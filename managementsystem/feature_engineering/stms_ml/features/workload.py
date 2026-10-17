"""
Workload Features - Acute:Chronic Workload Ratio, Training Load, etc.
Based on Gabbett's ACWR model and Banister's TRIMP.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class WorkloadFeatures(BaseFeatureExtractor):
    """
    Extract training workload features:
    - Acute workload (7-day)
    - Chronic workload (28-day)
    - ACWR (Acute:Chronic Workload Ratio)
    - Session RPE load
    - Monotony, Strain
    - Load progression rates
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.acute_window = self.config.get("windows", {}).get("acute", 7)
        self.chronic_window = self.config.get("windows", {}).get("chronic", 28)
        self.subacute_window = self.config.get("windows", {}).get("subacute", 28)

    def extract(self) -> Dict[str, Any]:
        features = {}

        # Get workout logs with RPE
        logs = self._get_workout_logs()

        if not logs:
            return self._empty_features()

        # Calculate daily loads
        daily_loads = self._calculate_daily_loads(logs)

        # Acute (7-day) workload
        acute_load = self._rolling_sum(daily_loads, self.acute_window)
        features["acute_workload"] = acute_load

        # Chronic (28-day) workload
        chronic_load = self._rolling_sum(daily_loads, self.chronic_window)
        features["chronic_workload"] = chronic_load

        # ACWR
        features["acwr"] = self._safe_divide(acute_load, chronic_load, default=1.0)

        # Sub-acute (28-day) for comparison
        subacute_load = self._rolling_sum(daily_loads, self.subacute_window)
        features["subacute_workload"] = subacute_load
        features["acwr_subacute"] = self._safe_divide(acute_load, subacute_load, default=1.0)

        # Monotony (daily load variability)
        recent_loads = list(daily_loads.values())[-self.acute_window:]
        if recent_loads:
            features["load_monotony"] = np.mean(recent_loads) / (np.std(recent_loads) + 1e-6)
            features["load_strain"] = features["load_monotony"] * acute_load
        else:
            features["load_monotony"] = 0.0
            features["load_strain"] = 0.0

        # Weekly progression rate
        features["weekly_load_change_pct"] = self._weekly_progression(daily_loads)

        # Session-level features
        recent_logs = [log for log in logs if log.get("completedAt") and
                       (self.as_of - log["completedAt"]).days <= self.acute_window]

        if recent_logs:
            rpe_values = [log.get("perceivedEffort") for log in recent_logs if log.get("perceivedEffort")]
            duration_values = [log.get("durationMinutes") for log in recent_logs if log.get("durationMinutes")]

            features["avg_session_rpe"] = np.mean(rpe_values) if rpe_values else 0
            features["max_session_rpe"] = np.max(rpe_values) if rpe_values else 0
            features["avg_session_duration"] = np.mean(duration_values) if duration_values else 0
            features["total_sessions_week"] = len(recent_logs)
            features["high_rpe_sessions"] = sum(1 for r in rpe_values if r >= 8)
            features["very_high_rpe_sessions"] = sum(1 for r in rpe_values if r >= 9)

        # Load distribution by workout type
        features.update(self._load_by_type(logs))

        # TRIMP approximation (session RPE * duration)
        features["trimp_7d"] = self._calculate_trimp(logs, 7)
        features["trimp_28d"] = self._calculate_trimp(logs, 28)

        return features

    def _get_workout_logs(self) -> List[Dict[str, Any]]:
        """Fetch workout logs for the athlete."""
        collection = self._get_collection("workout_logs")
        cutoff = self.as_of - timedelta(days=self.chronic_window * 2)

        logs = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "completedAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("completedAt", 1))

        return logs

    def _calculate_daily_loads(self, logs: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate daily training load (session RPE * duration)."""
        daily = {}
        for log in logs:
            completed_at = log.get("completedAt")
            if not completed_at:
                continue
            date_key = completed_at.date().isoformat()
            rpe = log.get("perceivedEffort", 5) or 5
            duration = log.get("durationMinutes", 60) or 60
            load = rpe * duration
            daily[date_key] = daily.get(date_key, 0) + load
        return daily

    def _rolling_sum(self, daily_loads: Dict[str, float], window_days: int) -> float:
        """Sum of loads in the last N days."""
        cutoff = (self.as_of - timedelta(days=window_days)).date().isoformat()
        return sum(load for date, load in daily_loads.items() if date >= cutoff)

    def _weekly_progression(self, daily_loads: Dict[str, float]) -> float:
        """Week-over-week load change percentage."""
        this_week = self._rolling_sum(daily_loads, 7)
        last_week = self._rolling_sum(daily_loads, 14) - this_week
        return self._safe_divide(this_week - last_week, last_week, default=0.0) * 100

    def _load_by_type(self, logs: List[Dict[str, Any]]) -> Dict[str, float]:
        """Load distribution by workout tags/type."""
        # This would require joining with workouts collection to get tags
        # For now, return placeholder structure
        return {
            "load_strength_pct": 0.0,
            "load_endurance_pct": 0.0,
            "load_speed_pct": 0.0,
            "load_technical_pct": 0.0,
            "load_recovery_pct": 0.0,
        }

    def _calculate_trimp(self, logs: List[Dict[str, Any]], days: int) -> float:
        """Calculate TRIMP (Training Impulse) for given window."""
        cutoff = self.as_of - timedelta(days=days)
        trimp = 0.0
        for log in logs:
            completed_at = log.get("completedAt")
            if not completed_at or completed_at < cutoff:
                continue
            rpe = log.get("perceivedEffort", 5) or 5
            duration = log.get("durationMinutes", 60) or 60
            # Simplified TRIMP: RPE * duration * intensity factor
            trimp += rpe * duration * 0.1
        return trimp

    def _empty_features(self) -> Dict[str, float]:
        """Return zeros for all workload features."""
        return {
            "acute_workload": 0.0,
            "chronic_workload": 0.0,
            "acwr": 1.0,
            "subacute_workload": 0.0,
            "acwr_subacute": 1.0,
            "load_monotony": 0.0,
            "load_strain": 0.0,
            "weekly_load_change_pct": 0.0,
            "avg_session_rpe": 0.0,
            "max_session_rpe": 0.0,
            "avg_session_duration": 0.0,
            "total_sessions_week": 0,
            "high_rpe_sessions": 0,
            "very_high_rpe_sessions": 0,
            "trimp_7d": 0.0,
            "trimp_28d": 0.0,
            "load_strength_pct": 0.0,
            "load_endurance_pct": 0.0,
            "load_speed_pct": 0.0,
            "load_technical_pct": 0.0,
            "load_recovery_pct": 0.0,
        }