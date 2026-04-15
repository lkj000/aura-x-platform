# AURA-X Platform — Claude Code Instructions

## Project Purpose

AURA-X is an AI-powered music production platform purpose-built for **Amapiano** — the South African genre born in Soweto townships ca. 2012, now the dominant pan-African sound. Every decision about audio processing, ML models, stem separation, rhythm generation, lyric models, and cultural scoring must be evaluated against one question: **does this serve authentic Amapiano production at a world-class level?**

The standard is uncompromising: if a feature cannot be traced to a specific Amapiano production need, it should not be built. Expediency is not a reason to lower the bar. Every component must be revisited, tested, and validated against authentic Amapiano before moving forward.

---

## 0. Why This is an OS, Not a Generator

This section defines what AURA-X is. Read it before deciding whether to build anything.

**Suno, Udio, MusicGen are generators.** You describe something, they produce audio, the interaction ends. No memory of what you made. No cultural model that knows what a log drum timbral contract is. No feedback that improves the next generation. No tools to arrange, mix, plan sets, or sell. They are stateless vending machines for audio.

**An operating system manages resources, coordinates processes, maintains persistent state, and provides a platform on which other things are built.** AURA-X is an OS in four specific ways:

### The Four OS Properties — Applied to AURA-X

**1. Persistent cultural memory (state that compounds)**
Every track analysed, every generation rated, every stem separated contributes to a growing model of what authentic Amapiano sounds like. The groove fingerprint, timbral contract score, Dorian probability, and Contrast Score of every track in the platform are permanent, queryable, improvable state. The platform gets more accurate as more authentic Amapiano flows through it. This is OS-level behaviour — compounding state. Suno has no equivalent.

**2. Resource coordination across the full production lifecycle**
A producer's workflow is: generate → arrange → mix → separate stems → plan DJ set → sell. Suno owns one step. AURA-X owns all of them, and the handoffs are seamless because the platform holds the context. The track you generated in the AI Studio already has its BPM, Camelot key, groove fingerprint, and Contrast Score — when you drag it into the DJ Studio, the set planner already knows where it fits. No re-analysis, no copy-paste. Coordinating resources across processes is what an OS does.

**3. The feedback loop as the kernel**
The feedback loop (Generate → Score → Rate → Gold Standard → Fine-tune → Better Generation) is not a feature — it is the kernel of the OS. When a producer rates a generation 5/5, that signal flows into the gold standard corpus, which improves the next generation for every user on the platform. Suno cannot implement this for Amapiano specifically because Suno has no domain model of what "authentic" means at the level of Dorian probability and log drum timbral compliance. AURA-X does. The kernel is domain-specific and therefore the moat is structural.

**4. A cultural instruction set that defines the platform's primitives**
Every OS has an instruction set — the vocabulary of primitives the system natively understands. AURA-X's instruction set is: the 26-stem ontology, the log drum timbral contract, Euclidean percussion patterns, Camelot compatibility rules, the Contrast Score formula, the groove fingerprint, 11 SA languages with phonemic accuracy requirements. No other platform has this instruction set. Building anything on top of AURA-X — a controller integration, a mastering assistant, a label analytics tool — means building on a platform that understands Amapiano at the instruction-set level. That is why the moat compounds rather than erodes.

### The Feature Test

Before building any feature, apply this test. A feature belongs in AURA-X only if it satisfies **at least one** of these:

| Test | Question |
|---|---|
| **Cultural memory test** | Does this feature contribute to or consume the platform's growing model of authentic Amapiano? |
| **Lifecycle coordination test** | Does this feature coordinate resources across two or more production stages (generate, arrange, stem-separate, set-plan, sell)? |
| **Feedback loop test** | Does this feature produce or consume a signal that improves the quality of future generations? |
| **Instruction set test** | Does this feature use or extend a domain primitive (stem, timbral contract, groove fingerprint, Camelot key, Contrast Score)? |

If the answer to all four is no: the feature is an app feature bolted onto the wrong product. Do not build it.

---

## 1. Amapiano Domain Knowledge (Non-Negotiable)

### 1.1 Genre Definition

Amapiano ("the pianos" in Zulu/isiZulu) is a fusion of:
- Deep House (South African deep house lineage: Culoe De Song, Black Coffee)
- Jazz (especially modal jazz piano voicings — Dorian and Aeolian modes)
- Kwaito (90s SA township groove — syncopated bass, call-and-response)
- Lounge music (slow builds, atmospheric pads)

**Defining characteristics — understand these before touching any audio code:**

| Element | Spec | Why it matters |
|---|---|---|
| BPM | 115–130 (sweet spot 118–124) | Outside this range it is not Amapiano |
| Log drum | Sub-bass body 40–80 Hz, wood attack 180–220 Hz, syncopated | THE DNA of the genre — NOT the kick drum |
| Piano/keys | Jazz chord voicings, Dorian/Aeolian; 6-5-4-2 progressions, extended voicings | Triads = wrong genre |
| Swing % | 53–62% (regional variation) | Rigid quantisation = wrong feel |
| Key centres | Am, Dm, Gm, Cm, Fm dominate (minor keys) | Major-key Amapiano is rare and intentional |
| Structure | Intro → Build → Piano section → Drop → Outro; 6–10 min sets | Not 3-min pop structure |
| Mode | Dorian dominant (raised 6th = jazz tension); Aeolian for deeper/darker feel | Mode detection must distinguish Dorian from natural minor |

