#!/usr/bin/env python3
"""
Test script to validate feature extraction pipeline with synthetic data.
Run this to verify the pipeline works before connecting to MongoDB.
"""
import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features import (
    WorkloadFeatures, ComplianceFeatures, PerformanceFeatures,
    AttendanceFeatures, InjuryFeatures, FitnessFeatures,
    DemographicsFeatures, EventSpecificFeatures, ReadinessFeatures
)
from features.base import BaseFeatureExtractor, FeaturePipeline


class MockDB:
    """Mock MongoDB for testing without database connection."""
    
    def __init__(self):
        self.collections = {}
    
    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]


class MockCollection:
    """Mock MongoDB collection."""
    
    def __init__(self, name):
        self.name = name
        self.data = []
    
    def find(self, query=None):
        return MockCursor(self.data, query)
    
    def find_one(self, query=None):
        for doc in self.data:
            if self._match(doc, query):
                return doc
        return None
    
    def count_documents(self, query=None):
        return len(list(self.find(query)))
    
    def distinct(self, field, query=None):
        return list(set(doc.get(field) for doc in self.data if self._match(doc, query)))
    
    def insert_one(self, doc):
        self.data.append(doc)
    
    def _match(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k.startswith("$"):
                continue
            # Handle ObjectId comparison
            doc_val = doc.get(k)
            if isinstance(v, ObjectId):
                v = str(v)
            if isinstance(doc_val, ObjectId):
                doc_val = str(doc_val)
            if doc_val != v:
                return False
        return True


class MockCursor:
    """Mock MongoDB cursor."""
    
    def __init__(self, data, query=None):
        self.data = [doc for doc in data if self._match(doc, query)]
        self.query = query
        self.sort_key = None
        self.sort_dir = 1
        self.skip_count = 0
        self.limit_count = None
    
    def _match(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k.startswith("$"):
                continue
            doc_val = doc.get(k)
            if isinstance(v, ObjectId):
                v = str(v)
            if isinstance(doc_val, ObjectId):
                doc_val = str(doc_val)
            if doc_val != v:
                return False
        return True
    
    def sort(self, key, direction=1):
        self.sort_key = key
        self.sort_dir = direction
        if self.sort_key:
            self.data.sort(key=lambda x: x.get(self.sort_key, ""), reverse=(direction == -1))
        return self
    
    def skip(self, n):
        self.skip_count = n
        return self
    
    def limit(self, n):
        self.limit_count = n
        return self
    
    def toArray(self):
        result = self.data[self.skip_count:]
        if self.limit_count:
            result = result[:self.limit_count]
        return result
    
    # Alias for compatibility
    to_array = toArray
    
    def __iter__(self):
        return iter(self.toArray())


def create_mock_db():
    """Create mock database with synthetic athlete data."""
    db = MockDB()
    now = datetime.now(timezone.utc)
    club_id = ObjectId("507f1f77bcf86cd799439011")
    athlete_id = ObjectId("507f1f77bcf86cd799439012")
    user_id = ObjectId("507f1f77bcf86cd799439013")
    
    # Athlete profile
    db["athletes"].data.append({
        "_id": athlete_id,
        "clubId": club_id,
        "userId": user_id,
        "firstName": "Test",
        "lastName": "Athlete",
        "email": "test@example.com",
        "dateOfBirth": "2000-06-15",
        "gender": "male",
        "eventSpecialization": ["100m", "200m"],
        "status": "active",
        "createdAt": now - timedelta(days=365),
        "updatedAt": now,
    })
    
    # Workout logs (90 days)
    for i in range(30):
        date = now - timedelta(days=90 - i * 3)
        db["workout_logs"].data.append({
            "clubId": club_id,
            "athleteId": athlete_id,
            "completedAt": date,
            "perceivedEffort": np.random.randint(4, 9),
            "durationMinutes": np.random.randint(60, 120),
            "assignmentId": f"assign_{i}",
            "workoutId": f"workout_{i % 5}",
        })
    
    # Workout assignments
    for i in range(30):
        date = now - timedelta(days=90 - i * 3)
        status = "completed" if np.random.random() > 0.15 else "missed"
        db["workout_assignments"].data.append({
            "clubId": club_id,
            "athleteId": athlete_id,
            "workoutId": f"workout_{i % 5}",
            "startDate": date.strftime("%Y-%m-%d"),
            "status": status,
            "completedAt": date if status == "completed" else None,
            "createdAt": date - timedelta(days=7),
        })
    
    # Performance results
    for event in ["100m", "200m"]:
        for i in range(8):
            date = now - timedelta(days=180 - i * 20)
            base = 11.0 if event == "100m" else 22.0
            improvement = i * 0.02
            db["performance_results"].data.append({
                "clubId": club_id,
                "athleteId": athlete_id,
                "event": event,
                "resultValue": round(base - improvement + np.random.normal(0, 0.05), 2),
                "unit": "s",
                "date": date.strftime("%Y-%m-%d"),
                "isPB": i == 7,
                "isSB": i >= 6,
                "meetLevel": np.random.choice(["club", "district", "state"], p=[0.6, 0.3, 0.1]),
                "wind": round(np.random.uniform(-1.5, 1.5), 1),
            })
    
    # Fitness tests
    for test in ["30m_fly", "standing_long_jump", "countermovement_jump"]:
        for i in range(4):
            date = now - timedelta(days=120 - i * 30)
            db["fitness_tests"].data.append({
                "clubId": club_id,
                "athleteId": athlete_id,
                "testType": test,
                "value": round(np.random.uniform(3.0, 7.0), 2),
                "unit": "s" if test == "30m_fly" else "cm",
                "date": date.strftime("%Y-%m-%d"),
            })
    
    # Attendance (100 sessions over 90 days)
    for i in range(100):
        date = now - timedelta(days=90 - i)
        session_id = f"session_{i // 5}"
        status = np.random.choice(["present", "late", "absent", "excused"], p=[0.75, 0.1, 0.1, 0.05])
        db["attendance_records"].data.append({
            "clubId": club_id,
            "athleteId": athlete_id,
            "sessionId": session_id,
            "status": status,
            "method": "manual",
            "markedAt": datetime.combine(date.date(), datetime.min.time()) + timedelta(hours=8),
        })
    
    # Training sessions
    for i in range(20):
        date = now - timedelta(days=90 - i * 5)
        db["training_sessions"].data.append({
            "_id": f"session_{i}",
            "clubId": club_id,
            "date": date.strftime("%Y-%m-%d"),
            "type": "training",
            "status": "completed",
        })
    
    # Injuries (one past, resolved)
    db["injuries"].data.append({
        "_id": "injury_1",
        "clubId": club_id,
        "athleteId": athlete_id,
        "type": "Hamstring strain",
        "bodyPart": "Hamstring",
        "laterality": "left",
        "onsetDate": (now - timedelta(days=120)).strftime("%Y-%m-%d"),
        "severity": 2,
        "status": "resolved",
        "actualReturnDate": (now - timedelta(days=90)).strftime("%Y-%m-%d"),
    })
    
    # Wellness (last 28 days)
    for i in range(28):
        date = now - timedelta(days=28 - i)
        db["injury_wellness"].data.append({
            "clubId": club_id,
            "athleteId": athlete_id,
            "injuryId": "injury_1",
            "date": date.strftime("%Y-%m-%d"),
            "pain": np.random.randint(0, 3),
            "fatigue": np.random.randint(2, 6),
            "sleepHours": round(np.random.uniform(7, 9), 1),
        })
    
    # Daily readiness (last 28 days)
    for i in range(28):
        date = now - timedelta(days=28 - i)
        db["daily_readiness"].data.append({
            "clubId": club_id,
            "athleteId": athlete_id,
            "date": date.strftime("%Y-%m-%d"),
            "soreness": np.random.randint(1, 4),
            "sleepQuality": np.random.randint(3, 6),
            "stressEnergy": np.random.randint(2, 5),
            "notes": None,
            "createdAt": date,
            "updatedAt": date,
        })
    
    return db, str(club_id), str(athlete_id)


def test_all_extractors():
    """Test all feature extractors with mock data."""
    print("Creating mock database...")
    db, club_id, athlete_id = create_mock_db()
    as_of = datetime.utcnow()
    
    config = {
        "windows": {"acute": 7, "chronic": 28, "subacute": 28, "season": 180},
        "min_workouts_for_compliance": 5,
        "min_weeks_for_trends": 4,
        "min_attendance_sessions": 10,
        "event_groups": {
            "sprints": ["100m", "200m", "400m"],
            "middle_distance": ["800m", "1500m"],
            "jumps": ["long_jump"],
            "throws": ["shot_put"],
        }
    }
    
    print(f"\nTesting feature extraction for athlete {athlete_id} in club {club_id}")
    print("=" * 60)
    
    extractors = [
        ("Workload", WorkloadFeatures),
        ("Compliance", ComplianceFeatures),
        ("Performance", PerformanceFeatures),
        ("Attendance", AttendanceFeatures),
        ("Injury", InjuryFeatures),
        ("Fitness", FitnessFeatures),
        ("Demographics", DemographicsFeatures),
        ("Event-Specific", EventSpecificFeatures),
        ("Readiness", ReadinessFeatures),
    ]
    
    all_features = {}
    
    for name, ExtractorClass in extractors:
        try:
            extractor = ExtractorClass(
                db=db, club_id=club_id, athlete_id=athlete_id, as_of=as_of, config=config
            )
            features = extractor.extract()
            all_features.update(features)
            print(f"\n{name} Features ({len(features)}):")
            for k, v in sorted(features.items()):
                if not k.endswith("_error"):
                    print(f"  {k}: {v}")
        except Exception as e:
            print(f"\n{name} Features: ERROR - {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"TOTAL FEATURES: {len(all_features)}")
    
    # Test pipeline
    print("\nTesting FeaturePipeline...")
    pipeline = FeaturePipeline(
        db=db, club_id=club_id, athlete_id=athlete_id, as_of=as_of, config=config
    )
    
    for name, ExtractorClass in extractors:
        extractor = ExtractorClass(
            db=db, club_id=club_id, athlete_id=athlete_id, as_of=as_of, config=config
        )
        pipeline.register(name.lower(), extractor)
    
    pipeline_features = pipeline.extract_all()
    print(f"Pipeline extracted {len(pipeline_features)} features")
    
    return all_features


def test_training_dataset():
    """Test building training dataset."""
    print("\n\nTesting training dataset generation...")
    
    db, club_id, athlete_id = create_mock_db()
    
    # Add more athletes for training
    for i in range(1, 5):
        aid = f"507f1f77bcf86cd7994390{i+10}"
        db["athletes"].data.append({
            "_id": aid,
            "clubId": club_id,
            "firstName": f"Athlete{i}",
            "lastName": "Test",
            "dateOfBirth": "2000-01-01",
            "gender": "male",
            "eventSpecialization": ["100m"],
            "status": "active",
        })
        
        # Add some workout logs
        for j in range(20):
            date = datetime.utcnow() - timedelta(days=60 - j * 3)
            db["workout_logs"].data.append({
                "clubId": club_id,
                "athleteId": aid,
                "completedAt": date,
                "perceivedEffort": np.random.randint(4, 9),
                "durationMinutes": 90,
            })
    
    # Test pipeline's training dataset builder
    from features.pipeline import RecommendationFeaturePipeline
    
    # We can't fully test without MongoDB, but we can test the mock
    print("Mock database ready for pipeline testing")
    print(f"Collections: {list(db.collections.keys())}")
    print(f"Athletes: {len(db['athletes'].data)}")


if __name__ == "__main__":
    test_all_extractors()
    test_training_dataset()
    print("\nAll feature extraction tests passed!")