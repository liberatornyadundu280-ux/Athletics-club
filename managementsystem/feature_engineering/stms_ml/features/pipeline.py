"""
Main Feature Engineering Pipeline
Orchestrates all feature extractors for training and inference
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import pandas as pd
import yaml
from pymongo import MongoClient
from pymongo.database import Database
from bson import ObjectId

from .base import FeaturePipeline
from .workload import WorkloadFeatures
from .compliance import ComplianceFeatures
from .performance import PerformanceFeatures
from .attendance import AttendanceFeatures
from .injury import InjuryFeatures
from .fitness import FitnessFeatures
from .demographics import DemographicsFeatures
from .event_specific import EventSpecificFeatures
from .readiness import ReadinessFeatures


class RecommendationFeaturePipeline:
    """
    Complete feature engineering pipeline for STMS recommendation engine.
    Supports both training (historical) and inference (current) modes.
    """

    def __init__(
        self,
        mongo_uri: str = "mongodb://localhost:27017",
        database: str = "stms",
        config_path: Optional[str] = None,
    ):
        self.mongo_uri = mongo_uri
        self.database_name = database
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.config = self._load_config(config_path)

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if config_path:
            with open(config_path, "r") as f:
                return yaml.safe_load(f)
        return {}

    def connect(self):
        """Establish MongoDB connection."""
        self.client = MongoClient(self.mongo_uri)
        self.db = self.client[self.database_name]

    def disconnect(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()

    def _create_pipeline(
        self,
        club_id: str,
        athlete_id: str,
        as_of: Optional[datetime] = None,
        enabled_groups: Optional[List[str]] = None,
    ) -> FeaturePipeline:
        """Create a feature pipeline with all extractors registered."""
        if not self.db:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")

        pipeline = FeaturePipeline(
            db=self.db,
            club_id=club_id,
            athlete_id=athlete_id,
            as_of=as_of,
            config=self.config.get("features", {}),
            enabled_groups=enabled_groups,
        )

        # Register all feature extractors
        pipeline.register("workload", WorkloadFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("compliance", ComplianceFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("performance", PerformanceFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("attendance", AttendanceFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("injury", InjuryFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("fitness", FitnessFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("demographics", DemographicsFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("event_specific", EventSpecificFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))
        pipeline.register("readiness", ReadinessFeatures(
            db=self.db, club_id=club_id, athlete_id=athlete_id, as_of=as_of,
            config=self.config.get("features", {})
        ))

        return pipeline

    def extract_inference_features(
        self,
        club_id: str,
        athlete_id: str,
        as_of: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Extract features for real-time inference (current state)."""
        if self.db is None:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")
        pipeline = self._create_pipeline(club_id, athlete_id, as_of)
        return pipeline.extract_all()

    def extract_training_features(
        self,
        club_id: str,
        athlete_id: str,
        target_date: datetime,
        label_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Extract features for a specific historical date (training)."""
        if self.db is None:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")
        pipeline = self._create_pipeline(club_id, athlete_id, target_date)
        return pipeline.extract_for_training(target_date, label_data)

    def build_training_dataset(
        self,
        club_id: str,
        athlete_ids: List[str],
        start_date: datetime,
        end_date: datetime,
        frequency_days: int = 7,
        label_generator: Optional[callable] = None,
    ) -> pd.DataFrame:
        """
        Build a complete training dataset by extracting features at regular intervals.

        Args:
            club_id: Club identifier
            athlete_ids: List of athlete IDs to include
            start_date: Start of training period
            end_date: End of training period
            frequency_days: Interval between feature extractions (e.g., 7 for weekly)
            label_generator: Function(target_date, athlete_id) -> label dict

        Returns:
            DataFrame with features and labels
        """
        if self.db is None:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")
        rows = []
        current_date = start_date

        while current_date <= end_date:
            for athlete_id in athlete_ids:
                try:
                    # Generate labels for this date
                    labels = {}
                    if label_generator:
                        labels = label_generator(current_date, athlete_id)

                    features = self.extract_training_features(
                        club_id=club_id,
                        athlete_id=athlete_id,
                        target_date=current_date,
                        label_data=labels,
                    )
                    features["target_date"] = current_date.isoformat()
                    rows.append(features)
                except Exception as e:
                    # Log error but continue
                    print(f"Error extracting features for athlete {athlete_id} on {current_date}: {e}")

            current_date += timedelta(days=frequency_days)

        return pd.DataFrame(rows)

    def get_active_athletes(self, club_id: str, as_of: Optional[datetime] = None) -> List[str]:
        """Get list of active athlete IDs in a club."""
        if self.db is None:
            raise RuntimeError("Not connected to MongoDB")

        as_of = as_of or datetime.utcnow()
        cutoff = as_of - timedelta(days=90)  # Active in last 90 days

        # Athletes with recent workout logs or attendance
        workout_athletes = self.db.workout_logs.distinct("athleteId", {
            "clubId": ObjectId(club_id),
            "completedAt": {"$gte": cutoff}
        })

        attendance_athletes = self.db.attendance_records.distinct("athleteId", {
            "clubId": ObjectId(club_id),
            "markedAt": {"$gte": cutoff}
        })

        all_athletes = set(str(a) for a in workout_athletes) | set(str(a) for a in attendance_athletes)
        return list(all_athletes)

    def get_feature_names(self, club_id: str, athlete_id: str) -> List[str]:
        """Get list of all feature names by extracting once."""
        if self.db is None:
            raise RuntimeError("Not connected to MongoDB. Call connect() first.")
        sample = self.extract_inference_features(club_id, athlete_id)
        return [k for k in sample.keys() if not k.endswith("_error")]


# Convenience function for quick inference
def extract_features_for_athlete(
    mongo_uri: str,
    database: str,
    club_id: str,
    athlete_id: str,
    config_path: Optional[str] = None,
) -> Dict[str, Any]:
    """One-shot feature extraction for a single athlete."""
    with RecommendationFeaturePipeline(mongo_uri, database, config_path) as pipeline:
        return pipeline.extract_inference_features(club_id, athlete_id)