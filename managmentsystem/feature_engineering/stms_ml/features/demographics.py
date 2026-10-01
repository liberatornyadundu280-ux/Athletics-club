"""
Demographics Features - Age, gender, training age, physical attributes
"""
from datetime import datetime
from typing import Any, Dict
from bson import ObjectId
from .base import BaseFeatureExtractor


class DemographicsFeatures(BaseFeatureExtractor):
    """
    Extract demographic features:
    - Age (decimal years)
    - Gender encoding
    - Training age (weeks since first workout)
    - Physical attributes if available
    """

    def extract(self) -> Dict[str, Any]:
        features = {}
        athlete = self._get_athlete()

        if not athlete:
            return self._empty_features()

        # Age
        dob = athlete.get("dateOfBirth")
        if dob:
            try:
                birth_date = datetime.fromisoformat(dob.replace("Z", "+00:00"))
                age_days = (self.as_of - birth_date).days
                features["age_years"] = age_days / 365.25
                features["age_category"] = self._age_category(features["age_years"])
            except Exception:
                features["age_years"] = 0.0
                features["age_category"] = "unknown"
        else:
            features["age_years"] = 0.0
            features["age_category"] = "unknown"

        # Gender
        gender = athlete.get("gender", "other")
        features["gender"] = gender
        features["gender_male"] = 1 if gender == "male" else 0
        features["gender_female"] = 1 if gender == "female" else 0
        features["gender_other"] = 1 if gender == "other" else 0

        # Training age (weeks since first workout)
        features.update(self._training_age())

        # Height/weight if available (not in current schema, placeholder)
        features["height_cm"] = 0.0
        features["weight_kg"] = 0.0
        features["bmi"] = 0.0

        # School/grade (for youth athletes)
        features["school"] = athlete.get("school", "") or ""
        features["grade"] = athlete.get("grade", "") or ""
        features["is_youth"] = 1 if features["age_years"] < 19 else 0

        return features

    def _get_athlete(self) -> Dict[str, Any]:
        collection = self._get_collection("athletes")
        return collection.find_one({
            "clubId": ObjectId(self.club_id),
            "_id": ObjectId(self.athlete_id)
        }) or {}

    def _training_age(self) -> Dict[str, Any]:
        """Calculate training age from first workout log."""
        collection = self._get_collection("workout_logs")
        first_log = collection.find_one({
            "clubId": ObjectId(self.club_id),
            "athleteId": ObjectId(self.athlete_id)
        }, sort=[("completedAt", 1)])

        features = {}
        if first_log and first_log.get("completedAt"):
            first_date = first_log["completedAt"]
            training_days = (self.as_of - first_date).days
            features["training_age_weeks"] = max(0, training_days / 7.0)
            features["training_age_months"] = features["training_age_weeks"] / 4.33
            features["training_age_years"] = features["training_age_weeks"] / 52.0
        else:
            features["training_age_weeks"] = 0.0
            features["training_age_months"] = 0.0
            features["training_age_years"] = 0.0

        # Training age category
        weeks = features["training_age_weeks"]
        if weeks < 4:
            features["training_age_category"] = "novice"
        elif weeks < 52:
            features["training_age_category"] = "beginner"
        elif weeks < 260:
            features["training_age_category"] = "intermediate"
        else:
            features["training_age_category"] = "advanced"

        features["training_age_category_encoded"] = {
            "novice": 0, "beginner": 1, "intermediate": 2, "advanced": 3
        }.get(features["training_age_category"], 0)

        return features

    def _age_category(self, age: float) -> str:
        if age < 14:
            return "u14"
        elif age < 16:
            return "u16"
        elif age < 18:
            return "u18"
        elif age < 20:
            return "u20"
        elif age < 23:
            return "u23"
        elif age < 35:
            return "senior"
        elif age < 50:
            return "masters_35_49"
        else:
            return "masters_50_plus"

    def _empty_features(self) -> Dict[str, Any]:
        return {
            "age_years": 0.0,
            "age_category": "unknown",
            "gender": "other",
            "gender_male": 0,
            "gender_female": 0,
            "gender_other": 1,
            "training_age_weeks": 0.0,
            "training_age_months": 0.0,
            "training_age_years": 0.0,
            "training_age_category": "novice",
            "training_age_category_encoded": 0,
            "height_cm": 0.0,
            "weight_kg": 0.0,
            "bmi": 0.0,
            "school": "",
            "grade": "",
            "is_youth": 0,
        }