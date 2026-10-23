# model-lab

A read-only workbench for understanding the STMS recommendation engine: what it was trained
on, how it turns an athlete into a prescription, and whether the accuracy it reports is real.

It is **not part of the application**. Nothing in this folder is imported by the backend, the
frontend, or the inference worker. It only reads.

## Quick start

```bash
cd managementsystem/model-lab
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate elsewhere
pip install -r requirements.txt
python run_all.py
```

Open `output/report.html`.

Needs database access through `feature_engineering/config.local.yaml` or `MONGO_URI`, and a
seeded dev database (`npm run db:seed:history` from `stms-backend`).

## What it produces

| Output | What it is |
| --- | --- |
| `output/report.html` | Every figure in reading order, with plain-English commentary |
| `output/figures/*.png` | The individual charts |
| `output/interactive/*.html` | One athlete's prediction, split into its per-feature contributions |
| `output/metrics.json`, `cohorts.json`, `attribution.json` | The raw numbers behind the charts |
| `Docs/AgentsDocumentation/model-lab/findings.md` | The findings, in prose |
| `Docs/AgentsDocumentation/model-lab/competition-readiness-predictor.md` | Design brief for the prediction feature |

## Stages

Each stage is standalone and can be re-run alone (`python run_all.py --from 30`).

| Stage | Question it answers |
| --- | --- |
| `00_snapshot.py` | What is in the database, and what does the real pipeline emit for real athletes? |
| `10_dataset.py` | What is the model being asked to learn? Is the file credible? |
| `20_honest_eval.py` | Does the reported R² survive a held-out split, and does it beat two floors? |
| `30_attribution.py` | Which inputs move the prediction, and in what shape? |
| `40_decision_path.py` | Where does the model stop and the hand-written rules begin? |
| `50_cohorts.py` | Does the behaviour hold up athlete by athlete? |
| `60_readiness_brief.py` | What would a competition-readiness predictor actually need? |
| `70_report.py` | Assemble the report and write the findings up |

## Design rules

- **Read-only.** No MongoDB writes, no Redis traffic, no app changes.
- **No duplicated logic.** The lab imports `features.pipeline` and calls the real
  `InferenceWorker` heuristic methods, so the analysis cannot drift from production.
- **Provenance over polish.** Where a figure shows generated data instead of real history,
  the caption says so.
