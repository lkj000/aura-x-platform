# AURA-X Platform — Product Requirements Document

**Version**: 1.1  
**Date**: 2026-04-15  
**Author**: Agentic Engineer (derived from codebase audit + first-principles analysis)  
**Status**: Active — governs all engineering decisions until superseded

---

## 0. How to Read This Document

This PRD is written from an **agentic engineering perspective**: it describes *jobs users need done*, the *systems that serve those jobs*, and the *contracts between those systems*. Every section links back to a job. If a feature cannot be traced to a job, it should not be built.

The hierarchy is:

```
Problem → Persona → Job-to-be-Done → Requirement → Acceptance Criteria → Metric
```

---

## 1. Problem Statement (First Principles)

### The Real Problem

Amapiano is one of the fastest-growing music genres globally, originating from South Africa's townships. It has a highly specific sonic identity: log drums, piano rolls, bass lines, and a culturally encoded feeling that separates authentic Amapiano from imitation.

**Three problems converge:**

**P1 — Production barrier**: Making authentic Amapiano requires expensive DAWs, hardware controllers, years of ear training, and deep cultural knowledge. The barrier price-gates the culture from its own producers.

**P2 — AI alignment gap**: Existing AI music tools (Suno, Udio, MusicGen raw) generate music that *sounds like* Amapiano but *is not* Amapiano. They lack: log drum timbral contracts, groove fingerprint coherence, Dorian mode accuracy, Euclidean percussion patterns, and feedback loops that teach the model what authentic means.

**P3 — Workflow fragmentation**: A producer today uses 4–6 tools in sequence: a DAW to arrange, a stem separator to remix, a DJ tool to plan sets, a marketplace to sell, a community tool to share. Each handoff loses context and introduces friction.

### The Opportunity

Build a **vertically integrated AI production platform** where every layer — generation, scoring, DAW, DJ studio, marketplace — is connected by a continuous quality feedback loop. The platform gets smarter as more Amapiano producers use it, and every produced track is a data point that improves cultural authenticity for the next generation.

The moat is specificity: AURA-X is not a general music tool applied to Amapiano. It is an Amapiano-native system that happens to be implemented as software.

---

## 2. User Personas

### Persona A — Thabo, the Township Producer
- **Who**: 22-year-old in Soweto, producing on a mid-range laptop with pirated FL Studio
- **Goal**: Make a track that sounds like Major League DJz, share it, get bookings
- **Constraints**: No formal training, limited internet bandwidth, no budget for plugins
- **Frustration**: AI tools give him something "generic" — correct tempo but wrong *feel*, wrong groove fingerprint
- **JTBD**: "When I have a vibe in my head, help me turn it into a finished Amapiano track that sounds authentic, without me needing to know music theory"

### Persona B — Lesedi, the Semi-Pro DJ
- **Who**: 26-year-old in Johannesburg, plays weekend gigs, building a following on social media
- **Goal**: Create seamless DJ sets that showcase her taste, mix exclusive edits and stems
- **Constraints**: Limited time between gig prep and day job; needs reliable tools
- **Frustration**: Existing DJ tools don't understand Amapiano structure, Camelot compatibility, or Contrast Score sub-genre matching
- **JTBD**: "When I'm planning a set, help me select and order tracks that flow correctly for an Amapiano crowd, match groove fingerprints, and generate custom transitions"

### Persona C — Kagiso, the Established Producer
- **Who**: 31-year-old producer with production credits, sells beats and sample packs
- **Goal**: Monetize his sound library, collaborate with other producers remotely, maintain quality control
- **Constraints**: Protective of his sound; wants version control and royalty tracking
- **JTBD**: "When I release a sample pack, help me reach the right buyers, protect my IP, and automate the split payments"

### Persona D — The Platform (Internal Actor)
- **Goal**: Every track produced on AURA-X should improve the cultural model
- **JTBD**: "When a producer rates a generation as authentic, use that signal to improve the next generation"
- **Note**: This is the flywheel — without it, AURA-X is just a DAW with an AI button

---

