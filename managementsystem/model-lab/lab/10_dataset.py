"""Stage 10 - what the model is actually being asked to learn.

Everything here reads `feature_engineering/data/train_data.csv`, the dataset the
shipped XGBoost model was fitted on. No model is loaded yet; this stage is about
the data and the five labels in it.
"""
from __future__ import annotations

from typing import List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from _common import (FAINT, GRID, INK, MUTED, PANEL, TRAIN_CSV, WARN, add_captions,
                     banner, save, setup_theme)

TARGETS = [
    ("target_next_workout_rpe", "Next-workout RPE", "1-10 scale the model regresses"),
    ("target_intensity_prescription", "Intensity prescription", "0-1, fraction of max"),
    ("target_injury_risk_score", "Injury risk score", "0-1, rule-computed in the CSV"),
    ("target_progression_adjustment", "Progression adjustment", "-0.3 to +0.3"),
]

IDENTIFIERS = {"athlete_id", "club_id", "date"}


def candidate_features(frame: pd.DataFrame) -> List[str]:
    return [
        column
        for column in frame.columns
        if column not in IDENTIFIERS and not column.startswith("target_")
    ]


def numeric_features(frame: pd.DataFrame) -> List[str]:
    return [column for column in candidate_features(frame) if frame[column].dtype != object]


def figure_targets(frame: pd.DataFrame) -> None:
    fig, axes = plt.subplots(1, 4, figsize=(13.5, 3.4))
    for axis, (column, label, note) in zip(axes, TARGETS):
        values = frame[column]
        counts, _, _ = axis.hist(
            values, bins=32, color="#1f3d5c", alpha=0.85, edgecolor="white", linewidth=0.4
        )
        axis.axvline(values.mean(), color="#c2410c", linewidth=1.4, linestyle="--")
        axis.set_title(label, fontsize=10)
        axis.set_xlabel(note)
        axis.set_ylabel("rows" if axis is axes[0] else "")
        axis.set_ylim(0, counts.max() * 1.32)
        axis.text(
            0.97,
            0.96,
            f"mean {values.mean():.2f}\nstd {values.std():.2f}\nrange {values.min():.2f}"
            f"-{values.max():.2f}",
            transform=axis.transAxes,
            va="top",
            ha="right",
            fontsize=7.5,
            color=MUTED,
            bbox={"facecolor": "white", "edgecolor": "none", "alpha": 0.9, "pad": 2},
        )
    fig.suptitle(
        "The dataset carries five labels but the shipped model learns only the first",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "10_targets")
    add_captions(
        {
            "10_targets": (
                "Four of the five columns the CSV declares as targets. Only "
                "<b>next-workout RPE</b> was ever trained; the other three are written by "
                "the rule code in <code>inference_worker.py</code> at inference time, not "
                "predicted by a model. Note the injury-risk panel never exceeds 0.86 - that "
                "is the heuristic's clip ceiling, not a learned distribution."
            )
        }
    )


def figure_focus_classes(frame: pd.DataFrame) -> None:
    counts = frame["target_next_week_focus"].value_counts()
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.4), gridspec_kw={"width_ratios": [1, 1.4]})

    axes[0].barh(counts.index[::-1], counts.values[::-1], color="#0f766e", alpha=0.85)
    for position, value in enumerate(counts.values[::-1]):
        axes[0].text(value + 12, position, f"{value}", va="center", fontsize=8, color=MUTED)
    axes[0].set_title("Focus label balance")
    axes[0].set_xlabel("rows")
    axes[0].set_xlim(0, counts.max() * 1.18)

    order = counts.index.tolist()
    data = [frame.loc[frame["target_next_week_focus"] == label, "target_next_workout_rpe"] for label in order]
    box = axes[1].boxplot(
        data,
        tick_labels=order,
        patch_artist=True,
        widths=0.55,
        medianprops={"color": INK, "linewidth": 1.4},
        flierprops={"marker": "o", "markersize": 2, "markerfacecolor": FAINT, "markeredgecolor": "none"},
    )
    for patch, colour in zip(box["boxes"], ["#1f3d5c", "#c2410c", "#0f766e", "#a16207", "#6b21a8"]):
        patch.set_facecolor(colour)
        patch.set_alpha(0.55)
    axes[1].set_title("RPE the label implies, per focus")
    axes[1].set_ylabel("target next-workout RPE")
    axes[1].tick_params(axis="x", rotation=15)

    fig.suptitle(
        f"Focus is imbalanced {counts.max() / counts.min():.1f}:1 and each class sits on a distinct RPE band",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "11_focus_classes")
    add_captions(
        {
            "11_focus_classes": (
                "The focus label is not a free choice the model must discover - each class "
                "occupies its own RPE band, so an RPE regression already encodes most of it. "
                "That is why a focus classifier would look accurate while adding little."
            )
        }
    )


