"""FastAPI backend serving the dashboard.

Reads pre-computed JSON artifacts produced by `scripts/run_pipeline.py` out
of `data/processed/` so the dashboard renders real pipeline output (no mocks).
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="CausalProspect API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

PROCESSED = Path(__file__).parents[2] / "data" / "processed"


def _load(name: str):
    path = PROCESSED / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{name}.json not yet produced — run the pipeline")
    return json.loads(path.read_text())


@app.get("/api/health")
def health():
    return {"ok": True, "has_processed": PROCESSED.exists()}


@app.get("/api/kpis")
def kpis():
    return _load("kpis")


@app.get("/api/deposits")
def deposits():
    return _load("deposits")


@app.get("/api/drill_holes")
def drill_holes():
    return _load("drill_holes")


@app.get("/api/terrain")
def terrain():
    return _load("terrain")


@app.get("/api/prospectivity_grid")
def prospectivity_grid():
    return _load("prospectivity_grid")


@app.get("/api/causal_dag")
def causal_dag():
    return _load("causal_dag")


@app.get("/api/benchmark")
def benchmark():
    return _load("benchmark")


@app.get("/api/uncertainty")
def uncertainty():
    return _load("uncertainty")


@app.get("/api/export/{artifact}")
def export(artifact: str):
    path = PROCESSED / artifact
    if not path.exists():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(path)