### 1.2 Regional Sub-Styles

| Region | BPM | Swing | Contrast Score | Character |
|---|---|---|---|---|
| Gauteng (JHB/PTA) | 120–128 | 58% | 120–175 | Hard-hitting, log drum heavy, "Chisa Moya" energy |
| Durban (DBN) | 115–120 | 52% | 55–90 | More melodic, smoother transitions, soulful |
| Cape Town | 118–122 | 50% | 40–80 | Soulful, jazz-influenced, slower builds |
| Limpopo | 116–120 | 60% | 90–130 | Traditional instruments (marimba, kalimba), spiritual feel |
| East Rand | 122–128 | 59% | 140–200 | Raw, underground, harder percussion, Sgija character |

See §1.10 for the Contrast Score formula.

### 1.3 Reference Artists (use to calibrate — listen before implementing anything)

- **Kabza De Small** — Melodic piano, spiritual chord progressions, Dorian voicings
- **DJ Maphorisa** — Hard percussive grooves, log drum mastery, Gauteng energy
- **DBN Gogo** — Female DJ, flute-heavy, high energy, Durban soulful
- **Daliwonga** — Vocals, isiZulu lyrics, call-and-response, 8-bar phrase structure
- **Focalistic** — Rap over Amapiano, Sepedi/Sotho lyrics, code-switching
- **Kelvin Momo** — Soulful, introspective, Cape Town influence, low Contrast Score
- **MaWhoo** — Vocal-led, harmonies, siSwati language, choir elements
- **Young Stunna** — Energetic, youth culture, East Rand character
- **Sir Trill** — Melodic vocals, Xitsonga influence, "Tsonga amapiano" sub-genre

### 1.4 The 26 Canonical Amapiano Stems

These are the **minimum** granularity for stem separation and generation. A generic 4-stem model (drums/bass/other/vocals) is architecturally wrong for this genre.

#### Percussion Stems (8)
| ID | Name | Frequency Range | Euclidean Pattern | Notes |
|---|---|---|---|---|
| `log_drum` | Log Drum | Sub: 40–80 Hz, Attack: 180–220 Hz, Resonance: 300–600 Hz | E(3,16) or E(5,16) syncopated | THE defining element. See §1.9 for full timbral contract. NOT the kick. |
| `kick` | Kick Drum | 60–100 Hz fundamental, snap at 2–4 kHz | Beats 1+3 (positions 0,8 of 16) | 4-on-floor or 2-and-4 placement |
| `snare_clap` | Snare / Clap | 200 Hz–4 kHz | Beats 2+4 | Clap sound in Amapiano, not acoustic snare |
| `hi_hat_closed` | Closed Hi-Hat | 8–16 kHz | E(7,16) or E(9,16) | 16th-note patterns, velocity variation |
| `hi_hat_open` | Open Hi-Hat | 6–14 kHz | E(3,8) accent pattern | Accent markers, 8th notes |
| `shaker_cabasa` | Shaker / Cabasa | 5–15 kHz | E(7,16) constant drive | Constant 16th-note drive, quintessential Amapiano texture |
| `congas_bongos` | Congas / Bongos | 200 Hz–5 kHz | E(5,16) call + E(3,16) response | Call-and-response percussion |
| `tambourine` | Tambourine | 5–18 kHz | E(3,8) or E(5,8) | 8th or 16th note accents |

#### Bass Stems (2)
| ID | Name | Frequency Range | Notes |
|---|---|---|---|
| `bass_synth` | Bass Synth / 808 | 40–200 Hz melodic | Sub-bass melodic line, separate from log drum |
| `bass_walk` | Bass Walk | 80–400 Hz | Jazz-influenced walking bass lines in slower sections |

#### Harmonic / Melodic Stems (9)
| ID | Name | Notes |
|---|---|---|
| `piano_chords` | Piano / Keys (Chords) | Primary jazz chords; 6-5-4-2 voicings; Dorian 7th/9th/11th extensions; never bare triads |
| `piano_melody` | Piano (Melodic runs) | Riffs, runs, fills — separate layer from chords |
| `rhodes` | Rhodes / Electric Piano | Warm, slightly distorted; Fender Rhodes character; 200 Hz–4 kHz body |
| `pad_strings` | Pads / Strings | Atmospheric background; long attack/sustain; 200 Hz–8 kHz |
| `flute` | Flute | Highly characteristic; 500 Hz–4 kHz; often DBN Gogo / Daliwonga style |
| `saxophone` | Saxophone | Jazz melodic lines; alto 200 Hz–3 kHz, tenor 80 Hz–2 kHz |
| `guitar` | Guitar | Acoustic strumming OR funky electric; context-dependent |
| `kalimba_mbira` | Kalimba / Mbira | African thumb piano; 200 Hz–5 kHz; Limpopo/traditional flavour |
| `marimba` | Marimba / Xylophone | Melodic percussion; 200 Hz–6 kHz; township/traditional texture |

#### Vocal Stems (5)
| ID | Name | Notes |
|---|---|---|
| `lead_vocal` | Lead Vocal | Main singer or rapper; Nguni click consonants preserved in isiZulu/isiXhosa |
| `backing_vocals` | Backing Vocals | Harmonies, response parts — always paired with call structure |
| `vocal_chops` | Vocal Chops | Chopped/pitched samples — very common in Amapiano production |
| `ad_libs` | Ad-libs | "Yanos!", "eish", "sharp", whistles, shouts, hype calls |
| `choir` | Choir | Choral harmonies; spiritual Amapiano sub-genre |

