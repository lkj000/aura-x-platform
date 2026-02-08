"""
AURA-X Modal.com Orchestration Agent
Deploys music generation with cultural authentication to Modal.com
"""

import modal
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from modal_s3_helper import upload_to_s3

# Create Modal app
app = modal.App("aura-x-orchestration")

# Define image with all dependencies
image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch",
        "torchaudio",
        "transformers",
        "audiocraft",  # Meta's MusicGen
        "librosa",
        "numpy",
        "scipy",
        "pydantic",
        "fastapi",
        "boto3",  # AWS S3 SDK
    )
)

# Request models
class MIDINote(BaseModel):
    pitch: int
    velocity: int
    start_time: float
    duration: float

class MIDIConditioning(BaseModel):
    midi_notes: List[List[float]]  # [pitch, velocity, start, duration]
    tempo: int
    duration: float

class GaspMarker(BaseModel):
    time: float
    intensity: float
    type: str

class CulturalParams(BaseModel):
    language: str
    swing_percent: float
    gasp_type: str

class GenerationRequest(BaseModel):
    prompt: str
    midi_conditioning: MIDIConditioning
    gasp_markers: List[GaspMarker]
    duration: float = 30.0
    temperature: float = 1.0
    top_k: int = 250
    top_p: float = 0.9
    cultural_params: CulturalParams

class QualityScoreRequest(BaseModel):
    audio_data: bytes
    cultural_params: CulturalParams
    midi_conditioning: MIDIConditioning

# ============================================================================
# Music Generation with MIDI Conditioning
# ============================================================================

@app.function(
    image=image,
    gpu="A10G",  # GPU for MusicGen
    timeout=600,  # 10 minutes
    secrets=[modal.Secret.from_name("aura-x-secrets")],
)
def generate_with_midi(request: GenerationRequest) -> Dict[str, Any]:
    """
    Generate music with MIDI conditioning and cultural authentication
    """
    import torch
    from audiocraft.models import MusicGen
    from audiocraft.data.audio import audio_write
    import tempfile
    import base64
    
    try:
        # Load MusicGen model
        model = MusicGen.get_pretrained('facebook/musicgen-medium')
        model.set_generation_params(
            duration=request.duration,
            temperature=request.temperature,
            top_k=request.top_k,
            top_p=request.top_p,
        )
        
        # Convert MIDI conditioning to MusicGen format
        # This is a simplified version - full implementation would use proper MIDI conditioning
        descriptions = [request.prompt]
        
        # Generate audio
        wav = model.generate(descriptions)
        
        # Apply gasp markers (post-processing)
        wav_with_gasps = apply_gasp_markers(
            wav[0].cpu().numpy(),
            request.gasp_markers,
            model.sample_rate
        )
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            audio_write(
                tmp.name[:-4],  # Remove .wav extension
                wav_with_gasps,
                model.sample_rate,
                strategy="loudness",
                loudness_compressor=True
            )
            
            # Read file and upload to S3
            with open(tmp.name, 'rb') as f:
                audio_data = f.read()
            
            # Upload to S3
            generation_id = os.urandom(16).hex()
            s3_url = upload_to_s3(audio_data, generation_id)
        
        # Calculate quality score
        quality_score = calculate_quality_score(
            wav_with_gasps,
            request.cultural_params,
            request.midi_conditioning,
            model.sample_rate
        )
        
        return {
            "audio_url": s3_url,
            "quality_score": quality_score,
            "generation_id": generation_id,
            "sample_rate": model.sample_rate,
            "cultural_params": request.cultural_params.dict(),
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "status": "failed"
        }

