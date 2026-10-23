"""Stage 20 - does the model really score R2 = 0.987?

`train.py` fits on the whole matrix and then scores that same matrix, so the number
in the bundle is training error. This stage re-scores the shipped model three honest
ways and puts a persistence baseline next to it.
"""
from __future__ import annotations

import json
from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import TimeSeriesSplit

from _common import (FAINT, INK, MODEL, MUTED, OUTPUT, RULES, TRAIN_CSV,
                     add_captions, banner, model_bundle, save, setup_theme)
from _model_utils import PARAMS, TARGET_COLUMN, build_matrix, fit, metrics

TARGET = "next_workout_rpe"
HOLDOUT_FRACTION = 0.20
N_SPLITS = 5


def persistence_baseline(frame: pd.DataFrame) -> pd.Series:
    """Forecast next week's RPE with the athlete's own trailing 7-day average."""
    per_athlete = frame.groupby("athlete_id", sort=False)
    recent = frame["session_rpe"].where(frame["session_rpe"] > 0)
    trailing = recent.groupby(frame["athlete_id"], sort=False).transform(
        lambda series: series.rolling(7, min_periods=1).mean()
    )
    del per_athlete
    return trailing.fillna(frame["session_rpe"].replace(0, np.nan).mean())


def cross_validate(X, y, gap: int, label: str) -> Dict[str, List[float]]:
    splitter = TimeSeriesSplit(n_splits=N_SPLITS, gap=gap)
    collected: Dict[str, List[float]] = {"rmse": [], "mae": [], "r2": []}
    for train_index, test_index in splitter.split(X):
        model = fit(X.iloc[train_index], y.iloc[train_index])
        scores = metrics(y.iloc[test_index], model.predict(X.iloc[test_index]))
        for key, value in scores.items():
            collected[key].append(value)
    print(
        f"  CV {label:28s} "
        f"MAE {np.mean(collected['mae']):.3f} +/- {np.std(collected['mae']):.3f}  "
        f"R2 {np.mean(collected['r2']):.3f}"
    )
    return collected


