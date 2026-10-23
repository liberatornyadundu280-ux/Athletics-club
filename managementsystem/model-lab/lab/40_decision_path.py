"""Stage 40 - where the model stops and the hand-written rules begin.

Only one of the six things a coach reads is a model output. The rest are if-statements
in `inference_worker.py`, and this stage runs those exact functions on real athletes so
the split is visible rather than asserted.
"""
from __future__ import annotations

import json
import sys
import textwrap
from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

from _common import (DATA, FAINT, GRID, INK, ML_SRC, MODEL, MUTED, OUTPUT, PANEL, RULES,
                     WARN, add_captions, banner, model_bundle, save, setup_theme)

NAMES = list("ABCDEFGHIJ")


def box(axis, x, y, w, h, title, lines, edge, fill="white", title_size=9.0, body_size=7.0):
    axis.add_patch(
        FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0.006,rounding_size=0.012",
            linewidth=1.2,
            edgecolor=edge,
            facecolor=fill,
        )
    )
    axis.text(x + 0.012, y + h - 0.018, title, fontsize=title_size, fontweight="semibold",
              color=edge, va="top")
    for index, line in enumerate(lines):
        axis.text(x + 0.012, y + h - 0.055 - index * 0.028, line, fontsize=body_size,
                  color=INK, va="top")


def arrow(axis, start, end, colour=GRID, curve=0.0):
    axis.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=11,
            linewidth=1.2,
            color=colour,
            connectionstyle=f"arc3,rad={curve}",
        )
    )


