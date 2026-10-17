# STMS Recommendation Engine — Hybrid Upgrade Plan

**Goal**: Enhance the existing XGBoost/LightGBM recommendation engine (Module 6 spec) with:
- Subjective readiness metrics (daily survey + sRPE)
- Deterministic rule-based safety layer
- Event/phase-aware workout templates (mined from public sources during development)
- Explainability & auto-regulation

**Constraints**: No changes to core model architecture, no schema breaking changes, no paid dependencies.

---

## 1. Architecture: Hybrid Rule-ML Engine (Zero-Cost)

```
[Daily Readiness Survey + sRPE + STMS Context]
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ 1. RULE-BASED SAFETY LAYER (Deterministic)  │
│    • Injury filters: block contraindicated  │
│      exercises (hamstring strain → no hills)│
│    • CNS ordering: Warmup → Explosive →     │
│      Strength → Cooldown                    │
│    • Readiness gating: if soreness ≥ 4/5,   │
│      reduce prescribed volume by 25%        │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ 2. XGBOOST/LIGHTGBM MODEL (Trained)         │
│    Inputs: 230+ features from STMS          │
│      - Workload (ACWR, TRIMP, monotony)     │
│      - Compliance (completion rate, RPE     │
│        adherence, streaks)                  │
│      - Performance (PB/SB trends, goals)    │
│      - Attendance (rate, streaks, DoW)      │
│      - Injury (active, history, RTP,        │
│        wellness trends)                     │
│      - Fitness (test baselines, trends)     │
│      - Demographics (age, gender, training  │
│        age)                                 │
│      - Event-specific (sprint/jump/throw)   │
│      - NEW: Daily readiness (soreness,      │
│        sleep, stress) + sRPE load           │
│    Outputs (multi-target):                  │
│      - next_workout_rpe (regression)        │
│      - next_week_focus (classification)     │
│      - intensity_prescription (regression)  │
│      - injury_risk_score (regression)       │
│      - progression_adjustment (regression)  │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│ 3. TEMPLATE RETRIEVAL & AUTO-REGULATION     │
│    • Model predicts focus/intensity/RPE     │
│    • Rule engine selects matching workout   │
│      template from library                  │
│    • Auto-regulation scales sets/reps       │
│      based on daily readiness               │
└─────────────────────────────────────────────┘
```

---

## 2. Data Additions (Minimal Schema Changes)

### 2.1 New Collection: `daily_readiness`
**Purpose**: Daily 30-second subjective check-in for ALL athletes (not just injured).

