"""
Base Feature Extractor Class
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
import pandas as pd
from pymongo import MongoClient
from pymongo.database import Database


class BaseFeatureExtractor(ABC):
    """Base class for all feature extractors."""

    def __init__(
        self,
        db: Database,
        club_id: str,
        athlete_id: str,
        as_of: Optional[datetime] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.db = db
        self.club_id = club_id
        self.athlete_id = athlete_id
        self.as_of = as_of or datetime.utcnow()
        self.config = config or {}

    @abstractmethod
    def extract(self) -> Dict[str, Any]:
        """Extract features and return as a flat dictionary."""
        pass

    def _to_object_id(self, value: str):
        """Convert string to ObjectId if needed."""
        from bson import ObjectId
        if isinstance(value, str):
            return ObjectId(value)
        return value

    def _get_collection(self, name: str):
        """Get a club-scoped collection."""
        return self.db[name]

    def _filter_by_date(self, cursor, date_field: str, start: Optional[datetime] = None, end: Optional[datetime] = None):
        """Add date range filter to a query."""
        query = {}
        if start or end:
            query[date_field] = {}
            if start:
                query[date_field]["$gte"] = start
            if end:
                query[date_field]["$lte"] = end
        return cursor.find(query) if query else cursor

    def _safe_divide(self, numerator: float, denominator: float, default: float = 0.0) -> float:
        """Safe division with default."""
        if denominator == 0:
            return default
        return numerator / denominator

    def _days_between(self, start: datetime, end: datetime) -> int:
        """Calculate days between two dates."""
        return (end - start).days

    def _weeks_between(self, start: datetime, end: datetime) -> float:
        """Calculate weeks between two dates."""
        return self._days_between(start, end) / 7.0


class FeaturePipeline:
    """Orchestrates multiple feature extractors."""

    def __init__(
        self,
        db: Database,
        club_id: str,
        athlete_id: str,
        as_of: Optional[datetime] = None,
        config: Optional[Dict[str, Any]] = None,
        enabled_groups: Optional[List[str]] = None,
    ):
        self.db = db
        self.club_id = club_id
        self.athlete_id = athlete_id
        self.as_of = as_of or datetime.utcnow()
        self.config = config or {}
        self.enabled_groups = enabled_groups or [
            "workload", "compliance", "performance",
            "attendance", "injury", "fitness",
            "demographics", "event_specific"
        ]
        self._extractors = {}

    def register(self, name: str, extractor: BaseFeatureExtractor):
        """Register a feature extractor."""
        self._extractors[name] = extractor

    def extract_all(self) -> Dict[str, Any]:
        """Extract all enabled feature groups."""
        features = {}
        features["athlete_id"] = self.athlete_id
        features["club_id"] = self.club_id
        features["extracted_at"] = self.as_of.isoformat()

        for name, extractor in self._extractors.items():
            if name in self.enabled_groups:
                try:
                    extracted = extractor.extract()
                    features.update(extracted)
                except Exception as e:
                    # Log error but don't fail the whole pipeline
                    features[f"{name}_error"] = str(e)

        return features

    def extract_for_training(
        self,
        target_date: datetime,
        label_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Extract features for a specific historical date (for training)."""
        original_as_of = self.as_of
        self.as_of = target_date

        # Update all extractors
        for extractor in self._extractors.values():
            extractor.as_of = target_date

        features = self.extract_all()

        # Add labels if provided
        if label_data:
            features.update(label_data)

        self.as_of = original_as_of
        for extractor in self._extractors.values():
            extractor.as_of = original_as_of

        return features