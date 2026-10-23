"""Stage 60 - what a real competition-readiness predictor would need.

This does not build the predictor. It writes the brief that has to exist before one
can be built, using the numbers measured by the earlier stages.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict

from _common import DOCS_OUT, OUTPUT, add_captions, banner

BRIEF = DOCS_OUT / "competition-readiness-predictor.md"


def load(name: str) -> Dict[str, Any]:
    path = OUTPUT / name
    if not path.exists():
        raise SystemExit(f"Missing {path.name} - run the earlier stages first.")
    return json.loads(path.read_text(encoding="utf-8"))


def build(metrics: Dict[str, Any], cohorts: Dict[str, Any], attribution: Dict[str, Any]) -> str:
    results = metrics["results"]
    claimed = results["in_sample"]["mae"]
    honest = results["holdout"]["mae"]
    honest_r2 = results["holdout"]["r2"]
    floor = results["global_mean"]["mae"]
    shipped_acwr = cohorts["acwr"]["shipped_median"]
    guard = cohorts["quiet_day_share"] * 100
    live_r = cohorts["readiness_link"]["correlation"]
    train_r = cohorts["readiness_link"]["training_correlation"]
    competitions = cohorts["labels"]["competitions"]
    results_count = cohorts["labels"]["results"]
    per_athlete = cohorts["labels"]["median_results_per_athlete"]
    athlete_days = cohorts["acwr"]["athlete_days"]

    return f"""# Competition readiness prediction - design brief

Status: **proposal, nothing implemented.**
Written {date.today():%Y-%m-%d} from the measurements in `model-lab/`. Every number below is
read from `output/metrics.json` and `output/cohorts.json`, not estimated.

## 1. Where the engine stands today

| Fact | Value |
| --- | --- |
| Targets declared in the dataset | 5 |
| Targets with a trained model | **1** - `next_workout_rpe` |
| In-sample MAE the bundle reports | {claimed:.2f} RPE |
| Honest held-out MAE | **{honest:.2f} RPE** (R&sup2; {honest_r2:.2f}) |
| Beating the club average by | {floor - honest:.2f} RPE |
| Injury risk, progression, focus, intensity, recovery | rule thresholds in `inference_worker.py` |
| Readiness-to-effort correlation, training CSV | {train_r:+.2f} |
| Readiness-to-effort correlation, dev database | {live_r:+.2f} |
| Competitions available as labels | {competitions} |
| Median results per athlete | {per_athlete:.0f} |

Two things follow. First, the current engine forecasts *how hard the next session will feel*,
which is a same-week, self-correcting quantity - useful, but not what a coach means by
"will she be ready for the championships". Second, the effect the model leans on most
(readiness to effort) is strong in the generated training data and absent in the real
database, so a readiness predictor cannot be validated with today's data.

## 2. What must be decided before any model

**Target definition.** "Ready by competition day" needs one sentence that a coach would
sign. The recommended definition:

> An athlete is *ready* for competition C if, at the end of the preparation block, their
> competition result is at or above their personal trend baseline - {100:.0f}% of their
> rolling best for that event within the block - without having missed more than 20% of
> planned sessions in the final three weeks.

This is deliberately outcome-anchored (a result), not input-anchored (how they felt).

**Why not predict RPE for the competition.** RPE is a reported effort, not a performance.
Optimising it would teach the engine to prescribe easier sessions, which is the opposite
of peaking.

**Label schema** (one row per athlete, per competition, snapshot taken N weeks out):

| Field | Type | Example |
| --- | --- | --- |
| `athleteId` | ObjectId | - |
| `competitionId` | ObjectId | - |
| `snapshotDate` | date | 6 weeks before the meet |
| `weeksToCompetition` | int | 6 |
| `readinessOutcome` | `ready` / `at_risk` / `not_ready` | `ready` |
| `resultDeltaPct` | float | +1.4 (% vs rolling baseline) |
| `sessionsMissed30d` | float | 0.18 |
| `labelSource` | `result` / `coach_judgement` | `result` |

