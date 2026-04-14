"""Tests for the drill-hole generator."""

from __future__ import annotations

from causalprospect.data.drill_holes import generate_all, generate_for_deposit


def _deposit(id_="test_a", grade=0.4, size="large"):
    return {
        "id": id_,
        "name": id_.title(),
        "lat": 33.0,
        "lon": -110.5,
        "grade_pct": grade,
        "size_class": size,
    }


def test_generator_is_deterministic_per_deposit():
    a = generate_for_deposit(_deposit("foo"))
    b = generate_for_deposit(_deposit("foo"))
    assert [h.id for h in a] == [h.id for h in b]
    assert a[0].lat == b[0].lat


def test_different_deposits_produce_different_patterns():
    a = generate_for_deposit(_deposit("foo"))
    b = generate_for_deposit(_deposit("bar"))
    assert a[0].lat != b[0].lat


def test_hole_count_scales_with_size_class():
    small = generate_for_deposit(_deposit(size="small"))
    giant = generate_for_deposit(_deposit(size="giant"))
    assert len(giant) > len(small)


def test_intervals_cover_full_depth():
    holes = generate_for_deposit(_deposit())
    for h in holes:
        assert h.intervals[0].from_m == 0
        # Last interval should end at exactly the hole's total depth.
        assert abs(h.intervals[-1].to_m - h.total_depth_m) < 1e-6
        # Intervals are contiguous.
        for prev, cur in zip(h.intervals, h.intervals[1:]):
            assert cur.from_m == prev.to_m


def test_generate_all_returns_jsonable():
    import json

    deposits = [_deposit("a"), _deposit("b")]
    holes = generate_all(deposits)
    # Round-trip through JSON as the dashboard does.
    _ = json.loads(json.dumps(holes))
    assert len(holes) > 0
