"""
AURA-X DJ Studio — Modal Backend
Amapiano-Specific Audio Processing Pipeline

Architecture:
  CPU functions: analysis (Essentia + Whisper + amapiano_analyzer)
  GPU functions: stem separation (Demucs htdemucs_6s + 26-stem classifier)
  Web endpoints: HTTP-callable by Node.js training router and Temporal workflows
  S3: all audio artefacts stored at defined key prefixes
  Webhooks: callbacks to Node.js tRPC endpoints on completion

Key endpoints:
  POST /analyze-track              — DJ Studio: analysis + Amapiano features
  POST /separate-stems             — DJ Studio: 26-stem separation
  POST /render-dj-set              — DJ Studio: final mix render
  POST /analyze-training-track     — Training pipeline: analysis + cultural score
  POST /separate-stems-training    — Training pipeline: 26-stem + SDR quality
"""

import modal
import os
from typing import Dict, Any, List, Optional

# ---------------------------------------------------------------------------
# App definition
# ---------------------------------------------------------------------------

app = modal.App("aura-x-dj-studio")

# Model cache volume (Demucs ~300 MB, Whisper-small ~450 MB)
models_volume = modal.Volume.from_name("aura-x-models", create_if_missing=True)

# ---------------------------------------------------------------------------
# Container images
# ---------------------------------------------------------------------------

# CPU image: Essentia + librosa + scipy + Whisper (CPU inference)
_cpu_base = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg",
        "libsndfile1",
        "libsndfile1-dev",
        "libyaml-dev",
        "libfftw3-dev",
        "libavcodec-dev",
        "libavformat-dev",
        "libavutil-dev",
        "libsamplerate0-dev",
        "libtag1-dev",
        "rubberband-cli",   # tempo-shifting for set renderer
    )
    .pip_install("setuptools")
    # openai-whisper uses legacy setup.py that needs pkg_resources at build time;
    # --no-build-isolation reuses the env where setuptools is already installed.
    .pip_install("openai-whisper==20231117", extra_options="--no-build-isolation")
    .pip_install(
        "fastapi",          # required by @modal.web_endpoint / @modal.fastapi_endpoint
        "essentia==2.1b6.dev1110",
        "numpy==1.24.3",
        "scipy==1.11.4",
        "librosa==0.10.1",
        "soundfile==0.12.1",
        "pydub==0.25.1",
        "boto3==1.34.34",
        "requests==2.31.0",
        "torch==2.1.2",
        "torchaudio==2.1.2",
    )
    .add_local_python_source("amapiano_analyzer")
    .add_local_python_source("stem_separator_26")
    .add_local_python_source("set_renderer")
    .add_local_python_source("set_planner")
)

# GPU image: same dependencies + Demucs, PyTorch GPU
_gpu_base = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg",
        "libsndfile1",
        "libsndfile1-dev",
        "libyaml-dev",
        "libfftw3-dev",
        "libavcodec-dev",
        "libavformat-dev",
        "libavutil-dev",
        "libsamplerate0-dev",
        "libtag1-dev",
        "rubberband-cli",
    )
    .pip_install("setuptools")
    .pip_install("openai-whisper==20231117", extra_options="--no-build-isolation")
    .pip_install(
        "fastapi",          # required by @modal.web_endpoint / @modal.fastapi_endpoint
        "essentia==2.1b6.dev1110",
        "numpy==1.24.3",
        "scipy==1.11.4",
        "librosa==0.10.1",
        "soundfile==0.12.1",
        "pydub==0.25.1",
        "boto3==1.34.34",
        "requests==2.31.0",
        # GPU-enabled torch
        "torch==2.1.2+cu121",
        "torchaudio==2.1.2+cu121",
        "demucs==4.0.1",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu121",
    )
    .add_local_python_source("amapiano_analyzer")
    .add_local_python_source("stem_separator_26")
    .add_local_python_source("set_renderer")
    .add_local_python_source("set_planner")
)

# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------

def _s3_client():
    """Create a boto3 S3 client from env secrets."""
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("S3_REGION", "us-east-1"),
    )


def _s3_bucket() -> str:
    return os.environ["S3_BUCKET"]


def _s3_download(file_key: str, local_path: str) -> None:
    _s3_client().download_file(_s3_bucket(), file_key, local_path)