def apply_gasp_markers(
    audio: 'numpy.ndarray',
    gasp_markers: List[GaspMarker],
    sample_rate: int
) -> 'numpy.ndarray':
    """
    Apply gasp effects to audio at specified markers
    """
    import numpy as np
    from scipy import signal
    
    audio_copy = audio.copy()
    
    for marker in gasp_markers:
        # Convert time to sample index
        sample_idx = int(marker.time * sample_rate)
        
        # Gasp duration (typically 0.1-0.3 seconds)
        gasp_duration_samples = int(0.2 * sample_rate)
        
        if sample_idx + gasp_duration_samples < len(audio_copy):
            # Create amplitude envelope for gasp (sharp drop then recovery)
            envelope = np.ones(gasp_duration_samples)
            
            # Drop phase (first 30%)
            drop_samples = int(gasp_duration_samples * 0.3)
            envelope[:drop_samples] = np.linspace(1.0, 1.0 - marker.intensity, drop_samples)
            
            # Recovery phase (remaining 70%)
            recovery_samples = gasp_duration_samples - drop_samples
            envelope[drop_samples:] = np.linspace(1.0 - marker.intensity, 1.0, recovery_samples)
            
            # Apply envelope
            audio_copy[sample_idx:sample_idx + gasp_duration_samples] *= envelope
    
    return audio_copy

# ============================================================================
# Quality Scoring with Cultural Authenticity Metrics
# ============================================================================

@app.function(
    image=image,
    timeout=120,
)
def calculate_quality_score(
    audio: 'numpy.ndarray',
    cultural_params: CulturalParams,
    midi_conditioning: MIDIConditioning,
    sample_rate: int
) -> Dict[str, float]:
    """
    Calculate quality score with cultural authenticity metrics
    """
    import librosa
    import numpy as np
    
    try:
        # 1. Log Drum Detection (40-90Hz)
        log_drum_score = detect_log_drums(audio, sample_rate)
        
        # 2. Gasp Detection (RMS drop analysis)
        gasp_score = detect_gasps(audio, sample_rate)
        
        # 3. Swing Quotient Calculation
        swing_score = calculate_swing_quotient(audio, sample_rate, cultural_params.swing_percent)
        
        # 4. Rhythmic Consistency
        rhythm_score = analyze_rhythmic_consistency(audio, sample_rate, midi_conditioning)
        
        # 5. Overall Cultural Authenticity
        cultural_authenticity = (
            log_drum_score * 0.25 +
            gasp_score * 0.25 +
            swing_score * 0.30 +
            rhythm_score * 0.20
        )
        
        return {
            "overall": cultural_authenticity,
            "log_drum_presence": log_drum_score,
            "gasp_authenticity": gasp_score,
            "swing_quotient": swing_score,
            "rhythmic_consistency": rhythm_score,
        }
        
    except Exception as e:
        return {
            "overall": 0.0,
            "error": str(e)
        }

def detect_log_drums(audio: 'numpy.ndarray', sample_rate: int) -> float:
    """
    Detect log drum presence in 40-90Hz range using FFT
    """
    import librosa
    import numpy as np
    
    # Compute spectrogram
    D = librosa.stft(audio)
    magnitude = np.abs(D)
    
    # Convert to frequency bins
    freqs = librosa.fft_frequencies(sr=sample_rate)
    
    # Find bins in 40-90Hz range
    log_drum_bins = np.where((freqs >= 40) & (freqs <= 90))[0]
    
    # Calculate average energy in log drum range
    log_drum_energy = np.mean(magnitude[log_drum_bins, :])
    
    # Calculate total energy
    total_energy = np.mean(magnitude)
    
    # Score is ratio of log drum energy to total energy
    score = min(1.0, (log_drum_energy / total_energy) * 5.0)
    
    return float(score)

def detect_gasps(audio: 'numpy.ndarray', sample_rate: int) -> float:
    """
    Detect gasp effects using RMS amplitude drop analysis
    """
    import librosa
    import numpy as np
    
    # Calculate RMS energy in frames
    frame_length = int(0.05 * sample_rate)  # 50ms frames
    hop_length = int(0.025 * sample_rate)   # 25ms hop
    
    rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
    
    # Detect sudden drops (gasps)
    rms_diff = np.diff(rms)
    drops = rms_diff < -0.1  # Threshold for significant drop
    
    # Count number of drops
    num_drops = np.sum(drops)
    
    # Expected drops (approximately every 4 bars at 112 BPM = every ~8.5 seconds)
    duration_seconds = len(audio) / sample_rate
    expected_drops = duration_seconds / 8.5
    
    # Score based on how close we are to expected
    score = min(1.0, num_drops / max(1, expected_drops))
    
    return float(score)

