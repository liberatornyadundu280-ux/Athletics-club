"""Shared paths, configuration and chart styling for the STMS model lab.

The lab is deliberately read-only and self-contained: it imports the real feature
pipeline and the real inference heuristics, but never writes to MongoDB, never
touches the backend, and never ships anything the application loads.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402  (must follow matplotlib.use)

# --------------------------------------------------------------------------- paths

LAB = Path(__file__).resolve().parents[1]           # .../managementsystem/model-lab
MANAGEMENT = LAB.parent                             # .../managementsystem
FEATURE_ENGINEERING = MANAGEMENT / "feature_engineering"
ML_SRC = FEATURE_ENGINEERING / "stms_ml"
BACKEND = MANAGEMENT / "stms-backend"
DOCS_OUT = MANAGEMENT / "Docs" / "AgentsDocumentation" / "model-lab"

TRAIN_CSV = FEATURE_ENGINEERING / "data" / "train_data.csv"

DATA = LAB / "data"
OUTPUT = LAB / "output"
FIGURES = OUTPUT / "figures"
INTERACTIVE = OUTPUT / "interactive"
CAPTIONS = OUTPUT / "captions.json"

for _directory in (DATA, FIGURES, INTERACTIVE, DOCS_OUT):
    _directory.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------------------- styling

INK = "#1b1b19"
MUTED = "#6f6f68"
FAINT = "#9a9a92"
GRID = "#e6e6df"
PANEL = "#f7f7f3"
MODEL = "#c2410c"      # everything the model decides
RULES = "#0f766e"      # everything the heuristics decide
WARN = "#b91c1c"
SERIES = ["#1f3d5c", "#c2410c", "#0f766e", "#a16207", "#6b21a8", "#b91c1c"]


def setup_theme() -> None:
    """One restrained look for every figure so the report reads as a set."""
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "axes.edgecolor": GRID,
            "axes.labelcolor": MUTED,
            "axes.titlecolor": INK,
            "axes.titlesize": 11,
            "axes.titleweight": "semibold",
            "axes.titlelocation": "left",
            "axes.labelsize": 9,
            "axes.grid": True,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "grid.color": GRID,
            "grid.linewidth": 0.8,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "font.size": 9,
            "font.family": "sans-serif",
            "legend.frameon": False,
            "legend.fontsize": 8,
            "lines.linewidth": 1.8,
        }
    )


def banner(title: str) -> None:
    print("")
    print("=" * 78)
    print(title)
    print("=" * 78)


def save(fig, name: str) -> Path:
    """Write a figure to output/figures/<name>.png and release it."""
    path = FIGURES / f"{name}.png"
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"  figure  output/figures/{name}.png")
    return path


def add_captions(mapping: Dict[str, str]) -> None:
    """Merge figure captions into output/captions.json (later stages append)."""
    existing: Dict[str, str] = {}
    if CAPTIONS.exists():
        try:
            existing = json.loads(CAPTIONS.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}
    existing.update(mapping)
    CAPTIONS.write_text(json.dumps(existing, indent=2), encoding="utf-8")


# --------------------------------------------------------------------- connection

def _parse_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = re.match(r"^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$", line)
        if not match:
            # Multi-line PEM blocks in the backend .env land here; they are single
            # values continued over several lines, so skipping is correct.
            continue
        key, value = match.group(1), match.group(2).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def mongo_settings() -> tuple[str, str]:
    """Resolve (uri, database) the same way the pipeline does, without secrets in git."""
    env_file = _parse_env_file(BACKEND / ".env")
    uri = os.getenv("MONGO_URI")
    database = os.getenv("MONGO_DB")

    local_config = FEATURE_ENGINEERING / "config.local.yaml"
    if local_config.exists():
        import yaml

        config = yaml.safe_load(local_config.read_text(encoding="utf-8")) or {}
        mongodb = config.get("mongodb") or {}
        uri = uri or mongodb.get("uri")
        database = database or mongodb.get("database")

    uri = (uri or env_file.get("MONGODB_URI") or "").strip().strip("\"'")
    if not uri:
        raise SystemExit(
            "No MongoDB URI found. Set MONGO_URI, add feature_engineering/config.local.yaml,\n"
            "or make sure stms-backend/.env defines MONGODB_URI."
        )

    if not database:
        tail = uri.rsplit("/", 1)[-1].split("?")[0]
        database = tail or "stms_dev"

    return uri, database


def connect():
    """Read-only handle to the STMS database."""
    from pymongo import MongoClient

    uri, database = mongo_settings()
    client = MongoClient(uri, serverSelectionTimeoutMS=15000, appname="stms-model-lab")
    db = client[database]
    # Fail fast with a readable message instead of a stack trace three figures later.
    client.admin.command("ping")
    print(f"  connected to {db.name}")
    return client, db


# -------------------------------------------------------------------- model bundle

def model_bundle(path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the newest shipped next_workout_rpe bundle."""
    import pickle

    if path is None:
        candidates = sorted((ML_SRC / "models").glob("model_next_workout_rpe_*.pkl"))
        if not candidates:
            raise SystemExit(f"No trained model found under {ML_SRC / 'models'}")
        path = candidates[-1]

    with open(path, "rb") as handle:
        bundle = pickle.load(handle)

    bundle["_path"] = path
    bundle["_version"] = path.name
    return bundle


def load_snapshot(name: str):
    """Read a CSV written by 00_snapshot.py."""
    import pandas as pd

    path = DATA / f"{name}.csv"
    if not path.exists():
        raise SystemExit(
            f"Missing {path.relative_to(LAB)}. Run 00_snapshot.py first "
            "(or `python run_all.py`)."
        )
    return pd.read_csv(path, low_memory=False)


# ------------------------------------------------------------------ feature naming

FEATURE_FAMILIES: Dict[str, str] = {
    "readiness_composite_score": "Readiness",
    "daily_soreness": "Readiness",
    "daily_sleep_quality": "Readiness",
    "daily_stress_energy": "Readiness",
    "readiness_soreness_7d_avg": "Readiness",
    "readiness_sleep_7d_avg": "Readiness",
    "readiness_stress_7d_avg": "Readiness",
    "high_soreness_days_7d": "Readiness",
    "sRPE_acwr": "Load",
    "sRPE_load_acute_7d": "Load",
    "sRPE_load_chronic_28d": "Load",
    "session_sRPE_load": "Load",
    "session_rpe": "Load",
    "session_duration_mins": "Load",
    "compliance_rate_30d": "Compliance",
    "attendance_rate_30d": "Attendance",
    "active_injury_flag": "Injury",
    "injury_prone_flag": "Injury",
    "base_fitness_score": "Fitness",
    "age": "Demographics",
    "training_age": "Demographics",
    "gender_F": "Demographics",
    "gender_M": "Demographics",
}
for _group in ("sprints", "middle_distance", "long_distance", "jumps", "throws", "combined"):
    FEATURE_FAMILIES[f"event_group_{_group}"] = "Event group"
for _phase in ("off-season", "pre-comp", "competition", "transition"):
    FEATURE_FAMILIES[f"periodization_phase_{_phase}"] = "Periodisation"


def family_of(feature: str) -> str:
    return FEATURE_FAMILIES.get(feature, "Other")