def _s3_upload(local_path: str, file_key: str, content_type: str = "audio/wav") -> str:
    """Upload file to S3 and return its public URL."""
    client = _s3_client()
    bucket = _s3_bucket()
    client.upload_file(
        local_path,
        bucket,
        file_key,
        ExtraArgs={"ContentType": content_type},
    )
    region = os.environ.get("S3_REGION", "us-east-1")
    return f"https://{bucket}.s3.{region}.amazonaws.com/{file_key}"


def _send_webhook(webhook_url: str, data: Dict[str, Any]) -> None:
    """POST JSON payload to a webhook URL (fire-and-forget with retry)."""
    import requests
    for attempt in range(3):
        try:
            r = requests.post(webhook_url, json=data, timeout=30)
            r.raise_for_status()
            print(f"[Webhook] OK → {webhook_url}")
            return
        except Exception as exc:
            print(f"[Webhook] Attempt {attempt + 1} failed: {exc}")
    print(f"[Webhook] All retries exhausted for {webhook_url}")


# ---------------------------------------------------------------------------
# Camelot wheel helper (shared by analysis functions)
# ---------------------------------------------------------------------------

_CAMELOT_MAJOR = {
    "C": "8B", "G": "9B", "D": "10B", "A": "11B", "E": "12B", "B": "1B",
    "F#": "2B", "Gb": "2B", "C#": "3B", "Db": "3B", "G#": "4B", "Ab": "4B",
    "D#": "5B", "Eb": "5B", "A#": "6B", "Bb": "6B", "F": "7B",
}
_CAMELOT_MINOR = {
    "A": "8A", "E": "9A", "B": "10A", "F#": "11A", "Gb": "11A", "C#": "12A",
    "Db": "12A", "G#": "1A", "Ab": "1A", "D#": "2A", "Eb": "2A", "A#": "3A",
    "Bb": "3A", "F": "4A", "C": "5A", "G": "6A", "D": "7A",
}

def _camelot(key: str, scale: str) -> str:
    tbl = _CAMELOT_MAJOR if scale == "major" else _CAMELOT_MINOR
    return tbl.get(key, "?")


# Compatible Camelot neighbors (same number ±1, same letter ±1 letter)
def _compatible_keys(camelot: str) -> List[str]:
    if len(camelot) < 2 or not camelot[:-1].isdigit():
        return []
    num = int(camelot[:-1])
    letter = camelot[-1]
    neighbors = []
    for n in [(num - 1) % 12 or 12, num, (num % 12) + 1]:
        neighbors.append(f"{n}{letter}")
    alt_letter = "B" if letter == "A" else "A"
    neighbors.append(f"{num}{alt_letter}")
    return neighbors


# ============================================================================
# ANALYSIS — DJ STUDIO
# ============================================================================