def figure_metrics(results: Dict[str, Dict[str, float]]) -> None:
    order = list(results.keys())
    labels = [result["label"] for result in results.values()]
    colours = []
    for key in order:
        if key == "in_sample":
            colours.append(FAINT)
        elif key == "holdout":
            colours.append(MODEL)
        elif key in {"persistence", "global_mean"}:
            colours.append(RULES)
        else:
            colours.append("#1f3d5c")

    fig, axes = plt.subplots(1, 3, figsize=(14, 4.2))
    specs = [
        ("rmse", "RMSE (lower is better)", "{:.3f}"),
        ("mae", "MAE in RPE points (lower is better)", "{:.3f}"),
        ("r2", "R2 (higher is better)", "{:.3f}"),
    ]
    for axis, (metric, title, pattern) in zip(axes, specs):
        values = [results[key][metric] for key in order]
        positions = np.arange(len(order))
        bars = axis.barh(positions, values, color=colours, alpha=0.9, height=0.62)
        axis.set_yticks(positions, labels, fontsize=8)
        axis.invert_yaxis()
        axis.set_title(title, fontsize=10)
        low = min(0.0, min(values))
        span = max(values) - low
        for bar, value in zip(bars, values):
            axis.text(
                value + span * 0.015,
                bar.get_y() + bar.get_height() / 2,
                pattern.format(value),
                va="center",
                fontsize=8,
                color=INK,
            )
        if metric == "r2":
            axis.set_xlim(low * 1.15 if low < 0 else 0, 1.12)
        else:
            axis.set_xlim(0, max(values) * 1.2)

    fig.suptitle(
        "Same model, same data - the accuracy depends entirely on how you score it",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.subplots_adjust(left=0.19, right=0.985, top=0.82, bottom=0.13, wspace=0.62)
    save(fig, "20_metrics")
    add_captions(
        {
            "20_metrics": (
                "Grey is what the bundle reports - the model scored on the rows it memorised. "
                "Orange is a held-out final 20% of the season. Teal is the floor any model must "
                "clear: predicting the club average, and predicting each athlete's own last "
                "seven days. The gap between grey and orange is the honest cost of asking the "
                "model about something it has not already seen."
            )
        }
    )


def figure_actual_vs_predicted(y_true, y_pred, scores: Dict[str, float]) -> None:
    fig, axis = plt.subplots(figsize=(5.6, 5.4))
    axis.scatter(y_pred, y_true, s=16, alpha=0.45, color="#1f3d5c", edgecolors="none")
    low = min(y_true.min(), y_pred.min()) - 0.2
    high = max(y_true.max(), y_pred.max()) + 0.2
    axis.plot([low, high], [low, high], color=MODEL, linewidth=1.4, linestyle="--", label="perfect")
    axis.set_xlim(low, high)
    axis.set_ylim(low, high)
    axis.set_xlabel("predicted next-workout RPE")
    axis.set_ylabel("actual next-workout RPE")
    axis.set_title("Held-out season: prediction vs reality", fontsize=10)
    axis.legend(loc="upper left")
    axis.text(
        0.97,
        0.05,
        f"MAE {scores['mae']:.2f} RPE\nR2 {scores['r2']:.2f}",
        transform=axis.transAxes,
        ha="right",
        va="bottom",
        fontsize=9,
        color=INK,
        bbox={"facecolor": "white", "edgecolor": FAINT, "alpha": 0.9},
    )
    save(fig, "21_actual_vs_predicted")
    add_captions(
        {
            "21_actual_vs_predicted": (
                "The diagonal is a perfect forecast. A useful model hugs it. Points spread "
                "horizontally along a row are the same true value predicted differently; points "
                "stacked vertically are athletes whose week the model could not anticipate."
            )
        }
    )


def figure_residuals(y_true, y_pred) -> None:
    residuals = y_pred - y_true
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.4))

    axes[0].hist(residuals, bins=28, color="#1f3d5c", alpha=0.85, edgecolor="white")
    axes[0].axvline(0, color=INK, linewidth=1.1)
    axes[0].axvline(residuals.mean(), color=MODEL, linewidth=1.4, linestyle="--")
    axes[0].set_title("Residual distribution (predicted - actual)", fontsize=10)
    axes[0].set_xlabel("RPE points")
    axes[0].set_ylabel("rows")
    axes[0].text(
        0.02,
        0.95,
        f"mean bias {residuals.mean():+.3f}\nspread {residuals.std():.3f}",
        transform=axes[0].transAxes,
        va="top",
        fontsize=8,
        color=MUTED,
    )

    axes[1].scatter(y_pred, residuals, s=14, alpha=0.4, color="#1f3d5c", edgecolors="none")
    axes[1].axhline(0, color=INK, linewidth=1.1)
    axes[1].set_title("Bias by predicted value", fontsize=10)
    axes[1].set_xlabel("predicted RPE")
    axes[1].set_ylabel("residual")

    fig.tight_layout()
    save(fig, "22_residuals")
    add_captions(
        {
            "22_residuals": (
                "Near-zero mean bias and a narrow spread looks healthy - and it is, on the "
                "range the model has seen. The risk is extrapolation: coaches will use this on "
                "athletes outside these 50 days, and gradient-boosted trees cannot predict "
                "outside the values they were shown."
            )
        }
    )


def figure_learning_curve(X_train, y_train, X_test, y_test) -> List[Dict[str, float]]:
    fractions = [0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0]
    rows = []
    for fraction in fractions:
        count = int(len(X_train) * fraction)
        model = fit(X_train.iloc[:count], y_train.iloc[:count])
        scores = metrics(y_test, model.predict(X_test))
        scores["rows"] = count
        rows.append(scores)
        print(f"  learning curve {count:5d} rows -> holdout MAE {scores['mae']:.3f} R2 {scores['r2']:.3f}")

    frame = pd.DataFrame(rows)
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.4))
    axes[0].plot(frame["rows"], frame["mae"], marker="o", color=MODEL)
    axes[0].set_title("Held-out MAE vs training rows", fontsize=10)
    axes[0].set_xlabel("training rows")
    axes[0].set_ylabel("MAE (RPE points)")

    axes[1].plot(frame["rows"], frame["r2"], marker="o", color=RULES)
    axes[1].set_title("Held-out R2 vs training rows", fontsize=10)
    axes[1].set_xlabel("training rows")
    axes[1].set_ylabel("R2")
    axes[1].set_ylim(min(-0.2, frame["r2"].min() - 0.05), 1.0)

    fig.tight_layout()
    save(fig, "23_learning_curve")
    add_captions(
        {
            "23_learning_curve": (
                "Where the curve flattens is where more of the same data stopped helping. If it "
                "is already flat at the left edge, the ceiling is the feature set - not the "
                "sample size - and collecting another season of the same columns will not fix it."
            )
        }
    )

    return rows