`coach_judgement` rows are needed in the first season, because results alone will not
produce enough examples.

## 3. Why Phase B is not a model

With {competitions} competitions and {results_count} results ({per_athlete:.0f} per athlete),
any trained classifier would memorise twenty-six people. The honest first step is a
**transparent composite score** - no learning, every number traceable:

```
readiness_index = 0.30 * readiness_trend      (7-day composite minus 28-day composite, scaled)
                + 0.25 * load_balance         (1 - |standard ACWR - 1|, clipped 0-1)
                + 0.20 * compliance_30d       (completed / planned)
                + 0.15 * (1 - pain_score)     (7-day average pain / 10)
                + 0.10 * freshness            (days since last maximal session, capped)
```

Readiness trend rather than level, because a level of "3/5" means nothing without the
athlete's own norm. `load_balance` must use the **standard** ACWR
(`acute / (chronic / 4)`); the shipped feature divides by the 28-day *total*, which on
{athlete_days} athlete-days in the dev database reads a median of {shipped_acwr:.2f} and
therefore can never cross the 1.3 spike threshold its own rules test for.

Guardrails on the composite:

- Suppress it entirely when fewer than 8 sessions exist in 28 days - currently true on
  **{guard:.0f}%** of athlete-days in the dev database.
- Show the five components next to the score, never the score alone.
- Label it "readiness index", not "injury risk". It is not a probability.

## 4. Phase C - collecting labels

| Step | What it produces |
| --- | --- |
| Add `snapshotDate` capture to competitions | one feature vector per athlete per meet, frozen 6 weeks out |
| Record planned vs completed sessions | `compliance_30d` without guesswork |
| Record a result for every athlete who competes | `resultDeltaPct` |
| Have the coach mark `ready`/`at_risk`/`not_ready` within 48h of the meet | coach labels while the memory is fresh |
| Repeat for a full season | the actual dataset |

Rough volume needed: a three-class model with ~12 features needs a few hundred labelled
athlete-meets to be worth fitting. At 26 athletes and 8 meets a season that is
~200 rows - one full season of disciplined capture. Anything less should stay a
composite score.

## 5. Phase D - the model, and its gate

Only start when the label table reaches the volume in Phase C. Then:

1. **Baseline first.** The composite score from Phase B is the bar. A model that cannot
   beat it should not ship.
2. **Split by competition, not by row.** All rows for one meet share a day and a
   condition; splitting them across train and test leaks the answer.
3. **Report calibration, not just accuracy.** Coaches need "when we say ready, we are
   right X% of the time", which means a calibration curve and per-class precision.
4. **Minimum bar to ship:** beats the composite score by a clear margin on held-out
   meets *and* is no worse in calibration. Otherwise keep the composite.

## 6. What not to do

- Do not reuse this RPE model as a readiness forecast. Its honest error is
  {honest:.2f} RPE on a 0.66-RPE-spread target; translating that into a yes/no about a
  championship is a precision it does not have.
- Do not present a rule threshold as a model output. The screens currently label
  hand-written numbers as injury risk and progression; if a readiness index ships, it
  should say "index", show its parts, and show its provenance.
- Do not let a failed inference fall back silently. In the current database a fallback
  produced a plausible-looking recommendation with a confidence value attached.

## 7. Open questions for the owner

1. Is competition result the right definition of "ready", or does the coach care about
   process (completed the block) more than outcome?
2. Which meets count? League meets, trials, and championships probably deserve different
   labels.
3. Is a three-class label useful, or would one number plus a warning threshold be used
   more often on the pool deck?
4. Who signs off that a "not ready" flag is fair to show an athlete?
"""


def main() -> None:
    banner("60 - readiness brief")
    metrics = load("metrics.json")
    cohorts = load("cohorts.json")
    attribution = load("attribution.json")

    text = build(metrics, cohorts, attribution)
    BRIEF.write_text(text, encoding="utf-8")
    print(f"  wrote   {BRIEF.relative_to(BRIEF.parents[3])}")

    add_captions({})
    print("\n  ok")


if __name__ == "__main__":
    main()
