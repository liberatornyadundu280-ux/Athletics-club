#!/usr/bin/env python3
"""
STMS Recommendation Engine Training Script

Usage:
    python train.py --config config.yaml --club-id <club_id> --output-dir models/
    python train.py --synthetic --output-dir models/  # For testing without MongoDB
"""
import argparse
import os
import sys
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features.pipeline import RecommendationFeaturePipeline
from features import (
    WorkloadFeatures, ComplianceFeatures, PerformanceFeatures,
    AttendanceFeatures, InjuryFeatures, FitnessFeatures,
    DemographicsFeatures, EventSpecificFeatures
)


def generate_synthetic_data(n_athletes: int = 100, n_weeks: int = 52) -> pd.DataFrame:
    """Generate synthetic training data for pipeline validation."""
    np.random.seed(42)
    rows = []

    for athlete_idx in range(n_athletes):
        # Athlete demographics
        age = np.random.uniform(16, 30)
        gender = np.random.choice(["male", "female"], p=[0.6, 0.4])
        training_age_weeks = np.random.uniform(4, 260)
        event_group = np.random.choice(["sprints", "middle_distance", "jumps", "throws"])

        # Base ability (latent)
        base_ability = np.random.normal(0, 1)

        for week in range(n_weeks):
            target_date = datetime(2024, 1, 1) + timedelta(weeks=week)

            # Simulate features with realistic correlations
            # Workload
            chronic_load = np.random.gamma(2, 500) + week * 5  # Increases over time
            acute_load = chronic_load * np.random.lognormal(0, 0.2)
            acwr = acute_load / (chronic_load + 1e-6)

            # Compliance
            completion_rate = np.random.beta(8, 2)  # Skewed high
            intensity_adherence = np.random.normal(1.0, 0.15)

            # Performance
            pb_count = np.random.poisson(week / 20)
            latest_result = base_ability * 10 + np.random.normal(0, 2) - week * 0.05  # Improves over time

            # Attendance
            attendance_rate = np.random.beta(15, 3)

            # Injury
            has_injury = np.random.binomial(1, 0.05)
            injury_severity = np.random.choice([0, 1, 2, 3], p=[0.7, 0.15, 0.1, 0.05]) if has_injury else 0

            # Fitness
            fitness_score = base_ability + week * 0.01 + np.random.normal(0, 0.1)

            # Target: next week RPE (simulated)
            # Higher load -> higher RPE, injury -> lower RPE, better fitness -> lower RPE for same load
            next_rpe = (
                5.0
                + 0.5 * (acwr - 1.0)
                + 0.3 * (1 - completion_rate)
                + 0.4 * injury_severity
                - 0.2 * fitness_score
                + np.random.normal(0, 0.5)
            )
            next_rpe = np.clip(next_rpe, 1, 10)

            row = {
                "athlete_id": f"ath_{athlete_idx}",
                "target_date": target_date,
                "age_years": age,
                "gender_male": 1 if gender == "male" else 0,
                "training_age_weeks": training_age_weeks + week,
                "event_group_sprints": 1 if event_group == "sprints" else 0,
                "event_group_middle_distance": 1 if event_group == "middle_distance" else 0,
                "event_group_jumps": 1 if event_group == "jumps" else 0,
                "event_group_throws": 1 if event_group == "throws" else 0,
                "acute_workload": acute_load,
                "chronic_workload": chronic_load,
                "acwr": acwr,
                "completion_rate": completion_rate,
                "intensity_adherence_mean": intensity_adherence,
                "attendance_rate": attendance_rate,
                "active_injury_count": has_injury,
                "active_injury_max_severity": injury_severity,
                "fitness_category_speed_avg": fitness_score,
                "total_pbs": pb_count,
                "next_workout_rpe": next_rpe,  # Target
            }
            rows.append(row)

    return pd.DataFrame(rows)


def prepare_features_targets(df: pd.DataFrame, target_col: str = "next_workout_rpe"):
    """Split features and target, handle missing values."""
    # Drop non-feature columns
    drop_cols = ["athlete_id", "target_date", target_col]
    X = df.drop(columns=[c for c in drop_cols if c in df.columns])
    y = df[target_col] if target_col in df.columns else None

    # Handle missing values
    X = X.fillna(X.median())

    # Ensure numeric
    X = X.select_dtypes(include=[np.number])

    return X, y


def train_model(
    X: pd.DataFrame,
    y: pd.Series,
    model_type: str = "xgboost",
    params: Optional[Dict] = None,
) -> Any:
    """Train XGBoost or LightGBM model."""
    if model_type == "xgboost":
        default_params = {
            "n_estimators": 500,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "n_jobs": -1,
            "objective": "reg:squarederror",
        }
        if params:
            default_params.update(params)

        model = xgb.XGBRegressor(**default_params)
        model.fit(X, y, eval_set=[(X, y)], verbose=False)
        return model

    else:
        raise ValueError(f"Unsupported model type: {model_type}")