```javascript
{
  _id: ObjectId,
  clubId: ObjectId,
  athleteId: ObjectId,
  date: "2024-01-15",           // YYYY-MM-DD (unique per athlete per day)
  soreness: 3,                  // 1-5 scale (1=none, 5=severe)
  sleepQuality: 4,              // 1-5 scale (1=terrible, 5=excellent)
  stressEnergy: 2,              // 1-5 scale (1=exhausted, 5=energized)
  notes: "optional text",       // free text, max 500 chars
  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**:
```javascript
{ clubId: 1, athleteId: 1, date: -1 }  // unique compound
{ clubId: 1, date: -1 }                // coach dashboard queries
```

**API Endpoints**:
- `POST /api/v1/readiness` — athlete submits daily survey
- `GET /api/v1/readiness/:athleteId` — coach views history
- `GET /api/v1/readiness/club/summary` — coach sees team readiness heatmap

---

### 2.2 Enhanced `exercises` Collection (Additive Fields)
**Purpose**: Enable CNS ordering & energy system filtering for rule engine.

```javascript
// ADD to existing exercise documents
{
  // ... existing fields ...
  phase: "warmup" | "explosive" | "strength" | "cooldown" | "mobility",
  energySystem: "atp-pcr" | "glycolytic" | "aerobic" | "mixed",
  movementPattern: "squat" | "hinge" | "push" | "pull" | "lunge" | "carry" | "sprint" | "jump" | "throw",
  cnsIntensity: 1 | 2 | 3 | 4 | 5,        // 1=low (mobility), 5=max (max sprint/plyo)
  contraindications: ["hamstring", "knee", "lower_back", "shoulder", "ankle"]  // body parts to avoid
}
```

**Migration**: Backfill existing exercises with defaults (`phase: "strength"`, `energySystem: "mixed"`, `cnsIntensity: 3`, `contraindications: []`)

---

### 2.3 Enhanced `workouts` Collection (Additive Fields)
**Purpose**: Periodization-aware template selection.

```javascript
// ADD to existing workout documents
{
  // ... existing fields ...
  periodizationPhase: "off-season" | "pre-comp" | "competition" | "transition",
  energySystemFocus: "atp-pcr" | "glycolytic" | "aerobic" | "mixed",
  templateType: "speed" | "strength" | "endurance" | "technique" | "recovery" | "testing",
  targetEventGroup: "sprints" | "middle_distance" | "long_distance" | "jumps" | "throws" | "combined",
  estimatedRPE: 6.5,                        // model can predict, template provides prior
  estimatedDurationMinutes: 90
}
```

---

### 2.4 Enhanced `workout_logs` Collection (Already Exists, Ensure Fields)
**Purpose**: Training load calculation (sRPE × duration).

```javascript
// EXISTING — ensure these are populated
{
  perceivedEffort: 7,              // 1-10 RPE (REQUIRED)
  durationMinutes: 85,             // REQUIRED
  exerciseResults: [               // optional but valuable
    { exerciseIndex: 0, completedSets: 4, actualReps: "5", rpe: 8, notes: "" }
  ]
}
```

**Derived Feature** (computed in feature pipeline, not stored):
```python
session_load = perceivedEffort * durationMinutes  # sRPE method
```

---

## 3. YouTube Data Mining (Development Only — Training Data)

**Role**: Populate `exercises` + `workouts` libraries with event-specific templates during development. **Not part of production model.**

### 3.1 Mining Pipeline (Offline Scripts)
```
YouTube Channels (World Athletics, ALTIS, USTFCCCA, etc.)
       │
       ▼
yt-dlp + youtube-transcript-api + Whisper (local CPU)
       │
       ▼
Regex / Local LLM (Ollama Llama-3) → Structured JSON
       │
       ▼
Validation & Deduplication
       │
       ▼
