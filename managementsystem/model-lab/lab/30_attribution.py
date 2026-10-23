"""Stage 30 - which inputs move the prediction, and how.

Gain importance says what the trees split on; permutation importance says what
actually matters on unseen weeks; SHAP splits one prediction into per-feature
contributions; partial dependence shows the shape of each relationship.
"""
from __future__ import annotations

import json
from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.inspection import permutation_importance

from _common import (DATA, FAINT, INK, INTERACTIVE, MODEL, MUTED, OUTPUT, RULES,
                     TRAIN_CSV, add_captions, banner, family_of, model_bundle,
                     save, setup_theme)
from _model_utils import build_matrix, contributions, holdout_split

N_PDP = 6


def figure_families(bundle) -> None:
    model = bundle["model"]
    names = list(bundle["feature_names"])
    frame = pd.DataFrame({"feature": names, "gain": model.feature_importances_})
    frame["family"] = frame["feature"].map(family_of)
    grouped = (
        frame.groupby("family")["gain"].sum().sort_values(ascending=True)
    )

    fig, axis = plt.subplots(figsize=(6.8, 3.6))
    bars = axis.barh(grouped.index, grouped.values, color="#1f3d5c", alpha=0.9, height=0.62)
    bars[-1].set_color(MODEL)
    for bar, value in zip(bars, grouped.values):
        axis.text(value + grouped.max() * 0.015, bar.get_y() + bar.get_height() / 2,
                  f"{value * 100:.1f}%", va="center", fontsize=8, color=INK)
    axis.set_xlim(0, grouped.max() * 1.2)
    axis.set_title("Where the model's total decision weight sits")
    axis.set_xlabel("summed gain importance")
    axis.grid(axis="y", visible=False)
    save(fig, "30_importance_by_family")
    add_captions(
        {
            "30_importance_by_family": (
                "Readiness and load together own most of the model. Demographics and event "
                "group - the things a coach cannot change today - contribute little, which is "
                "the right shape for a daily prescription tool."
            )
        }
    )


