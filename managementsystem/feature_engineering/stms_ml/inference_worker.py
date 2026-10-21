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
        # BLOCK reads (XREADGROUP) legitimately wait block_ms; redis-py's default socket
        # timeout is 5s, so a 5s block raced the socket and the worker spun on
        # "Timeout reading from socket" instead of consuming triggers.
        self.redis_client = redis.from_url(
            self.redis_url,
            decode_responses=True,
            socket_timeout=None,
            socket_connect_timeout=5,
            health_check_interval=30,
        )

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
        self.scaler_in_training = bool(model_data.get("scaler_used", False))
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

        # train.py fits the tree model on the raw feature matrix and saves a StandardScaler
        # beside it without ever transforming the training data. Applying that scaler here
        # fed the model a distribution it had never seen, so every athlete collapsed to the
        # same ~5.7 prediction. Scaling is therefore opt-in, for a model that was genuinely
        # trained on scaled inputs.
        if self.scaler is not None and self._scaler_was_used_in_training():
            X = self.scaler.transform(X)

        return X

    def _scaler_was_used_in_training(self) -> bool:
        """Read the training-side flag if the model bundle records one (default: no)."""
        return bool(getattr(self, "scaler_in_training", False))

    def _current_periodization_phase(self) -> str:
        """Mirror the backend's rule engine so the model sees the same phase it expects."""
        month = datetime.utcnow().month
        if 6 <= month <= 8:
            return "competition"
        if month >= 10 or month <= 2:
            return "off-season"
        return "pre-comp"

    def _apply_model_contract(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Translate pipeline feature names into the names the shipped model was trained on.

        The model was trained on the analytics dataset columns (`age`, `session_rpe`,
        `gender_F`, ...) while the runtime pipeline emits descriptive names (`age_years`,
        `avg_session_rpe`, `gender_female`, ...). Only 4 of 31 inputs matched by name, so 27
        were silently fed to the model as zeros.
        """
        f = dict(features)

        def num(key: str, default: float = 0.0) -> float:
            value = f.get(key, default)
            if isinstance(value, bool):
                return 1.0 if value else 0.0
            if isinstance(value, (int, float)):
                return float(value)
            return float(default)

        soreness = num("readiness_latest_soreness", 3.0)
        sleep = num("readiness_latest_sleep", 3.0)
        stress = num("readiness_latest_stress", 3.0)
        # 1.0 when the athlete reports excellent readiness, 0.0 when they report the worst.
        readiness_composite = ((6 - soreness) + (6 - sleep) + (6 - stress)) / 15.0

        percentile_keys = [
            key
            for key, value in f.items()
            if key.startswith("fitness_")
            and key.endswith("percentile_club")
            and isinstance(value, (int, float))
        ]
        base_fitness = (
            # Percentile features are 0-100 around the club median; the training data used a
            # 62-95 score centred on ~78, so map 50th percentile to 75 and 90th to 95.
            50.0 + (sum(float(f[key]) for key in percentile_keys) / len(percentile_keys)) * 0.5
            if percentile_keys
            else 75.0
        )

        phase = self._current_periodization_phase()
        injury_prone = 1.0 if (num("injuries_per_year") >= 1.5 or num("max_severity_ever") >= 2) else 0.0

        f.update(
            {
                "age": num("age_years", 18.0),
                "training_age": num("training_age_years", 1.0),
                "base_fitness_score": base_fitness,
                "daily_soreness": soreness,
                "daily_sleep_quality": sleep,
                "daily_stress_energy": stress,
                "readiness_soreness_7d_avg": num("readiness_soreness_acute_avg", 3.0),
                "readiness_sleep_7d_avg": num("readiness_sleep_acute_avg", 3.0),
                "readiness_stress_7d_avg": num("readiness_stress_acute_avg", 3.0),
                "readiness_composite_score": readiness_composite,
                "high_soreness_days_7d": num("high_soreness_days_7d"),
                "session_duration_mins": num("avg_session_duration"),
                "session_rpe": num("avg_session_rpe"),
                "session_sRPE_load": num("avg_session_srpe"),
                "sRPE_load_acute_7d": num("acute_workload"),
                "sRPE_load_chronic_28d": num("chronic_workload"),
                "sRPE_acwr": num("acwr", 1.0),
                "active_injury_flag": 1.0 if f.get("has_active_injury") else 0.0,
                "injury_prone_flag": injury_prone,
                "compliance_rate_30d": num("completion_rate_28d", 1.0),
                "attendance_rate_30d": num("attendance_rate_28d", 1.0),
                "gender_F": num("gender_female"),
                "gender_M": num("gender_male"),
            }
        )

        for group in ("jumps", "middle_distance", "sprints", "throws"):
            f[f"event_group_{group}"] = num(f"event_group_{group}")
        for phase_name in ("competition", "off-season", "pre-comp", "transition"):
            f[f"periodization_phase_{phase_name}"] = 1.0 if phase == phase_name else 0.0

        return f

    def _generate_recommendation(
        self,
        club_id: str,
        athlete_id: str,
        trigger: str,
        actor_uid: str,
        features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate recommendation from model prediction."""
        features = self._apply_model_contract(features)

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

        # Estimate injury risk and progression adjustment from features
        injury_risk = self._estimate_injury_risk(features, predicted_rpe)
        progression_adjustment = self._estimate_progression_adjustment(features, predicted_rpe)

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
            # Additional ML outputs for backend
            "predicted_rpe": predicted_rpe,
            "injury_risk_score": injury_risk,
            "progression_adjustment": progression_adjustment,
        }

    def _acwr_is_usable(self, features: Dict[str, Any]) -> bool:
        """True when the 28-day window holds enough sessions for ACWR to mean something.

        One hard session inside a three-session month produces a ratio above 2 with no real
        spike, so ratios built on fewer than eight sessions are not used to raise injury
        risk, suppress progression, or warn the coach.
        """
        return float(features.get("sessions_28d", 0) or 0) >= 8

    def _estimate_injury_risk(self, features: Dict[str, Any], predicted_rpe: float) -> float:
        """Estimate injury risk from features and predicted RPE."""
        risk = 0.1  # Base risk
        
        # High RPE increases risk
        if predicted_rpe >= 8:
            risk += 0.2
        elif predicted_rpe >= 6:
            risk += 0.1
        
        # Active injury greatly increases risk
        if features.get("has_active_injury", False):
            risk += 0.3
        
        # High acute:chronic workload ratio. The extractor already computes the standard
        # 7-day vs 28-day ratio; dividing raw totals here understated it by 4x.
        acwr = float(features.get("sRPE_acwr", features.get("acwr", 1.0)) or 1.0)
        if self._acwr_is_usable(features):
            if acwr > 1.5:
                risk += 0.2
            elif acwr > 1.3:
                risk += 0.1

        # High pain/soreness
        if features.get("avg_pain_7d", 0) > 4:
            risk += 0.15
        if float(features.get("readiness_soreness_7d_avg", 0) or 0) > 4:
            risk += 0.1
        
        # Low compliance
        if features.get("compliance_rate_30d", 1) < 0.7:
            risk += 0.1
        
        return float(np.clip(risk, 0.0, 0.9))

    def _estimate_progression_adjustment(self, features: Dict[str, Any], predicted_rpe: float) -> float:
        """Estimate progression adjustment percentage from features."""
        adjustment = 0.0  # Base: no adjustment
        
        # High RPE suggests reduce progression
        if predicted_rpe >= 8:
            adjustment -= 0.15
        elif predicted_rpe >= 7:
            adjustment -= 0.05
        
        # High ACWR suggests reduce
        acwr = float(features.get("sRPE_acwr", features.get("acwr", 1.0)) or 1.0)
        if self._acwr_is_usable(features):
            if acwr > 1.3:
                adjustment -= 0.1
            elif acwr < 0.8:
                adjustment += 0.05  # Room to progress

        # Good readiness suggests can progress. The contract expresses readiness on 0-1;
        # older extractor output used 0-100.
        readiness = features.get("readiness_composite_score", 50)
        readiness = float(readiness) * 100 if float(readiness) <= 1 else float(readiness)
        if readiness > 70:
            adjustment += 0.05
        elif readiness < 40:
            adjustment -= 0.1
        
        # Recent PBs suggest good adaptation
        if features.get("total_pbs", 0) > 0:
            adjustment += 0.05
        
        return float(np.clip(adjustment, -0.3, 0.3))

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

        # Freshly reported pain is the athlete's own signal and should not be pushed out of
        # the top 3 by attendance/PB context.
        if features.get("avg_pain_7d", 0) > 3:
            drivers.append(f"Average pain score {features['avg_pain_7d']:.1f}/10 in last 7 days")

        if features.get("high_rpe_sessions", 0) >= 2:
            drivers.append(f"{features['high_rpe_sessions']} recent workouts at RPE 8+")

        attendance = features.get("attendance_rate_28d", 1)
        if attendance < 0.65:
            drivers.append(f"Attendance over recent window is {attendance*100:.0f}%")

        if features.get("total_pbs", 0) > 0:
            drivers.append(f"{features['total_pbs']} recent personal best(s)")

        # Compare weekly acute load to the weekly average of the chronic window. Comparing
        # acute to the raw 28-day total could never trigger for a normally training athlete.
        acwr = float(features.get("sRPE_acwr", features.get("acwr", 1.0)) or 1.0)
        if self._acwr_is_usable(features) and acwr > 1.3:
            drivers.append(f"Acute:chronic workload ratio {acwr:.2f} — above the 1.3 caution line")
        elif acwr > 1.3:
            sessions = int(features.get("sessions_28d", 0) or 0)
            drivers.append(
                f"Only {sessions} sessions in 28 days — the {acwr:.2f} load ratio needs more history to interpret"
            )

        if features.get("completion_rate_28d", 1) < 0.7:
            drivers.append(f"Workout completion rate is {features['completion_rate_28d']*100:.0f}%")

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
        request_id = message_data.get("requestId", "")
        try:
            data = json.loads(message_data.get("data", "{}"))
            club_id = data.get("clubId")
            athlete_id = data.get("athleteId")
            trigger = data.get("trigger", "unknown")
            actor_uid = data.get("actorUid", "system")

            if not club_id or not athlete_id:
                logger.warning(f"Missing club_id or athlete_id in message {message_id}")
                self._write_error_result(request_id, club_id, athlete_id, trigger, "Missing club_id or athlete_id")
                return False

            logger.info(f"Processing {trigger} for athlete {athlete_id} in club {club_id}")

            # Extract features
            features = self.feature_pipeline.extract_inference_features(club_id, athlete_id)

            # Generate recommendation
            recommendation = self._generate_recommendation(
                club_id, athlete_id, trigger, actor_uid, features
            )

            # The backend owns persistence. The worker returns its result over the stream;
            # writing here as well produced two recommendation documents per request.
            logger.info(f"Recommendation generated for athlete {athlete_id}")

            # Write result to results stream for backend to pick up
            self._write_result(request_id, club_id, athlete_id, trigger, recommendation, features)

            return True

        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}", exc_info=True)
            self._write_error_result(request_id, club_id, athlete_id, trigger, str(e))
            return False

    def _write_result(self, request_id: str, club_id: str, athlete_id: str, trigger: str, 
                      recommendation: Dict[str, Any], features: Dict[str, Any]):
        """Write inference result to results stream."""
        try:
            result_stream_key = f"{self.stream_key}:results"

            result = {
                "requestId": request_id,
                "data": json.dumps({
                    "clubId": club_id,
                    "athleteId": athlete_id,
                    "trigger": trigger,
                    "focus": recommendation["focus"],
                    "intensity": recommendation["intensity"],
                    "recovery": recommendation.get("recovery", ""),
                    "drivers": recommendation.get("drivers", []),
                    "rpe": recommendation.get("predicted_rpe", 6.0),
                    "injuryRisk": recommendation.get("injury_risk_score", 0.1),
                    "progressionAdjustment": recommendation.get("progression_adjustment", 0.0),
                    "confidence": recommendation["confidence"],
                    "modelVersion": recommendation["modelVersion"],
                    "generatedAt": recommendation["generatedAt"].isoformat() if hasattr(recommendation["generatedAt"], 'isoformat') else str(recommendation["generatedAt"]),
                })
            }
            
            self.redis_client.xadd(result_stream_key, result, maxlen=1000, approximate=True)
            logger.debug(f"Wrote result to stream for request {request_id}")
        except Exception as e:
            logger.error(f"Failed to write result to stream: {e}")

    def _write_error_result(self, request_id: str, club_id: str, athlete_id: str, trigger: str, error: str):
        """Write error result to results stream."""
        try:
            result_stream_key = f"{self.stream_key}:results"
            result = {
                "requestId": request_id,
                "data": json.dumps({
                    "clubId": club_id or "",
                    "athleteId": athlete_id or "",
                    "trigger": trigger,
                    "focus": "",
                    "intensity": "",
                    "rpe": 0,
                    "injuryRisk": 0,
                    "progressionAdjustment": 0,
                    "confidence": 0,
                    "modelVersion": "",
                    "generatedAt": datetime.utcnow().isoformat(),
                    "error": error,
                })
            }
            self.redis_client.xadd(result_stream_key, result, maxlen=1000, approximate=True)
        except Exception as e:
            logger.error(f"Failed to write error result to stream: {e}")

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
                    self.redis_client = redis.from_url(
                        self.redis_url,
                        decode_responses=True,
                        socket_timeout=None,
                        socket_connect_timeout=5,
                        health_check_interval=30,
                    )
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