Bulk Insert → MongoDB (exercises + workouts collections)
```

### 3.2 Required Fields to Extract (Per Workout Template)

| Field | Source | Example |
|-------|--------|---------|
| `event` | Video title/description | "100m", "Long Jump", "Shot Put" |
| `periodizationPhase` | Video context/season | "pre-comp", "competition" |
| `energySystemFocus` | Exercise types | "atp-pcr" (sprints/jumps), "glycolytic" (200-400m), "aerobic" (800m+) |
| `templateType` | Session goal | "speed", "strength", "technique", "recovery" |
| `exercises[]` | Video content | See exercise fields below |
| `sourceUrl` | YouTube URL | "https://youtube.com/watch?v=..." |
| `sourceChannel` | Channel name | "ALTIS", "World Athletics" |
| `publishedDate` | Video date | "2023-03-15" |
| `confidence` | Extraction quality | 0.85 (0-1) |

### 3.3 Required Fields Per Exercise (Within Template)

| Field | Source | Example |
|-------|--------|---------|
| `name` | Spoken/text | "Flying 30m Sprint", "Box Jump", "Power Clean" |
| `phase` | Sequence position | "warmup" / "explosive" / "strength" / "cooldown" |
| `sets` | Prescribed | 4 |
| `reps` | Prescribed | "5" or "30m" |
| `restSeconds` | Prescribed | 180 |
| `tempo` | Prescribed | "explosive" |
| `targetZone` | Prescribed | "95-100% max velocity" |
| `coachingNotes` | Spoken cues | "Push the ground away, stay tall" |
| `equipment` | Visual/audio | ["boxes", "barbell", "cones"] |
| `primaryMuscles` | Knowledge | ["hamstrings", "glutes", "quadriceps"] |
| `energySystem` | Exercise type | "atp-pcr" |
| `movementPattern` | Biomechanics | "sprint" / "jump" / "hinge" / "push" |
| `cnsIntensity` | Expert rating | 5 (max sprint), 3 (tempo run) |
| `contraindications` | Expert knowledge | ["hamstring", "achilles"] |

### 3.4 Target Channels (Free, High-Quality)
- **World Athletics** — Official technique analysis
- **ALTIS** — Coach Dan Pfaff, Stu McMillan (sprints/jumps)
- **USTFCCCA** — Conference presentations
- **Chris Barnard (Overtime Athletes)** — Field events
- **Dr. Anatoly Bondarchuk** — Periodization theory
- **Juggernaut Training Systems** — Strength for track
- **SimpliFaster** — Speed/power development

### 3.5 Mining Scripts Location
```
managmentsystem/feature_engineering/data_mining/
├── youtube_extractor.py       # yt-dlp + transcript + Whisper
├── parser.py                  # Regex + Ollama → structured JSON
├── validator.py               # Schema validation, deduplication
├── importer.py                # Bulk insert to MongoDB
└── channels.yaml              # Channel list + event mappings
```

---

## 4. Feature Engineering Updates (Python Pipeline)

### 4.1 New Feature Group: `readiness`
**File**: `features/readiness.py` (NEW)
```python
class ReadinessFeatures(BaseFeatureExtractor):
    """Daily subjective readiness + sRPE load features."""
    
    def extract(self) -> Dict[str, Any]:
        # 7-day rolling averages
        # Trends (soreness increasing?)
        # sRPE load (acute/chronic)
        # Readiness score = f(soreness, sleep, stress, load)
        return {
            "readiness_soreness_7d_avg": ...,
            "readiness_sleep_7d_avg": ...,
            "readiness_stress_7d_avg": ...,
            "readiness_score": ...,           # 0-1 composite
            "sRPE_load_acute": ...,           # 7-day
            "sRPE_load_chronic": ...,         # 28-day
            "sRPE_acwr": ...,                 # acute/chronic
            "readiness_soreness_trend": ...,  # slope
            "high_soreness_days_7d": ...,     # count ≥ 4
        }
```

### 4.2 Integration
- Add `"readiness": true` to `config.yaml` → `features.enabled_groups`
- Register in `pipeline.py` → `RecommendationFeaturePipeline._create_pipeline()`

---

## 5. Rule Engine Implementation (TypeScript Backend)

### 5.1 File: `stms-backend/src/services/ruleEngine.ts` (NEW)
```typescript
// Deterministic safety & ordering rules
export class RuleEngine {
  // 1. Injury contraindications
  static filterExercises(exercises: Exercise[], injuries: Injury[]): Exercise[]
  
  // 2. CNS ordering enforcement
  static enforceOrder(exercises: Exercise[]): Exercise[]
  
  // 3. Readiness auto-regulation
  static autoRegulate(
    workout: Workout, 
    readiness: DailyReadiness,
    sRPELoad: { acute: number; chronic; acwr: number }
  ): Workout  // returns modified workout with scaled sets/reps
  
  // 4. Template matching
  static matchTemplate(
    eventGroup: string,
    phase: string,
    focus: string,
    intensity: string
  ): Workout[]
}
```

### 5.2 Integration Point
**File**: `stms-backend/src/services/recommendation.service.ts`
```typescript
// After ML model predicts focus/intensity/RPE
const mlOutput = await generateMLRecommendation(...);

// Apply rule engine
const safeWorkout = RuleEngine.filterExercises(template.exercises, athlete.injuries);
const orderedWorkout = RuleEngine.enforceOrder(safeWorkout);
const regulatedWorkout = RuleEngine.autoRegulate(orderedWorkout, readiness, sRPELoad);