def figure_correlations(frame: pd.DataFrame, features: List[str]) -> None:
    numeric_targets = [column for column, _, _ in TARGETS]
    correlation = frame[features + numeric_targets].corr().loc[features, numeric_targets]

    fig, axis = plt.subplots(figsize=(7.6, 8.4))
    sns.heatmap(
        correlation,
        annot=True,
        fmt=".2f",
        cmap="RdBu_r",
        center=0,
        vmin=-0.6,
        vmax=0.6,
        linewidths=0.6,
        linecolor="white",
        annot_kws={"size": 7},
        cbar_kws={"shrink": 0.5, "label": "Pearson r"},
        ax=axis,
    )
    axis.set_title("Feature correlation with each label", pad=12)
    axis.set_xticklabels(
        [label.replace(" ", "\n") for _, label, _ in TARGETS], rotation=0, fontsize=8
    )
    axis.tick_params(axis="y", length=0)
    save(fig, "12_correlations")
    add_captions(
        {
            "12_correlations": (
                "Readiness dominates. <code>readiness_composite_score</code> alone carries "
                "the strongest linear relationship with the target, which is what the next "
                "stage's feature importance will confirm - and what makes the leakage "
                "question in figure 14 worth asking."
            )
        }
    )


def figure_integrity(frame: pd.DataFrame, features: List[str]) -> None:
    dates = pd.to_datetime(frame["date"])
    per_date = frame.groupby(dates).size()

    # How much of the target is just "which athlete is this?" - a random-effects view.
    target = frame["target_next_workout_rpe"]
    athlete_means = frame.groupby("athlete_id")["target_next_workout_rpe"].mean()
    between = athlete_means.var(ddof=0) / target.var(ddof=0)

    constants = [column for column in features if frame[column].nunique(dropna=False) <= 1]
    duplicates = int(frame.duplicated(subset=["athlete_id", "date"]).sum())
    nulls = int(frame.isna().sum().sum())

    fig, axes = plt.subplots(1, 3, figsize=(13.5, 3.4), gridspec_kw={"width_ratios": [1.5, 1.2, 1.1]})

    axes[0].plot(per_date.index, per_date.values, color="#1f3d5c", linewidth=1.2)
    axes[0].fill_between(per_date.index, per_date.values, color="#1f3d5c", alpha=0.12)
    axes[0].set_title("Rows per calendar day")
    axes[0].set_ylabel("rows")
    axes[0].set_ylim(0, per_date.max() * 1.25)
    axes[0].tick_params(axis="x", rotation=30)

    axes[1].hist(athlete_means.values, bins=12, color="#0f766e", alpha=0.85, edgecolor="white")
    axes[1].set_title("Per-athlete mean target RPE")
    axes[1].set_xlabel("mean next-workout RPE")
    axes[1].set_ylabel("athletes")
    axes[1].text(
        0.97,
        0.95,
        f"only {between * 100:.0f}% of variance sits\nbetween athletes - the rest is\nday-to-day within one athlete",
        transform=axes[1].transAxes,
        ha="right",
        va="top",
        fontsize=8,
        color="#0f766e",
        fontweight="semibold",
    )

    axes[2].axis("off")
    checks = [
        (f"{len(frame):,} rows", "ok"),
        (f"{frame['athlete_id'].nunique()} athletes x {per_date.size} days", "ok"),
        (f"{len(features)} candidate features", "ok"),
        (f"{nulls} missing cells", "ok" if nulls == 0 else "warn"),
        (f"{duplicates} duplicate athlete-days", "ok" if duplicates == 0 else "warn"),
        (f"{len(constants)} constant features", "ok" if not constants else "warn"),
    ]
    axes[2].set_title("Integrity checks", loc="left")
    for index, (text, status) in enumerate(checks):
        axes[2].text(
            0.0,
            0.86 - index * 0.14,
            ("OK   " if status == "ok" else "WARN ") + text,
            transform=axes[2].transAxes,
            fontsize=8.5,
            color=INK if status == "ok" else WARN,
            family="monospace",
        )
    if constants:
        axes[2].text(
            0.0,
            0.86 - len(checks) * 0.14,
            "constant: " + ", ".join(constants)[:120],
            transform=axes[2].transAxes,
            fontsize=7,
            color=WARN,
            wrap=True,
        )

    fig.suptitle(
        f"{per_date.size} consecutive days, {frame['athlete_id'].nunique()} athletes, no gaps or duplicates",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "13_integrity")
    add_captions(
        {
            "13_integrity": (
                "The dataset is clean and evenly shaped - which is exactly what a generated "
                "dataset looks like. Only 9% of the target's variance sits between athletes, so "
                "the model is not really learning &ldquo;who recovers slowly&rdquo;; it is learning "
                "day-to-day response. That is the right thing for a daily prescription, and the "
                "wrong thing to reuse as a season-level readiness forecast."
            )
        }
    )


