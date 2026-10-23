"""Stage 70 - assemble the figures into one report and the written findings.

Outputs:
  output/report.html                                  - the thing to read
  Docs/AgentsDocumentation/model-lab/README.md        - index and how to run
  Docs/AgentsDocumentation/model-lab/findings.md      - the findings, written down
"""
from __future__ import annotations

import html
import json
from datetime import date
from typing import Any, Dict, List

from _common import (CAPTIONS, DOCS_OUT, FIGURES, INTERACTIVE, OUTPUT, banner)

SECTIONS = {
    "1": ("The dataset", "What the model was asked to learn, and what is actually in the file."),
    "2": ("Honest accuracy", "The shipped metric, three honest re-scores, and two floors to beat."),
    "3": ("How the model decides", "Importance, partial dependence, and one athlete's arithmetic."),
    "4": ("Where the model stops", "The prediction versus the six hand-written rules around it."),
    "5": ("Cohorts and labels", "The real database: load, readiness, and the labels we do not have."),
}

STYLE = """
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 56px 28px 96px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #fbfbf8; color: #1b1b19; line-height: 1.62; font-size: 16px;
}
main { max-width: 1020px; margin: 0 auto; }
h1 { font-size: 34px; line-height: 1.2; margin: 0 0 8px; letter-spacing: -0.02em; }
h2 { font-size: 23px; margin: 64px 0 4px; letter-spacing: -0.01em; }
h2 .num { color: #9a9a92; font-weight: 500; margin-right: 10px; }
h3 { font-size: 16px; margin: 34px 0 6px; }
p { margin: 10px 0; max-width: 74ch; }
.lede { font-size: 18px; color: #4a4a45; max-width: 72ch; }
.meta { font-size: 13px; color: #6f6f68; margin-bottom: 34px; }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin: 28px 0 8px; }
.card { background: #fff; border: 1px solid #e6e6df; border-radius: 10px; padding: 16px 18px; }
.card .k { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #6f6f68; }
.card .v { font-size: 28px; font-weight: 650; margin-top: 6px; letter-spacing: -0.02em; }
.card .n { font-size: 12.5px; color: #6f6f68; margin-top: 2px; }
.card.bad .v { color: #b91c1c; } .card.good .v { color: #c2410c; } .card.rules .v { color: #0f766e; }
figure { margin: 26px 0; }
figure img { width: 100%; height: auto; border: 1px solid #e6e6df; border-radius: 8px; background: #fff; }
figcaption { font-size: 14px; color: #4a4a45; margin-top: 10px; max-width: 88ch; }
table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; background: #fff; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #e6e6df; vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #6f6f68; font-weight: 600; }
td.num { font-variant-numeric: tabular-nums; }
.flag { border-left: 3px solid #c2410c; padding: 4px 0 4px 16px; margin: 22px 0; }
.flag.rules { border-color: #0f766e; } .flag.risk { border-color: #b91c1c; }
.flag strong { display: block; margin-bottom: 3px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px;
       background: #f0f0ea; padding: 1px 5px; border-radius: 4px; }
ul { max-width: 74ch; } li { margin: 6px 0; }
.links a { display: inline-block; margin: 4px 10px 4px 0; font-size: 14px; color: #0f766e; }
footer { margin-top: 72px; padding-top: 20px; border-top: 1px solid #e6e6df; font-size: 13px; color: #6f6f68; }
"""


def load_json(name: str) -> Dict[str, Any]:
    path = OUTPUT / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def figures() -> List[str]:
    return sorted(path.stem for path in FIGURES.glob("*.png"))


def section_of(name: str) -> str:
    return name[0]