def figure_decision_path(predicted: float, athlete_label: str) -> None:
    fig, axis = plt.subplots(figsize=(13, 6.9))
    axis.set_xlim(0, 1)
    axis.set_ylim(0, 1)
    axis.axis("off")

    tall = 0.165
    top = 0.75

    box(axis, 0.012, top, 0.20, tall, "1. Collections",
        ["workout logs, daily readiness,", "attendance, injuries,", "results, fitness tests"], MUTED)
    box(axis, 0.252, top, 0.20, tall, "2. Feature pipeline",
        ["9 extractors, one dict", "200-270 features per athlete", "Python, read-only"], MUTED)
    box(axis, 0.492, top, 0.20, tall, "3. Model contract",
        ["translates to the 31", "column names the model", "was trained on"], MUTED)
    box(axis, 0.732, top, 0.256, tall, "4. XGBoost regressor",
        ["500 trees, depth 6,", "target = next-workout RPE", f"{athlete_label[:20]} -> {predicted:.2f}"],
        MODEL, fill="#fdf2ec")

    for start, end in [((0.212, top + tall / 2), (0.252, top + tall / 2)),
                       ((0.452, top + tall / 2), (0.492, top + tall / 2)),
                       ((0.692, top + tall / 2), (0.732, top + tall / 2))]:
        arrow(axis, start, end, MUTED)

    # Legend: which colour means "the model decided this" and which means "someone wrote an if".
    axis.add_patch(plt.Rectangle((0.012, 0.935), 0.012, 0.022, color=MODEL))
    axis.text(0.030, 0.946, "learned by XGBoost", fontsize=9, color=MODEL,
              fontweight="semibold", va="center")
    axis.add_patch(plt.Rectangle((0.235, 0.935), 0.012, 0.022, color=RULES))
    axis.text(0.253, 0.946, "written by hand in inference_worker.py", fontsize=9, color=RULES,
              fontweight="semibold", va="center")

    # The heuristic shelf.
    shelf_y, shelf_h = 0.30, 0.40
    fan_y = 0.725
    arrow(axis, (0.86, top), (0.86, fan_y), MODEL)
    axis.plot([0.091, 0.86], [fan_y, fan_y], color=MODEL, linewidth=1.2)

    cards = [
        ("Focus", [
            "if active injury:",
            "  controlled return",
            "elif high-RPE >= 2:",
            "  recovery + movement",
            "elif attendance < 65%:",
            "  build consistency",
            "elif PBs > 0:",
            "  event technique",
        ]),
        ("Intensity", [
            "injury -> clinician plan",
            f"RPE >= 8 -> High 8-9",
            "RPE >= 6 -> Moderate 6-7",
            "else -> Low-mod 4-5",
            "",
            "read straight off the",
            "predicted RPE",
        ]),
        ("Injury risk", [
            "start at 0.10",
            "+0.20  RPE >= 8",
            "+0.30  active injury",
            "+0.20  ACWR > 1.5 *",
            "+0.15  pain > 4/10",
            "+0.10  soreness > 4",
            "* only with 8+ sessions",
            "clip at 0.90",
        ]),
        ("Progression", [
            "start at 0.00",
            "-0.15  RPE >= 8",
            "-0.10  ACWR > 1.3 *",
            "+0.05  ACWR < 0.8 *",
            "+0.05  readiness > 70",
            "-0.10  readiness < 40",
            "+0.05  any recent PB",
            "clip at +/-0.30",
        ]),
        ("Recovery", [
            "injury -> follow RTP",
            "pain > 4/10 ->",
            "  low-intensity day",
            "ACWR > 1.5 ->",
            "  unload the week",
            "else -> normal spacing",
        ]),
        ("Confidence", [
            "0.80 base",
            "+0.05 per driver",
            "-0.10 if data thin",
            "clip at 0.95",
            "",
            "a hand-set number,",
            "not a model probability",
        ]),
    ]
    width = 0.158
    for index, (title, lines) in enumerate(cards):
        x = 0.012 + index * (width + 0.006)
        box(axis, x, shelf_y, width, shelf_h, title, lines, RULES, body_size=6.6,
            fill="#f2f8f6")
        arrow(axis, (x + width / 2, fan_y), (x + width / 2, shelf_y + shelf_h), MODEL)

    arm_y = 0.13
    axis.add_patch(
        FancyBboxPatch(
            (0.012, arm_y),
            0.716,
            0.062,
            boxstyle="round,pad=0.006,rounding_size=0.01",
            linewidth=1.1,
            edgecolor=MUTED,
            facecolor=PANEL,
        )
    )
    axis.text(
        0.024,
        arm_y + 0.033,
        "RuleEngine (TypeScript): drop contraindicated exercises  ->  enforce warm-up to\n"
        "explosive to strength order  ->  scale volume by readiness",
        fontsize=7.6,
        color=INK,
        va="center",
    )
    arrow(axis, (0.36, shelf_y), (0.36, arm_y + 0.062), RULES)

    box(axis, 0.744, arm_y - 0.005, 0.244, 0.105, "Coach's screen",
        ["focus, intensity, recovery,", "drivers, risk, confidence"], INK, fill=PANEL)
    arrow(axis, (0.728, arm_y + 0.04), (0.744, arm_y + 0.04), MUTED)

    fig.suptitle(
        "One prediction, five heuristics: the full decision path a coach is reading",
        x=0.005,
        ha="left",
        fontsize=13,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    save(fig, "40_decision_path")
    add_captions(
        {
            "40_decision_path": (
                "Read left to right: data becomes features, features become 31 columns, and "
                "those become <b>one</b> number - the predicted RPE. Everything after that point "
                "is deterministic code. It is not wrong to combine a model with rules (a safety "
                "layer should be rules), but the numbers labelled injury risk and progression "
                "come from the green column, not from XGBoost."
            )
        }
    )


def figure_athlete_cards(cases: pd.DataFrame) -> None:
    rows = int(np.ceil(len(cases) / 3))
    fig, axes = plt.subplots(rows, 3, figsize=(13, 2.35 * rows))
    axes = np.atleast_2d(axes)
    for axis in axes.ravel():
        axis.axis("off")

    for axis, (_, case) in zip(axes.ravel(), cases.iterrows()):
        axis.set_xlim(0, 1)
        axis.set_ylim(0, 1)
        axis.add_patch(
            FancyBboxPatch((0.01, 0.02), 0.98, 0.96,
                           boxstyle="round,pad=0.01,rounding_size=0.02",
                           linewidth=1.0, edgecolor=GRID, facecolor="white")
        )
        axis.text(0.04, 0.92, str(case["name"]), fontsize=9.5, fontweight="semibold", color=INK,
                  va="top")
        axis.text(0.04, 0.83, str(case["event"])[:46], fontsize=7.2, color=MUTED, va="top")

        # Predicted RPE bar - the one modelled value.
        axis.text(0.04, 0.71, "predicted RPE", fontsize=7, color=MUTED, va="top")
        axis.text(0.96, 0.71, f"{case['predicted_rpe']:.2f}", fontsize=11, color=MODEL,
                  va="top", ha="right", fontweight="semibold")
        axis.add_patch(
            FancyBboxPatch((0.04, 0.615), 0.92, 0.032, boxstyle="round,pad=0,rounding_size=0.01",
                           linewidth=0, facecolor="#eeeeea")
        )
        axis.add_patch(
            FancyBboxPatch((0.04, 0.615), max(0.02, 0.92 * case["predicted_rpe"] / 10), 0.032,
                           boxstyle="round,pad=0,rounding_size=0.01", linewidth=0, facecolor=MODEL)
        )

        wrapped = textwrap.wrap(str(case["focus"]), 44)
        axis.text(0.04, 0.55, "focus", fontsize=7, color=MUTED, va="top")
        axis.text(0.04, 0.485, "\n".join(wrapped[:2]), fontsize=8, color=RULES, va="top",
                  fontweight="semibold")
        axis.text(0.04, 0.34, "intensity", fontsize=7, color=MUTED, va="top")
        axis.text(0.04, 0.275, str(case["intensity"])[:44], fontsize=8, color=INK, va="top")

        axis.text(
            0.04,
            0.15,
            f"injury risk {case['injury_risk']:.2f}     progression {case['progression']:+.2f}"
            f"     confidence {case['confidence']:.2f}",
            fontsize=7.4,
            color=MUTED,
            va="top",
        )

    fig.suptitle(
        "What the coach actually sees, for six real athletes",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.955))
    save(fig, "41_athlete_cards")
    add_captions(
        {
            "41_athlete_cards": (
                "Each card is built by running the production heuristics on live pipeline "
                "features - these are the real strings and numbers the app would store. Notice "
                "how much of each card is text generated by thresholds, and how little of it "
                "varies the model's output."
            )
        }
    )