#### Effects / Atmosphere (2)
| ID | Name | Notes |
|---|---|---|
| `whistle_fx` | Whistle / FX | Referee whistle (party marker), sweeps, risers |
| `room_ambience` | Room / Crowd Ambience | Venue noise; gives tracks "live" feeling |

### 1.5 South African Languages

All lyric generation, transcription, pronunciation guides, and language detection must support all 11 official SA languages plus township slang:

| Code | Language | Family | Swing bias | Typical usage in Amapiano |
|---|---|---|---|---|
| `zul` | isiZulu | Nguni | 55% | Most common; 12M speakers; Kabza, Daliwonga |
| `xho` | isiXhosa | Nguni | 54% | Cape Town influence; click consonants |
| `sot` | Sesotho (Southern) | Sotho | 52% | Lesotho-border areas; emotional ballads |
| `tsn` | Setswana | Sotho | 51% | Botswana crossover; Focalistic style |
| `nso` | Sepedi / Northern Sotho | Sotho | 53% | Limpopo; Focalistic (raps in Pedi) |
| `ven` | Tshivenda | Venda | 60% | Limpopo; traditional instruments |
| `tso` | Xitsonga | Tsonga | 62% | "Tsonga amapiano" sub-genre; high energy |
| `nbl` | isiNdebele | Nguni | 54% | Mpumalanga; less common but present |
| `ssw` | siSwati | Nguni | 55% | Eswatini crossover; MaWhoo style |
| `afr` | Afrikaans | Germanic | 50% | Cape Town; mixed-language lyrics |
| `eng` | English (SA/Kasi) | Germanic | 51% | Township slang; code-switching |

**Code-switching**: Authentic Amapiano lyrics freely mix 2–4 languages in one song. Any lyric model must handle intra-sentence code-switching (e.g., "Yebo sharp, ke a go rata ka hao" mixes Zulu, Pedi, Tswana). Code-switching is not random — it follows cultural conventions for each language pair.

**Language analysis depth requirements** — detection must go beyond language identification:

1. **Functional role classification**: Each language segment serves a role — acknowledgment (Zulu "Yebo"), endearment (Sotho "ke a go rata"), boast ("sharp sharp"), call-to-action ("let's go"). The analysis system must classify segment function, not just language.

2. **Kasi slang register**: Township vernacular ("sharp sharp", "aweh", "eish", "loxion", "yanos", "chisa moya") is a distinct register that standard language models do not handle. It must be recognised as authentic, not classified as unrecognised speech.

3. **Phonemic accuracy for Nguni languages**: isiZulu and isiXhosa have phonemic vowel length distinctions and click consonants (isiXhosa: c, q, x clicks) that AI vocal models routinely flatten. A flat vowel or missing click is an immediate authenticity fail to native speakers. Phonemic accuracy scoring is mandatory.

4. **Call-and-response structure**: Authentic Amapiano vocals have lead phrase → backing response patterns in 2-bar or 4-bar cycles. Language analysis must detect and score this structural pattern.

### 1.6 Amapiano Harmonic Theory

**Primary progression**: vi–V–IV–II (e.g. Am–G–F–Dm in A minor)  
**Extended voicings**: 7ths, 9ths, 11ths — never bare triads in the piano  
**Modal tendencies**: Dorian mode dominant (raised 6th = jazz tension); Aeolian for deeper feel  
**Bass movement**: Often contrary to piano; creates harmonic tension/release  
**Typical bar structure**: 4/4, 32-bar loops, 8-bar phrases

#### Dorian Mode Detection Specification

Mode detection must not simply return "minor" — it must distinguish:

| Mode | Scale degrees | Character in Amapiano |
|---|---|---|
| Dorian | 1 2 ♭3 4 5 6 ♭7 | Raised 6th = jazz lift; most common in piano sections |
| Aeolian (natural minor) | 1 2 ♭3 4 5 ♭6 ♭7 | Darker, moodier; log drum drops and breakdowns |
| Melodic minor (ascending) | 1 2 ♭3 4 5 6 7 | Rare; used in sophisticated piano runs |

Implementation requirement: given a root note, compute a chroma vector from the audio and return probability scores for each mode — not binary classification. Dorian probability ≥ 0.40 is the threshold for labelling a section "Dorian". Store the modal probability vector in the features table, not just the modal label.

#### Camelot Key System (Required for DJ Studio)

Every analysed track must have a Camelot key code. DJs plan sets using Camelot compatibility — adjacent positions mix harmonically without clashing.

| Camelot | Key | Common in Amapiano |
|---|---|---|
| 4A | F minor | Yes |
| 5A | C minor | Yes |
| 6A | G minor | Yes |
| 7A | D minor | Yes |
| 8A | A minor | Most common |
| 9A | E minor | Yes |
| 10A | B minor | Occasional |
| 3A | Bb minor | Occasional |

**Mixing rules**: 8A mixes with 7A, 9A (same family ±1), and 8B (relative major). These are the only valid harmonic transitions unless the user explicitly overrides. Enforce this in set-planning logic.

### 1.7 Cultural Authenticity Scoring

When scoring or prompting for authenticity, evaluate on ALL of these axes. Each dimension has sub-components that are individually measurable — do not collapse sub-scores into a single dimension number without computing each sub-component.

#### Dimension 1 — Log Drum Presence (0–20)

