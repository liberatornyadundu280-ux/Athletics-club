"""
Attendance Features - Attendance rate, streaks, patterns
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class AttendanceFeatures(BaseFeatureExtractor):
    """
    Extract attendance features:
    - Overall attendance rate
    - Recent attendance trends
    - Streaks (present/absent)
    - Day-of-week patterns
    - Excused vs unexcused absences
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lookback_days = self.config.get("windows", {}).get("chronic", 90)
        self.min_sessions = self.config.get("min_attendance_sessions", 10)

    def extract(self) -> Dict[str, Any]:
        features = {}

        records = self._get_attendance_records()
        sessions = self._get_sessions()

        if not sessions or len(sessions) < self.min_sessions:
            return self._empty_features()

        # Overall attendance rate
        features.update(self._overall_rate(records, sessions))

        # Recent windows
        features.update(self._recent_windows(records, sessions))

        # Streaks
        features.update(self._streaks(records, sessions))

        # Day-of-week patterns
        features.update(self._dow_patterns(records, sessions))

        # Excused vs unexcused
        features.update(self._absence_types(records))

        # Session type patterns
        features.update(self._session_type_patterns(records, sessions))

        return features

    def _get_attendance_records(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("attendance_records")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        records = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "markedAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("markedAt", 1))

        return records

    def _get_sessions(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("training_sessions")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        sessions = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "date": {"$gte": cutoff.strftime("%Y-%m-%d"), "$lte": self.as_of.strftime("%Y-%m-%d")},
            "status": {"$ne": "cancelled"}
        }).sort("date", 1))

        return sessions

    def _overall_rate(self, records: List[Dict], sessions: List[Dict]) -> Dict[str, float]:
        """Calculate overall attendance rate."""
        session_ids = {s["_id"] for s in sessions}
        athlete_records = [r for r in records if r["sessionId"] in session_ids]

        present = sum(1 for r in athlete_records if r.get("status") in ["present", "late"])
        excused = sum(1 for r in athlete_records if r.get("status") == "excused")
        total = len(session_ids)

        credited = present + excused
        return {
            "attendance_rate": self._safe_divide(credited, total),
            "present_rate": self._safe_divide(present, total),
            "excused_rate": self._safe_divide(excused, total),
            "absent_rate": self._safe_divide(total - credited, total),
            "total_sessions": total,
        }

    def _recent_windows(self, records: List[Dict], sessions: List[Dict]) -> Dict[str, float]:
        """Attendance rate in recent windows."""
        features = {}
        for window in [7, 14, 28, 56]:
            cutoff = self.as_of - timedelta(days=window)
            window_sessions = [s for s in sessions if s.get("date") and
                             datetime.fromisoformat(s["date"]) >= cutoff]
            window_session_ids = {s["_id"] for s in window_sessions}
            window_records = [r for r in records if r["sessionId"] in window_session_ids]

            present = sum(1 for r in window_records if r.get("status") in ["present", "late"])
            excused = sum(1 for r in window_records if r.get("status") == "excused")
            total = len(window_session_ids)

            features[f"attendance_rate_{window}d"] = self._safe_divide(present + excused, total)

        return features

    def _streaks(self, records: List[Dict], sessions: List[Dict]) -> Dict[str, int]:
        """Current and longest attendance streaks."""
        if not sessions:
            return {"current_streak": 0, "longest_streak": 0, "current_absent_streak": 0}

        # Map session to attendance status
        session_status = {}
        for r in records:
            session_status[r["sessionId"]] = r.get("status", "absent")

        # Sort sessions by date
        sorted_sessions = sorted(sessions, key=lambda x: x.get("date", ""))

        current_streak = 0
        longest_streak = 0
        current_absent = 0

        for s in reversed(sorted_sessions):
            status = session_status.get(s["_id"], "absent")
            if status in ["present", "late", "excused"]:
                current_streak += 1
                current_absent = 0
            else:
                current_absent += 1
                current_streak = 0
            longest_streak = max(longest_streak, current_streak)

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "current_absent_streak": current_absent,
        }

    def _dow_patterns(self, records: List[Dict], sessions: List[Dict]) -> Dict[str, float]:
        """Day-of-week attendance patterns."""
        from collections import defaultdict

        dow_present = defaultdict(int)
        dow_total = defaultdict(int)

        session_dow = {}
        for s in sessions:
            if s.get("date"):
                dow = datetime.fromisoformat(s["date"]).weekday()
                session_dow[s["_id"]] = dow
                dow_total[dow] += 1

        for r in records:
            dow = session_dow.get(r["sessionId"])
            if dow is not None and r.get("status") in ["present", "late", "excused"]:
                dow_present[dow] += 1

        features = {}
        for dow in range(7):
            features[f"attendance_dow_{dow}"] = self._safe_divide(dow_present[dow], dow_total[dow])

        # Weekend vs weekday
        weekday_present = sum(dow_present[i] for i in range(5))
        weekday_total = sum(dow_total[i] for i in range(5))
        weekend_present = sum(dow_present[i] for i in [5, 6])
        weekend_total = sum(dow_total[i] for i in [5, 6])

        features["attendance_weekday"] = self._safe_divide(weekday_present, weekday_total)
        features["attendance_weekend"] = self._safe_divide(weekend_present, weekend_total)

        return features

    def _absence_types(self, records: List[Dict]) -> Dict[str, float]:
        """Excused vs unexcused absence breakdown."""
        total_absent = sum(1 for r in records if r.get("status") == "absent")
        total_excused = sum(1 for r in records if r.get("status") == "excused")
        total_records = len(records)

        return {
            "excused_absence_rate": self._safe_divide(total_excused, total_records),
            "unexcused_absence_rate": self._safe_divide(total_absent, total_records),
            "excused_ratio": self._safe_divide(total_excused, total_absent + total_excused),
        }

    def _session_type_patterns(self, records: List[Dict], sessions: List[Dict]) -> Dict[str, float]:
        """Attendance by session type (training, competition, testing, meeting)."""
        from collections import defaultdict

        type_present = defaultdict(int)
        type_total = defaultdict(int)

        session_type = {}
        for s in sessions:
            stype = s.get("type", "training")
            session_type[s["_id"]] = stype
            type_total[stype] += 1

        for r in records:
            stype = session_type.get(r["sessionId"], "training")
            if r.get("status") in ["present", "late", "excused"]:
                type_present[stype] += 1

        features = {}
        for stype in ["training", "competition", "testing", "meeting"]:
            features[f"attendance_{stype}_rate"] = self._safe_divide(type_present[stype], type_total[stype])

        return features

    def _empty_features(self) -> Dict[str, Any]:
        return {
            "attendance_rate": 0.0,
            "present_rate": 0.0,
            "excused_rate": 0.0,
            "absent_rate": 0.0,
            "total_sessions": 0,
            "attendance_rate_7d": 0.0,
            "attendance_rate_14d": 0.0,
            "attendance_rate_28d": 0.0,
            "attendance_rate_56d": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "current_absent_streak": 0,
            "attendance_dow_0": 0.0,
            "attendance_dow_1": 0.0,
            "attendance_dow_2": 0.0,
            "attendance_dow_3": 0.0,
            "attendance_dow_4": 0.0,
            "attendance_dow_5": 0.0,
            "attendance_dow_6": 0.0,
            "attendance_weekday": 0.0,
            "attendance_weekend": 0.0,
            "excused_absence_rate": 0.0,
            "unexcused_absence_rate": 0.0,
            "excused_ratio": 0.0,
            "attendance_training_rate": 0.0,
            "attendance_competition_rate": 0.0,
            "attendance_testing_rate": 0.0,
            "attendance_meeting_rate": 0.0,
        }