def figure_input_audit(contract: pd.DataFrame) -> List[str]:
    names = [column for column in contract.columns if column != "_athleteId"]
    values = contract[names].astype(float)
    spread = values.std(ddof=0)
    scales = values.abs().mean().replace(0, np.nan)
    variation = (spread / scales).fillna(0.0)

    frame = pd.DataFrame({"feature": names, "variation": variation.values,
                          "mean": values.mean().values}).sort_values("variation")
    constant = frame[frame["variation"] < 1e-9]

    fig, axis = plt.subplots(figsize=(7.6, 6.2))
    colours = [WARN if value < 1e-9 else "#1f3d5c" for value in frame["variation"]]
    axis.barh(frame["feature"], frame["variation"], color=colours, alpha=0.9)
    axis.set_title("How much each of the 31 inputs varies across six athletes")
    axis.set_xlabel("coefficient of variation (0 = identical for everyone)")
    axis.grid(axis="y", visible=False)
    axis.tick_params(axis="y", labelsize=7)
    for index, (_, row) in enumerate(constant.iterrows()):
        axis.text(0.004, index, f"  always {row['mean']:.3f}", fontsize=6.8, color=WARN,
                  va="center")
    save(fig, "42_input_audit")
    add_captions(
        {
            "42_input_audit": (
                "Red inputs are identical for every athlete in this sample, so they cannot change "
                "the answer. Two are structural: <code>base_fitness_score</code> is the contract's "
                "fallback of 75 because every club percentile comes back as exactly 50, and "
                "<code>training_age</code> is 0.03 years - eleven days, the age of the database "
                "row rather than years in the sport. Periodisation dummies are constant because "
                "the phase is club-wide. The injury flags are only zero because none of these six "
                "athletes is currently injured."
            )
        }
    )
    return constant["feature"].tolist()


def figure_stored_outputs() -> None:
    path = DATA / "recommendations.csv"
    if not path.exists():
        print("  (no recommendations snapshot - skipping stored-output figure)")
        return

    frame = pd.read_csv(path)
    frame["source"] = np.where(
        frame["modelVersion"].astype(str).str.startswith("rules-"),
        "cold-start rules",
        "XGBoost model",
    )

    fig, axes = plt.subplots(1, 2, figsize=(11, 3.4), gridspec_kw={"width_ratios": [1, 1.5]})

    counts = frame["source"].value_counts()
    colours = [RULES if label == "cold-start rules" else MODEL for label in counts.index]
    bars = axes[0].bar(counts.index, counts.values, color=colours, alpha=0.9, width=0.55)
    for bar, value in zip(bars, counts.values):
        axes[0].text(bar.get_x() + bar.get_width() / 2, value + 0.4,
                     f"{value} ({value / len(frame) * 100:.0f}%)", ha="center", fontsize=8,
                     color=INK)
    axes[0].set_title(f"Origin of the {len(frame)} stored recommendations", fontsize=10)
    axes[0].set_ylabel("recommendations")
    axes[0].set_ylim(0, counts.max() * 1.25)

    for label, colour in (("XGBoost model", MODEL), ("cold-start rules", RULES)):
        subset = frame.loc[frame["source"] == label, "confidence"]
        if len(subset):
            axes[1].hist(subset, bins=np.arange(0.3, 0.95, 0.05), alpha=0.75, color=colour,
                         label=f"{label} (n={len(subset)})", edgecolor="white")
    axes[1].set_title("Confidence attached to each recommendation", fontsize=10)
    axes[1].set_xlabel("confidence")
    axes[1].set_ylabel("recommendations")
    axes[1].legend(loc="upper left")

    fig.suptitle(
        "In the live database, nearly half of what coaches saw was not the model",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "43_stored_outputs")
    add_captions(
        {
            "43_stored_outputs": (
                "Read straight from the <code>recommendations</code> collection. A recommendation "
                "tagged <code>rules-cold-start-v1</code> was produced because ML inference "
                "failed or was unavailable - the backend falls back silently and still shows a "
                "confidence number. If you want coaches to trust the feature, the origin should "
                "be visible on screen, and a failed inference should be an error state rather "
                "than a plausible-looking substitute."
            )
        }
    )


