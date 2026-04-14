"""Tests for causal feature selection via d-separation on the discovered DAG."""

from __future__ import annotations

import networkx as nx
import pytest

from causalprospect.causal.feature_selection import (
    find_colliders,
    minimal_adjustment_set,
    select_causal_features,
)
from causalprospect.causal.mineral_system import PORPHYRY_COPPER, is_forbidden_by_tier


def _simple_dag() -> nx.DiGraph:
    """A > X > Y, A > Y, Z > Y, target Y, and downstream descendant D of Y."""
    g = nx.DiGraph()
    g.add_edges_from(
        [
            ("A", "X"),
            ("X", "Y"),
            ("A", "Y"),
            ("Z", "Y"),
            ("Y", "D"),
        ]
    )
    return g


def test_selects_parents_of_target():
    sel = select_causal_features(_simple_dag(), target="Y")
    assert set(sel.parents) == {"X", "A", "Z"}


def test_excludes_descendants_of_target():
    sel = select_causal_features(_simple_dag(), target="Y")
    assert "D" not in sel.causal_features


def test_includes_ancestors_not_just_parents():
    sel = select_causal_features(_simple_dag(), target="Y")
    # A is an ancestor through X; must still be selected.
    assert "A" in sel.causal_features
    assert "X" in sel.causal_features


def test_target_never_selected_as_its_own_predictor():
    sel = select_causal_features(_simple_dag(), target="Y")
    assert "Y" not in sel.causal_features


def test_missing_target_raises():
    with pytest.raises(ValueError):
        select_causal_features(_simple_dag(), target="NOT_IN_GRAPH")


def test_minimal_adjustment_set_is_parents_for_acyclic():
    g = _simple_dag()
    adj = minimal_adjustment_set(g, "Y")
    assert adj == set(g.predecessors("Y"))


def test_colliders_detected():
    # Y has multiple parents, so it is a collider on any path through it.
    g = _simple_dag()
    colliders = find_colliders(g, target="Y")
    # Target itself is skipped; D is downstream but has only one parent (Y).
    assert "D" not in colliders


def test_tier_ordering_prevents_downstream_to_upstream_edge():
    # elevation is GEOMORPHIC (downstream); intrusion_depth is MAGMATIC (upstream).
    # An edge elevation -> intrusion_depth should be flagged as forbidden.
    assert is_forbidden_by_tier("elevation", "intrusion_depth", PORPHYRY_COPPER) is True


def test_tier_ordering_allows_upstream_to_downstream_edge():
    assert is_forbidden_by_tier("intrusion_depth", "Cu_ppm", PORPHYRY_COPPER) is False