| Sub-dimension | Points | Measurement |
|---|---|---|
| Audible sub-bass presence (40–80 Hz) | 0–8 | Energy in 40–80 Hz band, normalised to track LUFS |
| Timbral contract compliance | 0–8 | Spectral centroid 250–450 Hz; no metallic content >2 kHz; decay 80–180 ms |
| Syncopation map accuracy | 0–4 | Onset offset pattern vs. Euclidean E(3,16) or E(5,16) reference |

#### Dimension 2 — Piano Authenticity (0–20)

| Sub-dimension | Points | Measurement |
|---|---|---|
| Extended voicing complexity (7th/9th/11th) | 0–8 | Average note count per detected chord segment |
| Modal accuracy (Dorian probability) | 0–7 | Dorian mode probability score from chroma analysis |
| Chord density and rhythm | 0–5 | Chord change rate: 1–2 changes per bar for authentic Amapiano piano feel |

#### Dimension 3 — Rhythmic Swing (0–15)

| Sub-dimension | Points | Measurement |
|---|---|---|
| Swing % in regional target range | 0–7 | Measured 8th-note swing percentage vs. regional reference |
| Groove fingerprint coherence | 0–5 | 32-bar microtiming matrix consistency — see §1.8 |
| Euclidean pattern recognition | 0–3 | Shaker E(7,16), hi-hat E(9,16), log drum E(3,16) detected |

#### Dimension 4 — Language Authenticity (0–15)

| Sub-dimension | Points | Measurement |
|---|---|---|
| SA language correctly identified | 0–5 | Whisper transcription + language classifier |
| Functional role classification | 0–4 | Acknowledgment/endearment/call-to-action roles detected |
| Phonemic accuracy (Nguni clicks, vowel length) | 0–3 | Phoneme error rate on click consonants and long vowels |
| Call-and-response structure detected | 0–3 | Lead/response phrase alternation in 2–4 bar cycles |

#### Dimension 5 — Energy Arc (0–10)

Measures whether the track builds correctly from intro to drop: LUFS variation over time should show a consistent upward gradient in the build section, a 3–6 dB boost at the drop, and resolution in the outro.

#### Dimension 6 — Harmonic Structure (0–10)

| Sub-dimension | Points | Measurement |
|---|---|---|
| vi–V–IV–II progression presence | 0–6 | Chord progression template matching |
| Camelot key correctly within Amapiano range (4A–10A) | 0–4 | Detected key vs. accepted Camelot range |

#### Dimension 7 — Timbre / Texture (0–5)

Presence and audibility of characteristic instruments: log drum (required), piano (required), shaker (required for full score), flute or saxophone (bonus texture). Score based on identified stems.

#### Dimension 8 — Production Era (0–5)

Contemporary Amapiano (2018–present) characteristics: sub-heavy mix (LUFS typically −10 to −13), modern sidechain compression on bass and log drum, bright high-shelf on piano. Penalise tracks that sound pre-2016 (kwaito-era processing signatures).

**Total: 100. Target: ≥ 82. Training eligibility threshold: ≥ 60 AND avgStemQuality ≥ 0.7.**

### 1.8 Rhythmic DNA — Groove Fingerprint & Euclidean Patterns

#### Groove Fingerprint

A swing percentage alone does not capture the shape of a groove. Two tracks at 58% swing can feel completely different because one has a consistent 12 ms micro-delay on the shaker that the other lacks.

The **groove fingerprint** is a 32-bar microtiming matrix: for each of the 512 16th-note positions in a 32-bar loop, record the onset deviation (in milliseconds) of each key stem (log drum, kick, shaker, hi-hat closed) from the quantised grid. This is stored as a JSON vector in the features table.

Requirements:
- Groove fingerprint must be computed for every analysed track
- The fingerprint is used in DJ set planning to score "groove compatibility" between two tracks
- Two tracks are groove-compatible if their shaker microtiming matrices have cosine similarity ≥ 0.75
- Groove compatibility is a secondary sort key after Camelot compatibility in set planning

#### Euclidean Rhythm Patterns

Amapiano percussion follows Euclidean distribution principles. The pattern E(k,n) places k pulses as evenly as possible in n steps.

| Stem | Expected Pattern | Deviation Tolerance |
|---|---|---|
| `shaker_cabasa` | E(7,16) — 7 pulses in 16 steps | ±1 position |
| `hi_hat_closed` | E(9,16) — 9 pulses in 16 steps (Gauteng/East Rand) | ±1 position |
| `hi_hat_closed` | E(7,16) — 7 pulses in 16 steps (Durban/Cape Town) | ±1 position |
| `log_drum` | E(3,16) or E(5,16) — syncopated | ±2 positions |
| `congas_bongos` | E(5,16) call + E(3,16) response | ±1 position per part |
| `tambourine` | E(3,8) or E(5,8) | ±1 position |

Implementation requirement: the onset detection pipeline must identify the Euclidean pattern for each percussion stem and score it against the reference. Onset detection must use a 10 ms resolution window. Do not use MIDI quantisation to infer patterns — use actual onset timing from the audio.

#### Log Drum Syncopation Map

The log drum's defining character is its syncopated relationship to the kick. The onset offset pattern of the log drum relative to the 4/4 grid must be measured as a distinct analysis output — not bundled into a general swing score.

