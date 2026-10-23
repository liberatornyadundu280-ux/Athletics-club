# Exercise library data sources

The STMS exercise library is a hybrid catalogue:

1. a curated, normalized slice of **free-exercise-db** for generic strength, mobility and
   plyometric movements; and
2. an authored **STMS track & field layer** for the drills, sprint sessions, jumps and throws
   that a generic gym dataset does not contain.

The library is the movement catalogue. A workout line owns the dose — sets, reps or distance,
rest, tempo and target. That separation lets a coach swap a movement without losing the
prescription.

## Source 1 — free-exercise-db

| | |
| --- | --- |
| Repository | https://github.com/yuhonas/free-exercise-db |
| Dataset | `dist/exercises.json` (876 entries) |
| Licence | **Unlicense** (public domain dedication) |
| Images | JPEG files in the same repository, served from `raw.githubusercontent.com` |
| Used for | Strength, power, plyometric, mobility and a few conditioning movements |

The upstream dataset is much larger than STMS needs. We curate rather than import all 876
entries:

- **149 entries** are checked in, normalized into the STMS vocabulary.
- Only movements that are useful to a track & field programme are kept.
- Machine- and cable-dependent exercises are excluded from the base slice. A few authored
  track-layer entries use a cable or band where that is the realistic coaching tool.
- Three upstream entries with empty instruction arrays (`Side Bridge`, `Push Press`,
  `One-Arm Kettlebell Swings`) have short STMS-authored cues in the build script.
- Instructions are cleaned of upstream formatting artefacts and bounded to six steps.

The normalized output lives at
`stms-backend/src/data/exercises.base.json`. The normalization was a one-off; the checked-in
JSON is the source of truth. To regenerate it, download the upstream `exercises.json` and
follow the transformation rules in this document.

### Image policy

- The image URL is the upstream `0.jpg` for the exact exercise id, for example
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg`.
- An image is used **only when it depicts the same movement**. If no accurate image exists,
  `imageUrl` is `null` and the picker shows a neutral category icon.
- Track-layer entries currently use no upstream images; they show a neutral category
  placeholder. A close-but-different movement is not reused just to fill the card. If an exact
  image is sourced later, add it with the same provenance rules.
- v1 hotlinks the upstream files. Before a large public launch, mirror the images to
  Cloudinary or another controlled host so the library does not depend on GitHub's raw
  endpoint or its rate limits.

## Source 2 — STMS track & field layer

| | |
| --- | --- |
| File | `stms-backend/src/data/track-exercises.ts` |
| Entries | 71 |
| Licence | STMS-authored; no upstream copy |
| Used for | Sprint mechanics, acceleration, speed endurance, plyometrics, throws, jumps, prehab and recovery |

Each entry is written for this project. Instructions are original coaching cues, not copied
from a paid plan, a coaching website or a book. The layer covers:

- warm-up and mobility,
- sprint mechanics (A/B skips, wall drills, starts),
- acceleration and max velocity,
- speed endurance and special endurance (60m–400m repetitions, broken 400m, split 400m),
- throws and jumps drills,
- adductor/hamstring prehab and core stability,
- recovery sessions.

The track layer is intentionally **not** a workout library. It describes how to perform a
movement; the starter workouts and the coach's own sessions decide how much of it to do.

## Canonical vocabulary

| Field | Values |
| --- | --- |
| `category` | `strength`, `power`, `plyometric`, `sprint-drill`, `speed`, `endurance`, `mobility`, `jumps`, `throws`, `core`, `recovery` |
| `phase` | `warmup`, `mobility`, `technique`, `speed`, `power`, `strength`, `prevention`, `core`, `conditioning`, `recovery` |
| `energySystem` | `atp-pcr`, `glycolytic`, `aerobic`, `mixed` |
| `eventGroups` | `sprints`, `middle_distance`, `long_distance`, `jumps`, `throws`, `combined`, `general` |
| `level` | `beginner`, `intermediate`, `advanced` |
| `source` | `free-exercise-db`, `stms`, `club`, `legacy` |

`clubId: null` marks a platform-wide entry. A club-created exercise carries the club's
ObjectId and `source: 'club'`.

## Provenance fields

Every seeded record stores:

```ts
{
  source: 'free-exercise-db' | 'stms',
  sourceId?: string,
  sourceUrl?: string,
  license: 'Unlicense' | 'STMS',
  imageUrl?: string | null,
}
```

This makes it possible to audit where a movement came from without relying on memory or a
spreadsheet.

## Seeding

```bash
cd stms-backend

# Validate and count without touching the database
npm run db:seed:exercises -- --dry-run

# Upsert the platform library (idempotent)
npm run db:seed:exercises

