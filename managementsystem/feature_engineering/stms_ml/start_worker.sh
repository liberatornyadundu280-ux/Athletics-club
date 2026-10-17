#!/usr/bin/env bash
# Start the STMS ML Inference Worker

set -e

# Load environment variables from .env if exists
if [ -f "../../.env" ]; then
    export $(grep -v '^#' ../../.env | xargs)
fi

# Default values
MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-stms_dev}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
MODEL_PATH="${MODEL_PATH:-./models/model_next_workout_rpe_20261001_043023.pkl}"
SCALER_PATH="${SCALER_PATH:-./models/scaler.pkl}"
CONFIG_PATH="${CONFIG_PATH:-./config.local.yaml}"
STREAM_KEY="${ML_INFERENCE_STREAM_KEY:-stms:recommendation:triggers}"
CONSUMER_GROUP="${ML_INFERENCE_CONSUMER_GROUP:-inference-workers}"
CONSUMER_NAME="${CONSUMER_NAME:-worker-1}"

echo "Starting STMS Inference Worker..."
echo "MongoDB: $MONGO_URI"
echo "Database: $MONGO_DB"
echo "Redis: $REDIS_URL"
echo "Model: $MODEL_PATH"
echo "Scaler: $SCALER_PATH"
echo "Config: $CONFIG_PATH"
echo "Stream: $STREAM_KEY"
echo "Consumer Group: $CONSUMER_GROUP"
echo "Consumer Name: $CONSUMER_NAME"

# Check if model exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "ERROR: Model file not found at $MODEL_PATH"
    echo "Available models:"
    ls -la ./models/
    exit 1
fi

# Check if scaler exists
if [ ! -f "$SCALER_PATH" ]; then
    echo "WARNING: Scaler file not found at $SCALER_PATH"
fi

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
    echo "WARNING: Config file not found at $CONFIG_PATH"
fi

# Install Python dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Run the worker
python inference_worker.py \
    --mongo-uri "$MONGO_URI" \
    --database "$MONGO_DB" \
    --redis-url "$REDIS_URL" \
    --model-path "$MODEL_PATH" \
    --scaler-path "$SCALER_PATH" \
    --config "$CONFIG_PATH" \
    --stream-key "$STREAM_KEY" \
    --consumer-group "$CONSUMER_GROUP" \
    --consumer-name "$CONSUMER_NAME"