Required output fields (stored in `djTrackFeatures.logDrumSyncopationMap` as JSON):
```json
{
  "pattern": "E(3,16)",
  "onsetOffsets": [0.032, 0.281, 0.531],  // fractional bar positions
  "kickRelativeOffsets": [-0.063, 0.156, 0.344],  // offset from nearest kick onset
  "metricalStrength": 0.72  // 0-1, how strongly syncopated vs on-beat
}
```

A `metricalStrength` below 0.50 indicates a log drum that is too close to on-beat — this is an authenticity failure. Flag it in the cultural score.

### 1.9 Log Drum Timbral Contract

The log drum is the most important sound in any Amapiano track. It is a physical wooden instrument (typically a hollowed hardwood log with a membrane) and its timbre is distinct from all synthetic kicks or 808 bass drums. Any generated or separated log drum stem must satisfy ALL of the following:

#### Spectral Specification

| Band | Frequency Range | Role | Requirement |
|---|---|---|---|
| Sub-bass body | 40–80 Hz | Weight and felt impact | Energy ≥ −18 dBFS in this band |
| Wood attack transient | 180–220 Hz | The "knock" — distinguishes it from a sine sub | Energy ≥ −24 dBFS; onset rise time < 5 ms |
| Wooden chamber resonance | 300–600 Hz | Organic character vs. synthetic kick | Energy ≥ −30 dBFS; slight harmonic saturation acceptable |
| Upper body | 600 Hz–2 kHz | Presence in the mix | −30 to −36 dBFS typical |
| High-frequency zone | > 2 kHz | **Must be suppressed** | Energy < −42 dBFS |

#### Envelope Specification

| Parameter | Target | Failure condition |
|---|---|---|
| Spectral centroid | 250–450 Hz | < 150 Hz (too bassy, no attack) or > 600 Hz (too metallic) |
| Decay time (−60 dB from peak) | 80–180 ms | < 60 ms (clicks, no body) or > 250 ms (muddy) |
| Attack time (10% to 90% peak) | 2–8 ms | > 15 ms (sluggish, loses punch) |
| Crest factor | ≥ 12 dB | < 8 dB (too sustained, not percussive) |

#### What the Log Drum Must NOT Sound Like

- A sine wave sub — no attack transient means no log drum character
- A 909/808 kick — metallic content above 2 kHz is a kick, not a log drum
- A kick with reverb — reverb extends decay beyond 250 ms and washes out the groove
- A clean sample with no harmonic saturation — real log drums have slight harmonic colour from wood resonance

#### Automated Evaluation

Every log drum stem produced by the separation pipeline or generation model must be automatically evaluated against this contract. The evaluation function (`evaluateLogDrumTimbralContract`) returns a score 0–8 that feeds directly into Dimension 1 of the cultural scoring system (§1.7). A score below 4.0 on this sub-dimension must be flagged with a specific message: "Log drum timbral contract: [specific failure]".

### 1.10 Sub-Genre Classification & Contrast Score

Amapiano has two dominant sub-genre poles. Understanding which pole a track sits on determines correct instrumentation, production decisions, and DJ set ordering.

| Sub-genre | Character | BPM bias | Swing bias | Log drum | Piano | Personas |
|---|---|---|---|---|---|---|
| **Soulful / Private School** | Melodic, jazz-forward, spiritual | 115–120 | 50–53% | Soft, melodic log drum | Complex Dorian voicings | Kabza, Kelvin Momo |
| **Sgija / Underground** | Raw, hard-hitting, dancefloor | 122–128 | 57–62% | Sharp attack, heavy sub | Sparse, percussive piano | East Rand, DJ Maphorisa |

Between these poles: mainstream Amapiano (120–124 BPM, 55–57% swing) occupies the middle ground.

#### Contrast Score Formula

The Contrast Score quantifies sub-genre position on the Soulful↔Sgija axis. It is the authoritative sub-genre metric — use it consistently everywhere.

```
ContrastScore = (swing_deviation × 100) + (bpm_normalized × 50) + (log_drum_attack_sharpness × 30) + (piano_chord_density × 20)
```

Where:

| Variable | Definition | Range |
|---|---|---|
| `swing_deviation` | `(swing_pct − 53) / 14` — deviation from 53% baseline, normalised | 0.0–1.0 (clamped) |
| `bpm_normalized` | `(bpm − 112) / 20` — BPM relative to low boundary, normalised | 0.0–1.0 (clamped) |
| `log_drum_attack_sharpness` | Spectral centroid of the log drum attack transient, normalised to 0–1 (180 Hz = 0, 600 Hz = 1) | 0.0–1.0 |
| `piano_chord_density` | Average note count per piano chord, normalised (1 note = 0, 7 notes = 1) | 0.0–1.0 |

**Score interpretation:**

| Score | Classification | Example |
|---|---|---|
| 0–75 | Soulful / Private School | Kelvin Momo, Kabza (slow spiritual) |
| 76–149 | Mainstream Amapiano | Major League DJz, most radio tracks |
| 150–200 | Sgija / Underground | East Rand productions, DJ Maphorisa hard cuts |

The Contrast Score must be stored in `djTrackFeatures.contrastScore` and `trainingTrackFeatures.contrastScore`. It is used in DJ set planning to avoid mismatched sub-genre adjacencies.

---