@app.function(
    image=_cpu_base,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/root/.cache": models_volume},
    timeout=600,
    cpu=4.0,
)
@modal.fastapi_endpoint(method="POST")
def analyze_track(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full Amapiano analysis for a DJ Studio track.

    Request body:
        track_id     int
        file_key     str   (S3 key for the raw audio)
        webhook_url  str   (optional — tRPC endpoint to POST results to)

    Returns the full analysis result (also POSTs it to webhook_url).
    """
    import tempfile, os, json
    import essentia.standard as es
    import numpy as np

    from amapiano_analyzer import (
        compute_swing_percent,
        detect_log_drum,
        compute_piano_complexity,
        detect_flute,
        detect_language,
        compute_cultural_score,
        infer_regional_style,
        infer_production_era,
        compute_groove_fingerprint,
        compute_log_drum_syncopation_map,
        compute_contrast_score,
    )

    track_id: int = body["track_id"]
    file_key: str = body["file_key"]
    webhook_url: Optional[str] = body.get("webhook_url")

    print(f"[Analysis] track={track_id}  key={file_key}")

    ext = os.path.splitext(file_key)[-1] or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        input_path = f.name

    try:
        _s3_download(file_key, input_path)

        # ── Essentia core analysis ───────────────────────────────────────────
        loader = es.MonoLoader(filename=input_path, sampleRate=44100)
        audio = loader()
        sr = 44100
        duration_sec = len(audio) / float(sr)

        rhythm = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, beats_confidence, _, beats_intervals = rhythm(audio)

        key_extractor = es.KeyExtractor()
        key, scale, key_strength = key_extractor(audio)
        camelot_key = _camelot(key, scale)
        compatible_keys = _compatible_keys(camelot_key)

        # Energy curve (1-second windows)
        energy_curve: List[float] = []
        hop = sr
        energy_fn = es.Energy()
        for i in range(0, len(audio), hop):
            frame = audio[i : i + hop]
            if len(frame) > 0:
                energy_curve.append(float(energy_fn(frame)))
        energy_avg = float(np.mean(energy_curve)) if energy_curve else 0.0

        # Downbeats
        try:
            dbt = es.BeatTrackerMultiFeature()
            downbeats_arr = dbt(audio)
            downbeats = [float(t) for t in downbeats_arr]
        except Exception:
            downbeats = []

        # LUFS
        try:
            lufs_fn = es.LoudnessEBUR128()
            lufs_integrated, lufs_range, _, _ = lufs_fn(audio)
            lufs = float(lufs_integrated)
            dynamic_range = float(lufs_range)
        except Exception:
            lufs = -23.0
            dynamic_range = 6.0

        true_peak = float(np.max(np.abs(audio)))

        # ── Amapiano-specific features ───────────────────────────────────────
        beats_np = np.array([float(b) for b in beats])
        swing_pct = compute_swing_percent(beats_np, float(bpm))

        log_drum_info = detect_log_drum(audio, beats_np, float(bpm))
        piano_complexity = compute_piano_complexity(audio)
        flute_detected = detect_flute(audio)

        # Language detection (Whisper — may be slow on CPU; handled gracefully)
        try:
            lang_info = detect_language(input_path)
        except Exception as exc:
            print(f"[Analysis] Language detection skipped: {exc}")
            lang_info = {
                "detected_language": "eng",
                "language_confidence": 0.0,
                "detected_languages": ["eng"],
                "transcription": "",
            }

        # Cultural score
        cultural_score, cultural_breakdown = compute_cultural_score(
            bpm=float(bpm),
            swing_percent=swing_pct,
            log_drum_detected=log_drum_info["detected"],
            log_drum_prominence=log_drum_info.get("prominence", 0.0),
            piano_complexity=piano_complexity,
            flute_detected=flute_detected,
            energy_avg=energy_avg,
            detected_language=lang_info["detected_language"],
            language_confidence=lang_info["language_confidence"],
        )

        regional_style = infer_regional_style(
            bpm=float(bpm),
            swing_percent=swing_pct,
            detected_language=lang_info["detected_language"],
            log_drum_prominence=log_drum_info.get("prominence", 0.0),
        )
        production_era = infer_production_era(
            bpm=float(bpm),
            lufs=lufs,
            swing_percent=swing_pct,
        )

        # ── T10: Groove fingerprint + log drum syncopation map ────────────────
        groove = compute_groove_fingerprint(audio, beats_np, float(bpm))
        log_drum_syncopation = compute_log_drum_syncopation_map(
            audio, beats_np, float(bpm)
        )

        # ── T11: Contrast Score ───────────────────────────────────────────────
        # log_drum_attack_centroid_hz: use log drum freq_hz as a proxy for the
        # attack transient centroid when full timbral analysis is not available.
        # Defaults to 300 Hz (mid-range wood sound) when not detected.
        log_drum_centroid = float(log_drum_info.get("freq_hz") or 300.0)
        # avg_piano_chord_note_count: derive from piano_complexity (0–1 → 1–7 notes)
        avg_note_count = 1.0 + piano_complexity * 6.0
        contrast = compute_contrast_score(
            swing_percent=swing_pct,
            bpm=float(bpm),
            log_drum_attack_centroid_hz=log_drum_centroid,
            avg_piano_chord_note_count=avg_note_count,
        )

        # Beat-grid (compact: beat positions for client waveform display)
        beatgrid = [float(b) for b in beats[:500]]  # cap at 500 markers

        result: Dict[str, Any] = {
            "track_id": track_id,
            "duration_sec": duration_sec,
            "bpm": float(bpm),
            "bpm_confidence": float(beats_confidence),
            "key": key,
            "scale": scale,
            "camelot_key": camelot_key,
            "compatible_keys": compatible_keys,
            "energy_curve": energy_curve,
            "energy_avg": energy_avg,
            "beatgrid": beatgrid,
            "downbeats": downbeats,
            "lufs": lufs,
            "dynamic_range": dynamic_range,
            "true_peak": true_peak,
            # Amapiano
            "swing_percent": swing_pct,
            "log_drum_detected": log_drum_info["detected"],
            "log_drum_freq_hz": log_drum_info.get("freq_hz"),
            "log_drum_prominence": log_drum_info.get("prominence"),
            "piano_complexity": piano_complexity,
            "flute_detected": flute_detected,
            "cultural_score": cultural_score,
            "cultural_score_breakdown": cultural_breakdown,
            "detected_language": lang_info["detected_language"],
            "language_confidence": lang_info["language_confidence"],
            "detected_languages": lang_info["detected_languages"],
            "regional_style": regional_style,
            "production_era": production_era,
            # T10: Groove fingerprint
            "groove_fingerprint": groove,
            "log_drum_syncopation_map": log_drum_syncopation,
            # T11: Contrast Score
            "contrast_score": contrast["score"],
            "contrast_score_label": contrast["label"],
        }

        if webhook_url:
            _send_webhook(webhook_url, result)

        print(f"[Analysis] DONE  track={track_id}  bpm={bpm:.1f}  cultural={cultural_score:.1f}")
        return result

    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


# ============================================================================
# STEM SEPARATION — DJ STUDIO (26 stems)
# ============================================================================

@app.function(
    image=_gpu_base,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/root/.cache": models_volume},
    gpu="A10G",
    timeout=1800,
)
@modal.fastapi_endpoint(method="POST")
def separate_stems(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    26-stem Amapiano separation for a DJ Studio track.

    Request body:
        track_id     int
        file_key     str   (S3 key for raw audio)
        user_id      int   (used for S3 prefix)
        webhook_url  str   (optional)

    Returns stem_map: { stem_id: { url, key, sdr_db } }
    """
    import tempfile, os
    from stem_separator_26 import separate_26_stems

    track_id: int = body["track_id"]
    file_key: str = body["file_key"]
    user_id: int = body["user_id"]
    webhook_url: Optional[str] = body.get("webhook_url")

    print(f"[Stems] track={track_id}  key={file_key}")

    ext = os.path.splitext(file_key)[-1] or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        input_path = f.name

    tmp_dir = tempfile.mkdtemp(prefix="stems_")

    try:
        _s3_download(file_key, input_path)

        s3_prefix = f"dj-stems/{user_id}/{track_id}/"

        stem_map = separate_26_stems(
            input_path=input_path,
            output_dir=tmp_dir,
            s3_prefix=s3_prefix,
            upload_fn=_s3_upload,
            model="htdemucs_6s",
        )

        stems_completed = len(stem_map)
        avg_sdr = (
            sum(v.get("sdr_db", 0) for v in stem_map.values()) / stems_completed
            if stems_completed > 0 else 0.0
        )

        result: Dict[str, Any] = {
            "track_id": track_id,
            "stem_map": stem_map,
            "stems_completed": stems_completed,
            "avg_sdr_db": avg_sdr,
        }

        if webhook_url:
            _send_webhook(webhook_url, result)

        print(f"[Stems] DONE  track={track_id}  stems={stems_completed}  avg_sdr={avg_sdr:.1f} dB")
        return result

    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# ANALYSIS — TRAINING PIPELINE
# ============================================================================

@app.function(
    image=_cpu_base,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/root/.cache": models_volume},
    timeout=900,
    cpu=4.0,
)
@modal.fastapi_endpoint(method="POST")
def analyze_training_track(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analysis for training pipeline.  Same computation as analyze_track but
    posts to training.analysisWebhook with training_track_id field.

    Request body:
        training_track_id  int
        file_key           str
        webhook_url        str   (tRPC /training.analysisWebhook)
    """
    import tempfile, os
    import essentia.standard as es
    import numpy as np

    from amapiano_analyzer import (
        compute_swing_percent,
        detect_log_drum,
        compute_piano_complexity,
        detect_flute,
        detect_language,
        compute_cultural_score,
        infer_regional_style,
        infer_production_era,
    )

    training_track_id: int = body["training_track_id"]
    file_key: str = body["file_key"]
    webhook_url: str = body["webhook_url"]

    print(f"[TrainingAnalysis] training_track_id={training_track_id}  key={file_key}")

    # Generate a job_id for the response (used by Node before webhook fires)
    job_id = f"train-analyze-{training_track_id}"

    ext = os.path.splitext(file_key)[-1] or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        input_path = f.name

    try:
        _s3_download(file_key, input_path)

        loader = es.MonoLoader(filename=input_path, sampleRate=44100)
        audio = loader()
        sr = 44100
        duration_sec = len(audio) / float(sr)

        rhythm = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, beats_confidence, _, _ = rhythm(audio)

        key_extractor = es.KeyExtractor()
        key, scale, _ = key_extractor(audio)

        try:
            lufs_fn = es.LoudnessEBUR128()
            lufs_integrated, _, _, _ = lufs_fn(audio)
            lufs = float(lufs_integrated)
        except Exception:
            lufs = -23.0

        beats_np = np.array([float(b) for b in beats])
        swing_pct = compute_swing_percent(beats_np, float(bpm))

        energy_curve: List[float] = []
        energy_fn = es.Energy()
        for i in range(0, len(audio), sr):
            frame = audio[i : i + sr]
            if len(frame) > 0:
                energy_curve.append(float(energy_fn(frame)))
        energy_avg = float(np.mean(energy_curve)) if energy_curve else 0.0

        log_drum_info = detect_log_drum(audio, beats_np, float(bpm))
        piano_complexity = compute_piano_complexity(audio)
        flute_detected = detect_flute(audio)

        try:
            lang_info = detect_language(input_path)
        except Exception as exc:
            print(f"[TrainingAnalysis] Language detection skipped: {exc}")
            lang_info = {
                "detected_language": "eng",
                "language_confidence": 0.0,
                "detected_languages": ["eng"],
                "transcription": "",
            }

        cultural_score, cultural_breakdown = compute_cultural_score(
            bpm=float(bpm),
            swing_percent=swing_pct,
            log_drum_detected=log_drum_info["detected"],
            log_drum_prominence=log_drum_info.get("prominence", 0.0),
            piano_complexity=piano_complexity,
            flute_detected=flute_detected,
            energy_avg=energy_avg,
            detected_language=lang_info["detected_language"],
            language_confidence=lang_info["language_confidence"],
        )

        regional_style = infer_regional_style(
            bpm=float(bpm),
            swing_percent=swing_pct,
            detected_language=lang_info["detected_language"],
            log_drum_prominence=log_drum_info.get("prominence", 0.0),
        )
        production_era = infer_production_era(
            bpm=float(bpm),
            lufs=lufs,
            swing_percent=swing_pct,
        )

        # Webhook payload matches training.analysisWebhook Zod schema
        webhook_payload: Dict[str, Any] = {
            "training_track_id": training_track_id,
            "bpm": float(bpm),
            "key": key,
            "scale": scale,
            "swing_percent": swing_pct,
            "lufs": lufs,
            "duration_sec": duration_sec,
            "cultural_score": cultural_score,
            "detected_language": lang_info["detected_language"],
            "detected_languages": lang_info["detected_languages"],
            "regional_style": regional_style,
        }

        _send_webhook(webhook_url, webhook_payload)

        print(
            f"[TrainingAnalysis] DONE  id={training_track_id}  "
            f"bpm={bpm:.1f}  cultural={cultural_score:.1f}  "
            f"lang={lang_info['detected_language']}"
        )
        return {"job_id": job_id, "status": "complete"}

    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)


# ============================================================================
# STEM SEPARATION — TRAINING PIPELINE (26 stems + SDR quality)
# ============================================================================

@app.function(
    image=_gpu_base,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/root/.cache": models_volume},
    gpu="A10G",
    timeout=3600,
)
@modal.fastapi_endpoint(method="POST")
def separate_stems_training(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    26-stem separation for training tracks.  Stores stems under:
        training-data/amapiano/stems/{training_track_id}/{stem_id}.wav

    Request body:
        training_track_id  int
        file_key           str   (S3 key for raw audio)
        stems_prefix       str   (S3 prefix for output stems)
        webhook_url        str   (tRPC /training.stemsWebhook)
    """
    import tempfile, os, shutil
    from stem_separator_26 import separate_26_stems

    training_track_id: int = body["training_track_id"]
    file_key: str = body["file_key"]
    stems_prefix: str = body.get("stems_prefix", f"training-data/amapiano/stems/{training_track_id}/")
    webhook_url: str = body["webhook_url"]

    print(f"[TrainingStems] training_track_id={training_track_id}  key={file_key}")

    job_id = f"train-stems-{training_track_id}"

    ext = os.path.splitext(file_key)[-1] or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        input_path = f.name

    tmp_dir = tempfile.mkdtemp(prefix="train_stems_")

    try:
        _s3_download(file_key, input_path)

        stem_map = separate_26_stems(
            input_path=input_path,
            output_dir=tmp_dir,
            s3_prefix=stems_prefix,
            upload_fn=_s3_upload,
            model="htdemucs_6s",
        )

        stems_completed = len(stem_map)
        avg_sdr = (
            sum(v.get("sdr_db", 0) for v in stem_map.values()) / stems_completed
            if stems_completed > 0 else 0.0
        )

        # Webhook payload matches training.stemsWebhook Zod schema
        webhook_payload: Dict[str, Any] = {
            "training_track_id": training_track_id,
            "stems_completed": stems_completed,
            "avg_sdr_db": avg_sdr,
            "stem_map": stem_map,
        }

        _send_webhook(webhook_url, webhook_payload)

        print(
            f"[TrainingStems] DONE  id={training_track_id}  "
            f"stems={stems_completed}  avg_sdr={avg_sdr:.1f} dB"
        )
        return {"job_id": job_id, "status": "complete", "stems_completed": stems_completed}

    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# DJ SET RENDERER
# ============================================================================

@app.function(
    image=_cpu_base,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/root/.cache": models_volume},
    timeout=3600,
    cpu=8.0,
)
@modal.fastapi_endpoint(method="POST")
def render_dj_set(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Render complete DJ set from performance plan.

    Request body:
        plan_id             int
        performance_plan    dict
        tracks_data         list[dict]
        user_id             int
        use_stem_transitions bool (default true)
        webhook_url         str  (optional)
    """
    import tempfile, os, json, shutil
    from set_renderer import render_dj_set as _render

    plan_id: int = body["plan_id"]
    performance_plan: Dict = body["performance_plan"]
    tracks_data: List[Dict] = body["tracks_data"]
    user_id: int = body["user_id"]
    use_stem_transitions: bool = body.get("use_stem_transitions", True)
    webhook_url: Optional[str] = body.get("webhook_url")

    print(f"[Render] plan={plan_id}")

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        output_path = f.name
    cue_sheet_path = output_path.replace(".mp3", "_cuesheet.json")

    try:
        metadata = _render(performance_plan, tracks_data, output_path, use_stem_transitions)

        mix_key = f"dj-renders/{user_id}/{plan_id}/mix.mp3"
        mix_url = _s3_upload(output_path, mix_key, "audio/mpeg")

        cue_sheet = {
            "plan_id": plan_id,
            "total_duration": metadata["total_duration"],
            "cue_points": metadata["cue_points"],
            "num_transitions": metadata["num_transitions"],
            "stem_transitions_used": metadata["stem_transitions_used"],
        }
        with open(cue_sheet_path, "w") as fh:
            json.dump(cue_sheet, fh, indent=2)

        cue_key = f"dj-renders/{user_id}/{plan_id}/cuesheet.json"
        cue_url = _s3_upload(cue_sheet_path, cue_key, "application/json")

        result: Dict[str, Any] = {
            "plan_id": plan_id,
            "mix_url": mix_url,
            "mix_key": mix_key,
            "cue_sheet_url": cue_url,
            "cue_sheet_key": cue_key,
            "total_duration": metadata["total_duration"],
            "num_transitions": metadata["num_transitions"],
            "stem_transitions_used": metadata["stem_transitions_used"],
        }

        if webhook_url:
            _send_webhook(webhook_url, result)

        print(f"[Render] DONE  plan={plan_id}  duration={metadata['total_duration']:.1f}s")
        return result

    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)
        if os.path.exists(cue_sheet_path):
            os.unlink(cue_sheet_path)


# ============================================================================
# DEPLOYMENT ENTRYPOINT
# ============================================================================

if __name__ == "__main__":
    print("AURA-X Modal Backend — deploy with: modal deploy modal_backend/modal_app.py")