def render_table(rows: List[List[str]], header: List[str]) -> str:
    head = "".join(f"<th>{html.escape(cell)}</th>" for cell in header)
    body = ""
    for row in rows:
        cells = "".join(f'<td class="num">{html.escape(str(cell))}</td>' for cell in row)
        body += f"<tr>{cells}</tr>"
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def build() -> str:
    captions = json.loads(CAPTIONS.read_text(encoding="utf-8")) if CAPTIONS.exists() else {}
    metrics = load_json("metrics.json")
    cohorts = load_json("cohorts.json")
    attribution = load_json("attribution.json")
    examples = OUTPUT / "heuristic_examples.csv"

    results = metrics.get("results", {})
    in_sample = results.get("in_sample", {})
    holdout = results.get("holdout", {})
    floor = results.get("global_mean", {})

    parts: List[str] = []
    parts.append(
        f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STMS model lab - how the recommendation engine decides</title>
<style>{STYLE}</style></head><body><main>
<h1>How the recommendation engine decides</h1>
<p class="lede">An audit of the STMS recommendation engine, built from the shipped model, the
training file and the live database. Every figure in this report is regenerated by
<code>python run_all.py</code>.</p>
<p class="meta">Model bundle <code>{html.escape(str(metrics.get('model_version', 'unknown')))}</code>
&middot; trained {html.escape(str(metrics.get('trained_at', '')[:10]))}
&middot; report generated {date.today():%Y-%m-%d}</p>

<div class="strip">
  <div class="card bad"><div class="k">claimed accuracy</div>
    <div class="v">{in_sample.get('mae', 0):.2f}</div>
    <div class="n">RPE, scored on the rows it memorised</div></div>
  <div class="card good"><div class="k">honest accuracy</div>
    <div class="v">{holdout.get('mae', 0):.2f}</div>
    <div class="n">RPE on a held-out final 20% of the season</div></div>
  <div class="card"><div class="k">beat the club average by</div>
    <div class="v">{floor.get('mae', 0) - holdout.get('mae', 0):.2f}</div>
    <div class="n">RPE of real signal, not persistence</div></div>
  <div class="card rules"><div class="k">decisions from the model</div>
    <div class="v">1 of 6</div>
    <div class="n">the rest are if-statements</div></div>
</div>
"""
    )

    current = None
    for name in figures():
        section = section_of(name)
        if section != current and section in SECTIONS:
            current = section
            title, blurb = SECTIONS[section]
            parts.append(
                f'<h2><span class="num">{section}</span>{html.escape(title)}</h2>'
                f'<p class="lede">{html.escape(blurb)}</p>'
            )
        caption = captions.get(name, "")
        parts.append(
            f'<figure><img src="figures/{name}.png" alt="{html.escape(name)}">'
            f"<figcaption>{caption}</figcaption></figure>"
        )

        # Insert the supporting table once, after the metric figure.
        if name == "20_metrics" and results:
            rows = [
                [meta["label"], f"{meta['mae']:.3f}", f"{meta['rmse']:.3f}", f"{meta['r2']:.3f}",
                 f"{meta['rows']}"]
                for meta in results.values()
            ]
            parts.append(
                render_table(rows, ["Regime", "MAE", "RMSE", "R2", "rows"])
                + "<p>Read the first row as &lsquo;what the dashboard was told&rsquo; and the "
                "fourth as &lsquo;what a new week looks like&rsquo;.</p>"
            )

        if name == "41_athlete_cards" and examples.exists():
            import pandas as pd

            frame = pd.read_csv(examples)
            rows = [
                [
                    row["name"],
                    f"{row['predicted_rpe']:.2f}",
                    str(row["focus"])[:44],
                    str(row["intensity"])[:30],
                    f"{row['injury_risk']:.2f}",
                    f"{row['progression']:+.2f}",
                ]
                for _, row in frame.iterrows()
            ]
            parts.append(render_table(
                rows, ["Athlete", "Predicted RPE", "Focus", "Intensity", "Injury risk", "Progression"]
            ))

    # --- what it means, written plainly -------------------------------------
    live_r = cohorts.get("readiness_link", {}).get("correlation", 0.0)
    train_r = cohorts.get("readiness_link", {}).get("training_correlation", 0.0)
    guard = cohorts.get("quiet_day_share", 0.0) * 100
    acwr = cohorts.get("acwr", {}).get("shipped_median", 0.0)
    competitions = cohorts.get("labels", {}).get("competitions", 0)

    parts.append(
        f"""
<h2><span class="num">&rarr;</span>What this means</h2>

<div class="flag risk"><strong>1. The accuracy on the dashboard is not accuracy.</strong>
{in_sample.get('mae', 0):.2f} RPE is training error. A held-out week costs
{holdout.get('mae', 0):.2f} RPE, and the model's advantage over simply predicting the club
average is {floor.get('mae', 0) - holdout.get('mae', 0):.2f} RPE. That is a real but modest
signal - worth keeping, not worth quoting as {results.get('in_sample', {}).get('r2', 0):.2f}
R&sup2;.</div>

<div class="flag"><strong>2. Five of six labels are hand-written rules wearing a model's clothes.</strong>
Only the predicted RPE comes from XGBoost. Focus, intensity, recovery, confidence, injury
risk and progression are if-statements in <code>inference_worker.py</code>. That is a legitimate
design - safety should be deterministic - but the screen should say which is which.</div>

<div class="flag rules"><strong>3. The model's strongest input is real in the training file and
missing in the database.</strong> Readiness correlates {train_r:+.2f} with next-week effort in
<code>train_data.csv</code> and {live_r:+.2f} with next-session effort across {cohorts.get('readiness_link', {}).get('pairs', 0)}
real check-ins. Either the seeded history is random or the effect is smaller than the
synthetic data claims. Until real seasons exist, the engine is calibrated to a story about
athletes, not to athletes.</div>

<div class="flag"><strong>4. ACWR is on the wrong scale.</strong>
<code>workload.py</code> divides a 7-day total by a 28-day total (median {acwr:.2f} on
{cohorts.get('acwr', {}).get('athlete_days', 0)} athlete-days), while the 0.8 / 1.3 / 1.5 thresholds in the rules assume a
ratio where 1.0 means steady. In practice {guard:.0f}% of athlete-days are under the
eight-session guard, so the load rules are inert - they are not wrong on screen, they are
simply never consulted.</div>

<div class="flag"><strong>5. Some inputs cannot vary.</strong>
<code>base_fitness_score</code> is 75 for every athlete because every club percentile returns
exactly 50; <code>training_age</code> is the age of the database row (11 days), not years in
the sport. Nine of the 31 columns are identical across the sampled squad.</div>

<div class="flag risk"><strong>6. Nearly half of the stored recommendations were not the model.</strong>
Recommendations tagged <code>rules-cold-start-v1</code> are the silent fallback when inference
fails, and they still carry a confidence number.</div>

<h2><span class="num">&rarr;</span>The prediction feature</h2>
<p>A competition-readiness forecast is a different target from next-workout RPE, and the data
for it does not exist yet: <strong>{competitions} competitions</strong> in the database. The design
brief in <code>Docs/AgentsDocumentation/model-lab/competition-readiness-predictor.md</code> sets out
the label schema, the transparent Phase B index, the volume required, and the gate a model
has to clear before it ships. It deliberately does not ship a model now.</p>

<h2><span class="num">&rarr;</span>What I would do next, in order</h2>
<ul>
<li>Stop displaying the in-sample metric. Re-score on a time split in <code>train.py</code> and
store both numbers in the bundle.</li>
<li>Label the provenance of every recommendation field on the coach screen: predicted vs
derived vs fixed threshold.</li>
<li>Fix ACWR to <code>acute / (chronic / 4)</code>, or restate the thresholds for the current
scale - and decide which, in writing.</li>
<li>Fix <code>training_age</code> and the fitness percentile fallback, or drop those features
rather than feeding constants.</li>
<li>Make inference failure visible instead of falling back to a confident-looking substitute.</li>
<li>Start capturing competition labels this season - that is the only path to the feature you
want.</li>
</ul>

<h2><span class="num">&rarr;</span>Interactive</h2>
<p class="links">{render_links()}</p>

<footer>Generated by <code>model-lab</code>. Raw numbers: <code>output/metrics.json</code>,
<code>output/cohorts.json</code>, <code>output/attribution.json</code>,
<code>output/permutation_importance.csv</code>. Snapshots are git-ignored because they contain
athlete names and contact details.</footer>
</main></body></html>
"""
    )
    return "".join(parts)


def render_links() -> str:
    files = sorted(INTERACTIVE.glob("*.html"))
    if not files:
        return "No interactive figures were generated (install <code>plotly</code>)."
    return "".join(
        f'<a href="interactive/{path.name}">{html.escape(path.stem.replace("_", " "))}</a>'
        for path in files
    )


def write_findings() -> None:
    metrics = load_json("metrics.json")
    cohorts = load_json("cohorts.json")
    results = metrics.get("results", {})
    in_sample, holdout = results.get("in_sample", {}), results.get("holdout", {})
    floor = results.get("global_mean", {})
    live = cohorts.get("readiness_link", {})

    text = f"""# Model lab - findings

Companion to `model-lab/output/report.html`. Numbers regenerate with `python run_all.py`.

## 1. The reported accuracy is training error

| Regime | MAE (RPE) | R2 |
| --- | --- | --- |
| In-sample (what the bundle stores) | {in_sample.get('mae', 0):.3f} | {in_sample.get('r2', 0):.3f} |
| Time-series CV, 7-row gap | {results.get('cv_gap_samples', {}).get('mae', 0):.3f} | {results.get('cv_gap_samples', {}).get('r2', 0):.3f} |
| Time-series CV, 7-day embargo | {results.get('cv_embargo', {}).get('mae', 0):.3f} | {results.get('cv_embargo', {}).get('r2', 0):.3f} |
| Held-out final 20% | {holdout.get('mae', 0):.3f} | {holdout.get('r2', 0):.3f} |
| Club-mean floor | {floor.get('mae', 0):.3f} | {floor.get('r2', 0):.3f} |

`train.py` fits and scores on the same matrix. The honest error is roughly
{holdout.get('mae', 0) / max(in_sample.get('mae', 1e-9), 1e-9):.0f}x the stored figure, and the model's
advantage over the club mean is {floor.get('mae', 0) - holdout.get('mae', 0):.2f} RPE.

## 2. One target is modelled, five are hand-written

`next_workout_rpe` is the only trained target. Focus, intensity, recovery, confidence,
injury risk and progression come from thresholds in `inference_worker.py`
(`_determine_focus`, `_estimate_injury_risk`, `_estimate_progression_adjustment`, ...).

## 3. The dominant feature does not replicate

Readiness composite vs next effort: **{live.get('training_correlation', 0):+.2f}** in
`train_data.csv` ({live.get('training_rows', 0):,} rows), **{live.get('correlation', 0):+.2f}** in the dev
database ({live.get('pairs', 0)} check-in/session pairs). The model leans on an effect the
database does not show.

## 4. ACWR is mis-scaled and mostly inert

`workload.py` computes `acute_7d / chronic_28d`, which is ~0.25 for steady training, while
the rules test 0.8 / 1.3 / 1.5. Median on the dev database: {cohorts.get('acwr', {}).get('shipped_median', 0):.2f}.
**{cohorts.get('quiet_day_share', 0) * 100:.0f}%** of athlete-days are under the eight-session guard, so the
load-dependent branches never fire.

## 5. Constants in the model contract

`base_fitness_score` = 75 for every athlete (all club percentiles return 50);
`training_age` = 0.033 years (the age of the database row). Nine of 31 inputs are identical
across the sampled squad.

## 6. Cold-start recommendations look like model output

{cohorts.get('labels', {}).get('competitions', 0)} competitions, {cohorts.get('labels', {}).get('results', 0)} results,
{cohorts.get('labels', {}).get('median_results_per_athlete', 0):.0f} per athlete. In the stored
recommendations, a large share are tagged `rules-cold-start-v1` - the fallback path - and still
carry a confidence value.

## 7. Consequence for the readiness predictor

The label does not exist yet. See `competition-readiness-predictor.md` for the phased plan.
"""
    (DOCS_OUT / "findings.md").write_text(text, encoding="utf-8")


def write_readme() -> None:
    text = """# model-lab

A read-only analysis of the STMS recommendation engine. It exists to answer *why* the engine
recommends what it recommends, and to test whether the accuracy it reports survives an honest
evaluation. It is not part of the application: nothing here is imported by the backend,
frontend or the inference worker.

## Run it

```bash
cd managementsystem/model-lab
python -m venv .venv
.venv\\Scripts\\activate        # or: source .venv/bin/activate
pip install -r requirements.txt
python run_all.py
```

Then open `output/report.html`, or read `Docs/AgentsDocumentation/model-lab/findings.md`.

Needs `feature_engineering/config.local.yaml` or `MONGO_URI` pointing at the dev database,
and `npm run db:seed:history` to have been run at least once. The lab only reads.

## Stages

| Script | Question |
| --- | --- |
| `lab/00_snapshot.py` | What is in the database, and what does the pipeline emit for real athletes? |
| `lab/10_dataset.py` | What is the model being asked to learn? |
| `lab/20_honest_eval.py` | Does R2 = 0.987 survive a held-out split? |
| `lab/30_attribution.py` | Which inputs move the prediction, and in what shape? |
| `lab/40_decision_path.py` | Where does the model stop and the hand-written rules begin? |
| `lab/50_cohorts.py` | Does the behaviour hold up athlete by athlete? |
| `lab/60_readiness_brief.py` | What would a competition-readiness predictor need? |
| `lab/70_report.py` | Assemble the report and the written findings. |

`python run_all.py --from 30` re-runs from a given stage. `data/` and `output/figures/` are
regenerated; `data/` is git-ignored because it contains athlete names and emails.

## Ground rules

- **Read-only.** No writes to MongoDB, no calls into Redis, no changes to app code.
- **Nothing is duplicated.** The lab imports the real feature pipeline and calls the real
  heuristic functions, so it cannot drift from production.
- **Honest labels.** Every figure is either measured or arithmetic. Where something is a
  generated dataset rather than real history, it says so.
"""
    (DOCS_OUT / "README.md").write_text(text, encoding="utf-8")


def main() -> None:
    banner("70 - report")
    text = build()
    target = OUTPUT / "report.html"
    target.write_text(text, encoding="utf-8")
    print(f"  wrote   output/report.html ({len(text) // 1024} KB, {len(figures())} figures)")

    write_findings()
    print("  wrote   Docs/AgentsDocumentation/model-lab/findings.md")
    write_readme()
    print("  wrote   Docs/AgentsDocumentation/model-lab/README.md")
    print("\n  ok")


if __name__ == "__main__":
    main()
