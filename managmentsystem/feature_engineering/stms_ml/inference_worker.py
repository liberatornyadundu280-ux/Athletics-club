#!/usr/bin/env python3
"""
STMS Recommendation Inference Worker

Consumes triggers from Redis Streams, loads latest model, generates recommendations,
and writes to MongoDB recommendations collection.
"""
import os
import sys
import json
import time
import pickle
import signal
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import redis
from pymongo import MongoClient
from pymongo.database import Database
from bson import ObjectId

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from features.pipeline import RecommendationFeaturePipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class InferenceWorker:
    """FastAPI-compatible inference worker for Redis Streams."""

    def __init__(
        self,
        mongo_uri: str,
        database: str,
        redis_url: str,
        model_path: str,
        scaler_path: Optional[str] = None,
        config_path: Optional[str] = None,
        stream_key: str = "stms:recommendation:triggers",
        consumer_group: str = "inference-workers",
        consumer_name: str = "worker-1",
    ):
        self.mongo_uri = mongo_uri
        self.database_name = database
        self.redis_url = redis_url
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.config_path = config_path
        self.stream_key = stream_key
        self.consumer_group = consumer_group
        self.consumer_name = consumer_name

        self.mongo_client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.redis_client: Optional[redis.Redis] = None
        self.feature_pipeline: Optional[RecommendationFeaturePipeline] = None
        self.model = None
        self.scaler = None
        self.feature_names: List[str] = []
        self.running = False

    def initialize(self):
        """Initialize all connections and load model."""
        # MongoDB
        self.mongo_client = MongoClient(self.mongo_uri)
        self.db = self.mongo_client[self.database_name]

        # Redis
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)

        # Create consumer group if not exists
        try:
            self.redis_client.xgroup_create(
                self.stream_key, self.consumer_group, id="0", mkstream=True
            )
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

        # Feature pipeline
        self.feature_pipeline = RecommendationFeaturePipeline(
            self.mongo_uri, self.database_name, self.config_path
        )
        self.feature_pipeline.connect()

        # Load model
        self._load_model()

        logger.info("Inference worker initialized")

    def _load_model(self):
        """Load trained model and scaler."""
        with open(self.model_path, "rb") as f:
            model_data = pickle.load(f)

        self.model = model_data["model"]
        self.feature_names = model_data.get("feature_names", [])
        self.target = model_data.get("target", "next_workout_rpe")
        logger.info(f"Loaded model: {model_data.get('model_type')} for target {self.target}")

        if self.scaler_path and os.path.exists(self.scaler_path):
            with open(self.scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            logger.info("Loaded scaler")

    def _prepare_features(self, features: Dict[str, Any]) -> np.ndarray:
        """Prepare feature vector for model inference."""
        # Ensure all expected features present
        feature_vector = []
        for name in self.feature_names:
            value = features.get(name, 0.0)
            if isinstance(value, bool):
                value = 1.0 if value else 0.0
            elif isinstance(value, str):
                # Handle categorical - would need encoding
                value = 0.0
            feature_vector.append(float(value))

        X = np.array(feature_vector).reshape(1, -1)

        # Scale if scaler available
        if self.scaler:
            X = self.scaler.transform(X)

        return X

    def _generate_recommendation(
        self,
        club_id: str,
        athlete_id: str,
        trigger: str,
        actor_uid: str,
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate recommendation from model prediction."""
        # Predict
        X = self._prepare_features(features)
        prediction = self.model.predict(X)[0]

        # Map prediction to recommendation components
        # This is simplified - real implementation would have multi-target model
        predicted_rpe = float(np.clip(prediction, 1, 10))

        # Determine focus based on features
        focus = self._determine_focus(features)
        intensity = self._determine_intensity(predicted_rpe, features)
        recovery = self._determine_recovery(features)
        drivers = self._determine_drivers(features)

        confidence = self._calculate_confidence(features)

        return {
            "clubId": ObjectId(club_id),
            "athleteId": ObjectId(athlete_id),
            "generatedAt": datetime.utcnow(),
            "trigger": trigger,
            "focus": focus,
            "intensity": intensity,
            "recovery": recovery,
            "drivers": drivers[:3],
            "confidence": confidence,
            "modelVersion": f"ml-{os.path.basename(self.model_path)}",
            "status": "pending",
            "createdBy": actor_uid,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }

    def _determine_focus(self, features: Dict) -> str:
        """Determine training focus from features."""
        if features.get("has_active_injury", False):
            return "Controlled return to training"
        elif features.get("high_rpe_sessions", 0) >= 2:
            return "Recovery and movement quality"
        elif features.get("attendance_rate_28d", 1) < 0.65:
            return "Gradual training consistency"
        elif features.get("total_pbs", 0) > 0:
            event = features.get("primary_event", "Event")
            return f"{event} technique and progression"
        elif features.get("primary_event"):
            return f"Foundation work for {features['primary_event']}"
        return "Build event-specific training consistency"

    def _determine_intensity(self, predicted_rpe: float, features: Dict) -> str:
        """Determine intensity prescription."""
        if features.get("has_active_injury", False):
            return "Low · stay within clinician-approved plan"
        elif predicted_rpe >= 8:
            return "High · RPE 8-9"
        elif predicted_rpe >= 6:
            return "Moderate · RPE 6-7"
        else:
            return "Low to moderate · RPE 4-5"

    def _determine_recovery(self, features: Dict) -> str:
        """Determine recovery recommendation."""
        if features.get("has_active_injury", False):
            return "Follow recorded return-to-play steps and stop if symptoms increase."
        elif features.get("avg_pain_7d", 0) > 4:
            return "Prioritize pain management, reduce load, consider medical review."
        elif features.get("avg_fatigue_7d", 0) > 6:
            return "Prioritize sleep, hydration, and easy recovery session before maximal work."
        elif features.get("load_monotony", 0) > 2:
            return "Add variety to training, ensure easy days are truly easy."
        return "Keep one full recovery day between demanding sessions."

    def _determine_drivers(self, features: Dict) -> List[str]:
        """Determine top 3 drivers for explainability."""
        drivers = []

        if features.get("active_injury_count", 0) > 0:
            drivers.append(f"{features['active_injury_count']} active injury/return-to-play record(s)")

        if features.get("high_rpe_sessions", 0) >= 2:
            drivers.append(f"{features['high_rpe_sessions']} recent workouts at RPE 8+")

        attendance = features.get("attendance_rate_28d", 1)
        if attendance < 0.65:
            drivers.append(f"Attendance over recent window is {attendance*100:.0f}%")

        if features.get("total_pbs", 0) > 0:
            drivers.append(f"{features['total_pbs']} recent personal best(s)")

        if features.get("acute_workload", 0) > features.get("chronic_workload", 1) * 1.3:
            drivers.append("Acute workload significantly exceeds chronic (ACWR > 1.3)")

        if features.get("completion_rate_28d", 1) < 0.7:
            drivers.append(f"Workout completion rate is {features['completion_rate_28d']*100:.0f}%")

        if features.get("avg_pain_7d", 0) > 3:
            drivers.append(f"Average pain score {features['avg_pain_7d']:.1f}/10 in last 7 days")

        if not drivers:
            drivers.append("No significant risk factors detected; using standard progression")

        return drivers

    def _calculate_confidence(self, features: Dict) -> float:
        """Calculate prediction confidence based on data availability."""
        confidence = 0.5  # Base

        # More data = higher confidence
        if features.get("total_sessions_week", 0) >= 3:
            confidence += 0.1
        if features.get("chronic_workload", 0) > 0:
            confidence += 0.1
        if features.get("total_pbs", 0) > 0:
            confidence += 0.1
        if features.get("fitness_battery_completeness_90d", 0) > 0.5:
            confidence += 0.1
        if features.get("training_age_weeks", 0) > 52:
            confidence += 0.1

        # Injury reduces confidence
        if features.get("has_active_injury", False):
            confidence -= 0.2

        return float(np.clip(confidence, 0.3, 0.9))

    def process_message(self, message_id: str, message_data: Dict[str, str]) -> bool:
        """Process a single trigger message."""
        try:
            data = json.loads(message_data.get("data", "{}"))
            club_id = data.get("clubId")
            athlete_id = data.get("athleteId")
            trigger = data.get("trigger", "unknown")
            actor_uid = data.get("actorUid", "system")

            if not club_id or not athlete_id:
                logger.warning(f"Missing club_id or athlete_id in message {message_id}")
                return False

            logger.info(f"Processing {trigger} for athlete {athlete_id} in club {club_id}")

            # Extract features
            features = self.feature_pipeline.extract_inference_features(club_id, athlete_id)

            # Generate recommendation
            recommendation = self._generate_recommendation(
                club_id, athlete_id, trigger, actor_uid, features
            )

            # Store in MongoDB
            self.db.recommendations.insert_one(recommendation)
            logger.info(f"Recommendation created for athlete {athlete_id}")

            return True

        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}", exc_info=True)
            return False

    def run(self, block_ms: int = 5000, count: int = 10):
        """Main worker loop."""
        self.running = True
        logger.info(f"Starting inference worker on stream {self.stream_key}")

        def signal_handler(signum, frame):
            logger.info("Shutdown signal received")
            self.running = False

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        while self.running:
            try:
                # Read from stream
                messages = self.redis_client.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {self.stream_key: ">"},
                    count=count,
                    block=block_ms,
                )

                if not messages:
                    continue

                for stream, stream_messages in messages:
                    for message_id, message_data in stream_messages:
                        success = self.process_message(message_id, message_data)

                        # Acknowledge message
                        self.redis_client.xack(self.stream_key, self.consumer_group, message_id)

                        if not success:
                            # Could implement retry logic here
                            logger.warning(f"Failed to process message {message_id}, acknowledged anyway")

            except redis.ConnectionError as e:
                logger.error(f"Redis connection error: {e}. Reconnecting...")
                time.sleep(5)
                try:
                    self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}", exc_info=True)
                time.sleep(1)

        logger.info("Worker stopped")

    def shutdown(self):
        """Clean shutdown."""
        self.running = False
        if self.feature_pipeline:
            self.feature_pipeline.disconnect()
        if self.mongo_client:
            self.mongo_client.close()
        if self.redis_client:
            self.redis_client.close()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="STMS Inference Worker")
    parser.add_argument("--mongo-uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    parser.add_argument("--database", default=os.getenv("MONGO_DB", "stms"))
    parser.add_argument("--redis-url", default=os.getenv("REDIS_URL", "redis://localhost:6379"))
    parser.add_argument("--model-path", required=True, help="Path to trained model pickle")
    parser.add_argument("--scaler-path", help="Path to scaler pickle")
    parser.add_argument("--config", help="Feature engineering config YAML")
    parser.add_argument("--stream-key", default="stms:recommendation:triggers")
    parser.add_argument("--consumer-group", default="inference-workers")
    parser.add_argument("--consumer-name", default="worker-1")

    args = parser.parse_args()

    worker = InferenceWorker(
        mongo_uri=args.mongo_uri,
        database=args.database,
        redis_url=args.redis_url,
        model_path=args.model_path,
        scaler_path=args.scaler_path,
        config_path=args.config,
        stream_key=args.stream_key,
        consumer_group=args.consumer_group,
        consumer_name=args.consumer_name,
    )

    try:
        worker.initialize()
        worker.run()
    except KeyboardInterrupt:
        pass
    finally:
        worker.shutdown()


if __name__ == "__main__":
    main()