## 2. Technology Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | Latest |
| State | Zustand | 5.x |
| Audio (web) | Tone.js + Web Audio API + WaveSurfer.js | 14.x (do not upgrade to 15.x without full regression — breaking changes) / 7.x |
| Backend | Express + tRPC v11 | Latest |
| ORM | Drizzle + MySQL | Latest |
| Serverless ML | Modal.com (GPU A10G / H100) | Latest |
| Workflow | Temporal.io | 1.x |
| Storage | AWS S3 + presigned URLs | SDK v3 |
| Auth | JWT (jose) + scrypt password hash | Built-in — see §2.1 |
| Payments | Stripe | Latest |
| Testing | Vitest 2 | 2.x |

### 2.1 Resolved Architecture Decisions

These questions are closed. Do not reopen them without updating this section with explicit rationale.

#### Auth — Custom JWT with jose

**Decision**: Custom JWT sessions using `jose`, mirroring the NEXUS pattern exactly.

**Rationale**: AURA-X requires fine-grained role logic (producer/buyer/admin/collaborator/editor/viewer). Clerk's abstractions fight this at the margins. Custom JWT has zero vendor lock-in at the identity layer, which is the most critical layer. Clerk is the fallback if the implementation stalls in Phase 0, but the default is custom JWT.

**Implementation contract**: Session tokens contain `{ userId, role, email }`. Token expiry: 7 days. Refresh: rolling expiry on each authenticated request. The cultural scoring LLM is GPT-4o (model ID: `gpt-4o`). Do not change the model without updating this file and adding a migration note to the scoring result schema.

#### Database — Railway MySQL → TiDB Cloud migration path

**Decision**: Railway MySQL for Phase 0–1. TiDB Cloud for Phase 2+.

**Rationale**: TiDB is MySQL wire-compatible and adds HTAP (hybrid transactional/analytical) capabilities. At Phase 2+ scale, analytical queries on `generations`, `tracks`, and `culturalScores` tables will be slow on single-node MySQL. TiDB handles these natively.

**Constraint**: The Drizzle schema must never use MySQL-specific syntax that TiDB does not support. Specifically: no `FULLTEXT` indexes, no `SPATIAL` types, no `JSON` path expressions with `->>`  unless confirmed TiDB-compatible. The migration from Railway MySQL to TiDB is a connection string swap — zero schema changes required.

#### Fine-tuning — Prompt engineering first, LoRA Phase 3

**Decision**: Phase 0–2: prompt engineering with cultural scoring as the feedback signal. Phase 3: LoRA fine-tuning on MusicGen-Large.

**Rationale**: Prompt engineering closes the authenticity gap immediately and generates the gold standard corpus. LoRA fine-tuning uses that corpus to permanently shift the model's prior toward Amapiano. The minimum corpus size before fine-tuning is meaningful is **500 gold-standard generations** (producer-rated ≥ 4/5 with cultural score ≥ 82). Do not start fine-tuning before hitting this threshold.

#### Temporal — Self-hosted dev, Temporal Cloud from Phase 1

**Decision**: Phase 0 development uses `localhost:7233` (self-hosted). Phase 1+ uses Temporal Cloud.

**Rationale**: Temporal Cloud costs ~$0.50–$0.75/day at Phase 3 generation volumes — negligible. Self-hosted requires Cassandra/PostgreSQL backend and operational overhead that buys nothing at this scale. The connection string is parameterised (`TEMPORAL_SERVER_URL`) — switching to Temporal Cloud is a single env var change.

#### Monetisation — Tiered subscription + marketplace take-rate

**Decision**:

| Tier | Price | What's included |
|---|---|---|
| Free | $0 | 5 generations/month, no stem separation, no marketplace selling |
| Pro | $19/month | Unlimited generation, stem separation, DJ Studio, marketplace buying |
| Creator | $49/month | Marketplace selling, revenue splits, collaboration, priority GPU |
| Credits | $5 per 10 | Top-up for Pro users who exceed generation quotas |
| Marketplace take-rate | 15% | Per transaction; Bandcamp-competitive |

---

## 3. Coding Conventions

### 3.1 General

- TypeScript strict mode everywhere. No `any` without a comment explaining why.
- No mocks in integration tests. Tests hit a real in-memory SQLite or real service.
- No placeholder/stub implementations shipped. If a feature isn't ready, it throws a clear, specific error (`throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: '...' })`).
- Functions that call external services (Modal, S3, Stripe, Temporal) must handle failure gracefully and surface meaningful errors to the user.

### 3.2 Audio Code

- **Never** use `setTimeout` for audio scheduling. Use `AudioContext.currentTime` or Tone.js Transport.
- **Always** load audio through `AudioContext.decodeAudioData()`. Do not use HTML `<audio>` elements for production playback in the DAW.
- Waveform display must use a real canvas draw from decoded `AudioBuffer` data, not a placeholder or static image.
- Audio exports must be real WAV/MP3 files, not silence.
- Every component that involves audio must have a visually inspectable waveform or VU meter — never just text status.
- Tone.js effect chain direction: `channel → effect1 → effect2 → ... → limiter → Destination`. Source audio connects to channel head; limiter connects to destination. Never wire backwards.

### 3.3 ML / Audio Processing

- Stem separation must use ≥ 6-stem models. The minimum acceptable configuration is the 26-stem Amapiano ontology defined in §1.4.
- The log drum is NOT the kick drum. Separation models must be evaluated specifically for log drum isolation quality against the timbral contract in §1.9.
- All Modal.com functions must have health-check endpoints and return structured JSON with at minimum: `{ status, job_id, timestamps, error? }`.
- Training data operations must be idempotent (re-running ingestion must not create duplicate records — SHA-256 deduplication is required).
- The cultural scoring LLM is GPT-4o (`gpt-4o`). The system prompt lives in `server/culturalScoring.ts`. Do not change the model or prompt without updating this file and the test fixtures.

