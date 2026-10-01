"""
Performance Features - Competition results, PB/SB trends, event-specific metrics
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class PerformanceFeatures(BaseFeatureExtractor):
    """
    Extract performance tracking features:
    - PB/SB progression rates
    - Competition frequency and level
    - Event-specific metrics (splits, wind-adjusted, etc.)
    - Performance trajectory (improving/declining/stable)
    - WA scoring table points
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lookback_days = self.config.get("windows", {}).get("season", 180)
        self.event_groups = self.config.get("event_groups", {})

    def extract(self) -> Dict[str, Any]:
        features = {}

        results = self._get_performance_results()
        fitness_tests = self._get_fitness_tests()
        goals = self._get_goals()
        athlete = self._get_athlete()

        if not results and not fitness_tests:
            return self._empty_features()

        # Overall PB progression
        features.update(self._pb_progression(results))

        # Event-specific features
        features.update(self._event_specific_features(results, athlete))

        # Competition features
        features.update(self._competition_features(results))

        # Fitness test features
        features.update(self._fitness_test_features(fitness_tests))

        # Goal features
        features.update(self._goal_features(goals, results))

        # Performance trajectory
        features.update(self._trajectory_features(results))

        return features

    def _get_performance_results(self) -> List[Dict[str, Any]]:
        """Fetch performance results."""
        collection = self._get_collection("performance_results")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        results = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

        return results

    def _get_fitness_tests(self) -> List[Dict[str, Any]]:
        """Fetch fitness tests."""
        collection = self._get_collection("fitness_tests")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        tests = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

        return tests

    def _get_goals(self) -> List[Dict[str, Any]]:
        """Fetch athlete goals."""
        collection = self._get_collection("athlete_goals")
        goals = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "status": "active"
        }).sort("targetDate", 1))
        return goals

    def _get_athlete(self) -> Optional[Dict[str, Any]]:
        """Fetch athlete profile for event specialization."""
        collection = self._get_collection("athletes")
        return collection.find_one({
            "clubId": ObjectId(self.club_id),
            "_id": ObjectId(self.athlete_id)
        })

    def _pb_progression(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate PB/SB progression rates."""
        if not results:
            return {}

        # Group by event
        by_event = {}
        for r in results:
            event = r.get("event", "unknown")
            if event not in by_event:
                by_event[event] = []
            by_event[event].append(r)

        features = {}
        total_pbs = 0
        total_sbs = 0
        events_with_pb = 0

        for event, event_results in by_event.items():
            # Sort by date
            event_results.sort(key=lambda x: x.get("date", ""))

            # Track PBs
            pbs = []
            best_so_far = None
            for r in event_results:
                is_pb = r.get("isPB", False)
                if is_pb:
                    total_pbs += 1
                    pbs.append(r)
                    best_so_far = r["resultValue"]
                elif best_so_far is not None:
                    # Calculate % off PB
                    pct_off = self._pct_off_pb(r["resultValue"], best_so_far, r.get("unit", "s"))
                    pbs.append({"pct_off_pb": pct_off})

            if pbs:
                events_with_pb += 1
                # Rate of PB improvement (per month)
                first_pb_date = datetime.fromisoformat(pbs[0]["date"])
                last_pb_date = datetime.fromisoformat(pbs[-1]["date"])
                months = max(1, (last_pb_date - first_pb_date).days / 30)
                features[f"pb_rate_{event}_per_month"] = len([p for p in pbs if p.get("isPB")]) / months

            # Season bests
            sbs = [r for r in event_results if r.get("isSB")]
            total_sbs += len(sbs)

        features["total_pbs"] = total_pbs
        features["total_sbs"] = total_sbs
        features["events_with_pb"] = events_with_pb
        features["pb_frequency_per_month"] = total_pbs / max(1, self.lookback_days / 30)

        return features

    def _pct_off_pb(self, current: float, pb: float, unit: str) -> float:
        """Calculate percentage off personal best."""
        if unit == "s":  # Time-based (lower is better)
            return ((current - pb) / pb) * 100
        else:  # Distance/points (higher is better)
            return ((pb - current) / pb) * 100

    def _event_specific_features(
        self,
        results: List[Dict[str, Any]],
        athlete: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Event-specific performance features."""
        features = {}
        event_specializations = athlete.get("eventSpecialization", []) if athlete else []

        # Primary event
        primary_event = event_specializations[0] if event_specializations else None
        features["primary_event"] = primary_event or "unknown"

        if primary_event:
            event_results = [r for r in results if r.get("event") == primary_event]
            if event_results:
                event_results.sort(key=lambda x: x.get("date", ""))
                latest = event_results[-1]

                features["primary_event_latest_result"] = latest.get("resultValue", 0)
                features["primary_event_latest_unit"] = latest.get("unit", "s")
                features["primary_event_is_pb"] = latest.get("isPB", False)
                features["primary_event_is_sb"] = latest.get("isSB", False)

                # Wind-adjusted for sprints/jumps
                if latest.get("wind") is not None:
                    features["primary_event_wind"] = latest["wind"]
                    features["primary_event_wind_adjusted"] = self._wind_adjust(
                        latest["resultValue"], latest["wind"], primary_event
                    )

                # Meet level
                features["primary_event_meet_level"] = self._meet_level_encoding(latest.get("meetLevel", "club"))

        # Event diversity
        unique_events = len(set(r.get("event") for r in results))
        features["event_diversity"] = unique_events

        return features

    def _wind_adjust(self, result: float, wind: float, event: str) -> float:
        """Basic wind adjustment for sprints/jumps."""
        # Simplified: 0.1s per 1m/s wind for 100m
        if event in ["100m", "200m", "100m_hurdles", "110m_hurdles", "long_jump", "triple_jump"]:
            if "100m" in event or "hurdles" in event:
                return result - (wind * 0.1)
            elif event in ["long_jump", "triple_jump"]:
                return result + (wind * 0.05)  # Approximate
        return result

    def _meet_level_encoding(self, level: str) -> int:
        """Encode meet level as ordinal."""
        levels = {"club": 1, "district": 2, "state": 3, "national": 4, "international": 5}
        return levels.get(level, 1)

    def _competition_features(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Competition frequency and level features."""
        if not results:
            return {}

        # Competition frequency (comps per month)
        unique_comps = len(set(r.get("competitionId") for r in results if r.get("competitionId")))
        features = {"competitions_per_month": unique_comps / max(1, self.lookback_days / 30)}

        # Average meet level
        meet_levels = [self._meet_level_encoding(r.get("meetLevel", "club")) for r in results]
        features["avg_meet_level"] = np.mean(meet_levels)

        # Highest meet level
        features["highest_meet_level"] = max(meet_levels)

        # Results at high level
        high_level_results = [r for r in results if self._meet_level_encoding(r.get("meetLevel", "club")) >= 4]
        features["high_level_results_count"] = len(high_level_results)
        features["high_level_pb_rate"] = self._safe_divide(
            sum(1 for r in high_level_results if r.get("isPB")),
            len(high_level_results)
        )

        return features

    def _fitness_test_features(self, tests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fitness test trends and baselines."""
        if not tests:
            return {}

        # Group by test type
        by_type = {}
        for t in tests:
            test_type = t.get("testType", "unknown")
            if test_type not in by_type:
                by_type[test_type] = []
            by_type[test_type].append(t)

        features = {}
        for test_type, type_tests in by_type.items():
            type_tests.sort(key=lambda x: x.get("date", ""))
            latest = type_tests[-1]

            features[f"fitness_{test_type}_latest"] = latest.get("value", 0)
            features[f"fitness_{test_type}_unit"] = latest.get("unit", "")

            # Trend (improving?)
            if len(type_tests) >= 2:
                first_val = type_tests[0]["value"]
                last_val = latest["value"]
                # Determine if higher/better depends on test type
                # For now, assume higher is better for most tests
                features[f"fitness_{test_type}_trend"] = (last_val - first_val) / max(1, first_val)

        return features

    def _goal_features(
        self,
        goals: List[Dict[str, Any]],
        results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Goal progress features."""
        if not goals:
            return {"active_goals": 0, "goal_progress_avg": 0.0}

        features = {"active_goals": len(goals)}
        progress_values = []

        for goal in goals:
            target = goal.get("targetValue", 0)
            event = goal.get("event", "")
            unit = goal.get("unit", "s")

            # Find latest result for this event
            event_results = [r for r in results if r.get("event") == event]
            if event_results:
                event_results.sort(key=lambda x: x.get("date", ""))
                current = event_results[-1]["resultValue"]

                if unit == "s":  # Time-based
                    progress = (target - current) / target if target > 0 else 0
                else:  # Distance-based
                    progress = current / target if target > 0 else 0

                progress = max(0, min(1, progress))  # Clamp 0-1
                progress_values.append(progress)

        features["goal_progress_avg"] = np.mean(progress_values) if progress_values else 0.0
        features["goals_on_track"] = sum(1 for p in progress_values if p >= 0.8)

        return features

    def _trajectory_features(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Overall performance trajectory."""
        if len(results) < 3:
            return {"trajectory": "insufficient_data", "trajectory_slope": 0.0}

        # Use primary event results for trajectory
        # For simplicity, use all results normalized
        # In practice, would use WA scoring tables

        features = {}
        # Simple linear trend on result values (normalized per event)
        # This is a placeholder - real implementation needs event normalization
        features["trajectory_slope"] = 0.0
        features["trajectory_r2"] = 0.0
        features["trajectory"] = "stable"

        return features

    def _empty_features(self) -> Dict[str, Any]:
        return {
            "total_pbs": 0,
            "total_sbs": 0,
            "events_with_pb": 0,
            "pb_frequency_per_month": 0.0,
            "primary_event": "unknown",
            "primary_event_latest_result": 0,
            "primary_event_latest_unit": "s",
            "primary_event_is_pb": False,
            "primary_event_is_sb": False,
            "primary_event_wind": 0.0,
            "primary_event_wind_adjusted": 0.0,
            "primary_event_meet_level": 1,
            "event_diversity": 0,
            "competitions_per_month": 0.0,
            "avg_meet_level": 1.0,
            "highest_meet_level": 1,
            "high_level_results_count": 0,
            "high_level_pb_rate": 0.0,
            "active_goals": 0,
            "goal_progress_avg": 0.0,
            "goals_on_track": 0,
            "trajectory": "insufficient_data",
            "trajectory_slope": 0.0,
            "trajectory_r2": 0.0,
        }