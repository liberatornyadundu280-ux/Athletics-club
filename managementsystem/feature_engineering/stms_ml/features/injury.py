"""
Injury Features - Active injuries, history, risk factors, RTP status
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class InjuryFeatures(BaseFeatureExtractor):
    """
    Extract injury-related features:
    - Active injury count and severity
    - Injury history (count, types, body parts)
    - Days missed due to injury
    - RTP (Return to Play) status
    - Injury risk indicators
    - Wellness trends (pain, fatigue, sleep)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lookback_days = self.config.get("windows", {}).get("season", 180)

    def extract(self) -> Dict[str, Any]:
        features = {}

        injuries = self._get_injuries()
        wellness = self._get_wellness()
        rehab = self._get_rehab()

        if not injuries and not wellness:
            return self._empty_features()

        # Active injuries
        features.update(self._active_injuries(injuries))

        # Injury history
        features.update(self._injury_history(injuries))

        # Days missed
        features.update(self._days_missed(injuries))

        # RTP status
        features.update(self._rtp_status(injuries))

        # Wellness trends
        features.update(self._wellness_trends(wellness))

        # Rehab compliance
        features.update(self._rehab_compliance(rehab))

        # Body part patterns
        features.update(self._body_part_patterns(injuries))

        return features

    def _get_injuries(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("injuries")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        injuries = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "onsetDate": {"$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("onsetDate", -1))

        return injuries

    def _get_wellness(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("injury_wellness")
        cutoff = self.as_of - timedelta(days=28)

        wellness = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$gte": cutoff.strftime("%Y-%m-%d"), "$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

        return wellness

    def _get_rehab(self) -> List[Dict[str, Any]]:
        injuries = self._get_injuries()
        rehab_items = []
        for inj in injuries:
            for task in inj.get("rehabPlan", []):
                task["injury_id"] = inj["_id"]
                task["injury_onset"] = inj.get("onsetDate")
                rehab_items.append(task)
        return rehab_items

    def _active_injuries(self, injuries: List[Dict]) -> Dict[str, Any]:
        active = [i for i in injuries if i.get("status") in ["active", "rehabilitating", "returning"]]

        features = {
            "active_injury_count": len(active),
            "active_injury_max_severity": max((i.get("severity", 1) for i in active), default=0),
            "has_active_injury": len(active) > 0,
        }

        for status in ["active", "rehabilitating", "returning", "resolved"]:
            count = sum(1 for i in injuries if i.get("status") == status)
            features[f"injury_status_{status}_count"] = count

        if active:
            onset_dates = [datetime.fromisoformat(i["onsetDate"]) for i in active if i.get("onsetDate")]
            if onset_dates:
                days_since = [(self.as_of - d).days for d in onset_dates]
                features["active_injury_days_since_onset_min"] = min(days_since)
                features["active_injury_days_since_onset_max"] = max(days_since)
                features["active_injury_days_since_onset_avg"] = np.mean(days_since)

        return features

    def _injury_history(self, injuries: List[Dict]) -> Dict[str, Any]:
        if not injuries:
            return {"total_injuries": 0}

        total = len(injuries)
        resolved = [i for i in injuries if i.get("status") == "resolved"]

        from collections import Counter
        type_counts = Counter(i.get("type", "unknown") for i in injuries)
        body_part_counts = Counter(i.get("bodyPart", "unknown") for i in injuries)
        laterality_counts = Counter(i.get("laterality", "not_applicable") for i in injuries)
        severity_counts = Counter(i.get("severity", 1) for i in injuries)

        features = {
            "total_injuries": total,
            "resolved_injuries": len(resolved),
            "recurrent_injury_rate": self._safe_divide(len(resolved), total),
            "most_common_injury_type": type_counts.most_common(1)[0][0] if type_counts else "none",
            "most_common_body_part": body_part_counts.most_common(1)[0][0] if body_part_counts else "none",
            "bilateral_injuries": laterality_counts.get("bilateral", 0),
            "left_injuries": laterality_counts.get("left", 0),
            "right_injuries": laterality_counts.get("right", 0),
            "avg_severity": np.mean([s * c for s, c in severity_counts.items()]) if severity_counts else 0,
            "max_severity_ever": max(severity_counts.keys()) if severity_counts else 0,
        }

        if injuries:
            first_injury = min(datetime.fromisoformat(i["onsetDate"]) for i in injuries if i.get("onsetDate"))
            years = max(1, (self.as_of - first_injury).days / 365)
            features["injuries_per_year"] = total / years
        else:
            features["injuries_per_year"] = 0

        return features

    def _days_missed(self, injuries: List[Dict]) -> Dict[str, Any]:
        total_estimated_days = 0
        for inj in injuries:
            onset = datetime.fromisoformat(inj["onsetDate"]) if inj.get("onsetDate") else self.as_of
            if inj.get("status") == "resolved" and inj.get("actualReturnDate"):
                return_date = datetime.fromisoformat(inj["actualReturnDate"])
                total_estimated_days += (return_date - onset).days
            elif inj.get("expectedReturnDate"):
                expected = datetime.fromisoformat(inj["expectedReturnDate"])
                total_estimated_days += max(0, (expected - onset).days)
            else:
                total_estimated_days += (self.as_of - onset).days

        return {
            "estimated_days_missed_total": total_estimated_days,
            "estimated_days_missed_per_year": total_estimated_days / max(1, self.lookback_days / 365),
        }

    def _rtp_status(self, injuries: List[Dict]) -> Dict[str, Any]:
        active = [i for i in injuries if i.get("status") in ["active", "rehabilitating", "returning"]]

        features = {
            "in_rtp_protocol": any(i.get("status") in ["rehabilitating", "returning"] for i in injuries),
            "rtp_phase": "none",
            "days_in_current_phase": 0,
            "expected_return_date": None,
        }

        if active:
            latest = active[0]
            features["rtp_phase"] = latest.get("phase", "unknown")
            features["expected_return_date"] = latest.get("expectedReturnDate")

            if latest.get("status") == "rehabilitating":
                features["days_in_current_phase"] = (self.as_of - datetime.fromisoformat(latest["onsetDate"])).days

        return features

    def _wellness_trends(self, wellness: List[Dict]) -> Dict[str, Any]:
        if not wellness:
            return {
                "avg_pain_7d": 0.0,
                "avg_fatigue_7d": 0.0,
                "avg_sleep_7d": 8.0,
                "pain_trend": 0.0,
                "fatigue_trend": 0.0,
            }

        cutoff = self.as_of - timedelta(days=7)
        recent = [w for w in wellness if datetime.fromisoformat(w["date"]) >= cutoff]

        if not recent:
            return {"avg_pain_7d": 0.0, "avg_fatigue_7d": 0.0, "avg_sleep_7d": 8.0, "pain_trend": 0.0, "fatigue_trend": 0.0}

        pain_vals = [w.get("pain", 0) for w in recent]
        fatigue_vals = [w.get("fatigue", 0) for w in recent]
        sleep_vals = [w.get("sleepHours", 8) for w in recent if w.get("sleepHours")]

        features = {
            "avg_pain_7d": np.mean(pain_vals),
            "avg_fatigue_7d": np.mean(fatigue_vals),
            "avg_sleep_7d": np.mean(sleep_vals) if sleep_vals else 8.0,
            "max_pain_7d": max(pain_vals),
            "max_fatigue_7d": max(fatigue_vals),
        }

        if len(pain_vals) >= 3:
            x = np.arange(len(pain_vals))
            features["pain_trend"] = np.polyfit(x, pain_vals, 1)[0]
            features["fatigue_trend"] = np.polyfit(x, fatigue_vals, 1)[0]
        else:
            features["pain_trend"] = 0.0
            features["fatigue_trend"] = 0.0

        return features

    def _rehab_compliance(self, rehab: List[Dict]) -> Dict[str, Any]:
        if not rehab:
            return {"rehab_tasks_total": 0, "rehab_compliance_rate": 0.0}

        total = len(rehab)
        done = sum(1 for t in rehab if t.get("done", False))

        return {
            "rehab_tasks_total": total,
            "rehab_completed": done,
            "rehab_compliance_rate": self._safe_divide(done, total),
        }

    def _body_part_patterns(self, injuries: List[Dict]) -> Dict[str, Any]:
        from collections import Counter

        body_parts = [i.get("bodyPart", "unknown") for i in injuries]
        part_counts = Counter(body_parts)

        features = {}
        for part, count in part_counts.most_common(3):
            features[f"injury_body_part_{part.replace(' ', '_')}_count"] = count

        lower_body = ["knee", "ankle", "hip", "thigh", "calf", "foot", "hamstring", "quadriceps", "achilles"]
        upper_body = ["shoulder", "elbow", "wrist", "hand", "back", "neck", "chest"]

        lower_count = sum(count for part, count in part_counts.items() if any(lb in part.lower() for lb in lower_body))
        upper_count = sum(count for part, count in part_counts.items() if any(ub in part.lower() for ub in upper_body))

        features["injury_lower_body_count"] = lower_count
        features["injury_upper_body_count"] = upper_count
        features["injury_lower_body_ratio"] = self._safe_divide(lower_count, lower_count + upper_count)

        return features

    def _empty_features(self) -> Dict[str, Any]:
        return {
            "active_injury_count": 0,
            "active_injury_max_severity": 0,
            "has_active_injury": False,
            "injury_status_active_count": 0,
            "injury_status_rehabilitating_count": 0,
            "injury_status_returning_count": 0,
            "injury_status_resolved_count": 0,
            "total_injuries": 0,
            "resolved_injuries": 0,
            "recurrent_injury_rate": 0.0,
            "most_common_injury_type": "none",
            "most_common_body_part": "none",
            "bilateral_injuries": 0,
            "left_injuries": 0,
            "right_injuries": 0,
            "avg_severity": 0.0,
            "max_severity_ever": 0,
            "injuries_per_year": 0.0,
            "estimated_days_missed_total": 0,
            "estimated_days_missed_per_year": 0.0,
            "in_rtp_protocol": False,
            "rtp_phase": "none",
            "days_in_current_phase": 0,
            "avg_pain_7d": 0.0,
            "avg_fatigue_7d": 0.0,
            "avg_sleep_7d": 8.0,
            "max_pain_7d": 0,
            "max_fatigue_7d": 0,
            "pain_trend": 0.0,
            "fatigue_trend": 0.0,
            "rehab_tasks_total": 0,
            "rehab_compliance_rate": 0.0,
            "injury_lower_body_count": 0,
            "injury_upper_body_count": 0,
            "injury_lower_body_ratio": 0.0,
        }