def main() -> None:
    banner("20 - honest evaluation")
    setup_theme()

    bundle = model_bundle()
    feature_names = list(bundle["feature_names"])
    deployed = bundle["model"]

    frame = pd.read_csv(TRAIN_CSV, parse_dates=["date"])
    frame = frame.sort_values(["date", "athlete_id"]).reset_index(drop=True)
    X, y, report = build_matrix(frame, feature_names)
    print(f"  bundle  {bundle['_version']}  ({len(feature_names)} features)")
    print(f"  matrix  {X.shape[0]} rows x {X.shape[1]} columns")
    if report["missing_from_matrix"]:
        print(f"  ! bundle expects columns absent from the CSV: {report['missing_from_matrix']}")
    if report["unused_from_matrix"]:
        print(f"  ! CSV columns the bundle never sees: {report['unused_from_matrix']}")

    results: Dict[str, Dict[str, float]] = {}

    # 1. The number in the bundle: fit and score on everything.
    in_sample = metrics(y, deployed.predict(X))
    results["in_sample"] = {"label": "In-sample (as shipped)", **in_sample, "rows": len(X)}
    print(f"  in-sample        MAE {in_sample['mae']:.3f}  R2 {in_sample['r2']:.3f}")

    # 2. Time-series CV, exactly as train.py would run it.
    gap_samples = 7
    cv_simple = cross_validate(X, y, gap_samples, f"TimeSeriesSplit gap={gap_samples} samples")
    results["cv_gap_samples"] = {
        "label": f"Time CV, gap {gap_samples} rows",
        "rmse": float(np.mean(cv_simple["rmse"])),
        "mae": float(np.mean(cv_simple["mae"])),
        "r2": float(np.mean(cv_simple["r2"])),
        "rows": len(X),
    }

    # 3. Time-series CV with a real seven-day embargo (one day = ~50 athlete rows).
    rows_per_day = int(round(len(X) / frame["date"].nunique()))
    cv_embargo = cross_validate(X, y, gap_samples * rows_per_day, f"TimeSeriesSplit 7-day embargo")
    results["cv_embargo"] = {
        "label": f"Time CV, 7-day embargo",
        "rmse": float(np.mean(cv_embargo["rmse"])),
        "mae": float(np.mean(cv_embargo["mae"])),
        "r2": float(np.mean(cv_embargo["r2"])),
        "rows": len(X),
    }

    # 4. Final 20% of the season, never seen during fitting.
    split = int(len(X) * (1 - HOLDOUT_FRACTION))
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]
    final_model = fit(X_train, y_train)
    predictions = final_model.predict(X_test)
    holdout = metrics(y_test, predictions)
    results["holdout"] = {"label": "Held-out final 20%", **holdout, "rows": len(X_test)}
    print(f"  holdout          MAE {holdout['mae']:.3f}  R2 {holdout['r2']:.3f}  ({len(X_test)} rows)")

    # 5. Floors any model has to beat: club average, then each athlete's own habit.
    global_mean = np.full(len(y_test), float(y_train.mean()))
    floor = metrics(y_test, global_mean)
    results["global_mean"] = {"label": "Global mean baseline", **floor, "rows": len(X_test)}
    print(f"  global mean      MAE {floor['mae']:.3f}  R2 {floor['r2']:.3f}")

    baseline = persistence_baseline(frame).iloc[split:]
    persistence = metrics(y_test, baseline.values)
    results["persistence"] = {
        "label": "Persistence baseline",
        **persistence,
        "rows": len(X_test),
    }
    print(f"  persistence      MAE {persistence['mae']:.3f}  R2 {persistence['r2']:.3f}")

    figure_metrics(results)
    figure_actual_vs_predicted(y_test.values, predictions, holdout)
    figure_residuals(y_test.values, predictions)
    learning = figure_learning_curve(X_train, y_train, X_test, y_test)

    payload = {
        "model_version": bundle["_version"],
        "trained_at": bundle.get("trained_at"),
        "bundle_metrics": {key: float(value) for key, value in bundle.get("metrics", {}).items()},
        "holdout_fraction": HOLDOUT_FRACTION,
        "results": results,
        "learning_curve": learning,
        "matrix": report,
        "rows_per_day": rows_per_day,
        "target": TARGET,
    }
    path = OUTPUT / "metrics.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"  wrote   output/metrics.json")

    print("")
    print(f"  honest MAE {holdout['mae']:.2f} RPE, in-sample claimed {in_sample['mae']:.2f}")
    print(f"  vs club average {floor['mae']:.2f} -> model adds "
          f"{floor['mae'] - holdout['mae']:.2f} RPE of signal")
    print(f"  vs own last 7 days {persistence['mae']:.2f} -> model adds "
          f"{persistence['mae'] - holdout['mae']:.2f} RPE of signal")
    print("\n  ok")


if __name__ == "__main__":
    main()