def main() -> None:
    banner("40 - decision path")
    setup_theme()

    contract_path = DATA / "model_contract_features.csv"
    features_path = DATA / "inference_features.csv"
    if not contract_path.exists() or not features_path.exists():
        raise SystemExit(
            "This stage needs the live pipeline snapshot. Run 00_snapshot.py with database "
            "access first."
        )

    contract = pd.read_csv(contract_path)
    raw = pd.read_csv(features_path).set_index("_athleteId")

    sys.path.insert(0, str(ML_SRC))
    from inference_worker import InferenceWorker  # noqa: E402

    bundle = model_bundle()
    worker = InferenceWorker("", "", "redis://localhost:6379", str(bundle["_path"]))
    worker._load_model()

    names = list(bundle["feature_names"])
    predictions = bundle["model"].predict(contract[names])

    lookup = pd.read_csv(DATA / "athlete_lookup.csv")

    def display_name(athlete_id: str) -> str:
        match = lookup[lookup["_id"].astype(str) == athlete_id]
        if not len(match):
            return athlete_id[:8]
        return f"{match.iloc[0]['firstName']} {match.iloc[0]['lastName']}".strip()

    def display_event(athlete_id: str) -> str:
        match = lookup[lookup["_id"].astype(str) == athlete_id]
        if not len(match):
            return ""
        raw_event = str(match.iloc[0].get("eventSpecialization", "") or "")
        try:
            events = json.loads(raw_event) if raw_event.strip().startswith("[") else [raw_event]
        except json.JSONDecodeError:
            events = [raw_event]
        return " / ".join(str(item) for item in events if str(item).strip())

    cases = []
    for index, row in contract.iterrows():
        athlete_id = str(row["_athleteId"])
        pipeline_features = raw.loc[athlete_id].to_dict() if athlete_id in raw.index else {}
        # Production order: contract first, then the heuristics read that dict.
        features = worker._apply_model_contract(pipeline_features)
        # Use the stored contract values so prediction and explanation use one vector.
        features.update({name: float(row[name]) for name in names})

        predicted = float(predictions[index])
        cases.append(
            {
                "athlete_id": athlete_id,
                "name": display_name(athlete_id),
                "event": display_event(athlete_id),
                "predicted_rpe": predicted,
                "focus": worker._determine_focus(features),
                "intensity": worker._determine_intensity(predicted, features),
                "recovery": worker._determine_recovery(features),
                "injury_risk": worker._estimate_injury_risk(features, predicted),
                "progression": worker._estimate_progression_adjustment(features, predicted),
                "confidence": worker._calculate_confidence(features),
                "drivers": " | ".join(worker._determine_drivers(features)[:3]),
            }
        )

    frame = pd.DataFrame(cases)
    frame.to_csv(OUTPUT / "heuristic_examples.csv", index=False)
    print(f"  wrote   output/heuristic_examples.csv ({len(frame)} athletes)")

    constants = figure_input_audit(contract)
    print(f"  {len(constants)} of 31 model inputs are identical for every athlete: "
          f"{', '.join(constants)}")

    figure_decision_path(float(frame["predicted_rpe"].mean()), frame.iloc[0]["name"])
    figure_athlete_cards(frame)
    figure_stored_outputs()

    print("")
    for _, case in frame.iterrows():
        print(f"  {case['name'][:20]:20s} RPE {case['predicted_rpe']:.2f}  risk "
              f"{case['injury_risk']:.2f}  prog {case['progression']:+.2f}  {case['focus'][:38]}")
    print("\n  ok")


if __name__ == "__main__":
    main()
