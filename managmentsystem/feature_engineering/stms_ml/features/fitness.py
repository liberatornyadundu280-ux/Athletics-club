"""
Fitness Features - Standardized fitness test baselines, percentiles, trends
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List
import numpy as np
from bson import ObjectId
from .base import BaseFeatureExtractor


class FitnessFeatures(BaseFeatureExtractor):
    """
    Extract fitness testing features:
    - Test baselines and latest values
    - Percentile rankings (within club/age group)
    - Trends over time
    - Test battery completeness
    """

    # Standard test battery for track & field
    STANDARD_TESTS = {
        "30m_fly": {"unit": "s", "lower_better": True, "category": "speed"},
        "standing_long_jump": {"unit": "cm", "lower_better": False, "category": "power"},
        "triple_hop": {"unit": "m", "lower_better": False, "category": "power"},
        "medicine_ball_throw": {"unit": "m", "lower_better": False, "category": "power"},
        "yo_yo_ir1": {"unit": "m", "lower_better": False, "category": "endurance"},
        "300m": {"unit": "s", "lower_better": True, "category": "speed_endurance"},
        "10m_split": {"unit": "s", "lower_better": True, "category": "acceleration"},
        "countermovement_jump": {"unit": "cm", "lower_better": False, "category": "power"},
        "drop_jump": {"unit": "cm", "lower_better": False, "category": "reactive_strength"},
        "rsi": {"unit": "ratio", "lower_better": False, "category": "reactive_strength"},
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lookback_days = self.config.get("windows", {}).get("season", 180)

    def extract(self) -> Dict[str, Any]:
        features = {}

        tests = self._get_fitness_tests()
        athlete = self._get_athlete()

        if not tests:
            return self._empty_features()

        # Latest values for each test
        features.update(self._latest_values(tests))

        # Trends
        features.update(self._trends(tests))

        # Battery completeness
        features.update(self._battery_completeness(tests))

        # Percentiles (would need club-wide data - placeholder)
        features.update(self._percentiles(tests, athlete))

        # Category scores
        features.update(self._category_scores(tests))

        return features

    def _get_fitness_tests(self) -> List[Dict[str, Any]]:
        collection = self._get_collection("fitness_tests")
        cutoff = self.as_of - timedelta(days=self.lookback_days)

        tests = list(collection.find({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id),
            "date": {"$lte": self.as_of.strftime("%Y-%m-%d")}
        }).sort("date", 1))

        return tests

    def _get_athlete(self) -> Dict[str, Any]:
        collection = self._get_collection("athletes")
        return collection.find_one({
            "clubId": ObjectId(self.club_id),
            "_id": ObjectId(self.athlete_id)
        }) or {}

    def _latest_values(self, tests: List[Dict]) -> Dict[str, Any]:
        """Latest value for each test type."""
        features = {}
        by_type = {}
        for t in tests:
            test_type = t.get("testType", "unknown")
            if test_type not in by_type:
                by_type[test_type] = []
            by_type[test_type].append(t)

        for test_type, type_tests in by_type.items():
            type_tests.sort(key=lambda x: x.get("date", ""))
            latest = type_tests[-1]
            std_info = self.STANDARD_TESTS.get(test_type, {})

            features[f"fitness_{test_type}_latest"] = latest.get("value", 0)
            features[f"fitness_{test_type}_latest_unit"] = latest.get("unit", std_info.get("unit", ""))
            features[f"fitness_{test_type}_latest_date"] = latest.get("date", "")

            # Days since last test
            if latest.get("date"):
                test_date = datetime.fromisoformat(latest["date"])
                features[f"fitness_{test_type}_days_since"] = (self.as_of - test_date).days

        return features

    def _trends(self, tests: List[Dict]) -> Dict[str, Any]:
        """Trend for each test type (improving/declining)."""
        features = {}
        by_type = {}
        for t in tests:
            test_type = t.get("testType", "unknown")
            if test_type not in by_type:
                by_type[test_type] = []
            by_type[test_type].append(t)

        for test_type, type_tests in by_type.items():
            if len(type_tests) < 2:
                features[f"fitness_{test_type}_trend"] = 0.0
                features[f"fitness_{test_type}_trend_direction"] = "insufficient_data"
                continue

            type_tests.sort(key=lambda x: x.get("date", ""))
            values = [t["value"] for t in type_tests]
            dates = [datetime.fromisoformat(t["date"]) for t in type_tests if t.get("date")]

            if len(values) >= 3 and len(dates) >= 3:
                # Normalize time to days since first test
                x = [(d - dates[0]).days for d in dates]
                slope = np.polyfit(x, values, 1)[0]

                # Determine direction based on test type
                std_info = self.STANDARD_TESTS.get(test_type, {})
                lower_better = std_info.get("lower_better", True)

                if lower_better:
                    direction = "improving" if slope < -0.01 else ("declining" if slope > 0.01 else "stable")
                else:
                    direction = "improving" if slope > 0.01 else ("declining" if slope < -0.01 else "stable")

                features[f"fitness_{test_type}_trend"] = slope
                features[f"fitness_{test_type}_trend_direction"] = direction
            else:
                features[f"fitness_{test_type}_trend"] = 0.0
                features[f"fitness_{test_type}_trend_direction"] = "insufficient_data"

        return features

    def _battery_completeness(self, tests: List[Dict]) -> Dict[str, Any]:
        """How many standard tests have been completed recently."""
        test_types_done = set(t.get("testType") for t in tests)
        standard_done = set(self.STANDARD_TESTS.keys()) & test_types_done

        # Recent (90 days)
        recent_cutoff = self.as_of - timedelta(days=90)
        recent_tests = [t for t in tests if datetime.fromisoformat(t["date"]) >= recent_cutoff]
        recent_types = set(t.get("testType") for t in recent_tests)
        recent_standard = set(self.STANDARD_TESTS.keys()) & recent_types

        return {
            "fitness_battery_completeness_all_time": len(standard_done) / len(self.STANDARD_TESTS),
            "fitness_battery_completeness_90d": len(recent_standard) / len(self.STANDARD_TESTS),
            "fitness_tests_completed_count": len(test_types_done),
            "fitness_standard_tests_done": list(standard_done),
        }

    def _percentiles(self, tests: List[Dict], athlete: Dict) -> Dict[str, Any]:
        """Percentile rankings (placeholder - needs club-wide aggregation)."""
        # This would require querying all athletes in club/age group
        # For now, return structure for future implementation
        features = {}
        for test_type in self.STANDARD_TESTS:
            features[f"fitness_{test_type}_percentile_club"] = 50.0  # Placeholder
            features[f"fitness_{test_type}_percentile_age_group"] = 50.0  # Placeholder
        return features

    def _category_scores(self, tests: Dict) -> Dict[str, Any]:
        """Aggregate scores by category (speed, power, endurance, etc.)."""
        by_type = {}
        for t in tests:
            test_type = t.get("testType", "unknown")
            if test_type not in by_type:
                by_type[test_type] = []
            by_type[test_type].append(t)

        category_values = {"speed": [], "power": [], "endurance": [], "acceleration": [], "reactive_strength": []}

        for test_type, type_tests in by_type.items():
            std_info = self.STANDARD_TESTS.get(test_type, {})
            category = std_info.get("category", "other")
            if category in category_values and type_tests:
                latest_val = type_tests[-1]["value"]
                # Normalize (z-score would be better with population data)
                category_values[category].append(latest_val)

        features = {}
        for category, values in category_values.items():
            if values:
                features[f"fitness_category_{category}_avg"] = np.mean(values)
                features[f"fitness_category_{category}_count"] = len(values)
            else:
                features[f"fitness_category_{category}_avg"] = 0.0
                features[f"fitness_category_{category}_count"] = 0

        return features

    def _empty_features(self) -> Dict[str, Any]:
        features = {}
        for test_type in self.STANDARD_TESTS:
            features[f"fitness_{test_type}_latest"] = 0.0
            features[f"fitness_{test_type}_latest_unit"] = ""
            features[f"fitness_{test_type}_latest_date"] = ""
            features[f"fitness_{test_type}_days_since"] = 999
            features[f"fitness_{test_type}_trend"] = 0.0
            features[f"fitness_{test_type}_trend_direction"] = "no_data"
            features[f"fitness_{test_type}_percentile_club"] = 50.0
            features[f"fitness_{test_type}_percentile_age_group"] = 50.0

        for category in ["speed", "power", "endurance", "acceleration", "reactive_strength"]:
            features[f"fitness_category_{category}_avg"] = 0.0
            features[f"fitness_category_{category}_count"] = 0

        features.update({
            "fitness_battery_completeness_all_time": 0.0,
            "fitness_battery_completeness_90d": 0.0,
            "fitness_tests_completed_count": 0,
            "fitness_standard_tests_done": [],
        })
        return features