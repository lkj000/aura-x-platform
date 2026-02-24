"""
AURA-X DJ Studio - Modal Backend
Level-5 Autonomous Audio Processing

This Modal app provides serverless audio processing capabilities:
- Track analysis (BPM, key, energy curve, segments)
- Stem separation (vocals, drums, bass, other)
- Set rendering (crossfade, tempo adjustment, EQ matching)

Architecture:
- Modal for serverless compute (GPU for Demucs, CPU for FFmpeg/Essentia)
- S3 for audio file storage
- Webhook callbacks to Node.js backend for database updates
"""

import modal
import os
from typing import Dict, Any, List, Optional

# Create Modal app
app = modal.App("aura-x-dj-studio")

# Define Modal image with audio processing dependencies
audio_image = (
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
    )
    .pip_install(
        "essentia==2.1b6.dev1110",
        "numpy==1.24.3",
        "scipy==1.11.4",
        "librosa==0.10.1",
        "soundfile==0.12.1",
        "pydub==0.25.1",
        "boto3==1.34.34",
        "requests==2.31.0",
        "demucs==4.0.1",
        "torch==2.1.2",
        "torchaudio==2.1.2",
    )
)

# Modal secrets for AWS S3 credentials
# These should be configured in Modal dashboard:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - S3_BUCKET
# - S3_REGION
# - WEBHOOK_BASE_URL (Node.js backend URL for callbacks)

# Modal volume for model caching (Demucs models are ~300MB each)
models_volume = modal.Volume.from_name("dj-studio-models", create_if_missing=True)

# ============================================================================
# SHARED UTILITIES
# ============================================================================

@app.function(image=audio_image, secrets=[modal.Secret.from_name("aura-x-aws-secrets")])
def download_from_s3(file_key: str, local_path: str) -> None:
    """Download a file from S3 to local path"""
    import boto3
    
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ["S3_REGION"],
    )
    
    bucket = os.environ["S3_BUCKET"]
    s3_client.download_file(bucket, file_key, local_path)


@app.function(image=audio_image, secrets=[modal.Secret.from_name("aura-x-aws-secrets")])
def upload_to_s3(local_path: str, file_key: str, content_type: str = "audio/mpeg") -> str:
    """Upload a file from local path to S3 and return URL"""
    import boto3
    
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ["S3_REGION"],
    )
    
    bucket = os.environ["S3_BUCKET"]
    s3_client.upload_file(
        local_path,
        bucket,
        file_key,
        ExtraArgs={"ContentType": content_type},
    )
    
    # Return public URL
    region = os.environ["S3_REGION"]
    return f"https://{bucket}.s3.{region}.amazonaws.com/{file_key}"


@app.function(image=audio_image, secrets=[modal.Secret.from_name("aura-x-aws-secrets")])
def send_webhook(endpoint: str, data: Dict[str, Any]) -> None:
    """Send webhook callback to Node.js backend"""
    import requests
    
    webhook_base_url = os.environ["WEBHOOK_BASE_URL"]
    url = f"{webhook_base_url}{endpoint}"
    
    try:
        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()
        print(f"Webhook sent successfully: {endpoint}")
    except Exception as e:
        print(f"Webhook failed: {endpoint}, error: {e}")


# ============================================================================
# AUDIO ANALYSIS WORKER
# ============================================================================

