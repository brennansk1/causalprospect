"""PC algorithm wrapper with domain constraint post-processing."""

from __future__ import annotations

import networkx as nx
import numpy as np

from .mineral_system import CausalConstraints, is_forbidden_by_tier


def run_pc(
    X: np.ndarray,
    feature_names: list[str],
    *,
    alpha: float = 0.05,
    indep_test: str = "fisherz",
    stable: bool = True,
) -> nx.DiGraph:
    """Run the PC algorithm and return a NetworkX DiGraph.

    Uses causal-learn under the hood. Falls back to a skeleton-only graph if
    causal-learn is unavailable (helpful during early dev).
    """
    try:
        from causallearn.search.ConstraintBased.PC import pc
        from causallearn.utils.cit import fisherz, kci
    except ImportError as e:
        raise ImportError("causal-learn not installed. Run `pip install causal-learn`.") from e

    test = {"fisherz": fisherz, "kci": kci}[indep_test]
    cg = pc(
        data=X,
        alpha=alpha,
        indep_test=test,
        stable=stable,
        uc_rule=0,
        uc_priority=2,
        show_progress=False,
    )
    g = nx.DiGraph()
    g.add_nodes_from(feature_names)
    for i, row in enumerate(cg.G.graph):
        for j, v in enumerate(row):
            if v == 1:  # directed edge j -> i in causal-learn convention
                g.add_edge(feature_names[j], feature_names[i])
    return g


def apply_constraints(g: nx.DiGraph, c: CausalConstraints) -> nx.DiGraph:
    """Remove forbidden edges, add required edges, enforce tier ordering."""
    out = g.copy()
    for src, dst in c.forbidden_edges:
        if out.has_edge(src, dst):
            out.remove_edge(src, dst)
    # Drop any edge that violates tier ordering.
    for src, dst in list(out.edges):
        if is_forbidden_by_tier(src, dst, c):
            out.remove_edge(src, dst)
    for src, dst in c.required_edges:
        if src in out.nodes and dst in out.nodes:
            out.add_edge(src, dst, required=True)
    # Ensure acyclicity — if constraint injection created a cycle, remove the
    # weakest non-required edge until the cycle breaks.
    while not nx.is_directed_acyclic_graph(out):
        cycle = nx.find_cycle(out)
        removable = [(u, v) for u, v in cycle if not out[u][v].get("required")]
        if not removable:
            raise ValueError("Constraint set is inconsistent — required edges form a cycle.")
        out.remove_edge(*removable[0])
    return out
