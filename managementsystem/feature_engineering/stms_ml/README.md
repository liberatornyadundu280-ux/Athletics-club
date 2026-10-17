# STMS Recommendation Engine - ML Pipeline

Feature engineering, training, and inference pipeline for the Smart Trainer Management System recommendation engine.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   STMS      │────▶│  Redis       │────▶│  Inference      │
│  Backend    │     │  Streams     │     │  Worker         │
│  (triggers) │     │  (queue)     │     │  (FastAPI)      │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  MongoDB        │
                                          │  (recs + labels)│
                                          └────────┬────────┘
                                                   │
                    ┌──────────────────────────────┘
                    ▼
         ┌─────────────────────┐
         │  Nightly Batch Job  │
         │  (train.py)         │
         └─────────┬───────────┘
                   │
         ┌─────────▼───────────┐
         │  Feature Pipeline   │
         │  (features/)        │
         └─────────┬───────────┘
                   │
         ┌─────────▼───────────┐
         │  MongoDB            │
         │  (raw data)         │
         └─────────────────────┘
```

## Components

### 1. Feature Engineering (`features/`)

Modular feature extractors for each data domain:

| Module | Features | Source Collections |
|--------|----------|-------------------|
| `workload.py` | ACWR, TRIMP, monotony, strain, weekly progression | `workout_logs` |
| `compliance.py` | Completion rate, intensity adherence, consistency streaks | `workout_assignments`, `workout_logs` |
| `performance.py` | PB/SB trends, competition levels, goal progress | `performance_results`, `fitness_tests`, `athlete_goals` |
| `attendance.py` | Attendance rate, streaks, day-of-week patterns, excused vs unexcused | `attendance_records`, `training_sessions` |
| `injury.py` | Active injuries, history, RTP status, wellness trends | `injuries`, `injury_wellness` |
| `fitness.py` | Test baselines, trends, battery completeness, percentiles | `fitness_tests` |
| `demographics.py` | Age, gender, training age, youth status | `athletes` |
| `event_specific.py` | Event-group tailored features (sprint, middle, jumps, throws, combined) | `performance_results`, `workout_logs` |

**Pipeline orchestration**: `pipeline.py` - `RecommendationFeaturePipeline` class

### 2. Training (`train.py`)

```bash
# With real data (requires MongoDB)
python train.py --club-id <club_id> --start-date 2024-01-01 --end-date 2024-12-31 --output-dir models/

# With synthetic data (for testing pipeline)
python train.py --synthetic --output-dir models/

# With cross-validation
python train.py --club-id <club_id> --cv --output-dir models/
```

Outputs:
- `model_<target>_<timestamp>.pkl` - Trained model with metadata
- `scaler.pkl` - Feature scaler for inference
- `feature_importance.csv` - Feature importance rankings

### 3. Inference Worker (`inference_worker.py`)

Consumes triggers from Redis Streams, generates recommendations, writes to MongoDB.

```bash
python inference_worker.py \
  --model-path models/model_next_workout_rpe_20241201_120000.pkl \
  --scaler-path models/scaler.pkl \
  --config config.yaml
```

**Triggers** (published by STMS backend):
- `workout_completed` - Athlete finishes workout
- `performance_result_added` - New competition result
- `injury_status_changed` - Injury created/updated/RTP
- `weekly_cron` - Monday 6 AM batch

## Quick Start

### 1. Install Dependencies

```bash
cd managmentsystem/feature_engineering/stms_ml
pip install -r requirements.txt
```

### 2. Configure

Copy `config.yaml` to `config.local.yaml` and update:
- MongoDB URI
- Redis URL
- Cloudinary credentials (for model artifact storage)

### 3. Test with Synthetic Data

```bash
python train.py --synthetic --output-dir models/ --cv
```

### 4. Train with Real Data

```bash
# Ensure MongoDB is accessible and has data
python train.py \
  --club-id <your_club_object_id> \
  --start-date 2024-06-01 \
  --end-date 2024-12-01 \
  --output-dir models/ \
  --cv
```

### 5. Deploy Inference Worker

```bash
# On Render (or your hosting platform)
python inference_worker.py \
  --model-path models/model_next_workout_rpe_20241201_120000.pkl \
  --scaler-path models/scaler.pkl \
  --config config.local.yaml