@app.function(
    image=audio_image,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    timeout=600,  # 10 minutes max
    cpu=4.0,
)
def analyze_track(track_id: int, file_key: str) -> Dict[str, Any]:
    """
    Analyze audio track using FFmpeg and Essentia
    
    Returns:
    - duration_sec: float
    - bpm: float
    - bpm_confidence: float
    - key: str (e.g., "C major", "A minor")
    - camelot_key: str (e.g., "8B", "5A")
    - energy_curve: List[float] (energy values at 1-second intervals)
    - segments: List[Dict] (beat/phrase boundaries)
    - lufs: float (integrated loudness)
    - true_peak: float (maximum peak level)
    """
    import essentia.standard as es
    import numpy as np
    import subprocess
    import json
    import tempfile
    import os
    
    print(f"[Analysis] Starting analysis for track {track_id}")
    
    # Download audio file from S3
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_input:
        input_path = tmp_input.name
    
    download_from_s3.remote(file_key, input_path)
    print(f"[Analysis] Downloaded file: {file_key}")
    
    try:
        # Load audio with Essentia
        loader = es.MonoLoader(filename=input_path, sampleRate=44100)
        audio = loader()
        duration_sec = len(audio) / 44100.0
        
        print(f"[Analysis] Audio loaded: {duration_sec:.2f} seconds")
        
        # BPM Detection
        rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)
        bpm_confidence = float(beats_confidence)
        
        print(f"[Analysis] BPM: {bpm:.2f} (confidence: {bpm_confidence:.2f})")
        
        # Key Detection
        key_extractor = es.KeyExtractor()
        key, scale, key_strength = key_extractor(audio)
        key_str = f"{key} {scale}"
        
        # Convert to Camelot wheel notation
        camelot_key = convert_to_camelot(key, scale)
        
        print(f"[Analysis] Key: {key_str} (Camelot: {camelot_key})")
        
        # Energy Curve (1-second intervals)
        energy_extractor = es.Energy()
        frame_size = 44100  # 1 second
        hop_size = 44100
        
        energy_curve = []
        for i in range(0, len(audio), hop_size):
            frame = audio[i:i + frame_size]
            if len(frame) > 0:
                energy = float(energy_extractor(frame))
                energy_curve.append(energy)
        
        energy_avg = float(np.mean(energy_curve))
        
        print(f"[Analysis] Energy curve: {len(energy_curve)} points, avg: {energy_avg:.4f}")
        
        # Segment Detection (beat positions)
        segments = []
        for i, beat_time in enumerate(beats):
            segments.append({
                "time": float(beat_time),
                "type": "beat",
                "confidence": float(beats_confidence),
            })
        
        # Downbeat Detection (phrase boundaries)
        downbeat_extractor = es.BeatTrackerMultiFeature()
        downbeats = downbeat_extractor(audio)
        
        for downbeat_time in downbeats:
            segments.append({
                "time": float(downbeat_time),
                "type": "downbeat",
                "confidence": 1.0,
            })
        
        # Sort segments by time
        segments.sort(key=lambda x: x["time"])
        
        print(f"[Analysis] Segments: {len(segments)} markers")
        
        # Loudness Analysis (LUFS)
        loudness_extractor = es.LoudnessEBUR128()
        loudness_integrated, loudness_range, loudness_momentary, loudness_shortterm = loudness_extractor(audio)
        lufs = float(loudness_integrated)
        
        # True Peak
        true_peak = float(np.max(np.abs(audio)))
        
        print(f"[Analysis] Loudness: {lufs:.2f} LUFS, True Peak: {true_peak:.4f}")
        
        # Prepare result
        result = {
            "track_id": track_id,
            "duration_sec": duration_sec,
            "bpm": float(bpm),
            "bpm_confidence": bpm_confidence,
            "key": key_str,
            "camelot_key": camelot_key,
            "energy_curve": energy_curve,
            "energy_avg": energy_avg,
            "segments": segments,
            "lufs": lufs,
            "true_peak": true_peak,
        }
        
        # Send webhook to backend
        send_webhook.remote("/api/dj-studio/analysis-complete", result)
        
        print(f"[Analysis] Complete for track {track_id}")
        
        return result
        
    finally:
        # Cleanup
        if os.path.exists(input_path):
            os.unlink(input_path)


def convert_to_camelot(key: str, scale: str) -> str:
    """Convert musical key to Camelot wheel notation"""
    # Camelot wheel mapping
    major_keys = {
        "C": "8B", "G": "9B", "D": "10B", "A": "11B", "E": "12B", "B": "1B",
        "F#": "2B", "Gb": "2B", "C#": "3B", "Db": "3B", "G#": "4B", "Ab": "4B",
        "D#": "5B", "Eb": "5B", "A#": "6B", "Bb": "6B", "F": "7B",
    }
    
    minor_keys = {
        "A": "8A", "E": "9A", "B": "10A", "F#": "11A", "Gb": "11A", "C#": "12A",
        "Db": "12A", "G#": "1A", "Ab": "1A", "D#": "2A", "Eb": "2A", "A#": "3A",
        "Bb": "3A", "F": "4A", "C": "5A", "G": "6A", "D": "7A",
    }
    
    if scale == "major":
        return major_keys.get(key, "?")
    else:
        return minor_keys.get(key, "?")


# ============================================================================
# STEM SEPARATION WORKER
# ============================================================================