# Remove seeded entries that are no longer in the catalogue, then upsert the rest
npm run db:seed:exercises -- --reset
```

`db:seed` also calls the library seeder and writes the editable starter workout block into
the club. `--reset` never deletes club-created exercises, and it keeps the ids of exercises
that are still present so existing workout lines stay linked.

## Starter workout block

`stms-backend/src/data/starter-workouts.ts` contains a four-week, three-session-per-week
400m block for a sprint-based club. It is a coherent high/low structure, not twelve unrelated
sessions:

| Week | Day 1 | Day 2 | Day 3 |
| --- | --- | --- | --- |
| 1 — general preparation | Acceleration & Strength (high) | Extensive Tempo (low) | Mechanics & Elastic (moderate) |
| 2 — speed / speed endurance | Max Velocity (high) | Tempo & Recovery (low) | Speed Endurance 3×60 (high) |
| 3 — special endurance | Special Endurance 2×200 (high) | Strength Maintenance (moderate) | Broken 400m (high) |
| 4 — taper / race model | Race Activation (moderate) | Split 400m (high) | Pre-Race Recovery (low) |

The shape follows the public guidance listed below:

- **High / low / high.** High-CNS sessions are separated by at least 48 hours; the middle day
  is either low-intensity tempo or a short strength-maintenance session.
- **Speed work is short and fully recovered.** Acceleration and max-velocity reps are stopped
  when posture or speed drops, rather than turning a quality session into conditioning.
- **Speed endurance is 60m at 95% with full recovery.** The 60m repeats are not a timed set.
- **Special endurance is race-pace work.** The 200s are run at the athlete's 400m race rhythm;
  the broken and split 400m rehearse the second half with a short recovery inside the set.
- **Tempo is aerobic support.** It is deliberately below the "middle intensity" band that
  competes with race-pace quality.
- **Strength is general and maintained.** It supports the running sessions and stops short of
  failure rather than chasing a new maximum during race-pace weeks.
- **The taper reduces volume, not speed.** Week 4 keeps short, sharp work and then protects
  freshness.

Every workout is an ordinary club workout (`isTemplate: true`, `starterPack: true`) with every
line linked to a library exercise. A coach can edit, duplicate or delete them. The 400m paces
are examples for a 52-second runner: about 25s per 200m at race pace, 38–39s for 300m,
13–14s for the final 100m, and 40–45s for tempo 200s. They are starting points for a coach to
adjust, not a universal prescription.

### Source basis

The block was informed by these public sources. It does not copy a paid plan or a coaching
website's workout; the session doses are STMS-authored around their published principles.

| Source | What it informed |
| --- | --- |
| World Athletics, [The 400 metres](https://worldathletics.org/download/downloadnsa?filename=ee60d9c7-6a54-406c-8c32-7adfd7c01fad.pdf&urlslug=the-400-metres) (New Studies in Athletics, 2008) | The 400m as a prolonged sprint; even pacing; speed endurance, tempo, event running and strength as separate qualities |
| UK Athletics, [Classifying Sprint Training Methods](https://speedendurance.com/wp-content/uploads/ebooks/UKA-Michael_Khmel&Tony_Lester_CLASSIFYING_SPRINT_TRAINING_METHODS.pdf) | Definitions of acceleration, max velocity, speed endurance, special endurance and extensive tempo; full recovery for high-intensity work; 400m split runs |
| Haugen et al., [The Training and Development of Elite Sprint Performance](https://pmc.ncbi.nlm.nih.gov/articles/PMC6872694/) (Sports Medicine - Open, 2019) | High/low organisation, 48-hour recovery between high-intensive sessions, and the dose table for acceleration, max velocity, speed endurance and tempo |
| NSCA, [Designing Speed Training Sessions](https://www.nsca.com/education/articles/kinetic-select/designing-speed-training-sessions) | Sprint quality, full recovery, and ending a session when performance drops |
| Australian Athletics, [Energy System Chart](https://coachathletics.com.au/coaching-education/energy-system-chart-how-to-train-maximum-speed-speed-endurance-and-tempo) | Practical intensity, rest and volume ranges for maximum speed, speed endurance, special endurance and tempo |

### Re-seeding and coach edits

Re-running `db:seed` only inserts missing starter workouts. It never overwrites an existing
starter workout, so a coach's edits survive a routine seed. When a legacy club exercise shares
a name with a global library entry, starter lines resolve to the global entry; the legacy copy
stays only for old logs and is hidden in the picker.

When the pack itself changes, use the explicit refresh path:

```bash
# Update existing unedited starter workouts to the current pack
npm run db:seed -- --refresh-starters

# Also remove old starter workouts that no longer exist in the pack
# and have no assignments or workout logs
npm run db:seed -- --refresh-starters --prune-starters
```

The API marks a starter workout `coachEdited: true` the first time a coach saves it. Refresh
skips those records; prune also skips them, and skips any old starter workout still referenced
by an assignment or log. A fresh environment receives only the current pack.

## Filters and search

`GET /workouts/exercises` supports:

| Query | Meaning |
| --- | --- |
| `search` | Case-insensitive match across name, description, tags, muscles and equipment |
| `category` | One canonical category |
| `phase` | One canonical phase |
| `eventGroup` | One event group; matches entries whose `eventGroups` array contains it |
| `equipment` | Case-insensitive equipment match |
| `muscle` | Case-insensitive primary or secondary muscle match |
| `level` | One level |
| `source` | One source |
| `limit` / `offset` | Pagination; default 250, maximum 500 |

The picker loads the catalogue once and filters locally for instant search. The API filters
are available for other clients and for future server-side search.

## What is deliberately out of scope for v1

- YouTube or video references. The schema has `videoUrl`, but the UI does not show videos yet.
- Paid exercise APIs, wger, or scraped coaching plans.
- Global workout CRUD. Starter workouts are club-scoped and editable.
- Automatic exercise substitution. The coach swaps a movement and keeps the dose.
- A licence review of every upstream image beyond the repository's Unlicense declaration.
  Attribution is recorded even though the licence does not require it.

## Maintenance checklist

When adding a movement:

1. Add it to `track-exercises.ts` (authored) or regenerate the base JSON (imported).
2. Give it a canonical `category`, `phase`, `energySystem`, `eventGroups`, `level` and
   `cnsIntensity`.
3. Add at least one instruction and a short description.
4. Set `source`, `license` and, for imported entries, `sourceId` / `sourceUrl`.
5. Add an image only if it shows the same movement; otherwise leave `imageUrl` empty.
6. Run `npm run db:seed:exercises -- --dry-run`, then `npm run db:seed:exercises`.
7. If the movement is used by a starter workout, update `starter-workouts.ts`, bump
   `STARTER_PACK_VERSION`, then run `npm run db:seed -- --refresh-starters`
   (add `--prune-starters` if session names changed).