## 3. Jobs-to-be-Done (JTBD) Catalog

Each job follows: **"When [situation], I want to [action], so I can [outcome]"**

| ID | Persona | Situation | Action | Outcome |
|----|---------|-----------|--------|---------|
| J1 | Thabo | I have a vibe/mood in mind | Describe it in natural language and generate a track | A finished Amapiano track I can build on |
| J2 | Thabo | My generated track sounds "off" | See exactly why it failed (timbral contract, groove, mode) and fix it | A track with authentic Amapiano structure |
| J3 | Thabo | I want to remix a track | Separate its 26 stems and rearrange them | A new track with my arrangement |
| J4 | Lesedi | I'm planning a 2-hour set | Select tracks, sort by energy arc, Camelot key, groove compatibility | A set that flows perfectly |
| J5 | Lesedi | I need a custom transition between two tracks | Generate a stem-based crossfade at matched BPM and key | A seamless transition |
| J6 | Kagiso | I want to sell a drum loop pack | Upload, tag, price, and list it | Passive income from buyers who can preview and purchase |
| J7 | Kagiso | I want to co-produce remotely | Share a project with edit permissions | Real-time or async collaboration without version conflicts |
| J8 | Platform | A user marks a generation as "fire" | Store it as a gold standard with full feature vector | Improve future generation quality for the genre |
| J9 | All | I want to understand my track's quality | See a breakdown: all 8 cultural scoring dimensions + timbral contract + groove fingerprint | Actionable feedback, not just a number |
| J10 | Thabo | I want to use hardware (pad controller, MIDI keyboard) | Plug in and have it mapped automatically | Professional workflow without configuration |

---

## 4. Product Vision

**AURA-X is the creative OS for Amapiano** — the first platform where AI generation, cultural scoring, professional DAW tools, DJ studio, and marketplace are a single integrated system, not a collection of features.

**North Star Metric**: *Cultural Authenticity Score* — the median score of tracks generated on the platform, measured against the gold standard corpus. Target: ≥ 82/100 by end of Phase 2. This score uses all 8 cultural dimensions defined in CLAUDE.md §1.7, including timbral contract compliance for the log drum and Dorian mode probability for piano.

**What AURA-X is NOT**:
- Not a general-purpose music generator (Suno, Udio)
- Not a generic DAW (FL Studio, Ableton)
- Not a DJ app (Rekordbox, Serato)

It is *all three*, deeply unified for *one genre*, and that specificity is the moat.

---

## 5. System Architecture (Requirement Contracts)

### 5.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React 19 + Vite)                   │
│  Pages: AI Studio, DAW, DJ Studio, Marketplace,         │
│         Community, Analysis, History                     │
└──────────────────────┬──────────────────────────────────┘
                       │ tRPC (type-safe)
┌──────────────────────▼──────────────────────────────────┐
│  API LAYER (Express + tRPC)                             │
│  Routers: auth, projects, tracks, generate,             │
│           queue, marketplace, community, djStudio,       │
│           training                                       │
└──────────┬─────────────────┬───────────────────────────┘
           │                 │
┌──────────▼──────┐ ┌────────▼────────────────────────────┐
│  DATABASE LAYER │ │  WORKFLOW LAYER (Temporal)           │
│  Railway MySQL  │ │  Workflows: MusicGeneration,         │
│  (Phase 0–1)    │ │             StemSeparation,           │
│  TiDB Cloud     │ │             QualityFeedback,          │
│  (Phase 2+)     │ │             TrainingIngestion         │
│  Drizzle ORM    │ └────────┬────────────────────────────┘
└─────────────────┘          │
                  ┌──────────▼──────────────────────────┐
                  │  AI LAYER (Modal.com)               │
                  │  analyze_track, analyze_training_   │
                  │  track, separate_stems,             │
                  │  separate_training_stems,           │
                  │  generate_music, render_set         │
                  │  [Phase 3] fine_tune_amapiano       │
                  └─────────────────────────────────────┘
