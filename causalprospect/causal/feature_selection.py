"""Causal feature selection via d-separation / backdoor criterion."""

from __future__ import annotations

from dataclasses import dataclass

import networkx as nx


@dataclass
class FeatureSelection:
    causal_features: list[str]
    parents: list[str]
    ancestors: list[str]
    colliders_excluded: list[str]
    adjustment_set: list[str]


def find_colliders(g: nx.DiGraph, target: str) -> set[str]:
    """A collider is a node with ≥2 parents on a path to target."""
    colliders: set[str] = set()
    for node in g.nodes:
        if node == target:
            continue
        parents = list(g.predecessors(node))
        if len(parents) >= 2 and nx.has_path(g, node, target):
            colliders.add(node)
    return colliders


def minimal_adjustment_set(g: nx.DiGraph, target: str) -> set[str]:
    """Parents of target satisfy the backdoor criterion in an acyclic DAG
    when we treat each feature as a potential treatment."""
    return set(g.predecessors(target))


def select_causal_features(g: nx.DiGraph, target: str = "deposit_present") -> FeatureSelection:
    """Canonical valid-predictor set: ancestors of the target minus descendants.

    A feature is a valid causal predictor iff there is a directed path from it
    to the target (it's an ancestor) AND there is no directed path from the
    target to it (it's not a descendant). Colliders that are downstream of
    other observed features but not of the target are still ancestors and stay.
    """
    if target not in g.nodes:
        raise ValueError(f"target '{target}' not in DAG")
    parents = set(g.predecessors(target))
    ancestors = nx.ancestors(g, target)
    descendants = nx.descendants(g, target)
    colliders = find_colliders(g, target)
    adj = minimal_adjustment_set(g, target)
    causal = (ancestors | parents) - descendants - {target}
    return FeatureSelection(
        causal_features=sorted(causal),
        parents=sorted(parents),
        ancestors=sorted(ancestors),
        colliders_excluded=sorted(colliders & descendants),
        adjustment_set=sorted(adj),
    )