// Final recommendation combines ML + rules
```

---

## 6. Training Pipeline Updates

### 6.1 Label Generation (Enhanced)
**Existing labels from coach/athlete actions**:
- Coach `accept` / `modify` / `dismiss` → implicit labels
- Athlete `thumbs_up` / `thumbs_down` → satisfaction labels

**New labels from daily readiness**:
- Next-day soreness change → injury risk proxy
- Next-week compliance → adherence proxy

### 6.2 Retraining Schedule (Unchanged)
- Nightly batch (2 AM UTC) via `train.py`
- Time-series CV with 7-day gap
- Minimum 50 new labeled samples before retrain
- Model versioned to Cloudinary

---

## 7. Deployment (Free Tiers Only)

| Component | Platform | Free Tier Limits |
|-----------|----------|------------------|
| FastAPI Backend + ML Workers | Render | 750 hrs/mo, spins down after 15 min inactivity |
| PostgreSQL (Supabase) | Supabase | 500 MB, 1 GB bandwidth |
| Redis Streams | Upstash | 10k requests/day, 256 MB |
| Model Artifacts | Cloudinary | 25 GB storage, 25 GB bandwidth |
| Frontend Dashboard | Streamlit Cloud | Unlimited public apps |
| Mining Scripts | Local / GitHub Actions | Free |

---

## 8. Implementation Checklist

### Phase 1: Data Layer (Week 1)
- [ ] Create `daily_readiness` collection + indexes
- [ ] Add `phase`, `energySystem`, `movementPattern`, `cnsIntensity`, `contraindications` to `exercises`
- [ ] Add `periodizationPhase`, `energySystemFocus`, `templateType`, `targetEventGroup` to `workouts`
- [ ] Create API endpoints for daily readiness (POST/GET)
- [ ] Add frontend daily check-in modal (30 sec)

### Phase 2: Feature Pipeline (Week 1-2)
- [ ] Implement `features/readiness.py`
- [ ] Register in `pipeline.py`
- [ ] Update `config.yaml` → enable `readiness` group
- [ ] Test feature extraction with mock data

### Phase 3: Rule Engine (Week 2)
- [ ] Implement `ruleEngine.ts` (safety filter, CNS order, auto-regulation)
- [ ] Integrate into `recommendation.service.ts`
- [ ] Unit test injury filtering, volume scaling

### Phase 4: Model Retraining (Week 2-3)
- [ ] Run `train.py` with new readiness features
- [ ] Validate CV metrics improve
- [ ] Deploy new model version

### Phase 5: Data Mining (Parallel, Ongoing)
- [ ] Build `data_mining/` scripts
- [ ] Mine 50+ templates per event group
- [ ] Validate & import to `exercises` + `workouts`
- [ ] Coach review & approve templates

---

## 9. What DOES NOT Change

| Component | Status |
|-----------|--------|
| Core ML algorithm (XGBoost/LightGBM) | ✅ Unchanged |
| Multi-target outputs (5 targets) | ✅ Unchanged |
| Nightly retraining pipeline | ✅ Unchanged |
| Redis Streams inference queue | ✅ Unchanged |
| Coach review workflow (accept/modify/dismiss) | ✅ Unchanged |
| Athlete Smart Plan UI | ✅ Unchanged |
| Multi-tenant isolation (per-club models) | ✅ Unchanged |
| MongoDB collections (users, clubs, memberships, athletes, sessions, attendance, injuries, performance, fitness, goals, recommendations, permissions, announcements) | ✅ Unchanged |
| Authentication (Firebase + JWT) | ✅ Unchanged |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Daily readiness submission rate | > 70% active athletes |
| Coach recommendation acceptance rate | > 60% |
| Injury risk score AUC (next 7 days) | > 0.75 |
| Next-workout RPE MAE | < 1.0 |
| Auto-regulation volume adjustments | < 15% of sessions |
| Template library coverage | 10+ templates per event/phase |

---

## 11. Rollback Plan

If readiness features degrade model performance:
1. Disable `readiness` group in `config.yaml`
2. Retrain without readiness features
3. Deploy previous model version from Cloudinary

No schema migration rollback needed (all additive fields).