def evaluate_model(model, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
    """Evaluate model performance."""
    preds = model.predict(X)
    return {
        "rmse": np.sqrt(mean_squared_error(y, preds)),
        "mae": mean_absolute_error(y, preds),
        "r2": r2_score(y, preds),
    }


def time_series_cv(
    X: pd.DataFrame,
    y: pd.Series,
    n_splits: int = 5,
    gap_days: int = 7,
    model_type: str = "xgboost",
    params: Optional[Dict] = None,
) -> Dict[str, List[float]]:
    """Time series cross-validation."""
    tscv = TimeSeriesSplit(n_splits=n_splits, gap=gap_days)

    cv_scores = {"rmse": [], "mae": [], "r2": []}

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = train_model(X_train, y_train, model_type, params)
        metrics = evaluate_model(model, X_val, y_val)

        for k, v in metrics.items():
            cv_scores[k].append(v)

        print(f"Fold {fold + 1}: RMSE={metrics['rmse']:.4f}, MAE={metrics['mae']:.4f}, R2={metrics['r2']:.4f}")

    # Summary
    for k, v in cv_scores.items():
        print(f"{k.upper()}: {np.mean(v):.4f} (+/- {np.std(v):.4f})")

    return cv_scores


def train_with_real_data(
    pipeline: RecommendationFeaturePipeline,
    club_id: str,
    start_date: datetime,
    end_date: datetime,
    target_col: str = "next_workout_rpe",
) -> pd.DataFrame:
    """Extract features from real MongoDB data."""
    print(f"Building training dataset from {start_date} to {end_date}...")

    athlete_ids = pipeline.get_active_athletes(club_id)
    print(f"Found {len(athlete_ids)} active athletes")

    # Label generator: next week's average RPE
    def label_generator(target_date: datetime, athlete_id: str) -> Dict[str, float]:
        next_week = target_date + timedelta(days=7)
        # Query workout logs for next week
        logs = pipeline.db.workout_logs.find({
            "clubId": ObjectId(club_id),
            "athleteId": ObjectId(athlete_id),
            "completedAt": {"$gte": target_date, "$lt": next_week},
        })
        rpe_values = [log.get("perceivedEffort") for log in logs if log.get("perceivedEffort")]
        if rpe_values:
            return {target_col: np.mean(rpe_values)}
        return {}

    df = pipeline.build_training_dataset(
        club_id=club_id,
        athlete_ids=athlete_ids,
        start_date=start_date,
        end_date=end_date,
        frequency_days=7,
        label_generator=label_generator,
    )

    return df


def main():
    parser = argparse.ArgumentParser(description="Train STMS recommendation model")
    parser.add_argument("--config", default="config.yaml", help="Config file path")
    parser.add_argument("--club-id", help="Club ID for real data training")
    parser.add_argument("--start-date", help="Training start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="Training end date (YYYY-MM-DD)")
    parser.add_argument("--output-dir", default="models/", help="Output directory for model artifacts")
    parser.add_argument("--model-type", default="xgboost", choices=["xgboost"], help="Model type")
    parser.add_argument("--target", default="next_workout_rpe", help="Target variable")
    parser.add_argument("--synthetic", action="store_true", help="Use synthetic data for testing")
    parser.add_argument("--cv", action="store_true", help="Run cross-validation")
    parser.add_argument("--mongo-uri", default="mongodb://localhost:27017", help="MongoDB URI")
    parser.add_argument("--database", default="stms", help="Database name")

    args = parser.parse_args()

    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    if args.synthetic:
        print("Generating synthetic training data...")
        df = generate_synthetic_data(n_athletes=200, n_weeks=52)
        print(f"Generated {len(df)} samples")

    else:
        if not args.club_id:
            parser.error("--club-id required for real data training")

        with RecommendationFeaturePipeline(args.mongo_uri, args.database, args.config) as pipeline:
            start = datetime.fromisoformat(args.start_date) if args.start_date else datetime.utcnow() - timedelta(weeks=26)
            end = datetime.fromisoformat(args.end_date) if args.end_date else datetime.utcnow()

            df = train_with_real_data(pipeline, args.club_id, start, end, args.target)

            if len(df) == 0:
                print("No training data extracted. Falling back to synthetic data.")
                df = generate_synthetic_data()

    # Prepare features and target
    X, y = prepare_features_targets(df, args.target)

    print(f"Feature matrix shape: {X.shape}")
    print(f"Target range: {y.min():.2f} - {y.max():.2f}")

    # Cross-validation
    if args.cv:
        print("\nRunning time series cross-validation...")
        time_series_cv(X, y, n_splits=5, model_type=args.model_type)

    # Train final model on all data
    print("\nTraining final model...")
    model = train_model(X, y, args.model_type)

    # Evaluate on training set (for reference)
    train_metrics = evaluate_model(model, X, y)
    print(f"Training metrics: RMSE={train_metrics['rmse']:.4f}, MAE={train_metrics['mae']:.4f}, R2={train_metrics['r2']:.4f}")

    # Feature importance
    if hasattr(model, "feature_importances_"):
        importance = pd.DataFrame({
            "feature": X.columns,
            "importance": model.feature_importances_
        }).sort_values("importance", ascending=False)
        print("\nTop 20 features:")
        print(importance.head(20).to_string(index=False))

        # Save feature importance
        importance.to_csv(os.path.join(args.output_dir, "feature_importance.csv"), index=False)

    # Save model
    model_path = os.path.join(args.output_dir, f"model_{args.target}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pkl")
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": model,
            "feature_names": list(X.columns),
            "target": args.target,
            "model_type": args.model_type,
            "trained_at": datetime.utcnow().isoformat(),
            "metrics": train_metrics,
        }, f)

    print(f"\nModel saved to {model_path}")

    # Save scaler for inference
    scaler = StandardScaler()
    scaler.fit(X)
    scaler_path = os.path.join(args.output_dir, "scaler.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved to {scaler_path}")


if __name__ == "__main__":
    main()