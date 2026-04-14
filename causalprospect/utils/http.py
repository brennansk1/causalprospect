"""Shared HTTP client with on-disk caching and tenacity retry.

All data-ingest modules should use `get_json` / `get_bytes` from here so that
(a) we respect server rate limits, (b) we never re-download the same payload
within the cache TTL, and (c) the pipeline is reproducible offline once cached.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

DEFAULT_CACHE_DIR = Path(os.environ.get("CP_CACHE", "./data/cache"))
DEFAULT_TTL_SECONDS = 7 * 24 * 3600
USER_AGENT = "CausalProspect/0.1 (+https://github.com/brennansk1/causalprospect)"


def _cache_key(url: str, params: dict | None) -> str:
    payload = url + "|" + json.dumps(params or {}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def _cache_paths(key: str, suffix: str, cache_dir: Path) -> tuple[Path, Path]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / f"{key}.{suffix}", cache_dir / f"{key}.meta.json"


def _fresh(meta_path: Path, ttl: int) -> bool:
    if not meta_path.exists():
        return False
    meta = json.loads(meta_path.read_text())
    return time.time() - meta.get("fetched_at", 0) < ttl


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=2, max=30))
def _get(url: str, params: dict | None, timeout: float) -> httpx.Response:
    with httpx.Client(
        timeout=timeout,
        headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate"},
        follow_redirects=True,
    ) as client:
        r = client.get(url, params=params)
        r.raise_for_status()
        return r


def get_json(
    url: str,
    params: dict | None = None,
    *,
    cache_dir: Path = DEFAULT_CACHE_DIR,
    ttl: int = DEFAULT_TTL_SECONDS,
    timeout: float = 60.0,
) -> dict | list:
    key = _cache_key(url, params)
    data_path, meta_path = _cache_paths(key, "json", cache_dir)
    if data_path.exists() and _fresh(meta_path, ttl):
        return json.loads(data_path.read_text())
    r = _get(url, params, timeout)
    data_path.write_text(r.text)
    meta_path.write_text(json.dumps({"url": url, "params": params, "fetched_at": time.time()}))
    return r.json()


def get_bytes(
    url: str,
    params: dict | None = None,
    *,
    cache_dir: Path = DEFAULT_CACHE_DIR,
    ttl: int = DEFAULT_TTL_SECONDS,
    timeout: float = 120.0,
    suffix: str = "bin",
) -> bytes:
    key = _cache_key(url, params)
    data_path, meta_path = _cache_paths(key, suffix, cache_dir)
    if data_path.exists() and _fresh(meta_path, ttl):
        return data_path.read_bytes()
    r = _get(url, params, timeout)
    data_path.write_bytes(r.content)
    meta_path.write_text(json.dumps({"url": url, "params": params, "fetched_at": time.time()}))
    return r.content
