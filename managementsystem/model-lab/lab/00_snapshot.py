"""Stage 00 - snapshot the live database into inspectable CSVs.

Nothing here writes to MongoDB. The point is reproducibility: every later figure
is built from these files, so the analysis can be re-run offline and you can open
any dataset in Excel to check what the pipeline actually saw.
"""
from __future__ import annotations

import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from bson import ObjectId

from _common import (DATA, ML_SRC, banner, connect, mongo_settings,
                     model_bundle)

COLLECTIONS = [
    "clubs",
    "club_memberships",
    "athletes",
    "exercises",
    "workouts",
    "training_sessions",
    "attendance_records",
    "workout_logs",
    "workout_assignments",
    "daily_readiness",
    "performance_results",
    "competitions",
    "fitness_tests",
    "athlete_goals",
    "injuries",
    "injury_wellness",
    "recommendations",
]

# Collections whose absence is worth calling out, because a figure depends on them.
REQUIRED = {
    "athletes": "cohort figures",
    "workout_logs": "load / RPE figures",
    "daily_readiness": "readiness figures",
    "performance_results": "competition label audit",
    "competitions": "competition label audit",
}


def scalar(value: Any) -> Any:
    """Flatten a Mongo value into something a CSV can hold."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return json.dumps(value, default=str, sort_keys=True)


def flatten(document: Dict[str, Any]) -> Dict[str, Any]:
    return {key: scalar(value) for key, value in document.items()}


def dump_collection(db, name: str) -> int:
    documents = list(db[name].find({}))
    if not documents:
        pd.DataFrame(columns=["_id"]).to_csv(DATA / f"{name}.csv", index=False)
        return 0
    rows = [flatten(document) for document in documents]
    frame = pd.DataFrame(rows)
    # Keep _id first for eyeballing, then alphabetical for stable diffs.
    ordered = ["_id"] + sorted(column for column in frame.columns if column != "_id")
    frame[ordered].to_csv(DATA / f"{name}.csv", index=False)
    return len(frame)


def extract_inference_features(uri: str, database: str) -> pd.DataFrame:
    """Run the real pipeline for a handful of athletes, exactly as inference does."""
    sys.path.insert(0, str(ML_SRC))
    from features.pipeline import RecommendationFeaturePipeline  # noqa: E402

    snapshot = pd.read_csv(DATA / "athletes.csv")
    logs = pd.read_csv(DATA / "workout_logs.csv")
    activity = (
        logs.groupby("athleteId").size().sort_values(ascending=False).rename("logs")
    )
    candidates = (
        snapshot[snapshot["_id"].isin(activity.index)]
        .assign(logs=lambda frame: frame["_id"].map(activity))
        .sort_values("logs", ascending=False)
        .head(6)
    )

    rows: List[Dict[str, Any]] = []
    config_path = ML_SRC.parent / "config.local.yaml"
    with RecommendationFeaturePipeline(
        uri, database, str(config_path) if config_path.exists() else None
    ) as pipeline:
        for _, athlete in candidates.iterrows():
            try:
                features = pipeline.extract_inference_features(
                    str(athlete["clubId"]), str(athlete["_id"])
                )
            except Exception as error:  # one odd athlete must not kill the snapshot
                print(f"  ! feature extraction failed for {athlete['_id']}: {error}")
                continue
            features["_athleteId"] = str(athlete["_id"])
            rows.append(features)
            print(f"  extracted {len(features):3d} features for athlete {athlete['_id']}")

    if not rows:
        return pd.DataFrame()

    frame = pd.DataFrame(rows)
    ordered = ["_athleteId"] + sorted(column for column in frame.columns if column != "_athleteId")
    frame = frame[ordered]
    frame.to_csv(DATA / "inference_features.csv", index=False)

    lookup = candidates[["_id", "firstName", "lastName", "eventSpecialization", "logs"]]
    lookup.to_csv(DATA / "athlete_lookup.csv", index=False)
    return frame


def apply_model_contract(uri: str, database: str, features: pd.DataFrame) -> pd.DataFrame:
    """Translate pipeline names into the 31 columns the deployed model was trained on."""
    from inference_worker import InferenceWorker  # noqa: E402  (path set above)

    bundle = model_bundle()
    worker = InferenceWorker(
        uri,
        database,
        "redis://localhost:6379",
        str(bundle["_path"]),
    )
    worker._load_model()  # reads the pickle only; no Redis, no Mongo

    rows = []
    for _, row in features.iterrows():
        translated = worker._apply_model_contract(row.to_dict())
        translated["_athleteId"] = row["_athleteId"]
        rows.append(translated)

    contract = pd.DataFrame(rows)
    columns = ["_athleteId"] + list(bundle["feature_names"])
    contract = contract.reindex(columns=columns)
    contract.to_csv(DATA / "model_contract_features.csv", index=False)
    return contract


def write_summary(counts: Dict[str, int], features: pd.DataFrame, contract: pd.DataFrame) -> None:
    lines = [
        "# Snapshot summary",
        "",
        f"Generated from database `{mongo_settings()[1]}` on {datetime.now():%Y-%m-%d %H:%M}.",
        "",
        "| Collection | Rows | Used by |",
        "| --- | --- | --- |",
    ]
    for name, count in counts.items():
        note = REQUIRED.get(name, "")
        lines.append(f"| `{name}` | {count} | {note} |")

    lines += ["", "## Feature extraction", ""]
    if features.empty:
        lines.append("Feature extraction did **not** run - later stages will be skipped.")
    else:
        string_keys = [
            column
            for column in features.columns
            if features[column].dtype == object and column != "_athleteId"
        ]
        lines += [
            f"- Pipeline emitted **{len(features.columns) - 1}** features per athlete.",
            f"- Model contract accepts **{len(contract.columns) - 1}** columns.",
            f"- Athletes sampled: {', '.join(features['_athleteId'].astype(str))}.",
            f"- Text-valued features (dropped before modelling): {', '.join(string_keys) or 'none'}.",
        ]

    missing = [name for name in REQUIRED if counts.get(name, 0) == 0]
    if missing:
        lines += ["", "## Empty but expected", "", ", ".join(f"`{name}`" for name in missing)]

    (DATA / "snapshot_summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("  wrote   data/snapshot_summary.md")


def main() -> None:
    banner("00 - snapshot")
    client, db = connect()
    uri, database = mongo_settings()

    counts: Dict[str, int] = {}
    for name in COLLECTIONS:
        present = name in db.list_collection_names()
        counts[name] = dump_collection(db, name) if present else 0
        print(f"  {name:22s} {counts[name]:5d}")

    features = extract_inference_features(uri, database)
    contract = apply_model_contract(uri, database, features) if not features.empty else pd.DataFrame()

    write_summary(counts, features, contract)
    client.close()

    if features.empty:
        print("\n  feature extraction unavailable - 30/40 will fall back to the CSV dataset.")
    print("\n  ok")


if __name__ == "__main__":
    main()