```

## Feature Engineering Details

### Time Windows (configurable in `config.yaml`)

| Window | Days | Purpose |
|--------|------|---------|
| Acute | 7 | Recent fatigue/freshness |
| Subacute | 28 | Mesocycle load |
| Chronic | 90 | Long-term fitness |
| Season | 180 | Annual planning |

### Feature Groups (enable/disable in config)

```yaml
features:
  enabled_groups:
    workload: true
    compliance: true
    performance: true
    attendance: true
    injury: true
    fitness: true
    demographics: true
    event_specific: true
```

### Target Variables (multi-target)

| Target | Type | Description |
|--------|------|-------------|
| `next_workout_rpe` | Regression | Predicted RPE for next session |
| `next_week_focus` | Classification | Training focus category |
| `intensity_prescription` | Regression | Target intensity % |
| `injury_risk_score` | Regression | 0-1 injury risk |
| `progression_adjustment` | Regression | Weekly load adjustment % |

## Integration with STMS Backend

### Publishing Triggers (Node.js/TypeScript)

```typescript
// In workout completion handler
await redis.xadd('stms:recommendation:triggers', '*', {
  clubId: clubId.toString(),
  athleteId: athleteId.toString(),
  trigger: 'workout_completed',
  actorUid: req.user!.uid,
  timestamp: Date.now().toString(),
});
```

### Consuming Recommendations

```typescript
// GET /api/v1/recommendations/:athleteId
const recommendation = await db.recommendations.findOne({
  clubId,
  athleteId,
  status: 'pending',
}, { sort: { generatedAt: -1 } });
```

## Model Retraining

Automated nightly retraining (configured in `config.yaml`):

```yaml
training:
  schedule:
    enabled: true
    cron: "0 2 * * *"  # Daily 2 AM UTC
    min_new_samples: 50
```

The training job:
1. Extracts features for all active athletes at weekly intervals
2. Generates labels from coach reviews + athlete feedback
3. Trains XGBoost with time-series CV
4. Validates against holdout period
5. Uploads versioned artifact to Cloudinary
6. Updates inference worker (rolling deploy)

## Cold Start Strategy

For athletes with < 4 weeks data:
1. **Pre-trained model** on public athletics datasets (World Athletics, OpenPowerlifting, etc.)
2. **Rule-based fallback** using event templates + fitness baselines
3. **Confidence scoring** - low confidence triggers coach review

## Explainability

Each recommendation includes `drivers` (top 3 factors):
- `"2 active injury/return-to-play records"`
- `"3 recent workouts at RPE 8+"`
- `"Attendance over recent window is 58%"`

## Monitoring

Key metrics to track:
- **Prediction accuracy** (RPE MAE, focus classification accuracy)
- **Coach acceptance rate** (accepted / total recommendations)
- **Athlete satisfaction** (thumbs up/down ratio)
- **Feature drift** (population feature distribution shifts)
- **Inference latency** (p99 < 100ms)

## File Structure

```
stms_ml/
├── config.yaml              # Main configuration
├── config.local.yaml        # Local overrides (gitignored)
├── requirements.txt         # Python dependencies
├── train.py                 # Training script
├── inference_worker.py      # Redis Streams consumer
├── features/
│   ├── __init__.py
│   ├── base.py              # Base classes
│   ├── pipeline.py          # Main pipeline
│   ├── workload.py
│   ├── compliance.py
│   ├── performance.py
│   ├── attendance.py
│   ├── injury.py
│   ├── fitness.py
│   ├── demographics.py
│   └── event_specific.py
└── models/                  # Generated artifacts (gitignored)
    ├── model_*.pkl
    ├── scaler.pkl
    └── feature_importance.csv
```

## Next Steps

1. **Provision infrastructure**: Render Python service, Upstash Redis, Cloudinary
2. **Run synthetic training**: Validate pipeline end-to-end
3. **Connect STMS backend triggers**: Add Redis xadd calls
4. **Train on real data**: Once sufficient coach/athlete labels exist
5. **Deploy inference worker**: As Render background worker
6. **Monitor and iterate**: Track acceptance rates, retrain weekly