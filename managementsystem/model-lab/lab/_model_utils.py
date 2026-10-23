"""Small shared helpers for the stages that touch the model itself."""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

TARGET_COLUMN = "target_next_workout_rpe"

# Exactly the hyper-parameters baked into train.py, so "in-sample" numbers reproduce
# the shipped bundle instead of describing a different model.
PARAMS = {
    "n_estimators": 500,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "n_jobs": -1,
    "objective": "reg:squarederror",
}


def build_matrix(frame: pd.DataFrame, feature_names: List[str]) -> Tuple[pd.DataFrame, pd.Series, Dict]:
    """Rebuild the training matrix exactly as train.py does, then align to the bundle."""
    droppable = [
        column
        for column in frame.columns
        if column.startswith("target_") or column in {"athlete_id", "club_id", "date"}
    ]
    encoded = pd.get_dummies(frame.drop(columns=droppable), dtype=float)
    encoded = encoded.fillna(encoded.median())

    missing = [name for name in feature_names if name not in encoded.columns]
    unused = [name for name in encoded.columns if name not in feature_names]
    matrix = encoded.reindex(columns=feature_names, fill_value=0.0)

    return matrix, frame[TARGET_COLUMN].astype(float), {
        "columns_built": len(encoded.columns),
        "columns_expected": len(feature_names),
        "missing_from_matrix": missing,
        "unused_from_matrix": unused,
    }


def fit(X: pd.DataFrame, y: pd.Series):
    model = xgb.XGBRegressor(**PARAMS)
    model.fit(X, y, verbose=False)
    return model


def metrics(y_true, y_pred) -> Dict[str, float]:
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
    }


def holdout_split(length: int, fraction: float = 0.20) -> Tuple[slice, slice]:
    split = int(length * (1 - fraction))
    return slice(0, split), slice(split, length)


def contributions(model, X: pd.DataFrame) -> np.ndarray:
    """Exact SHAP values straight from the booster - no extra dependency needed.

    The returned matrix has one extra column: the base value, so that
    base + contributions.sum(axis=1) equals the prediction.
    """
    booster = model.get_booster()
    frame = xgb.DMatrix(X, feature_names=booster.feature_names)
    return booster.predict(frame, pred_contribs=True)