#### Error Escalation Protocol for Modal Functions

When a Modal function fails, the response must follow this escalation chain — never silently swallow errors:

| Failure type | Action | User-visible message |
|---|---|---|
| Modal cold start timeout (< 30s) | Retry once automatically via Temporal | "Warming up AI engine, please wait…" |
| Modal execution timeout (> 90s) | Mark job as `failed`, trigger Temporal compensation | "Generation timed out. Your credits have not been charged. Try again." |
| Modal OOM / GPU error | Mark job as `failed`, alert via WebSocket, log to Sentry | "Server overloaded. Retrying with smaller batch…" |
| Modal HTTP 5xx (3 consecutive) | Escalate to dead-letter queue, notify admin via email | "Service temporarily unavailable. Your job is queued." |
| Modal HTTP 4xx (bad input) | Do not retry; return error to client immediately | Specific validation message |

All Temporal workflows that call Modal must implement a compensation step: if the Modal call fails after all retries, the workflow must reverse any partial state changes (e.g., mark generation as failed, delete partial S3 uploads).

### 3.4 Database

- Never use `any` for DB query results — use Drizzle inferred types.
- Migrations must be backward-compatible. Deprecation cycle for column removal:
  1. Add new column (or rename via add+copy)
  2. Deploy code that writes to both old and new column
  3. After 2 sprints with no issues, remove old column in a separate migration
  4. Deploy code that reads only from new column
  Never `DROP COLUMN` in a single migration step without completing this cycle.
- All timestamps in UTC. Use `defaultNow()` in Drizzle, not application-level `new Date()`.
- Schema must be TiDB-compatible — see §2.1.

### 3.5 Testing — Definition of Done

A feature is **Done** only when ALL of the following are true:

1. Feature works end-to-end in the deployed Railway environment (not just localhost)
2. Every tRPC procedure introduced has at least one passing integration test
3. Every Modal function introduced has a unit test (mocked HTTP) and an integration test gated by `MODAL_TEST_INTEGRATION=true`
4. For any generation-related feature: the cultural authenticity score is measurable and stored
5. TypeScript: `pnpm run check` passes with zero errors
6. No new `TODO:` or stub implementations in shipped code
7. PRD.md Phase table updated with the completed item checked
8. CLAUDE.md updated if a new pattern, convention, or domain rule was introduced

**Additional testing requirements:**
- Every tRPC procedure must have at least one passing integration test
- Every Modal function must have a unit test (mocked) and an integration test when `MODAL_TEST_INTEGRATION=true`
- Audio pipeline tests must assert on the shape/duration/channel-count of actual audio output
- Cultural authenticity scores must be tested with fixture tracks that have known expected scores
- Test file naming: `*.test.ts` for unit/integration, `*.e2e.ts` for end-to-end
- Do not write tests that pass without assertions (`expect(true).toBe(true)`)
- Do not mock the database in integration tests

---

## 4. Amapiano Stem Separation — Architecture Requirements

The current 4-stem Demucs model (`htdemucs`) is **insufficient** for this genre. The correct architecture is:

### Phase 1 — Immediate (use now)
Use `htdemucs_6s` (6-stem Demucs: `drums`, `bass`, `other`, `vocals`, `guitar`, `piano`) as foundation, then secondary-pass classify into 26 stems:
- `drums` → `log_drum`, `kick`, `snare_clap`, `hi_hat_closed`, `hi_hat_open`, `shaker_cabasa`, `congas_bongos`, `tambourine` using frequency-domain classification + onset detection + Euclidean pattern matching
- `other` → `pad_strings`, `flute`, `saxophone`, `kalimba_mbira`, `marimba`, `ad_libs`, `whistle_fx`, `room_ambience` using instrument classifier (CREPE + MFCC features)
- `vocals` → `lead_vocal`, `backing_vocals`, `vocal_chops`, `choir` using voice activity detection + pitch range + call-and-response detection
- `bass` → `bass_synth`, `bass_walk` using sub-frequency analysis (< 200 Hz melodic content vs. rhythmic)

**Log drum isolation is the highest-priority evaluation criterion.** Before deploying any separation model, verify the log drum SDR and run the timbral contract evaluation (§1.9) on the isolated stem.

### Phase 2 — Fine-tuned model (use training tracks)
Fine-tune Demucs on the 150+ Amapiano training tracks. Target metrics:
- SDR for log drum: ≥ 8 dB
- SDR for piano: ≥ 9 dB
- SDR for vocals: ≥ 11 dB
- Timbral contract score for log drum: ≥ 6.0/8.0

---

## 5. Training Data Policy

The owner has provided 150+ original Amapiano tracks (MP3, FLAC, WAV) for training. As of 2026-04-15, approximately 82 of 153 tracks have been uploaded to S3.

Rules:
1. All tracks stored in S3 under `training-data/amapiano/raw/`
2. Processed features go to `training-data/amapiano/features/`
3. Labelled stems go to `training-data/amapiano/stems/{track_id}/`
4. Training dataset metadata tracked in `modelTrainingDatasets` table
5. **Never** use training data tracks as sample pack content without explicit permission
6. Feature extraction must produce at minimum: BPM, key, Camelot key, Dorian probability, energy curve, LUFS, groove fingerprint, log drum timbral contract score, Contrast Score, cultural authenticity score (all 8 dimensions), Euclidean pattern per percussion stem, language detection + functional role, regional style, production era

