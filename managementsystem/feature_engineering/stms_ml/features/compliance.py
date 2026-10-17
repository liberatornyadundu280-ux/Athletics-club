"""
Compliance Features - Workout completion rates, adherence, consistency
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class ComplianceFeatures(BaseFeatureExtractor):
    """
    Extract workout compliance/adherence features:
    - Completion rate (assigned vs completed)
    - Adherence to prescribed intensity (RPE vs target)
    - Consistency (streaks, gaps)
    - Timeliness (completed on assigned day)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lookback_days = self.config.get("windows", {}).get("chronic", 90)
        self.min_workouts = self.config.get("min_workouts_for_compliance", 5)

    def extract(self) -> Dict[str, Any]:
        features = {}

        assignments = self._get_assignments()
        logs = self._get_workout_logs()

        if not assignments:
            return self._empty_features()

        # Overall completion rate
        completed_assignments = [a for a in assignments if a.get("status") == "completed"]
        features["completion_rate"] = self._safe_divide(len(completed_assignments), len(assignments))

        # Recent completion rate (28 days)
        recent_cutoff = self.as_of - timedelta(days=28)
        recent_assignments = [a for a in assignments if a.get("createdAt", self.as_of) >= recent_cutoff]
        recent_completed = [a for a in recent_assignments if a.get("status") == "completed"]
        features["completion_rate_28d"] = self._safe_divide(len(recent_completed), len(recent_assignments))

        # 7-day completion rate
        week_cutoff = self.as_of - timedelta(days=7)
        week_assignments = [a for a in assignments if a.get("createdAt", self.as_of) >= week_cutoff]
        week_completed = [a for a in week_assignments if a.get("status") == "completed"]
        features["completion_rate_7d"] = self._safe_divide(len(week_completed), len(week_assignments))

        # Consistency features
        features.update(self._consistency_features(assignments))

        # Intensity adherence (if RPE data available)
        features.update(self._intensity_adherence(completed_assignments, logs))

        # Timeliness
        features.update(self._timeliness_features(completed_assignments))

        # Missed sessions patterns
        features.update(self._missed_patterns(assignments))

        return features

    def _get_assignments(self) -> List[Dict[str, Any]]:
        """Fetch workout assignments for the athlete."""
        collection = self._get_collection("workout_assignments")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        assignments = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "createdAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("createdAt", 1))

        return assignments

    def _get_workout_logs(self) -> List[Dict[str, Any]]:
        """Fetch workout logs for the athlete."""
        collection = self._get_collection("workout_logs")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        logs = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "completedAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("completedAt", 1))

        return logs

    def _consistency_features(self, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate consistency metrics."""
        if not assignments:
            return {}

        # Sort by date
        sorted_assignments = sorted(assignments, key=lambda x: x.get("startDate", ""))

        # Current streak
        current_streak = 0
        for a in reversed(sorted_assignments):
            if a.get("status") == "completed":
                current_streak += 1
            else:
                break
        features = {"current_completion_streak": current_streak}

        # Longest streak
        longest_streak = 0
        temp_streak = 0
        for a in sorted_assignments:
            if a.get("status") == "completed":
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 0
        features["longest_completion_streak"] = longest_streak

        # Gaps (consecutive missed)
        max_gap = 0
        temp_gap = 0
        for a in sorted_assignments:
            if a.get("status") != "completed":
                temp_gap += 1
                max_gap = max(max_gap, temp_gap)
            else:
                temp_gap = 0
        features["max_consecutive_missed"] = max_gap

        # Weekly consistency (coefficient of variation of weekly completions)
        weekly_counts = self._weekly_completion_counts(sorted_assignments)
        if len(weekly_counts) > 1:
            features["weekly_completion_cv"] = np.std(weekly_counts) / (np.mean(weekly_counts) + 1e-6)
        else:
            features["weekly_completion_cv"] = 0.0

        return features

    def _weekly_completion_counts(self, assignments: List[Dict[str, Any]]) -> List[int]:
        """Count completions per week."""
        from collections import defaultdict
        weekly = defaultdict(int)
        for a in assignments:
            if a.get("status") == "completed" and a.get("completedAt"):
                week_key = a["completedAt"].strftime("%Y-W%U")
                weekly[week_key] += 1
        return list(weekly.values())

    def _intensity_adherence(
        self,
        completed_assignments: List[Dict[str, Any]],
        logs: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Compare actual RPE to target intensity."""
        if not completed_assignments or not logs:
            return {
                "intensity_adherence_mean": 1.0,
                "intensity_adherence_std": 0.0,
                "overreaching_sessions": 0,
                "underreaching_sessions": 0,
            }

        # Map logs to assignments by date proximity
        adherence_ratios = []
        overreaching = 0
        underreaching = 0

        for assignment in completed_assignments:
            assignment_date = assignment.get("completedAt") or assignment.get("startDate")
            if not assignment_date:
                continue

            # Find matching log
            matching_log = None
            for log in logs:
                log_date = log.get("completedAt")
                if log_date and abs((log_date - assignment_date).days) <= 1:
                    matching_log = log
                    break

            if matching_log and matching_log.get("perceivedEffort"):
                # Target RPE would come from workout prescription
                # For now, assume target is 6-7 (moderate)
                target_rpe = 6.5
                actual_rpe = matching_log["perceivedEffort"]
                ratio = actual_rpe / target_rpe
                adherence_ratios.append(ratio)

                if ratio > 1.2:
                    overreaching += 1
                elif ratio < 0.8:
                    underreaching += 1

        return {
            "intensity_adherence_mean": np.mean(adherence_ratios) if adherence_ratios else 1.0,
            "intensity_adherence_std": np.std(adherence_ratios) if adherence_ratios else 0.0,
            "overreaching_sessions": overreaching,
            "underreaching_sessions": underreaching,
        }

    def _timeliness_features(self, completed_assignments: List[Dict[str, Any]]) -> Dict[str, float]:
        """On-time vs late completion."""
        on_time = 0
        late = 0
        early = 0

        for a in completed_assignments:
            due_date = a.get("dueDate")
            completed_at = a.get("completedAt")
            if not due_date or not completed_at:
                continue

            due = datetime.fromisoformat(due_date) if isinstance(due_date, str) else due_date
            diff_days = (completed_at - due).days

            if diff_days <= 0:
                on_time += 1
            elif diff_days <= 2:
                late += 1
            else:
                late += 1  # Count as late

        total = on_time + late + early
        return {
            "on_time_completion_rate": self._safe_divide(on_time, total),
            "late_completion_rate": self._safe_divide(late, total),
        }

    def _missed_patterns(self, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Patterns in missed sessions."""
        missed = [a for a in assignments if a.get("status") != "completed"]

        # Day of week pattern
        from collections import Counter
        dow_missed = Counter()
        for a in missed:
            start_date = a.get("startDate")
            if start_date:
                dow = datetime.fromisoformat(start_date).weekday() if isinstance(start_date, str) else start_date.weekday()
                dow_missed[dow] += 1

        most_missed_day = dow_missed.most_common(1)[0][0] if dow_missed else -1

        return {
            "total_missed": len(missed),
            "most_missed_day_of_week": most_missed_day,  # 0=Monday
            "missed_on_monday": dow_missed.get(0, 0),
            "missed_on_friday": dow_missed.get(4, 0),
            "missed_on_weekend": dow_missed.get(5, 0) + dow_missed.get(6, 0),
        }

    def _empty_features(self) -> Dict[str, Any]:
        return {
            "completion_rate": 0.0,
            "completion_rate_28d": 0.0,
            "completion_rate_7d": 0.0,
            "current_completion_streak": 0,
            "longest_completion_streak": 0,
            "max_consecutive_missed": 0,
            "weekly_completion_cv": 0.0,
            "intensity_adherence_mean": 1.0,
            "intensity_adherence_std": 0.0,
            "overreaching_sessions": 0,
            "underreaching_sessions": 0,
            "on_time_completion_rate": 0.0,
            "late_completion_rate": 0.0,
            "total_missed": 0,
            "most_missed_day_of_week": -1,
            "missed_on_monday": 0,
            "missed_on_friday": 0,
            "missed_on_weekend": 0,
        }