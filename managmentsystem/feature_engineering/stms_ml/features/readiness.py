"""
Readiness Features - Daily subjective readiness + sRPE training load
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class ReadinessFeatures(BaseFeatureExtractor):
    """
    Extract daily readiness and training load features:
    - 7/14/28-day rolling averages for soreness, sleep, stress
    - Readiness composite score
    - sRPE training load (acute/chronic/ACWR)
    - Trends (soreness increasing?)
    - High soreness days count
    - Readiness compliance (submission rate)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.windows = {
            'acute': self.config.get('windows', {}).get('acute', 7),
            'subacute': self.config.get('windows', {}).get('subacute', 14),
            'chronic': self.config.get('windows', {}).get('chronic', 28),
        }

    def extract(self) -> Dict[str, Any]:
        features = {}

        readiness = self._get_readiness()
        workout_logs = self._get_workout_logs()

        if not readiness and not workout_logs:
            return self._empty_features()

        # Daily readiness metrics
        features.update(self._readiness_metrics(readiness))

        # sRPE training load from workout logs
        features.update(self._srpe_load_features(workout_logs))

        # Combined readiness score
        features.update(self._composite_readiness(readiness, workout_logs))

        return features

    def _get_readiness(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("daily_readiness")
        cutoff = self.as_of - timedelta(days=self.windows['chronic'] * 2)

        readiness = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$gte": cutoff.strftime("%Y-%m-%d"), "$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

        return readiness

    def _get_workout_logs(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("workout_logs")
        cutoff = self.as_of - timedelta(days=self.windows['chronic'] * 2)

        logs = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "completedAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("completedAt", 1))

        return logs

    def _readiness_metrics(self, readiness: List[Dict]) -> Dict[str, Any]:
        if not readiness:
            return self._empty_readiness()

        features = {}
        dates = [r["date"] for r in readiness]
        soreness = [r.get("soreness", 3) for r in readiness]
        sleep = [r.get("sleepQuality", 3) for r in readiness]
        stress = [r.get("stressEnergy", 3) for r in readiness]

        # Rolling windows
        for window_name, window_days in self.windows.items():
            cutoff = (self.as_of - timedelta(days=window_days)).strftime("%Y-%m-%d")
            window_data = [r for r in readiness if r["date"] >= cutoff]

            if window_data:
                w_soreness = [r.get("soreness", 3) for r in window_data]
                w_sleep = [r.get("sleepQuality", 3) for r in window_data]
                w_stress = [r.get("stressEnergy", 3) for r in window_data]

                features[f"readiness_soreness_{window_name}_avg"] = float(np.mean(w_soreness))
                features[f"readiness_sleep_{window_name}_avg"] = float(np.mean(w_sleep))
                features[f"readiness_stress_{window_name}_avg"] = float(np.mean(w_stress))
                features[f"readiness_submissions_{window_name}d"] = len(window_data)
            else:
                features[f"readiness_soreness_{window_name}_avg"] = 3.0
                features[f"readiness_sleep_{window_name}_avg"] = 3.0
                features[f"readiness_stress_{window_name}_avg"] = 3.0
                features[f"readiness_submissions_{window_name}d"] = 0

        # Trends (linear slope over chronic window)
        if len(soreness) >= 3:
            x = np.arange(len(soreness))
            features["readiness_soreness_trend"] = float(np.polyfit(x, soreness, 1)[0])
            features["readiness_sleep_trend"] = float(np.polyfit(x, sleep, 1)[0])
            features["readiness_stress_trend"] = float(np.polyfit(x, stress, 1)[0])
        else:
            features["readiness_soreness_trend"] = 0.0
            features["readiness_sleep_trend"] = 0.0
            features["readiness_stress_trend"] = 0.0

        # High soreness days (>= 4)
        features["high_soreness_days_7d"] = sum(1 for r in readiness[-7:] if r.get("soreness", 3) >= 4)
        features["high_soreness_days_28d"] = sum(1 for r in readiness if r.get("soreness", 3) >= 4)

        # Latest values
        latest = readiness[-1]
        features["readiness_latest_soreness"] = latest.get("soreness", 3)
        features["readiness_latest_sleep"] = latest.get("sleepQuality", 3)
        features["readiness_latest_stress"] = latest.get("stressEnergy", 3)
        features["readiness_latest_date"] = latest.get("date", "")
        features["days_since_readiness"] = (self.as_of - datetime.fromisoformat(latest["date"])).days if latest.get("date") else 999

        # Submission compliance (percentage of days with entry in last 28 days)
        expected_days = self.windows['chronic']
        features["readiness_compliance_28d"] = len(readiness) / expected_days if expected_days > 0 else 0.0

        return features

    def _srpe_load_features(self, logs: List[Dict]) -> Dict[str, Any]:
        """Calculate sRPE training load features."""
        if not logs:
            return {
                "srpe_load_acute": 0.0,
                "srpe_load_chronic": 0.0,
                "srpe_acwr": 1.0,
                "srpe_load_subacute": 0.0,
                "srpe_acwr_subacute": 1.0,
                "avg_session_srpe": 0.0,
                "total_sessions_week": 0,
            }

        # Calculate daily sRPE load
        daily_loads = {}
        for log in logs:
            completed_at = log.get("completedAt")
            if not completed_at:
                continue
            date_key = completed_at.date().isoformat()
            rpe = log.get("perceivedEffort", 5) or 5
            duration = log.get("durationMinutes", 60) or 60
            load = rpe * duration  # sRPE method
            daily_loads[date_key] = daily_loads.get(date_key, 0) + load

        # Rolling sums
        acute_load = self._rolling_load_sum(daily_loads, self.windows['acute'])
        chronic_load = self._rolling_load_sum(daily_loads, self.windows['chronic'])
        subacute_load = self._rolling_load_sum(daily_loads, self.windows['subacute'])

        features = {
            "srpe_load_acute": float(acute_load),
            "srpe_load_chronic": float(chronic_load),
            "srpe_acwr": float(self._safe_divide(acute_load, chronic_load, default=1.0)),
            "srpe_load_subacute": float(subacute_load),
            "srpe_acwr_subacute": float(self._safe_divide(acute_load, subacute_load, default=1.0)),
        }

        # Recent session metrics
        recent_cutoff = self.as_of - timedelta(days=self.windows['acute'])
        recent_logs = [log for log in logs if log.get("completedAt") and log["completedAt"] >= recent_cutoff]

        if recent_logs:
            rpe_values = [log.get("perceivedEffort") for log in recent_logs if log.get("perceivedEffort")]
            features["avg_session_srpe"] = float(np.mean(rpe_values)) if rpe_values else 0.0
            features["max_session_srpe"] = float(np.max(rpe_values)) if rpe_values else 0.0
            features["total_sessions_week"] = len(recent_logs)
            features["high_srpe_sessions_7d"] = sum(1 for r in rpe_values if r >= 8)
        else:
            features["avg_session_srpe"] = 0.0
            features["max_session_srpe"] = 0.0
            features["total_sessions_week"] = 0
            features["high_srpe_sessions_7d"] = 0

        return features

    def _rolling_load_sum(self, daily_loads: Dict[str, float], window_days: int) -> float:
        cutoff = (self.as_of - timedelta(days=window_days)).date().isoformat()
        return sum(load for date, load in daily_loads.items() if date >= cutoff)

    def _composite_readiness(self, readiness: List[Dict], logs: List[Dict]) -> Dict[str, Any]:
        """Calculate composite readiness score (0-1, higher = more ready)."""
        # Base score from subjective metrics
        if readiness:
            latest = readiness[-1]
            soreness = latest.get("soreness", 3)      # 1-5, lower better
            sleep = latest.get("sleepQuality", 3)     # 1-5, higher better
            stress = latest.get("stressEnergy", 3)    # 1-5, higher better

            # Normalize to 0-1 (invert soreness)
            soreness_norm = (5 - soreness) / 4
            sleep_norm = (sleep - 1) / 4
            stress_norm = (stress - 1) / 4

            subjective_score = (soreness_norm + sleep_norm + stress_norm) / 3
        else:
            subjective_score = 0.5

        # Load factor (penalize high ACWR)
        srpe_features = self._srpe_load_features(logs)
        acwr = srpe_features.get("srpe_acwr", 1.0)
        # Optimal ACWR ~0.8-1.3, penalize outside
        if 0.8 <= acwr <= 1.3:
            load_factor = 1.0
        elif acwr < 0.8:
            load_factor = 0.7 + 0.3 * (acwr / 0.8)  # undertraining
        else:
            load_factor = max(0.4, 1.0 - 0.3 * (acwr - 1.3))  # overtraining

        # Compliance factor
        compliance = 1.0
        if readiness:
            expected = self.windows['chronic']
            actual = len(readiness)
            compliance = min(1.0, actual / expected)

        composite = subjective_score * 0.5 + load_factor * 0.3 + compliance * 0.2

        return {
            "readiness_score": float(np.clip(composite, 0.0, 1.0)),
            "readiness_subjective": float(subjective_score),
            "readiness_load_factor": float(load_factor),
            "readiness_compliance_factor": float(compliance),
        }

    def _empty_readiness(self) -> Dict[str, Any]:
        return {
            "readiness_soreness_acute_avg": 3.0,
            "readiness_sleep_acute_avg": 3.0,
            "readiness_stress_acute_avg": 3.0,
            "readiness_submissions_7d": 0,
            "readiness_soreness_subacute_avg": 3.0,
            "readiness_sleep_subacute_avg": 3.0,
            "readiness_stress_subacute_avg": 3.0,
            "readiness_submissions_14d": 0,
            "readiness_soreness_chronic_avg": 3.0,
            "readiness_sleep_chronic_avg": 3.0,
            "readiness_stress_chronic_avg": 3.0,
            "readiness_submissions_28d": 0,
            "readiness_soreness_trend": 0.0,
            "readiness_sleep_trend": 0.0,
            "readiness_stress_trend": 0.0,
            "high_soreness_days_7d": 0,
            "high_soreness_days_28d": 0,
            "readiness_latest_soreness": 3,
            "readiness_latest_sleep": 3,
            "readiness_latest_stress": 3,
            "readiness_latest_date": "",
            "days_since_readiness": 999,
            "readiness_compliance_28d": 0.0,
        }

    def _empty_features(self) -> Dict[str, Any]:
        features = self._empty_readiness()
        features.update({
            "srpe_load_acute": 0.0,
            "srpe_load_chronic": 0.0,
            "srpe_acwr": 1.0,
            "srpe_load_subacute": 0.0,
            "srpe_acwr_subacute": 1.0,
            "avg_session_srpe": 0.0,
            "max_session_srpe": 0.0,
            "total_sessions_week": 0,
            "high_srpe_sessions_7d": 0,
            "readiness_score": 0.5,
            "readiness_subjective": 0.5,
            "readiness_load_factor": 1.0,
            "readiness_compliance_factor": 0.0,
        })
        return features