@app.function(
    image=audio_image,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={"/models": models_volume},
    gpu="T4",  # Demucs requires GPU
    timeout=1800,  # 30 minutes max
)
def separate_stems(track_id: int, file_key: str, user_id: int) -> Dict[str, Any]:
    """
    Separate audio track into 4 stems using Demucs
    
    Returns:
    - vocals_url: str
    - drums_url: str
    - bass_url: str
    - other_url: str
    """
    import torch
    import torchaudio
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import tempfile
    import os
    
    print(f"[Stems] Starting stem separation for track {track_id}")
    
    # Download audio file from S3
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_input:
        input_path = tmp_input.name
    
    download_from_s3.remote(file_key, input_path)
    print(f"[Stems] Downloaded file: {file_key}")
    
    try:
        # Load Demucs model (cached in volume)
        model = get_model("htdemucs")
        model.eval()
        
        print(f"[Stems] Model loaded: htdemucs")
        
        # Load audio
        audio, sr = torchaudio.load(input_path)
        
        # Resample to 44100 Hz if needed
        if sr != 44100:
            resampler = torchaudio.transforms.Resample(sr, 44100)
            audio = resampler(audio)
            sr = 44100
        
        # Ensure stereo
        if audio.shape[0] == 1:
            audio = audio.repeat(2, 1)
        
        print(f"[Stems] Audio loaded: {audio.shape}")
        
        # Apply model
        with torch.no_grad():
            sources = apply_model(model, audio.unsqueeze(0), device="cuda")[0]
        
        # Sources order: drums, bass, other, vocals
        stems = {
            "drums": sources[0],
            "bass": sources[1],
            "other": sources[2],
            "vocals": sources[3],
        }
        
        print(f"[Stems] Separation complete, uploading to S3...")
        
        # Save and upload each stem
        stem_urls = {}
        stem_keys = {}
        
        for stem_name, stem_audio in stems.items():
            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_stem:
                stem_path = tmp_stem.name
            
            torchaudio.save(stem_path, stem_audio, sr)
            
            # Upload to S3
            stem_key = f"dj-stems/{user_id}/{track_id}/{stem_name}.wav"
            stem_url = upload_to_s3.remote(stem_path, stem_key, "audio/wav")
            
            stem_urls[f"{stem_name}_url"] = stem_url
            stem_keys[f"{stem_name}_key"] = stem_key
            
            # Cleanup temp file
            os.unlink(stem_path)
            
            print(f"[Stems] Uploaded {stem_name}: {stem_url}")
        
        # Prepare result
        result = {
            "track_id": track_id,
            **stem_urls,
            **stem_keys,
            "model_version": "htdemucs",
        }
        
        # Send webhook to backend
        send_webhook.remote("/api/dj-studio/stems-complete", result)
        
        print(f"[Stems] Complete for track {track_id}")
        
        return result
        
    finally:
        # Cleanup
        if os.path.exists(input_path):
            os.unlink(input_path)


# ============================================================================
# DJ SET RENDERER
# ============================================================================

@app.function(
    image=audio_image,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    timeout=3600,  # 60 minutes max for long sets
)
def render_dj_set(
    plan_id: int,
    performance_plan: Dict[str, Any],
    tracks_data: List[Dict[str, Any]],
    user_id: int,
    use_stem_transitions: bool = True
) -> Dict[str, Any]:
    """
    Render complete DJ set from performance plan
    
    Args:
        plan_id: Performance plan ID
        performance_plan: Plan with tracks and transitions
        tracks_data: List of track metadata
        user_id: User ID for S3 path
        use_stem_transitions: Use stem-based transitions if available
    
    Returns:
        Render metadata (mix_url, cue_sheet, duration)
    """
    from set_renderer import render_dj_set as render_set
    import tempfile
    import os
    
    print(f"[Render] Starting render for plan {plan_id}")
    
    # Create temp output file
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_output:
        output_path = tmp_output.name
    
    try:
        # Render the set
        metadata = render_set(
            performance_plan,
            tracks_data,
            output_path,
            use_stem_transitions
        )
        
        print(f"[Render] Mix complete: {metadata['total_duration']:.1f}s, {metadata['num_transitions']} transitions")
        
        # Upload to S3
        mix_key = f"dj-renders/{user_id}/{plan_id}/mix.mp3"
        mix_url = upload_to_s3.remote(output_path, mix_key, "audio/mpeg")
        
        print(f"[Render] Uploaded mix: {mix_url}")
        
        # Generate cue sheet
        cue_sheet = {
            "plan_id": plan_id,
            "total_duration": metadata["total_duration"],
            "cue_points": metadata["cue_points"],
            "num_transitions": metadata["num_transitions"],
            "stem_transitions_used": metadata["stem_transitions_used"],
        }
        
        # Upload cue sheet
        cue_sheet_path = output_path.replace(".mp3", "_cuesheet.json")
        with open(cue_sheet_path, "w") as f:
            import json
            json.dump(cue_sheet, f, indent=2)
        
        cue_sheet_key = f"dj-renders/{user_id}/{plan_id}/cuesheet.json"
        cue_sheet_url = upload_to_s3.remote(cue_sheet_path, cue_sheet_key, "application/json")
        
        print(f"[Render] Uploaded cue sheet: {cue_sheet_url}")
        
        # Prepare result
        result = {
            "plan_id": plan_id,
            "mix_url": mix_url,
            "cue_sheet_url": cue_sheet_url,
            "total_duration": metadata["total_duration"],
            "num_transitions": metadata["num_transitions"],
            "stem_transitions_used": metadata["stem_transitions_used"],
        }
        
        # Send webhook to backend
        send_webhook.remote("/api/dj-studio/render-complete", result)
        
        print(f"[Render] Complete for plan {plan_id}")
        
        return result
        
    finally:
        # Cleanup
        if os.path.exists(output_path):
            os.unlink(output_path)
        if os.path.exists(cue_sheet_path):
            os.unlink(cue_sheet_path)


# ============================================================================
# DEPLOYMENT
# ============================================================================

if __name__ == "__main__":
    print("AURA-X DJ Studio Modal Backend")
    print("Deploy with: modal deploy modal_app.py")