---

## 6. What NOT to Do

- Do not use generic music descriptions — always use Amapiano-specific terminology
- Do not conflate log drum with kick drum in any code, comment, schema field, or UI label — they are architecturally distinct instruments
- Do not generate lyrics in languages not in the SA languages registry (§1.5)
- Do not hardcode BPM outside 115–130 for Amapiano presets
- Do not ship a feature with `TODO: implement` — either implement it or remove the endpoint
- Do not use `Math.random()` for anything musically meaningful — use seeded RNG with the generation seed stored in DB
- Do not write tests that pass without assertions
- Do not mock the database in integration tests
- Do not use `setTimeout` for audio scheduling
- Do not use Tone.js `15.x` without explicit testing — 15.x has breaking changes from 14.x
- Do not collapse sub-dimension scores in cultural scoring without computing each sub-component — losing sub-scores loses diagnostic value
- Do not use the Contrast Score formula incorrectly: swing_deviation is `(swing_pct − 53) / 14`, not absolute swing %
- Do not classify a track as Dorian without computing the chroma probability vector — "sounds minor" is not sufficient
- Do not perform phonemic evaluation of Nguni languages without click consonant handling — a model that drops clicks is not acceptable
- Do not call the fine-tuning pipeline before 500 gold-standard generations are collected — the corpus is too small to be meaningful
- Do not upgrade the cultural scoring LLM from GPT-4o without updating test fixtures and the scoring result schema

---

## 7. Documentation Requirements

Every new feature must include:
1. A comment block at the file level describing the domain context (why does this exist in the context of Amapiano production?)
2. JSDoc on all exported functions with `@param`, `@returns`, and `@throws`
3. If the feature involves a new ML model or audio processing step, update `PRD.md` Phase table
4. If the feature changes the schema, update `drizzle/schema.ts` with a descriptive comment on every new column
5. If the feature introduces a new domain rule or convention, update CLAUDE.md §1 before shipping

---

## 8. Repository Layout (Critical Paths)

```
server/
  _core/           — Express, tRPC, auth, env
  routers/         — Domain tRPC routers (one file per domain)
  db/              — Domain DB repositories (one file per domain)
  temporal/        — Temporal workflow + activity definitions
  musicGenerationRouter.ts  — Euclidean rhythm + cultural auth
  culturalScoring.ts        — GPT-4o cultural authenticity scoring (system prompt lives here)
  midiGenerator.ts          — MIDI pattern generation
  djStudioDb.ts             — DJ studio DB helpers
  modalClient.ts            — Modal.com HTTP client
  temporalClient.ts         — Temporal client helpers
  storage.ts                — S3 helpers (put / get / delete)
  websocket.ts              — Real-time job updates

client/src/
  components/daw/  — DAW UI (TimelineV2, PianoRoll, Mixer, Automation)
  components/dj/   — DJ Studio UI (TrackLibrary, Uploader, Player, Waveform)
  services/        — Audio engines (Tone.js, Web Audio API, Exporter)
  pages/           — Full page views
  stores/          — Zustand state

modal_backend/     — Python serverless (Modal.com)
  modal_app.py     — Main functions: analyze_track, separate_stems, generate_music, analyze_training_track, separate_training_stems
  set_renderer.py  — DJ set rendering (crossfades, tempo, EQ)
  set_planner.py   — Performance plan generation
  amapiano_analyzer.py     — Shared analysis functions (groove fingerprint, timbral contract, Contrast Score)
  training/        — Model fine-tuning scripts
    fine_tune_amapiano.py  — LoRA fine-tuning pipeline (Phase 3)

drizzle/
  schema.ts        — Single source of truth for all tables + types

shared/
  euclideanRhythm.ts  — Rhythm config types (used server + client)
  stems.ts            — 26-stem Amapiano ontology types
  languages.ts        — SA language registry
  contrastScore.ts    — Contrast Score formula (shared — used in analysis and generation)
```

---

## 9. Environment Variables Reference

See `.env.example` for the full list. Critical ones:

```
DATABASE_URL          — MySQL connection string (Railway Phase 0-1; TiDB Cloud Phase 2+)
JWT_SECRET            — Session token secret (64+ byte random string)
AWS_ACCESS_KEY_ID     — S3 credentials
AWS_SECRET_ACCESS_KEY
S3_BUCKET             — Primary media bucket
MODAL_API_KEY         — Modal.com API key
MODAL_BASE_URL        — Modal app base URL
TEMPORAL_SERVER_URL   — Temporal server (localhost:7233 dev; Temporal Cloud Phase 1+)
OPENAI_API_KEY        — GPT-4o for cultural scoring / lyrics (model: gpt-4o)
STRIPE_SECRET_KEY     — Payments
OWNER_EMAIL           — First-registered user gets admin role
MODAL_TEST_INTEGRATION — Set to "true" to run real Modal integration tests
```

---

## 10. Running the Project

```bash
# Install
pnpm install

# Type-check (must pass before any PR)
pnpm run check

# Tests (must all pass before any PR)
pnpm test

# Dev server (frontend + backend)
pnpm dev

# Build
pnpm build

# Deploy Modal functions
cd modal_backend && modal deploy modal_app.py

# Run Temporal worker
npx ts-node server/temporal/worker.ts
```