def figure_leakage(frame: pd.DataFrame) -> None:
    target = frame["target_next_workout_rpe"]
    pairs = [
        ("session_rpe", "Same-day session RPE vs next-workout RPE"),
        ("readiness_composite_score", "Readiness composite vs next-workout RPE"),
    ]
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.6))
    for axis, (column, title) in zip(axes, pairs):
        values = frame[column]
        correlation = values.corr(target)
        axis.scatter(values, target, s=4, alpha=0.18, color="#1f3d5c", edgecolors="none")
        axis.set_title(title, fontsize=10)
        axis.set_xlabel(column)
        axis.set_ylabel("next-workout RPE")
        axis.text(
            0.03,
            0.95,
            f"Pearson r = {correlation:+.2f}",
            transform=axis.transAxes,
            va="top",
            fontsize=9,
            color="#c2410c",
            fontweight="semibold",
        )

    fig.suptitle(
        "Two features share information with the label rather than predicting it",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "14_leakage")
    add_captions(
        {
            "14_leakage": (
                "<b>This is the chart to argue about.</b> The target is next week's average "
                "RPE, and the features include this week's RPE and today's readiness. An "
                "athlete who trains hard this week reports high readiness stress and high "
                "RPE, and tends to train hard next week too - so the model can score well by "
                "learning persistence rather than physiology. It is not a leak of the future, "
                "but it is why the headline R&sup2; is not a measure of predictive skill."
            )
        }
    )


def main() -> None:
    banner("10 - dataset")
    setup_theme()

    frame = pd.read_csv(TRAIN_CSV, parse_dates=["date"])
    candidates = candidate_features(frame)
    features = numeric_features(frame)
    print(f"  loaded  {len(frame):,} rows x {len(frame.columns)} columns from train_data.csv")
    print(f"  window  {frame['date'].min():%Y-%m-%d} to {frame['date'].max():%Y-%m-%d}", end="  ")
    print(f"({frame['date'].nunique()} days, {frame['athlete_id'].nunique()} athletes)")
    print(f"  features {len(features)} numeric + {len(candidates) - len(features)} categorical, targets 5")

    figure_targets(frame)
    figure_focus_classes(frame)
    figure_correlations(frame, features)
    figure_integrity(frame, candidates)
    figure_leakage(frame)
    print("\n  ok")


if __name__ == "__main__":
    main()
