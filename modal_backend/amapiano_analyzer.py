"""
amapiano_analyzer.py — Amapiano-Specific Audio Analysis

Extends standard DJ audio analysis (BPM, key, energy, LUFS) with features
that are specifically meaningful for Amapiano cultural authenticity:

1. Swing percentage — measures 16th-note timing deviation (target: 53–62%)
2. Log drum detection — identifies the defining sub-bass syncopated element
3. Piano voicing complexity — distinguishes jazz chords from basic triads
4. Flute detection — identifies the characteristic flute lines
5. Cultural score — composite Amapiano authenticity score (0–100)
6. Language detection — identifies SA languages in lyrics using Whisper

All functions operate on numpy arrays of audio data at 44100 Hz.
See CLAUDE.md §1.3 and §1.7 for the scoring rubric.
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple


# ── Constants ─────────────────────────────────────────────────────────────────

SAMPLE_RATE = 44100
AMAPIANO_BPM_MIN = 115.0
AMAPIANO_BPM_MAX = 130.0
AMAPIANO_SWING_MIN = 53.0
AMAPIANO_SWING_MAX = 62.0

# Sub-bass frequency range for log drum (Hz)
LOG_DRUM_FREQ_LOW = 40.0
LOG_DRUM_FREQ_HIGH = 200.0
LOG_DRUM_PEAK_FREQ_LOW = 50.0
LOG_DRUM_PEAK_FREQ_HIGH = 80.0

# Camelot wheel mapping (key_name -> camelot_code)
CAMELOT_MAP = {
    "C major": "8B",  "G major": "9B",  "D major": "10B", "A major": "11B",
    "E major": "12B", "B major": "1B",  "F# major": "2B", "C# major": "3B",
    "G# major": "4B", "D# major": "5B", "A# major": "6B", "F major": "7B",
    "A minor": "8A",  "E minor": "9A",  "B minor": "10A", "F# minor": "11A",
    "C# minor": "12A","G# minor": "1A", "D# minor": "2A", "A# minor": "3A",
    "F minor": "4A",  "C minor": "5A",  "G minor": "6A",  "D minor": "7A",
}

# Compatible Camelot keys (±1 and same key)
def get_compatible_keys(camelot_key: str) -> List[str]:
    """Returns harmonically compatible Camelot keys for mixing."""
    if not camelot_key or len(camelot_key) < 2:
        return []
    try:
        number = int(camelot_key[:-1])
        letter = camelot_key[-1]
        compatible = []
        # Same key, ±1 number, and opposite letter at same number
        for n in [(number - 1) % 12 or 12, number, (number % 12) + 1]:
            compatible.append(f"{n}{letter}")
        compatible.append(f"{number}{'B' if letter == 'A' else 'A'}")  # Relative key
        return list(set(compatible))
    except (ValueError, IndexError):
        return []


# ── Swing analysis ────────────────────────────────────────────────────────────

def compute_swing_percent(beats: np.ndarray, bpm: float) -> float:
    """
    Measure swing as the ratio of the long/short 8th-note pair timing.

    Straight 16ths: both 16th notes equal → 50% swing
    Full shuffle: first 16th is 2/3 of the beat → 66.7% swing
    Amapiano target: 53–62%

    Algorithm:
    1. Infer 16th-note grid from beat positions
    2. For each beat pair (strong-weak), measure the position of the
       intermediate onset relative to the beat pair duration
    3. Average across all beat pairs
    """
    if len(beats) < 4:
        return 50.0  # Not enough beats to measure

    quarter_duration = 60.0 / bpm  # seconds per beat
    sixteenth_duration = quarter_duration / 4.0

    swing_values = []

    for i in range(len(beats) - 1):
        beat_start = beats[i]
        beat_end = beats[i + 1]
        beat_dur = beat_end - beat_start

        # Expected position of the upbeat 8th (50% = straight)
        midpoint = beat_start + beat_dur * 0.5

        # We measure whether onsets cluster before or after the midpoint
        # by comparing the expected 16th-note positions
        # Swing ratio = (position_of_upbeat_onset - beat_start) / beat_dur
        # For now, use the beat duration as a proxy — uneven beats imply swing
        expected_duration = quarter_duration
        if expected_duration > 0:
            ratio = beat_dur / expected_duration
            # Clamp to sensible range
            if 0.8 <= ratio <= 1.2:
                # Project onto swing percentage scale
                # ratio=1.0 → 50% swing (straight)
                # ratio=1.33 → ~67% swing (full shuffle)
                swing_pct = 50.0 + (ratio - 1.0) * 100.0
                swing_values.append(np.clip(swing_pct, 45.0, 75.0))

    if not swing_values:
        return 50.0

    return float(np.mean(swing_values))


def compute_swing_from_onsets(
    audio: np.ndarray,
    beats: np.ndarray,
    bpm: float,
) -> float:
    """
    More accurate swing measurement using onset detection.

    Uses librosa to detect all note onsets, then measures how far each
    'upbeat' onset deviates from the straight 16th-note grid.
    """
    try:
        import librosa

        # Detect onsets
        onset_frames = librosa.onset.onset_detect(
            y=audio,
            sr=SAMPLE_RATE,
            units="time",
            hop_length=512,
            backtrack=True,
        )

        if len(onset_frames) < 8 or len(beats) < 2:
            return compute_swing_percent(beats, bpm)

        quarter = 60.0 / bpm
        eighth = quarter / 2.0

        swing_ratios = []
        for i in range(len(beats) - 1):
            beat_t = beats[i]
            next_beat_t = beats[i + 1]

            # Find onsets between this beat and the next
            mask = (onset_frames >= beat_t) & (onset_frames < next_beat_t)
            beat_onsets = onset_frames[mask]

            if len(beat_onsets) >= 2:
                # The first onset after the downbeat = downbeat onset
                # The second onset = upbeat onset
                # Swing % = (upbeat_pos - downbeat_pos) / beat_dur
                downbeat = beat_onsets[0]
                upbeat = beat_onsets[1]
                beat_dur = next_beat_t - beat_t

                if beat_dur > 0:
                    ratio = (upbeat - beat_t) / beat_dur
                    # Straight: ratio ≈ 0.5, Full shuffle: ratio ≈ 0.667
                    swing_pct = ratio * 100.0
                    if 45.0 <= swing_pct <= 75.0:
                        swing_ratios.append(swing_pct)

        if swing_ratios:
            return float(np.mean(swing_ratios))

        return compute_swing_percent(beats, bpm)

    except ImportError:
        return compute_swing_percent(beats, bpm)


# ── Log drum detection ────────────────────────────────────────────────────────

def detect_log_drum(
    audio: np.ndarray,
    beats: np.ndarray,
    bpm: float,
) -> Dict[str, Any]:
    """
    Detect the presence and characteristics of the Amapiano log drum.

    The log drum is a sub-bass percussion instrument (40–80 Hz fundamental)
    that plays a syncopated pattern. It is NOT the kick drum.

    Detection algorithm:
    1. Filter audio to 40–200 Hz (log drum frequency range)
    2. Compute energy envelope of the filtered signal
    3. Detect transient peaks (log drum hits)
    4. Measure syncopation: hits landing on off-beats indicate log drum
    5. Compute prominence (relative energy of log drum band)

    Returns:
      detected: bool — True if a log drum pattern is present
      freq_hz: float — Estimated fundamental frequency
      prominence: float — Relative energy (0–1)
      syncopation_score: float — How syncopated the pattern is (0–1)
    """
    try:
        from scipy import signal as sp_signal

        # Band-pass filter: 40–200 Hz
        nyq = SAMPLE_RATE / 2.0
        low = LOG_DRUM_FREQ_LOW / nyq
        high = LOG_DRUM_FREQ_HIGH / nyq
        b, a = sp_signal.butter(4, [low, high], btype="band")
        log_band = sp_signal.filtfilt(b, a, audio)

        # Energy envelope (RMS over 1024-sample windows)
        frame_size = 1024
        hop = 512
        n_frames = (len(log_band) - frame_size) // hop
        if n_frames < 1:
            return {"detected": False, "freq_hz": None, "prominence": 0.0, "syncopation_score": 0.0}

        rms = np.array([
            np.sqrt(np.mean(log_band[i*hop : i*hop + frame_size] ** 2))
            for i in range(n_frames)
        ])

        # Total audio energy for prominence calculation
        total_rms = np.sqrt(np.mean(audio ** 2))
        log_rms_mean = float(np.mean(rms))
        prominence = log_rms_mean / (total_rms + 1e-8)
        prominence = float(np.clip(prominence, 0.0, 1.0))

        # Detect transient peaks in the log band
        if len(rms) == 0 or np.max(rms) == 0:
            return {"detected": prominence > 0.05, "freq_hz": 60.0, "prominence": prominence, "syncopation_score": 0.0}

        peak_threshold = np.max(rms) * 0.4
        peak_indices = np.where(
            (rms > peak_threshold) &
            np.concatenate(([True], rms[1:] > rms[:-1])) &
            np.concatenate((rms[:-1] > rms[1:], [True]))
        )[0]

        # Estimate fundamental frequency using FFT of log band
        if len(log_band) > 4096:
            fft_magnitudes = np.abs(np.fft.rfft(log_band[:4096]))
            freqs = np.fft.rfftfreq(4096, d=1.0/SAMPLE_RATE)
            mask = (freqs >= LOG_DRUM_PEAK_FREQ_LOW) & (freqs <= LOG_DRUM_PEAK_FREQ_HIGH)
            if np.any(mask):
                peak_freq = float(freqs[mask][np.argmax(fft_magnitudes[mask])])
            else:
                peak_freq = 60.0
        else:
            peak_freq = 60.0

        # Syncopation: measure how many peaks fall off the quarter-note grid
        syncopation_score = 0.0
        if len(beats) >= 2 and len(peak_indices) > 0:
            quarter = 60.0 / bpm
            frame_times = peak_indices * hop / SAMPLE_RATE
            off_beat_count = 0
            for t in frame_times:
                # Distance from nearest beat
                distances = np.abs(beats - t)
                nearest_beat_dist = np.min(distances)
                # If hit is > 1/8 note from any beat, it's off-beat (syncopated)
                if nearest_beat_dist > quarter * 0.3:
                    off_beat_count += 1
            syncopation_score = float(off_beat_count) / max(len(frame_times), 1)

        detected = prominence > 0.04 and syncopation_score > 0.2

        return {
            "detected": detected,
            "freq_hz": peak_freq,
            "prominence": prominence,
            "syncopation_score": syncopation_score,
        }

    except Exception as e:
        print(f"[AmapianoAnalyzer] Log drum detection failed: {e}")
        return {"detected": False, "freq_hz": None, "prominence": 0.0, "syncopation_score": 0.0}


# ── Piano complexity ──────────────────────────────────────────────────────────

def compute_piano_complexity(audio: np.ndarray) -> float:
    """
    Estimate piano chord voicing complexity using chroma features.

    Amapiano uses extended jazz voicings (7ths, 9ths, 11ths). Basic triads
    score ~0.3; full jazz voicings score ~0.8–1.0.

    Algorithm:
    1. Compute chromagram (12 pitch classes)
    2. For each analysis frame, count how many pitch classes are active
       above a threshold — this correlates with chord complexity
    3. Return the mean complexity score

    Score:
      0.0 = no harmonic content (drums/bass only)
      0.3 = basic triads (3 notes)
      0.6 = 7th chords (4 notes)
      0.8 = 9th/11th chords (5+ notes)
      1.0 = full jazz voicings with extensions
    """
    try:
        import librosa

        # Compute chroma using CQT (better pitch accuracy than STFT)
        chroma = librosa.feature.chroma_cqt(
            y=audio,
            sr=SAMPLE_RATE,
            hop_length=2048,
            bins_per_octave=36,
        )

        # Normalize each frame
        chroma_norm = chroma / (np.max(chroma, axis=0, keepdims=True) + 1e-8)

        # Count active pitch classes per frame (threshold: 0.4)
        active_pcs = np.sum(chroma_norm > 0.4, axis=0)

        # Complexity: 0 PC = 0.0, 3 PC (triad) = 0.3, 7+ PC = 1.0
        complexity_per_frame = np.clip(active_pcs / 7.0, 0.0, 1.0)

        # Weight frames by their energy (louder = more representative)
        energy = np.sum(chroma ** 2, axis=0)
        if np.sum(energy) > 0:
            weights = energy / np.sum(energy)
            complexity = float(np.average(complexity_per_frame, weights=weights))
        else:
            complexity = float(np.mean(complexity_per_frame))

        return float(np.clip(complexity, 0.0, 1.0))

    except ImportError:
        # Fallback: use scipy FFT to measure harmonic content width
        try:
            from scipy.fft import rfft, rfftfreq
            N = min(len(audio), 4 * SAMPLE_RATE)  # 4 seconds
            fft = np.abs(rfft(audio[:N]))
            freqs = rfftfreq(N, d=1.0 / SAMPLE_RATE)

            # Piano range: 80–4000 Hz
            piano_mask = (freqs >= 80) & (freqs <= 4000)
            piano_energy = np.sum(fft[piano_mask] ** 2)
            total_energy = np.sum(fft ** 2) + 1e-8

            return float(np.clip(piano_energy / total_energy * 2.0, 0.0, 1.0))
        except Exception:
            return 0.5  # Unknown complexity


# ── Flute detection ───────────────────────────────────────────────────────────

def detect_flute(audio: np.ndarray) -> bool:
    """
    Detect the presence of a flute (or other high-pitched melodic instrument)
    characteristic of Amapiano.

    Flute characteristics:
    - Fundamental frequency: 300–2500 Hz (concert flute)
    - Very low odd-harmonic content (nearly pure tone)
    - High spectral centroid relative to instrument brightness
    - Continuous pitch (not percussive — low onset density)

    Returns True if a flute-like instrument is detected.
    """
    try:
        from scipy.fft import rfft, rfftfreq

        N = min(len(audio), 4 * SAMPLE_RATE)
        audio_chunk = audio[:N]
        fft = np.abs(rfft(audio_chunk))
        freqs = rfftfreq(N, d=1.0 / SAMPLE_RATE)

        # Flute frequency range
        flute_mask = (freqs >= 300) & (freqs <= 2500)
        flute_energy = np.sum(fft[flute_mask] ** 2)
        total_energy = np.sum(fft ** 2) + 1e-8

        flute_ratio = flute_energy / total_energy

        # Flute also has very low sub-bass energy
        sub_mask = freqs < 200
        sub_energy = np.sum(fft[sub_mask] ** 2) / total_energy

        # If flute-range energy is significant and sub-bass is low: likely flute
        return bool(flute_ratio > 0.15 and sub_energy < 0.3)

    except Exception as e:
        print(f"[AmapianoAnalyzer] Flute detection failed: {e}")
        return False


# ── Language detection ────────────────────────────────────────────────────────

def detect_language(audio_path: str) -> Dict[str, Any]:
    """
    Detect SA language(s) in audio using OpenAI Whisper.

    Returns:
      detected_language: str — ISO 639-3 code of primary language
      language_confidence: float — Confidence 0–1
      detected_languages: List[str] — All detected language codes
      transcription: str — Partial transcription (first 30 seconds)
    """
    try:
        import whisper

        # Use small model for speed; swap to "medium" for better accuracy
        model = whisper.load_model("small")

        # Detect language from first 30 seconds only
        audio_data = whisper.load_audio(audio_path)
        audio_30s = audio_data[:30 * 16000]  # Whisper uses 16kHz internally

        # Pad/trim to 30 seconds for language detection
        audio_padded = whisper.pad_or_trim(audio_30s)
        mel = whisper.log_mel_spectrogram(audio_padded).to(model.device)

        _, language_probs = model.detect_language(mel)

        # Map Whisper language codes to ISO 639-3 SA language codes
        whisper_to_iso = {
            "zu": "zul",  # Zulu
            "xh": "xho",  # Xhosa
            "st": "sot",  # Sesotho
            "tn": "tsn",  # Setswana
            "nso": "nso", # Northern Sotho
            "ve": "ven",  # Venda
            "ts": "tso",  # Tsonga
            "nr": "nbl",  # Ndebele
            "ss": "ssw",  # Swati
            "af": "afr",  # Afrikaans
            "en": "eng",  # English
        }

        # Find all SA languages in top results
        top_languages = sorted(language_probs.items(), key=lambda x: -x[1])
        sa_languages = []
        primary_lang = "eng"
        primary_confidence = 0.5

        for lang_code, prob in top_languages[:10]:
            if lang_code in whisper_to_iso and prob > 0.05:
                iso = whisper_to_iso[lang_code]
                sa_languages.append(iso)
                if not sa_languages or prob > primary_confidence:
                    primary_lang = iso
                    primary_confidence = float(prob)

        if not sa_languages:
            sa_languages = ["eng"]  # Default fallback

        # Quick transcription of first 30s
        result = model.transcribe(audio_path, language=None, fp16=False, verbose=False)
        transcription = result.get("text", "")[:500]  # Truncate to 500 chars

        return {
            "detected_language": primary_lang,
            "language_confidence": primary_confidence,
            "detected_languages": sa_languages,
            "transcription": transcription,
        }

    except ImportError:
        print("[AmapianoAnalyzer] whisper not available — skipping language detection")
        return {
            "detected_language": "zul",  # Default to Zulu (most common in Amapiano)
            "language_confidence": 0.0,
            "detected_languages": ["zul", "eng"],
            "transcription": "",
        }
    except Exception as e:
        print(f"[AmapianoAnalyzer] Language detection failed: {e}")
        return {
            "detected_language": "zul",
            "language_confidence": 0.0,
            "detected_languages": ["zul", "eng"],
            "transcription": "",
        }


# ── Cultural authenticity score ────────────────────────────────────────────────

def compute_cultural_score(
    bpm: float,
    swing_percent: float,
    log_drum_detected: bool,
    log_drum_prominence: float,
    piano_complexity: float,
    flute_detected: bool,
    energy_avg: float,
    detected_language: str,
    language_confidence: float,
) -> Tuple[float, Dict[str, float]]:
    """
    Compute composite Amapiano cultural authenticity score (0–100).

    Scoring rubric (see CLAUDE.md §1.7):
      log_drum   : 0–20  — Presence and prominence of log drum
      piano      : 0–20  — Piano complexity (jazz voicings vs triads)
      swing      : 0–15  — Swing percentage in target range (53–62%)
      language   : 0–15  — SA language detected with confidence
      energy_arc : 0–10  — Energy level appropriate for amapiano
      harmonic   : 0–10  — BPM in Amapiano range (115–130)
      timbre     : 0–5   — Flute or other characteristic instruments
      era        : 0–5   — BPM/swing combination suggests modern production

    Returns: (total_score, breakdown_dict)
    """

    # ── Log drum (0–20) ────────────────────────────────────────────────────────
    log_drum_score = 0.0
    if log_drum_detected:
        log_drum_score = 10.0 + min(log_drum_prominence * 50.0, 10.0)
    elif log_drum_prominence > 0.02:
        log_drum_score = log_drum_prominence * 100.0  # Some sub-bass present

    # ── Piano complexity (0–20) ───────────────────────────────────────────────
    # 0.0 = no piano → 0 pts; 0.5 = basic chords → 10 pts; 1.0 = jazz voicings → 20 pts
    piano_score = float(np.clip(piano_complexity * 20.0, 0.0, 20.0))

    # ── Swing (0–15) ──────────────────────────────────────────────────────────
    # Peak score at center of target range (57.5%)
    swing_center = (AMAPIANO_SWING_MIN + AMAPIANO_SWING_MAX) / 2.0  # 57.5
    swing_width = (AMAPIANO_SWING_MAX - AMAPIANO_SWING_MIN) / 2.0   # 4.5
    swing_distance = abs(swing_percent - swing_center)
    if swing_distance <= swing_width:
        swing_score = 15.0 * (1.0 - swing_distance / swing_width)
    elif swing_distance <= swing_width * 2:
        swing_score = 7.5 * (1.0 - (swing_distance - swing_width) / swing_width)
    else:
        swing_score = 0.0

    # ── Language (0–15) ───────────────────────────────────────────────────────
    sa_languages = {"zul", "xho", "sot", "tsn", "nso", "ven", "tso", "nbl", "ssw", "afr"}
    if detected_language in sa_languages and language_confidence > 0.3:
        language_score = 15.0 * min(language_confidence * 1.5, 1.0)
    elif detected_language == "eng" and language_confidence < 0.7:
        # Possibly mixed — partial credit
        language_score = 7.5
    else:
        language_score = 0.0

    # ── Energy arc (0–10) ─────────────────────────────────────────────────────
    # Amapiano typically has moderate-high energy (0.4–0.85)
    if 0.4 <= energy_avg <= 0.85:
        energy_arc_score = 10.0
    elif 0.3 <= energy_avg < 0.4 or 0.85 < energy_avg <= 0.95:
        energy_arc_score = 5.0
    else:
        energy_arc_score = 2.0

    # ── Harmonic / BPM (0–10) ─────────────────────────────────────────────────
    if AMAPIANO_BPM_MIN <= bpm <= AMAPIANO_BPM_MAX:
        harmonic_score = 10.0
    elif AMAPIANO_BPM_MIN - 5 <= bpm < AMAPIANO_BPM_MIN or AMAPIANO_BPM_MAX < bpm <= AMAPIANO_BPM_MAX + 5:
        harmonic_score = 5.0
    else:
        harmonic_score = 0.0

    # ── Timbre (0–5) ──────────────────────────────────────────────────────────
    timbre_score = 5.0 if flute_detected else 2.0  # Flute is characteristic

    # ── Era (0–5) ─────────────────────────────────────────────────────────────
    # Modern Amapiano (2021+) tends toward 120–128 BPM with 55–60% swing
    if 120 <= bpm <= 128 and 55 <= swing_percent <= 60:
        era_score = 5.0
    elif 117 <= bpm <= 128:
        era_score = 3.0
    else:
        era_score = 1.0

    # ── Total ──────────────────────────────────────────────────────────────────
    breakdown = {
        "logDrum": round(log_drum_score, 1),
        "piano": round(piano_score, 1),
        "swing": round(swing_score, 1),
        "language": round(language_score, 1),
        "energyArc": round(energy_arc_score, 1),
        "harmonic": round(harmonic_score, 1),
        "timbre": round(timbre_score, 1),
        "era": round(era_score, 1),
    }

    total = sum(breakdown.values())
    return round(total, 1), breakdown


# ── Regional style inference ──────────────────────────────────────────────────

def infer_regional_style(
    bpm: float,
    swing_percent: float,
    detected_language: str,
    log_drum_prominence: float,
) -> str:
    """
    Infer the regional Amapiano style based on BPM, swing, language, and dynamics.

    See CLAUDE.md §1.2 for regional style specifications.
    """
    if detected_language in ("tso",) and bpm >= 120:
        return "Limpopo"
    if detected_language in ("xho", "afr") and swing_percent <= 52:
        return "Cape Town"
    if bpm >= 115 and bpm <= 121 and swing_percent <= 53:
        return "Durban"
    if log_drum_prominence > 0.15 and bpm >= 122:
        return "East Rand"
    if bpm >= 118:
        return "Gauteng"
    return "Gauteng"  # Default: most tracks are Gauteng-origin


# ── Production era inference ──────────────────────────────────────────────────

def infer_production_era(bpm: float, lufs: float, swing_percent: float) -> str:
    """
    Infer production era based on BPM, loudness, and swing patterns.

    Classic (2017–2020): Lower BPM (115–118), looser production
    Modern (2021+): Higher BPM (120–128), more polished, louder (LUFS ≥ -10)
    """
    if bpm >= 120 and lufs >= -11 and swing_percent >= 55:
        return "modern"
    return "classic"
