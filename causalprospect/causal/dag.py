"""DAG construction: merge PC + SGC results with domain constraints."""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from .mineral_system import CausalConstraints
from .pc_discovery import apply_constraints
from .spatial_granger import SGCResult


def build_dag(
    pc_graph: nx.DiGraph,
    sgc_results: list[SGCResult],
    constraints: CausalConstraints,
    *,
    sgc_alpha: float = 0.05,
) -> nx.DiGraph:
    """Merge PC skeleton with significant SGC edges, then apply constraints."""
    g = pc_graph.copy()
    for r in sgc_results:
        if r.significant and r.p_value < sgc_alpha:
            g.add_edge(r.source, r.target, sgc_f=r.f_stat, sgc_p=r.p_value)
    return apply_constraints(g, constraints)


def export_graphml(g: nx.DiGraph, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    nx.write_graphml(g, path)


def export_dag_json(g: nx.DiGraph, path: Path) -> None:
    """Export in a shape the dashboard DAGPanel consumes directly."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "nodes": [
            {"id": n, **g.nodes[n]} for n in g.nodes
        ],
        "edges": [
            {"source": u, "target": v, **g.edges[u, v]} for u, v in g.edges
        ],
    }
    path.write_text(json.dumps(payload, indent=2, default=str))
