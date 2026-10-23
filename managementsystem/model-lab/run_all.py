"""Run every stage of the model lab in order.

    python run_all.py              # everything
    python run_all.py --from 30    # attribution onwards
    python run_all.py --only 20    # a single stage
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

LAB = Path(__file__).resolve().parent
STAGES = [
    "00_snapshot.py",
    "10_dataset.py",
    "20_honest_eval.py",
    "30_attribution.py",
    "40_decision_path.py",
    "50_cohorts.py",
    "60_readiness_brief.py",
    "70_report.py",
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the STMS model lab")
    parser.add_argument("--from", dest="start", help="stage prefix to start from, e.g. 20")
    parser.add_argument("--only", help="run only the stage with this prefix, e.g. 40")
    args = parser.parse_args()

    selected = STAGES
    if args.only:
        selected = [stage for stage in STAGES if stage.startswith(args.only)]
    elif args.start:
        prefixes = [stage[:2] for stage in STAGES]
        if args.start[:2] not in prefixes:
            parser.error(f"unknown stage {args.start!r}; choose from {', '.join(prefixes)}")
        selected = STAGES[prefixes.index(args.start[:2]):]

    if not selected:
        parser.error("no stages matched")

    environment = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    started = time.time()

    for stage in selected:
        print("")
        print(f">>> {stage}")
        stage_started = time.time()
        result = subprocess.run([sys.executable, str(LAB / "lab" / stage)], env=environment)
        if result.returncode != 0:
            print(f"\n!!! {stage} failed (exit {result.returncode})")
            return result.returncode
        print(f"<<< {stage} ok in {time.time() - stage_started:.1f}s")

    print("")
    print(f"finished {len(selected)} stage(s) in {time.time() - started:.1f}s")
    print(f"open     {LAB / 'output' / 'report.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