```

### 5.2 The Feedback Loop (Critical Path — Currently Broken)

This loop is the core product differentiator. It is currently **not implemented end-to-end**.

```
Generate → Score (8 dims + timbral + groove) → Display → User Rates → Store as Gold Standard
    ↑                                                             ↓
    └────────────── LoRA Fine-tune Signal (Phase 3) ─────────────┘
```

**Required contracts:**
1. Every generation MUST have a cultural score before being returned to the user
2. Every score MUST be displayable as a full breakdown (8 dimensions with sub-scores, not a single number)
3. Every generation the user rates ≥ 4/5 MUST be stored in `gold_standard_generations`
4. The `model_training_datasets` table MUST be populated automatically
5. The fine-tuning pipeline (Phase 3) MUST NOT start before 500 gold standard generations are collected

### 5.3 Analysis Dimensions Contract

Every track analysed on the platform must produce outputs for all of these dimensions. This is the minimum viable feature vector:

| Dimension | Field name in DB | Type | Source |
|---|---|---|---|
| BPM | `bpm` | float | Essentia beat tracker |
| BPM confidence | `bpmConfidence` | float 0–1 | Essentia |
| Key (pitch class) | `key` | string | Essentia key detector |
| Camelot key | `camelotKey` | string | Derived from key |
| Dorian probability | `dorianProbability` | float 0–1 | Chroma analysis |
| Scale (minor/Dorian/Aeolian) | `scale` | enum | Mode detection |
| Swing % | `swingPercent` | float | Onset deviation analysis |
| Groove fingerprint | `grooveFingerprint` | JSON (512 floats) | 32-bar microtiming matrix |
| Log drum detected | `logDrumDetected` | boolean | Frequency + onset classifier |
| Log drum freq centre | `logDrumFreqHz` | float | Sub-bass spectral centroid |
| Log drum prominence | `logDrumProminence` | float 0–1 | Energy ratio in 40–220 Hz band |
| Log drum timbral score | `logDrumTimbralScore` | float 0–8 | Timbral contract evaluation |
| Log drum syncopation map | `logDrumSyncopationMap` | JSON | Onset offset + metrical strength |
| Contrast Score | `contrastScore` | float 0–200 | Formula: see CLAUDE.md §1.10 |
| Piano complexity | `pianoComplexity` | float 0–1 | Average chord density |
| Flute detected | `fluteDetected` | boolean | Instrument classifier |
| Cultural score | `culturalScore` | int 0–100 | All 8 dimensions summed |
| Cultural score breakdown | `culturalScoreBreakdown` | JSON (8 fields) | Per-dimension scores |
| LUFS | `lufs` | float | Loudness analysis |
| True peak | `truePeak` | float | Peak detection |
| Energy curve | `energyCurve` | JSON (array) | Per-section LUFS |
| Segments | `segments` | JSON (array) | Section markers |
| Detected language | `detectedLanguage` | string | Whisper + classifier |
| Language confidence | `languageConfidence` | float 0–1 | Classifier confidence |
| All detected languages | `detectedLanguages` | JSON (array) | Multi-language detection |
| Functional role map | `languageFunctionalRoles` | JSON | Per-segment role classification |
| Regional style | `regionalStyle` | string | BPM + swing + log drum classifier |
| Production era | `productionEra` | enum | Spectral signature + LUFS classifier |

---

## 6. Functional Requirements by Job

### Job J1 — Natural Language → Amapiano Track

**FR-J1-1**: The AI Studio MUST accept free-text prompts in English and Zulu/Sotho  
**FR-J1-2**: The system MUST offer 9 Amapiano presets as starting points (already implemented)  
**FR-J1-3**: Generation MUST complete within 90 seconds (p95); users MUST see real-time progress via WebSocket  
**FR-J1-4**: Every generation MUST auto-trigger quality scoring before the result is shown  
**FR-J1-5**: The user MUST NOT need to know BPM, key, or mode — defaults must be culturally correct (120 BPM, A minor / Dorian, 55% swing)

**Acceptance Criteria**:
- User types "late night Amapiano with log drums" → receives track with cultural score ≥ 70 within 90s
- Score breakdown shows all 8 dimensions, including log drum timbral compliance and Dorian probability
- Log drum timbral contract score ≥ 4.0/8.0 on every generation

---

### Job J2 — Cultural Diagnosis and Iteration

**FR-J2-1**: The Analysis page MUST display a score breakdown with all 8 cultural dimensions and their sub-scores  
**FR-J2-2**: Low scores MUST produce actionable text: "Your log drum timbral contract fails: spectral centroid is 680 Hz (too metallic — target 250–450 Hz)" not just "score: 55"  
**FR-J2-3**: The autonomous generation mode MUST retry up to 3× with an improved prompt when the score is below target  
**FR-J2-4**: All attempts in an autonomous run MUST be shown in history with individual scores  
**FR-J2-5**: Groove fingerprint MUST be visually displayable as a microtiming heatmap

**Acceptance Criteria**:
- Autonomous mode with target score 80 produces at least one attempt that scores ≥ 80, or returns the best attempt with a breakdown of exactly which sub-dimensions failed to meet the target

---

### Job J3 — Stem-Based Remixing

**FR-J3-1**: Users MUST be able to trigger stem separation from any track in their library  
**FR-J3-2**: Separation MUST produce the full 26 Amapiano stems where stems are present in the track  
**FR-J3-3**: Every separated log drum stem MUST be evaluated against the timbral contract (§1.9 of CLAUDE.md)  
**FR-J3-4**: Stems MUST be stored on S3 and accessible in the DAW timeline  
**FR-J3-5**: When a track is deleted, its stems MUST be deleted from S3 (currently a TODO — blocking for cost reasons)  
**FR-J3-6**: Stem separation status MUST be visible in real-time (Temporal not currently wired — blocker T3)

**Acceptance Criteria**:
- Upload track → click "Separate Stems" → within 3 minutes → stems appear in DAW sidebar → log drum stem has timbral score displayed → deleting track removes S3 objects

---

### Job J4 — Set Planning

**FR-J4-1**: DJ Studio MUST allow selection of 3–40 tracks for a set  
**FR-J4-2**: The system MUST auto-order tracks by energy arc (low → peak → resolution)  
**FR-J4-3**: Camelot wheel compatibility MUST be enforced — adjacent keys only unless user overrides  
**FR-J4-4**: Groove fingerprint cosine similarity ≥ 0.75 MUST be used as a secondary compatibility score  
**FR-J4-5**: Contrast Score sub-genre compatibility MUST flag when adjacent tracks are > 80 points apart (e.g., a Soulful track followed directly by an Sgija track)  
**FR-J4-6**: Set plan MUST be exportable as a cue sheet with timestamps

**Acceptance Criteria**:
- Select 20 tracks → generate set → receive ordered list with transitions, BPM changes, Camelot compatibility, groove similarity scores, and Contrast Score warnings → export as PDF/CSV

---

### Job J5 — Custom Transitions

**FR-J5-1**: Given two tracks, MUST generate a stem-based crossfade  
**FR-J5-2**: Transition MUST be BPM-matched (tempo detection + time-stretch via RubberBand if needed)  
**FR-J5-3**: Transition MUST be key-matched using Camelot compatibility  
**FR-J5-4**: Transition length MUST be configurable (4, 8, 16 bars)

**Acceptance Criteria**:
- Select Track A (112 BPM, 8A) + Track B (115 BPM, 9A) → generate 8-bar transition → rendered audio file saved to S3 → playable in Set Player → key transition sounds harmonically correct

---

### Job J6 — Marketplace (Sample Packs)

**FR-J6-1**: Producers MUST be able to upload a ZIP of audio files as a sample pack  
**FR-J6-2**: Each pack MUST have: title, description, price (free or paid), genre tags, Contrast Score range, preview audio  
**FR-J6-3**: Purchase flow MUST use Stripe and complete within 2 clicks  
**FR-J6-4**: Downloads MUST be tracked per pack for analytics  
**FR-J6-5**: Purchased packs MUST appear in the user's media library automatically

**Acceptance Criteria**:
- Kagiso uploads a pack tagged "Sgija drum loops, Contrast Score 155" → sets $15 price → Thabo browses, previews, purchases → pack appears in Thabo's library → Kagiso sees sale in dashboard → 15% take-rate deducted automatically

---

### Job J7 — Collaboration

**FR-J7-1**: Projects MUST support roles: owner, editor, viewer  
**FR-J7-2**: Invitations MUST be sent by email with expiry  
**FR-J7-3**: All project mutations MUST be logged in `project_activity_log`  
**FR-J7-4**: Editors MUST be able to add/move/delete clips; viewers MUST have read-only access

**Acceptance Criteria**:
- Kagiso invites Thabo as editor → Thabo accepts → Thabo adds a clip → activity log shows "Thabo added clip X" → Kagiso sees the change on next load

---

### Job J8 — Feedback Loop (Platform Job)

**FR-J8-1**: Every generation completion MUST prompt the user for a 1–5 star rating  
**FR-J8-2**: Ratings ≥ 4 MUST store the generation in `gold_standard_generations` with the full feature vector (all dimensions in §5.3)  
**FR-J8-3**: `model_training_datasets` MUST be populated automatically from gold standards  
**FR-J8-4**: Dataset export MUST be available for Modal fine-tuning jobs when corpus ≥ 500 gold standards

**Acceptance Criteria**:
- User rates generation 5/5 → record appears in gold_standard_generations within 500ms with full feature vector → dataset export includes audio URL, complete score breakdown, groove fingerprint, Contrast Score, and prompt

---

### Job J9 — Quality Analysis Display

**FR-J9-1**: Analysis page MUST show waveform + full score breakdown side by side  
**FR-J9-2**: Score breakdown MUST include all 8 dimensions with sub-scores, log drum timbral contract detail, Contrast Score, groove fingerprint heatmap  
**FR-J9-3**: Comparison view MUST allow side-by-side analysis of 2 tracks  
**FR-J9-4**: Spectral display MUST update in real-time during playback  
**FR-J9-5**: Log drum section MUST show: timbral contract pass/fail, spectral centroid, decay time, syncopation map visualisation

---

### Job J10 — MIDI Hardware Integration

**FR-J10-1**: MIDI devices MUST be auto-detected via Web MIDI API on supported browsers  
**FR-J10-2**: MIDI learn mode MUST allow mapping any controller knob to any DAW parameter  
**FR-J10-3**: MIDI mappings MUST persist in the database per user  
**FR-J10-4**: MIDI input MUST have < 10ms latency to screen feedback

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Music generation (p50) | < 65 seconds | Modal execution time |
| Music generation (p95) | < 90 seconds | Modal execution time |
| API response (non-AI) | < 200ms (p95) | Express middleware |
| Page load (cold) | < 3 seconds | Lighthouse |
| Stem separation (p50) | < 3 minutes | Modal Demucs |
| MIDI latency | < 10ms | Web MIDI API |

### 7.2 Reliability

| Metric | Target |
|--------|--------|
| API uptime | 99.5% |
| Temporal workflow success rate | ≥ 95% |
| S3 data durability | 99.999999999% (AWS default) |
| Max retry attempts (generation) | 3× with exponential backoff |
| Modal cold start recovery | Automatic retry within 30s |

### 7.3 Security

- All protected procedures MUST validate the session cookie before execution
- S3 presigned URLs MUST expire within 1 hour for audio playback, 15 minutes for uploads
- Stripe webhooks MUST validate `stripe-signature` header
- No API key or secret MUST ever be returned to the client
- CSRF protection MUST be active on all state-mutating endpoints
- JWT tokens MUST include `{ userId, role, email }` and expire after 7 days (rolling)

### 7.4 Scalability

- The platform MUST support 1,000 concurrent users without degradation
- Modal functions MUST auto-scale; no manual capacity planning required
- Database queries on `generations`, `tracks`, `samples` MUST use indexed lookups
- TiDB Cloud migration (Phase 2) must require zero schema changes — MySQL wire compatibility must be maintained

### 7.5 Accessibility

- All interactive elements MUST have ARIA labels
- Keyboard navigation MUST work across DAW and DJ Studio
- Color contrast MUST meet WCAG AA

---

## 8. Technical Debt & Blocker Registry

### Honest Current State Assessment

AURA-X has the **specification** of an OS. It does not yet have the **implementation** of one.

What is genuinely OS-level today:
- The domain primitive layer is real: 26-stem ontology, timbral contract, groove fingerprint spec, Camelot system, Contrast Score formula exist as shared types in `shared/stems.ts`, `shared/languages.ts`, and CLAUDE.md. Every layer references the same vocabulary.
- The analysis pipeline produces platform-level outputs: BPM, Camelot key, swing percent, log drum detection, cultural score breakdown. When this data exists on a track, every other layer can consume it without re-analysing.

What is not yet OS behaviour:
- **The feedback loop is broken (T7).** A producer rating 5/5 does not write to `gold_standard_generations`. The corpus that fine-tuning needs does not grow. The most important OS characteristic — the platform getting smarter because people use it — does not exist yet.
- **Cross-layer data flow is disconnected (T10, T11).** The groove fingerprint column exists but is not being computed. The Contrast Score column exists but is not being stored. The primitives exist at the type level but are not flowing through the system.
- **Temporal workflows are not executing (T3).** Generation and stem separation run as direct HTTP calls. A timeout during generation doesn't retry — it fails silently. An OS manages its own processes reliably. A system that drops jobs silently is a beta tool.

The OS positioning is architecturally accurate and defensible. It becomes commercially true the moment T3, T7, T10, and T11 are closed — not before.

### OS Activation Sequence

These four items are not debt to be managed alongside feature work. They are the sequence that converts "designed an OS" into "built one." Nothing in Phase 1 matters as much as closing these four, in order.

| Priority | Item | What it activates |
|---|---|---|
| **1** | T7 — Auto-trigger quality scoring after generation | The feedback loop kernel. Without this, user ratings produce no learning signal. |
| **2** | T3 — Wire Temporal workflows end-to-end | Durable process management. Without this, the platform drops jobs silently like a tool. |
| **3** | T10 — Compute groove fingerprint on analysis | Cross-layer data flow: analysis → DJ set compatibility. |
| **4** | T11 — Store Contrast Score on analysis | Cross-layer data flow: analysis → marketplace tagging → DJ adjacency warnings. |

### The Daily Gate Question

At every work session, ask one question before starting: **Is the feedback loop closed?**

- If T7 is not done: that is the only job.
- If T7 is done but T3 is not: T3 is the only job.
- If T3 is done but T10/T11 are not: T10 and T11 are the only jobs.
- Only when all four are closed is Phase 1 feature work valid.

### Full Blocker Registry

| ID | Blocker | OS impact | Job Blocked |
|----|---------|-----------|-------------|
| T1 | Manus OAuth lock-in | Cannot deploy — nothing runs | All |
| T2 | `vite-plugin-manus-runtime` in production build | Build fails on standard platforms | All |
| **T3** | **Temporal workflows not executing** | **Platform drops jobs silently — not OS behaviour** | J3, J5 |
| T4 | S3 stems not deleted on track deletion | Storage cost leak, compliance risk | J3 |
| T5 | `server/routers.ts` is 2216 lines | Cannot add features without merge conflicts | All |
| T6 | `server/db.ts` is 1348 lines | Cannot test domain logic independently | All |
| **T7** | **Quality scoring not auto-triggered** | **Feedback loop broken — OS kernel missing** | J2, J8 |
| T8 | No CI/CD pipeline | Every deploy is manual and untested | All |
| T9 | Log drum timbral contract not enforced in generation | Log drum fails spectral spec silently | J1, J2 |
| **T10** | **Groove fingerprint not computed** | **Cross-layer data flow broken: analysis ↛ DJ Studio** | J4 |
| **T11** | **Contrast Score not stored on analysis** | **Cross-layer data flow broken: analysis ↛ marketplace ↛ DJ adjacency** | J4, J9 |
| T12 | Dorian mode probability not computed | Mode detection returns binary minor/major | J1, J9 |

Bold items are the OS activation sequence. All others are important but secondary.

---

## 9. Phased Roadmap

### Phase 0 — OS Activation (Current Sprint)
*The goal of Phase 0 is not to "unblock deployment". It is to activate the four OS properties so that AURA-X behaves as an OS, not a tool with OS-sounding names.*

**OS activation sequence (must complete in order):**
- [ ] T1/T2: Remove Manus lock-in, deploy to Railway (prerequisite — nothing else runs without this)
- [ ] T7: Auto-trigger quality scoring in generation completion webhook (**OS kernel — first priority after deployment**)
- [ ] T3: Wire Temporal workflows end-to-end for generation and stem separation (**durable process management**)
- [ ] T10: Compute groove fingerprint in analysis pipeline (**cross-layer data flow: analysis → DJ Studio**)
- [ ] T11: Store Contrast Score on every analysed track (**cross-layer data flow: analysis → marketplace → DJ adjacency**)

**Supporting infrastructure (parallel with above):**
- [ ] T4: S3 cleanup on track/stem deletion
- [ ] T5/T6: Split routers.ts and db.ts into domain modules
- [ ] T8: GitHub Actions CI (lint + type-check + test)

**Exit criteria**: A user can sign up, generate a track, see a full 8-dimension quality score with sub-scores, rate it 5/5, and have that rating write to `gold_standard_generations` — end-to-end on Railway, without Manus. The feedback loop must be measurably closed: the `gold_standard_generations` table must have at least one row after the first test generation.

---

### Phase 1 — Core Product (Q2 2026)
*Complete J1–J3 end-to-end with real AI*

- Autonomous generation loop with cultural scoring, timbral contract evaluation, Contrast Score (J1, J2)
- T9: Enforce log drum timbral contract in generation pipeline
- T12: Add Dorian probability to analysis outputs
- Stem separation with full 26-stem ontology and DAW integration (J3)
- Generation history with replay and remix (J1)
- Rating and gold standard collection with full feature vector (J8)
- MIDI controller support (J10)

**Exit criteria**: North Star metric is measurable with full 8-dimension breakdown. 100 gold standard generations collected. Median cultural score measurable.

---

### Phase 2 — DJ Studio (Q3 2026)
*Complete J4–J5*

- T10: Groove fingerprint computed and stored for all tracks
- T11: Contrast Score stored and displayed
- Set planning with energy arc, Camelot compatibility, groove fingerprint, Contrast Score (J4)
- Custom transition generation (J5)
- Set export and cue sheet (J4)
- Waveform display in Set Player
- TiDB Cloud migration (Railway MySQL → TiDB Cloud)

**Exit criteria**: Lesedi can plan and export a 2-hour set in under 10 minutes, with groove compatibility scores and Contrast Score warnings displayed for each transition.

---

### Phase 3 — Ecosystem (Q4 2026)
*Complete J6–J7*

- Marketplace: upload, purchase, download flow with Contrast Score tagging (J6)
- Collaboration: roles, invitations, activity log (J7)
- Producer profiles and follower system
- Revenue splits and Stripe Connect for producers (Creator tier)

**Exit criteria**: Kagiso earns first marketplace sale. Kagiso and Thabo successfully co-produce a track. Marketplace GMV > $500.

---

### Phase 4 — Intelligence (Q1 2027)
*Close the feedback loop*

**Prerequisite**: 500+ gold standard generations collected (monitoring this — as of 2026-04-15 the corpus is at 0 labelled gold standards; 82 of 153 training tracks have been uploaded to S3 and form the base corpus for fine-tuning).

- Dataset export from gold standards (complete feature vectors)
- LoRA fine-tuning pipeline on MusicGen-Large via Modal (A/B test against base model)
- Cultural authenticity score target: ≥ 82/100 at median
- A/B testing framework for comparing fine-tuned vs. base model on live traffic

**Exit criteria**: Platform-generated Amapiano scores ≥ 82/100 at median. Fine-tuned model measurably outperforms base model on log drum timbral score and Dorian probability. Model improves from user feedback signal.

---

## 10. Out of Scope

These will not be built unless a job emerges that requires them:

- Support for genres other than Amapiano (Phase 1–3)
- Native mobile app (PWA is sufficient)
- Real-time collaborative editing (async collaboration covers 80% of J7)
- Video / music video generation
- Lyric generation or vocal synthesis (deferred — vocal synthesis is in infrastructure but not activated)

*Note: Lyric generation and vocal synthesis exist in the system infrastructure (29 SA artist voices referenced in voice synthesis layer). Promotion to Phase 3 or 4 requires a dedicated job definition and cultural safety review before building.*

---

## 11. Success Metrics

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Successful generations / day | > 0 (unblocked) | 50 | 100 | 200 |
| Median cultural score (all 8 dims) | Measurable | ≥ 70 | ≥ 75 | ≥ 78 |
| Median log drum timbral score | Measurable | ≥ 4.0/8 | ≥ 5.5/8 | ≥ 6.5/8 |
| Median Dorian probability on generated tracks | Measurable | ≥ 0.45 | ≥ 0.55 | ≥ 0.65 |
| Gold standards collected | 0 | 100 | 300 | 1000 |
| Groove fingerprints stored | 0 | 100% of tracks | 100% | 100% |
| Set plans generated / week | — | — | 20 | 50 |
| Marketplace GMV / month | — | — | — | $500 |
| Generation success rate | > 80% | > 90% | > 95% | > 95% |
| Fine-tune corpus size | — | — | — | ≥ 500 gold standards |

---

## 12. Architecture Decisions (Closed Questions)

These questions are resolved. Do not reopen without explicit rationale in this document.

| Q | Decision | Rationale |
|---|----------|-----------|
| Q1: Auth provider | Custom JWT with `jose` — NEXUS pattern | Zero vendor lock-in; fine-grained role logic required; Clerk is fallback if Phase 0 stalls |
| Q2: Production database | Railway MySQL Phase 0–1; TiDB Cloud Phase 2+ | TiDB wire-compatible with MySQL; HTAP needed for analytical queries at Phase 2+ scale; zero schema changes on migration |
| Q3: Fine-tuning strategy | Prompt engineering Phase 0–2; LoRA on MusicGen-Large Phase 3 | Prompt engineering builds corpus; LoRA requires 500 gold standards minimum to be meaningful |
| Q4: Monetisation | Tiered subscription (Free/$19/$49) + 15% marketplace take-rate + credits top-up | Free tier grows Thabo, Pro tier monetises Lesedi, Creator tier funds Kagiso through marketplace |
| Q5: Temporal hosting | Self-hosted localhost dev; Temporal Cloud from Phase 1 | Cost ~$0.50–$0.75/day at Phase 3 volumes; operational overhead of self-hosted buys nothing |

---

## 13. Definition of Done (DoD)

A feature is **Done** only when ALL of the following are confirmed:

1. **Deployed**: Feature works end-to-end in the Railway environment (not just localhost)
2. **Tested**: Every tRPC procedure has ≥ 1 passing integration test; every Modal function has a unit test (mocked) and an integration test gated by `MODAL_TEST_INTEGRATION=true`
3. **Scored**: For any generation-related feature, cultural authenticity score is measurable and stored with all 8 sub-dimensions
4. **Type-clean**: `pnpm run check` passes with zero errors
5. **No stubs**: Zero `TODO:` or placeholder implementations in shipped code
6. **PRD updated**: PRD.md Phase table item is checked
7. **CLAUDE.md updated**: If a new pattern, convention, or domain rule was introduced, CLAUDE.md §1 or §3 is updated
8. **Fixture tested**: If a new cultural scoring dimension or formula was introduced, fixture tracks with known expected scores pass

---

*This document is the source of truth. Engineering decisions that contradict it require an explicit update to this file with a rationale.*
