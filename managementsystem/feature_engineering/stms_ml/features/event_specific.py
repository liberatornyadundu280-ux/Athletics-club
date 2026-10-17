"""
Event-Specific Features - Features tailored to event group demands
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class EventSpecificFeatures(BaseFeatureExtractor):
    """
    Extract event-group-specific features:
    - Sprint: acceleration, max velocity, speed endurance
    - Middle: aerobic capacity, lactate tolerance, pacing
    - Jumps: approach speed, takeoff angles, power
    - Throws: release velocity, technique consistency
    - Combined: multi-event proficiency
    """

    EVENT_GROUPS = {
        "sprints": ["100m", "200m", "400m", "60m", "100m_hurdles", "110m_hurdles", "400m_hurdles"],
        "middle_distance": ["800m", "1500m", "3000m", "mile", "3000m_steeplechase"],
        "long_distance": ["5000m", "10000m", "half_marathon", "marathon"],
        "jumps": ["long_jump", "triple_jump", "high_jump", "pole_vault"],
        "throws": ["shot_put", "discus", "hammer", "javelin", "weight_throw"],
        "combined": ["heptathlon", "decathlon", "pentathlon"],
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.event_groups = self.config.get("event_groups", self.EVENT_GROUPS)

    def extract(self) -> Dict[str, Any]:
        features = {}

        athlete = self._get_athlete()
        results = self._get_performance_results()
        workouts = self._get_workout_logs()

        primary_event = self._get_primary_event(athlete)
        event_group = self._get_event_group(primary_event)

        features["primary_event"] = primary_event
        features["event_group"] = event_group
        features.update(self._event_group_encoding(event_group))

        # Event-specific features based on group
        if event_group == "sprints":
            features.update(self._sprint_features(results, workouts))
        elif event_group == "middle_distance":
            features.update(self._middle_distance_features(results, workouts))
        elif event_group == "long_distance":
            features.update(self._long_distance_features(results, workouts))
        elif event_group == "jumps":
            features.update(self._jump_features(results, workouts))
        elif event_group == "throws":
            features.update(self._throw_features(results, workouts))
        elif event_group == "combined":
            features.update(self._combined_features(results, workouts))

        return features

    def _get_athlete(self) -> Dict[str, Any]:
        collection = self._get_collection("athletes")
        return collection.find_one({
            "clubId": ObjectId(self.club_id),
            "_id": ObjectId(self.athlete_id)
        }) or {}

    def _get_performance_results(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("performance_results")
        cutoff = self.as_of - timedelta(days=365)

        return list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

    def _get_workout_logs(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("workout_logs")
        cutoff = self.as_of - timedelta(days=90)

        return list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "completedAt": {"$gte": cutoff, "$lte": self.as_of}
        }).sort("completedAt", 1))

    def _get_primary_event(self, athlete: Dict) -> str:
        specializations = athlete.get("eventSpecialization", [])
        return specializations[0] if specializations else "unknown"

    def _get_event_group(self, event: str) -> str:
        for group, events in self.event_groups.items():
            if event in events:
                return group
        return "unknown"

    def _event_group_encoding(self, event_group: str) -> Dict[str, int]:
        """One-hot encoding for event group."""
        groups = list(self.event_groups.keys()) + ["unknown"]
        return {f"event_group_{g}": 1 if g == event_group else 0 for g in groups}

    # ==================== SPRINT FEATURES ====================
    def _sprint_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        # 100m/200m specific
        sprint_events = ["100m", "200m", "60m"]
        sprint_results = [r for r in results if r.get("event") in sprint_events]

        if sprint_results:
            sprint_results.sort(key=lambda x: x.get("date", ""))
            latest = sprint_results[-1]

            features["sprint_latest_100m"] = self._get_latest_result(sprint_results, "100m")
            features["sprint_latest_200m"] = self._get_latest_result(sprint_results, "200m")
            features["sprint_latest_60m"] = self._get_latest_result(sprint_results, "60m")

            # Speed endurance (200m/100m ratio)
            if features["sprint_latest_100m"] and features["sprint_latest_200m"]:
                features["sprint_speed_endurance_ratio"] = features["sprint_latest_200m"] / (2 * features["sprint_latest_100m"])

        # Hurdles
        hurdle_events = ["100m_hurdles", "110m_hurdles", "400m_hurdles"]
        hurdle_results = [r for r in results if r.get("event") in hurdle_events]
        features["hurdle_latest"] = self._get_latest_result(hurdle_results, hurdle_events[0]) if hurdle_results else 0

        # Workout features: max velocity work, acceleration work
        features.update(self._sprint_workout_features(workouts))

        return features

    def _sprint_workout_features(self, workouts: List[Dict]) -> Dict[str, Any]:
        """Analyze workout logs for sprint-specific content."""
        # This would need exercise-level data from workout logs
        # Placeholder for now
        return {
            "sprint_max_vel_sessions_90d": 0,
            "sprint_accel_sessions_90d": 0,
            "sprint_speed_end_sessions_90d": 0,
            "sprint_plyo_sessions_90d": 0,
        }

    # ==================== MIDDLE DISTANCE FEATURES ====================
    def _middle_distance_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        md_events = ["800m", "1500m", "mile"]
        md_results = [r for r in results if r.get("event") in md_events]

        if md_results:
            md_results.sort(key=lambda x: x.get("date", ""))
            features["md_latest_800m"] = self._get_latest_result(md_results, "800m")
            features["md_latest_1500m"] = self._get_latest_result(md_results, "1500m")

            # Aerobic speed reserve (1500m/800m ratio)
            if features["md_latest_800m"] and features["md_latest_1500m"]:
                features["md_aerobic_speed_reserve"] = features["md_latest_1500m"] / (features["md_latest_800m"] * 2.2)

        # Steeplechase
        sc_results = [r for r in results if r.get("event") == "3000m_steeplechase"]
        features["steeple_latest"] = self._get_latest_result(sc_results, "3000m_steeplechase") if sc_results else 0

        return features

    # ==================== LONG DISTANCE FEATURES ====================
    def _long_distance_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        ld_events = ["5000m", "10000m", "half_marathon", "marathon"]
        ld_results = [r for r in results if r.get("event") in ld_events]

        if ld_results:
            ld_results.sort(key=lambda x: x.get("date", ""))
            features["ld_latest_5000m"] = self._get_latest_result(ld_results, "5000m")
            features["ld_latest_10000m"] = self._get_latest_result(ld_results, "10000m")

        return features

    # ==================== JUMP FEATURES ====================
    def _jump_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        jump_events = ["long_jump", "triple_jump", "high_jump", "pole_vault"]
        jump_results = [r for r in results if r.get("event") in jump_events]

        for event in jump_events:
            event_results = [r for r in jump_results if r.get("event") == event]
            features[f"jump_latest_{event}"] = self._get_latest_result(event_results, event)

        # Wind-adjusted
        for event in ["long_jump", "triple_jump"]:
            event_results = [r for r in jump_results if r.get("event") == event and r.get("wind") is not None]
            if event_results:
                latest = event_results[-1]
                features[f"jump_{event}_wind_adjusted"] = latest["resultValue"] + (latest["wind"] * 0.05)

        return features

    # ==================== THROW FEATURES ====================
    def _throw_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        throw_events = ["shot_put", "discus", "hammer", "javelin", "weight_throw"]
        throw_results = [r for r in results if r.get("event") in throw_events]

        for event in throw_events:
            event_results = [r for r in throw_results if r.get("event") == event]
            features[f"throw_latest_{event}"] = self._get_latest_result(event_results, event)

        return features

    # ==================== COMBINED EVENTS FEATURES ====================
    def _combined_features(self, results: List[Dict], workouts: List[Dict]) -> Dict[str, Any]:
        features = {}

        # Proficiency across event groups
        group_scores = {}
        for group, events in self.event_groups.items():
            if group == "combined":
                continue
            group_results = [r for r in results if r.get("event") in events]
            if group_results:
                # Average percentile or points (placeholder)
                group_scores[group] = len(group_results)

        features["combined_event_groups_contested"] = sum(1 for v in group_scores.values() if v > 0)
        features["combined_total_events_contested"] = sum(group_scores.values())

        return features

    def _get_latest_result(self, results: List[Dict], event: str) -> float:
        """Get latest result value for an event."""
        event_results = [r for r in results if r.get("event") == event]
        if not event_results:
            return 0.0
        event_results.sort(key=lambda x: x.get("date", ""))
        return event_results[-1].get("resultValue", 0.0)

    def _empty_features(self) -> Dict[str, Any]:
        features = {}
        groups = list(self.event_groups.keys()) + ["unknown"]
        for g in groups:
            features[f"event_group_{g}"] = 0
        features["primary_event"] = "unknown"
        features["event_group"] = "unknown"

        # Sprint
        features.update({
            "sprint_latest_100m": 0.0, "sprint_latest_200m": 0.0, "sprint_latest_60m": 0.0,
            "sprint_speed_endurance_ratio": 0.0, "hurdle_latest": 0.0,
            "sprint_max_vel_sessions_90d": 0, "sprint_accel_sessions_90d": 0,
            "sprint_speed_end_sessions_90d": 0, "sprint_plyo_sessions_90d": 0,
        })

        # Middle
        features.update({
            "md_latest_800m": 0.0, "md_latest_1500m": 0.0,
            "md_aerobic_speed_reserve": 0.0, "steeple_latest": 0.0,
        })

        # Long
        features.update({
            "ld_latest_5000m": 0.0, "ld_latest_10000m": 0.0,
        })

        # Jumps
        for event in ["long_jump", "triple_jump", "high_jump", "pole_vault"]:
            features[f"jump_latest_{event}"] = 0.0
        features.update({"jump_long_jump_wind_adjusted": 0.0, "jump_triple_jump_wind_adjusted": 0.0})

        # Throws
        for event in ["shot_put", "discus", "hammer", "javelin", "weight_throw"]:
            features[f"throw_latest_{event}"] = 0.0

        # Combined
        features.update({
            "combined_event_groups_contested": 0,
            "combined_total_events_contested": 0,
        })

        return features