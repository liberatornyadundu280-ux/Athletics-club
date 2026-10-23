"""Stage 50 - does the behaviour make sense athlete by athlete?

This is the stage that reads the real dev database rather than the training CSV:
how much load each athlete actually carried, whether the readiness signal lines up
with how hard sessions felt, and what competition labels exist to learn from.
"""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from _common import (DATA, FAINT, GRID, INK, MODEL, MUTED, OUTPUT, PANEL, RULES, TRAIN_CSV,
                     WARN, add_captions, banner, load_snapshot, save, setup_theme)

THRESHOLDS = (0.8, 1.3, 1.5)


def daily_loads(logs: pd.DataFrame) -> pd.DataFrame:
    frame = logs.copy()
    frame["day"] = pd.to_datetime(frame["completedAt"], errors="coerce").dt.normalize()
    frame = frame.dropna(subset=["day"])
    frame["rpe"] = pd.to_numeric(frame["perceivedEffort"], errors="coerce")
    frame["duration"] = pd.to_numeric(frame["durationMinutes"], errors="coerce")
    frame["load"] = frame["rpe"].fillna(0) * frame["duration"].fillna(0)
    return frame


def athlete_series(logs: pd.DataFrame, readiness: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """One daily frame per athlete: load, acute, chronic, both ACWR definitions."""
    series: Dict[str, pd.DataFrame] = {}
    log_days = logs.groupby("athleteId")["day"].agg(["min", "max"])
    ready_days = readiness.groupby("athleteId")["day"].agg(["min", "max"])

    for athlete_id, row in log_days.iterrows():
        start, end = row["min"], row["max"]
        if athlete_id in ready_days.index:
            start = min(start, ready_days.loc[athlete_id, "min"])
            end = max(end, ready_days.loc[athlete_id, "max"])

        index = pd.date_range(start, end, freq="D")
        daily = (
            logs[logs["athleteId"] == athlete_id]
            .groupby("day")
            .agg(load=("load", "sum"), rpe=("rpe", "mean"), sessions=("load", "size"))
            .reindex(index)
            .fillna({"load": 0.0, "sessions": 0})
        )

        acute = daily["load"].rolling(7, min_periods=1).sum()
        chronic = daily["load"].rolling(28, min_periods=1).sum()
        sessions = daily["sessions"].rolling(28, min_periods=1).sum()

        daily["acute"] = acute
        daily["chronic"] = chronic
        daily["sessions_28d"] = sessions
        # As implemented: 7-day total over 28-day total.
        daily["acwr_shipped"] = np.where(chronic > 0, acute / chronic, np.nan)
        # The convention the thresholds assume: 7-day total over the 28-day *weekly average*.
        daily["acwr_standard"] = np.where(chronic > 0, acute / (chronic / 4), np.nan)
        series[str(athlete_id)] = daily

    return series


def figure_acwr_definition(series: Dict[str, pd.DataFrame]) -> Dict[str, float]:
    shipped = pd.concat([frame["acwr_shipped"] for frame in series.values()]).dropna()
    standard = pd.concat([frame["acwr_standard"] for frame in series.values()]).dropna()

    fig, axes = plt.subplots(1, 2, figsize=(12.5, 3.9), gridspec_kw={"width_ratios": [1.35, 1]})
    axis = axes[0]
    bins = np.linspace(0, 4.2, 42)
    axis.hist(shipped, bins=bins, color=WARN, alpha=0.65, edgecolor="white",
              label=f"as shipped (median {shipped.median():.2f})")
    axis.hist(standard, bins=bins, color=RULES, alpha=0.55, edgecolor="white",
              label=f"standard (median {standard.median():.2f})")
    for threshold in THRESHOLDS:
        axis.axvline(threshold, color=INK, linewidth=1.0, linestyle="--", alpha=0.55)
        axis.text(threshold, axis.get_ylim()[1] * 0.55, f" {threshold}", fontsize=7.5,
                  color=INK, rotation=90, va="bottom")
    axis.set_title("Observed on the dev database", fontsize=10)
    axis.set_xlabel("acute:chronic workload ratio")
    axis.set_ylabel("athlete-days")
    axis.legend(loc="upper right", fontsize=7.5)
    axis.text(
        0.02,
        0.62,
        f"same athlete-days, two formulas\n{len(shipped)} days with any load",
        transform=axis.transAxes,
        va="top",
        fontsize=7.5,
        color=MUTED,
    )

    # Arithmetic, not data: what each formula reports for a normal and a spiked week.
    scenarios = [("steady week\n1000 per week", 1000, 4000), ("spike week\n1500, chronic 4000", 1500, 4000)]
    positions = np.arange(len(scenarios))
    width = 0.32
    shipped_values = [acute / chronic for _, acute, chronic in scenarios]
    standard_values = [acute / (chronic / 4) for _, acute, chronic in scenarios]

    axis = axes[1]
    axis.axhline(1.3, color=INK, linewidth=1.0, linestyle="--", alpha=0.55)
    axis.text(0.0, 1.34, "spike threshold 1.3", fontsize=7.5, color=INK, ha="left")
    axis.bar(positions - width / 2, shipped_values, width, color=WARN, alpha=0.8, label="as shipped")
    axis.bar(positions + width / 2, standard_values, width, color=RULES, alpha=0.8, label="standard")
    for index, (low, high) in enumerate(zip(shipped_values, standard_values)):
        axis.text(index - width / 2, low + 0.04, f"{low:.2f}", ha="center", fontsize=8, color=INK)
        axis.text(index + width / 2, high + 0.04, f"{high:.2f}", ha="center", fontsize=8, color=INK)
    axis.set_xticks(positions, [name for name, _, _ in scenarios], fontsize=8)
    axis.set_ylim(0, 1.75)
    axis.set_title("What each formula reports, by construction", fontsize=10)
    axis.set_ylabel("ratio")
    axis.legend(loc="upper left", fontsize=7.5)

    fig.suptitle(
        "The ACWR thresholds in the rules were written for a ratio this feature never produces",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "50_acwr_definition")
    add_captions(
        {
            "50_acwr_definition": (
                "<code>workload.py</code> divides a seven-day total by a twenty-eight-day total, "
                "so steady training reads about 0.25 - the right-hand panel shows the arithmetic. "
                "The 0.8 / 1.3 / 1.5 thresholds in the injury-risk and progression rules assume a "
                "ratio scaled the other way, where 1.0 means steady. On the shipped scale the "
                "&ldquo;spike&rdquo; branches cannot fire and the &ldquo;undertrained&rdquo; branch "
                "is almost always true. In the dev database the effect is masked because almost no "
                "athlete-day clears the eight-session guard."
            )
        }
    )

    return {
        "shipped_median": float(shipped.median()),
        "standard_median": float(standard.median()),
        "shipped_above_1_3": float((shipped > 1.3).mean()),
        "standard_above_1_3": float((standard > 1.3).mean()),
        "athlete_days": int(len(shipped)),
    }


def figure_trajectories(series: Dict[str, pd.DataFrame], names: Dict[str, str]) -> None:
    chosen = sorted(series.items(), key=lambda item: -len(item[1]))[:12]
    fig, axes = plt.subplots(4, 3, figsize=(13, 8.4), sharex=False)
    for axis, (athlete_id, frame) in zip(axes.ravel(), chosen):
        axis.fill_between(frame.index, 0, 2.2, where=(frame["acwr_standard"] > 1.3),
                          color=MODEL, alpha=0.08, linewidth=0)
        axis.plot(frame.index, frame["acwr_standard"], color=RULES, linewidth=1.3)
        axis.axhline(1.3, color=FAINT, linewidth=0.9, linestyle="--")
        axis.axhline(0.8, color=FAINT, linewidth=0.9, linestyle="--")
        axis.set_ylim(0, 2.2)

        twin = axis.twinx()
        twin.scatter(frame.index[frame["rpe"].notna()], frame["rpe"][frame["rpe"].notna()],
                     s=12, color=MODEL, alpha=0.75, zorder=3)
        twin.set_ylim(0, 11)
        twin.set_yticks([])
        twin.grid(False)
        for spine in ("top", "right"):
            twin.spines[spine].set_visible(False)

        quiet = int((frame["sessions_28d"] < 8).sum())
        axis.set_title(names.get(athlete_id, athlete_id[:8]), fontsize=9)
        axis.text(0.02, 0.94, f"{quiet}/{len(frame)} days under 8 sessions", transform=axis.transAxes,
                  fontsize=6.8, color=MUTED, va="top")
        axis.tick_params(axis="x", labelsize=6.5, rotation=30)
        axis.tick_params(axis="y", labelsize=6.5)

    fig.suptitle(
        "12 athletes through the seeded season: standard ACWR (line) and session RPE (dots)",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    save(fig, "51_trajectories")
    add_captions(
        {
            "51_trajectories": (
                "Teal is load ratio, orange dots are how hard each session actually felt. Most "
                "athletes never leave the dashed band, and the caption in each panel is how many "
                "days had fewer than eight sessions in the trailing month - the threshold at "
                "which the engine stops trusting its own load ratio."
            )
        }
    )


def figure_readiness_vs_rpe(readiness: pd.DataFrame, logs: pd.DataFrame,
                            training: pd.DataFrame) -> Dict[str, float]:
    ready = readiness.copy()
    ready["day"] = pd.to_datetime(ready["date"], errors="coerce")
    for column in ("soreness", "sleepQuality", "stressEnergy"):
        ready[column] = pd.to_numeric(ready[column], errors="coerce")
    ready["composite"] = (
        (6 - ready["soreness"]) + (6 - ready["sleepQuality"]) + (6 - ready["stressEnergy"])
    ) / 15.0

    session = logs[["athleteId", "day", "rpe"]].dropna()
    pairs: List[Tuple[float, float]] = []
    for athlete_id, group in ready.groupby("athleteId"):
        sessions = session[session["athleteId"] == athlete_id].sort_values("day")
        if sessions.empty:
            continue
        for _, row in group.iterrows():
            upcoming = sessions[sessions["day"] >= row["day"]]
            if upcoming.empty:
                continue
            if (upcoming.iloc[0]["day"] - row["day"]).days <= 3:
                pairs.append((float(row["composite"]), float(upcoming.iloc[0]["rpe"])))

    live = pd.DataFrame(pairs, columns=["composite", "next_rpe"]).dropna()
    train = training[["readiness_composite_score", "target_next_workout_rpe"]].dropna()

    live_r = live["composite"].corr(live["next_rpe"]) if len(live) > 2 else float("nan")
    train_r = train["readiness_composite_score"].corr(train["target_next_workout_rpe"])

    fig, axes = plt.subplots(1, 2, figsize=(12, 3.8), sharey=True)

    axes[0].hexbin(
        train["readiness_composite_score"],
        train["target_next_workout_rpe"],
        gridsize=28,
        cmap="Blues",
        mincnt=1,
        linewidths=0.2,
    )
    axes[0].set_title(f"Training CSV: r = {train_r:+.2f}  (n = {len(train):,})", fontsize=10)
    axes[0].set_xlabel("readiness composite")
    axes[0].set_ylabel("next-workout RPE")
    axes[0].text(
        0.03,
        0.05,
        "the relationship the model learned",
        transform=axes[0].transAxes,
        fontsize=8,
        color=MODEL,
        fontweight="semibold",
    )

    axes[1].scatter(live["composite"], live["next_rpe"], s=16, alpha=0.45, color="#1f3d5c",
                    edgecolors="none")
    if len(live) > 8:
        live["band"] = pd.qcut(live["composite"], 4, duplicates="drop")
        grouped = live.groupby("band", observed=True)["next_rpe"].agg(["mean", "sem", "size"])
        axes[1].errorbar([band.mid for band in grouped.index], grouped["mean"],
                         yerr=grouped["sem"], color=RULES, marker="o", linewidth=1.6, capsize=3,
                         label="quartile mean")
        axes[1].legend(loc="upper right", fontsize=7.5)
    axes[1].set_title(f"Dev database: r = {live_r:+.2f}  (n = {len(live)})", fontsize=10)
    axes[1].set_xlabel("readiness composite (same formula)")
    axes[1].text(
        0.03,
        0.05,
        "the relationship the database shows",
        transform=axes[1].transAxes,
        fontsize=8,
        color=RULES,
        fontweight="semibold",
    )

    fig.suptitle(
        "The model's strongest input is real in the training data and absent in the database",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "52_readiness_vs_rpe")
    add_captions(
        {
            "52_readiness_vs_rpe": (
                "Left: in <code>train_data.csv</code>, fresher athletes report clearly lower "
                f"effort (r = {train_r:+.2f}), and readiness is the model's heaviest input. Right: "
                "the same composite built from the dev database's 332 real check-ins shows no "
                f"relationship at all (r = {live_r:+.2f}). Either the seeded history is random, or "
                "the effect is smaller than the synthetic data claims. Both mean this database "
                "cannot currently validate the model - and neither can a coach's trust be earned "
                "from a correlation that only exists in generated data."
            )
        }
    )

    return {
        "pairs": int(len(live)),
        "correlation": float(live_r) if live_r == live_r else 0.0,
        "training_correlation": float(train_r),
        "training_rows": int(len(train)),
    }


def figure_competition_labels(results: pd.DataFrame, competitions: pd.DataFrame) -> Dict[str, int]:
    per_competition = (
        results.dropna(subset=["competitionId"])
        .groupby("competitionId")
        .size()
        .sort_values(ascending=False)
    )
    unattached = int(results["competitionId"].isna().sum()) if "competitionId" in results else 0
    per_athlete = results.groupby("athleteId").size()

    fig, axes = plt.subplots(1, 2, figsize=(11, 3.4))
    labels = [f"competition {index + 1}" for index in range(len(per_competition))]
    if unattached:
        labels.append("no competition id")
    values = list(per_competition.values) + ([unattached] if unattached else [])
    colours = ["#1f3d5c"] * len(per_competition) + ([FAINT] if unattached else [])
    bars = axes[0].bar(labels, values, color=colours, alpha=0.9, width=0.55)
    for bar, value in zip(bars, values):
        axes[0].text(bar.get_x() + bar.get_width() / 2, value + 0.8, str(value), ha="center",
                     fontsize=8, color=INK)
    axes[0].set_title(f"{len(competitions)} competitions in the database", fontsize=10)
    axes[0].set_ylabel("performance results")
    axes[0].set_ylim(0, max(values) * 1.22 if values else 5)
    axes[0].tick_params(axis="x", labelsize=8)

    axes[1].hist(per_athlete.values, bins=range(1, per_athlete.max() + 2), color="#0f766e",
                 alpha=0.85, edgecolor="white")
    axes[1].set_title("Results per athlete", fontsize=10)
    axes[1].set_xlabel("recorded results")
    axes[1].set_ylabel("athletes")

    fig.suptitle(
        "The label a readiness forecast needs - competition outcome - is almost absent",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "53_competition_labels")
    add_captions(
        {
            "53_competition_labels": (
                "A &ldquo;will they be ready on the day&rdquo; model needs labelled competition "
                "outcomes. Three competitions is a sample you can describe, not one you can learn "
                "from. This is the constraint that decides the phasing of the prediction feature."
            )
        }
    )

    return {
        "competitions": int(len(competitions)),
        "results": int(len(results)),
        "athletes_with_results": int(per_athlete.size),
        "median_results_per_athlete": float(per_athlete.median()) if len(per_athlete) else 0.0,
    }


def main() -> None:
    banner("50 - cohorts")
    setup_theme()

    logs = daily_loads(load_snapshot("workout_logs"))
    readiness = load_snapshot("daily_readiness")
    readiness["day"] = pd.to_datetime(readiness["date"], errors="coerce")
    athletes = load_snapshot("athletes")
    names = {
        str(row["_id"]): f"{row['firstName']} {row['lastName']}".strip()
        for _, row in athletes.iterrows()
    }

    series = athlete_series(logs, readiness)
    print(f"  {len(series)} athletes with training history, {len(logs)} sessions")

    acwr = figure_acwr_definition(series)
    figure_trajectories(series, names)
    training = pd.read_csv(TRAIN_CSV)
    readiness_link = figure_readiness_vs_rpe(readiness, logs, training)
    labels = figure_competition_labels(
        load_snapshot("performance_results"), load_snapshot("competitions")
    )

    quiet_days = (
        pd.concat([frame["sessions_28d"] for frame in series.values()]) < 8
    ).mean()

    print(f"  ACWR median {acwr['shipped_median']:.2f} as shipped vs "
          f"{acwr['standard_median']:.2f} standard")
    print(f"  {quiet_days * 100:.0f}% of athlete-days are under the 8-session guard")
    print(f"  readiness vs next-session RPE: r = {readiness_link['correlation']:+.2f} "
          f"({readiness_link['pairs']} pairs) vs {readiness_link['training_correlation']:+.2f} "
          f"in the training CSV")
    print(f"  {labels['competitions']} competitions, {labels['results']} results")

    import json

    from _common import OUTPUT

    payload = {"acwr": acwr, "readiness_link": readiness_link, "labels": labels,
               "quiet_day_share": float(quiet_days)}
    (OUTPUT / "cohorts.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("  wrote   output/cohorts.json")
    print("\n  ok")


if __name__ == "__main__":
    main()