def figure_importance_detail(bundle, permutation: pd.DataFrame) -> None:
    model = bundle["model"]
    names = list(bundle["feature_names"])
    gain = (
        pd.DataFrame({"feature": names, "value": model.feature_importances_})
        .sort_values("value", ascending=False)
        .head(15)
    )

    fig, axes = plt.subplots(1, 2, figsize=(12.5, 4.6))
    axes[0].barh(gain["feature"][::-1], gain["value"][::-1], color="#1f3d5c", alpha=0.9)
    axes[0].set_title("Gain importance (training split usage)", fontsize=10)
    axes[0].grid(axis="y", visible=False)

    top = permutation.head(15)
    axes[1].barh(top["feature"][::-1], top["importance"][::-1], color=MODEL, alpha=0.9)
    axes[1].set_title("Permutation importance (held-out MAE increase)", fontsize=10)
    axes[1].set_xlabel("MAE increase when the column is shuffled")
    axes[1].grid(axis="y", visible=False)

    fig.suptitle(
        "Two honest ways to ask &lsquo;what matters&rsquo; - they disagree, and that is informative",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    save(fig, "31_importance_detail")
    add_captions(
        {
            "31_importance_detail": (
                "Left is how often the trees used a column; right is how much accuracy the "
                "model loses without it. A feature can be used constantly and matter little "
                "(it is a cheap proxy for something else). Where the two rankings disagree, "
                "the right-hand one is the trustworthy one."
            )
        }
    )


def figure_shap_global(shap: np.ndarray, names: List[str]) -> pd.DataFrame:
    values = np.abs(shap[:, :-1]).mean(axis=0)
    frame = (
        pd.DataFrame({"feature": names, "mean_abs_shap": values})
        .sort_values("mean_abs_shap", ascending=False)
        .reset_index(drop=True)
    )
    top = frame.head(12)

    fig, axis = plt.subplots(figsize=(7.2, 4.4))
    axis.barh(top["feature"][::-1], top["mean_abs_shap"][::-1], color=RULES, alpha=0.9)
    axis.set_title("Average pull on the prediction, per feature")
    axis.set_xlabel("mean |SHAP| in RPE points")
    axis.grid(axis="y", visible=False)
    axis.text(
        0.98,
        0.04,
        f"top feature moves the\nprediction by {top['mean_abs_shap'].iloc[0]:.2f} RPE on average",
        transform=axis.transAxes,
        ha="right",
        va="bottom",
        fontsize=8,
        color=MUTED,
    )
    save(fig, "32_shap_global")
    add_captions(
        {
            "32_shap_global": (
                "SHAP is measured in the model's own units, so these are RPE points: a "
                "one-athlete change in readiness moves the forecast by roughly the value "
                "shown. Compare that with the held-out MAE of ~0.36 - if a single feature can "
                "move the answer by more than the model's own error, that feature is doing "
                "almost all of the work."
            )
        }
    )
    return frame


def figure_pdp(bundle, X: pd.DataFrame, permutation: pd.DataFrame) -> None:
    model = bundle["model"]
    features = permutation["feature"].head(N_PDP).tolist()
    # Readiness is the headline feature; always show it even if permutation ranks it lower.
    if "readiness_composite_score" not in features:
        features = features[:-1] + ["readiness_composite_score"]

    baseline = X.median(numeric_only=True)
    fig, axes = plt.subplots(2, 3, figsize=(13, 6.2))
    for axis, feature in zip(axes.ravel(), features):
        observed = X[feature]
        unique = observed.nunique()
        if unique <= 3:
            grid = np.array(sorted(observed.unique()), dtype=float)
        else:
            low, high = observed.quantile(0.05), observed.quantile(0.95)
            grid = np.linspace(low, high, 24)

        rows = pd.DataFrame([baseline] * len(grid))
        rows[feature] = grid
        predicted = model.predict(rows[list(X.columns)])

        axis.plot(grid, predicted, color=MODEL, marker="o", markersize=3)
        axis.set_title(feature, fontsize=9)
        axis.set_xlabel("feature value")
        axis.set_ylabel("predicted RPE")
        if unique > 3:
            axis.scatter(
                observed.sample(min(200, len(observed)), random_state=0),
                np.full(min(200, len(observed)), predicted.min()),
                marker="|",
                color=FAINT,
                alpha=0.5,
                s=18,
            )

    figure_note = (
        "Every input except the one on the x-axis is frozen at its median. This is how the "
        "model responds to that feature in isolation - the shape a coach needs when they ask "
        "&lsquo;what happens if he sleeps badly tonight?&rsquo;. Flat segments mean the model does "
        "not use that range; steps mean it splits on a threshold."
    )
    fig.suptitle(
        "Partial dependence: the shape of each relationship",
        x=0.005,
        ha="left",
        fontsize=12,
        color=INK,
        fontweight="semibold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    save(fig, "33_pdp")
    add_captions({"33_pdp": figure_note})


def athlete_row(bundle) -> Dict[str, object]:
    """Prefer a real athlete from the live pipeline; fall back to the dataset median."""
    path = DATA / "model_contract_features.csv"
    if path.exists():
        contract = pd.read_csv(path)
        if len(contract):
            # Skip athletes whose demographics failed to resolve (age 0) - they make a
            # confusing worked example. Fall back to the first row if none are complete.
            complete = contract[(contract.get("age", 0) > 0) & (contract.get("daily_soreness", 0) > 0)]
            row = (complete if len(complete) else contract).iloc[0]
            athlete_id = str(row["_athleteId"])
            name, event = athlete_id, ""
            lookup_path = DATA / "athlete_lookup.csv"
            if lookup_path.exists():
                lookup = pd.read_csv(lookup_path)
                match = lookup[lookup["_id"].astype(str) == athlete_id]
                if len(match):
                    name = f"{match.iloc[0]['firstName']} {match.iloc[0]['lastName']}".strip()
                    raw = str(match.iloc[0].get("eventSpecialization", "") or "")
                    try:
                        parsed = json.loads(raw) if raw.strip().startswith("[") else [raw]
                    except json.JSONDecodeError:
                        parsed = [raw]
                    event = " / ".join(str(item) for item in parsed if str(item).strip())
            return {
                "source": "live pipeline",
                "athlete_id": athlete_id,
                "name": name,
                "event": event,
                "values": row[list(bundle["feature_names"])].astype(float).to_dict(),
            }

    frame = pd.read_csv(TRAIN_CSV, parse_dates=["date"]).sort_values(["date", "athlete_id"])
    X, _, _ = build_matrix(frame, list(bundle["feature_names"]))
    median = X.median(numeric_only=True)
    return {
        "source": "dataset median",
        "athlete_id": "median",
        "name": "The median training row",
        "event": "",
        "values": median.astype(float).to_dict(),
    }


def figure_contributions(bundle, athlete: Dict[str, object]) -> None:
    names = list(bundle["feature_names"])
    single = pd.DataFrame([athlete["values"]])[names]
    shap = contributions(bundle["model"], single)[0]
    base_value, per_feature = float(shap[-1]), shap[:-1]
    prediction = base_value + per_feature.sum()

    order = np.argsort(np.abs(per_feature))[::-1][:12]
    chosen = [(names[index], per_feature[index], single.iloc[0, index]) for index in order]
    chosen.sort(key=lambda item: item[1])

    fig, axis = plt.subplots(figsize=(9.6, 5.0))
    colours = [MODEL if contribution > 0 else "#1f3d5c" for _, contribution, _ in chosen]
    bars = axis.barh([item[0] for item in chosen], [item[1] for item in chosen], color=colours, alpha=0.9)
    axis.axvline(0, color=INK, linewidth=1.1)
    for bar, (feature, contribution, value) in zip(bars, chosen):
        offset = 0.01 if contribution >= 0 else -0.01
        axis.text(
            contribution + offset,
            bar.get_y() + bar.get_height() / 2,
            f"{contribution:+.2f}  (={value:.2f})",
            va="center",
            ha="left" if contribution >= 0 else "right",
            fontsize=7.5,
            color=INK,
        )
    span = max(abs(item[1]) for item in chosen) * 1.65
    axis.set_xlim(-span, span)
    axis.set_title(
        f"Why this athlete was given RPE {prediction:.2f}  -  {athlete['name']}"
        + (f" ({athlete['event']})" if athlete["event"] else ""),
        fontsize=10,
    )
    axis.set_xlabel(f"push on the prediction (RPE points)   |   baseline {base_value:.2f}")
    axis.grid(axis="y", visible=False)
    save(fig, "34_contributions")
    add_captions(
        {
            "34_contributions": (
                "Read bottom to top: start from the model's baseline (the average prediction it "
                "would make knowing nothing), then add each feature's push. Orange pushes the "
                "prescription harder, blue eases it. This is the exact arithmetic behind one "
                "athlete's number - it is not a separate, approximate explanation."
            )
        }
    )

    try:
        import plotly.graph_objects as go

        labels = [name for name, _, _ in chosen]
        values = [contribution for _, contribution, _ in chosen]
        observed = [value for _, _, value in chosen]
        figure = go.Figure(
            go.Bar(
                x=values,
                y=labels,
                orientation="h",
                marker_color=[MODEL if value > 0 else "#1f3d5c" for value in values],
                customdata=list(zip(observed, values)),
                hovertemplate="<b>%{y}</b><br>athlete value %{customdata[0]:.3f}"
                "<br>push %{customdata[1]:+.3f} RPE<extra></extra>",
            )
        )
        figure.update_layout(
            title=(
                f"{athlete['name']}: baseline {base_value:.2f} + contributions = "
                f"RPE {prediction:.2f}"
            ),
            xaxis_title="push on the prediction (RPE points)",
            template="plotly_white",
            height=520,
            margin={"l": 250, "r": 40, "t": 60, "b": 50},
        )
        target = INTERACTIVE / f"contributions_{athlete['athlete_id']}.html"
        figure.write_html(str(target), include_plotlyjs="cdn")
        print(f"  html    output/interactive/{target.name}")
    except ImportError:
        print("  (plotly not installed - skipping the interactive version)")


def main() -> None:
    banner("30 - attribution")
    setup_theme()

    bundle = model_bundle()
    names = list(bundle["feature_names"])
    frame = pd.read_csv(TRAIN_CSV, parse_dates=["date"]).sort_values(["date", "athlete_id"])
    frame = frame.reset_index(drop=True)
    X, y, _ = build_matrix(frame, names)

    train_slice, test_slice = holdout_split(len(X))
    X_test, y_test = X[test_slice], y[test_slice]

    print("  computing permutation importance on the held-out season...")
    permutation = permutation_importance(
        bundle["model"],
        X_test,
        y_test,
        scoring="neg_mean_absolute_error",
        n_repeats=10,
        random_state=42,
        n_jobs=-1,
    )
    perm = (
        pd.DataFrame(
            {
                "feature": names,
                "importance": permutation.importances_mean,
                "std": permutation.importances_std,
            }
        )
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )
    perm.to_csv(OUTPUT / "permutation_importance.csv", index=False)

    print("  computing SHAP values for the held-out season...")
    shap = contributions(bundle["model"], X_test)
    shap_frame = figure_shap_global(shap, names)
    shap_frame.to_csv(OUTPUT / "shap_global.csv", index=False)

    figure_families(bundle)
    figure_importance_detail(bundle, perm)
    figure_pdp(bundle, X, perm)

    athlete = athlete_row(bundle)
    print(f"  explaining {athlete['name']} ({athlete['source']})")
    figure_contributions(bundle, athlete)

    payload = {
        "athlete": {
            "name": athlete["name"],
            "event": athlete["event"],
            "source": athlete["source"],
            "id": athlete["athlete_id"],
        },
        "top_permutation": perm.head(10)[["feature", "importance"]].to_dict("records"),
        "top_shap": shap_frame.head(10).to_dict("records"),
    }
    (OUTPUT / "attribution.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("  wrote   output/attribution.json")
    print("\n  ok")


if __name__ == "__main__":
    main()