def calculate_swing_quotient(audio: 'numpy.ndarray', sample_rate: int, target_swing: float) -> float:
    """
    Calculate swing quotient by analyzing timing deviations
    """
    import librosa
    import numpy as np
    
    # Detect onsets
    onset_frames = librosa.onset.onset_detect(y=audio, sr=sample_rate, units='frames')
    onset_times = librosa.frames_to_time(onset_frames, sr=sample_rate)
    
    if len(onset_times) < 4:
        return 0.0
    
    # Calculate inter-onset intervals
    intervals = np.diff(onset_times)
    
    # Separate even and odd intervals (on-beat vs off-beat)
    even_intervals = intervals[::2]
    odd_intervals = intervals[1::2]
    
    if len(even_intervals) == 0 or len(odd_intervals) == 0:
        return 0.0
    
    # Calculate swing ratio
    avg_even = np.mean(even_intervals)
    avg_odd = np.mean(odd_intervals)
    
    if avg_even + avg_odd == 0:
        return 0.0
    
    measured_swing = (avg_odd / (avg_even + avg_odd)) * 100
    
    # Score based on how close to target swing
    swing_error = abs(measured_swing - target_swing)
    score = max(0.0, 1.0 - (swing_error / 20.0))  # 20% tolerance
    
    return float(score)

def analyze_rhythmic_consistency(
    audio: 'numpy.ndarray',
    sample_rate: int,
    midi_conditioning: MIDIConditioning
) -> float:
    """
    Analyze how well the audio matches the MIDI conditioning
    """
    import librosa
    import numpy as np
    
    # Detect tempo
    tempo, beats = librosa.beat.beat_track(y=audio, sr=sample_rate)
    
    # Compare to target tempo
    target_tempo = midi_conditioning.tempo
    tempo_error = abs(tempo - target_tempo) / target_tempo
    
    # Score based on tempo accuracy
    score = max(0.0, 1.0 - tempo_error)
    
    return float(score)

# ============================================================================
# Workflow Orchestration
# ============================================================================

@app.function(
    image=image,
    timeout=900,  # 15 minutes for full workflow
)
def execute_generation_workflow(request: GenerationRequest) -> Dict[str, Any]:
    """
    Execute complete generation workflow with quality checking and regeneration
    """
    max_attempts = 3
    quality_threshold = 0.8
    
    for attempt in range(max_attempts):
        # Generate music
        result = generate_with_midi(request)
        
        if "error" in result:
            continue
        
        # Check quality
        if result["quality_score"]["overall"] >= quality_threshold:
            result["attempts"] = attempt + 1
            result["workflow_status"] = "success"
            return result
    
    # If all attempts failed
    return {
        "workflow_status": "failed",
        "attempts": max_attempts,
        "message": f"Failed to generate music with quality >= {quality_threshold} after {max_attempts} attempts"
    }

# ============================================================================
# FastAPI Endpoints
# ============================================================================

@app.function()
@modal.asgi_app()
def fastapi_app():
    """
    FastAPI app for HTTP endpoints
    """
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    
    web_app = FastAPI(title="AURA-X Orchestration Agent")
    
    # CORS
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @web_app.post("/generate-with-midi")
    async def generate_endpoint(request: GenerationRequest):
        """Generate music with MIDI conditioning"""
        result = generate_with_midi.remote(request)
        return result
    
    @web_app.post("/execute-workflow")
    async def workflow_endpoint(request: GenerationRequest):
        """Execute complete generation workflow"""
        result = execute_generation_workflow.remote(request)
        return result
    
    @web_app.get("/health")
    async def health():
        """Health check endpoint"""
        return {"status": "healthy", "service": "aura-x-orchestration"}
    
    return web_app

# ============================================================================
# Local Development
# ============================================================================

@app.local_entrypoint()
def main():
    """
    Local entrypoint for testing
    """
    print("AURA-X Orchestration Agent deployed to Modal.com")
    print("Endpoints:")
    print("  - POST /generate-with-midi")
    print("  - POST /execute-workflow")
    print("  - GET /health")
