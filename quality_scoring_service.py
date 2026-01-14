"""
AURA-X Quality Scoring Service
Real audio quality analysis with LUFS measurement, spectral analysis, and cultural authenticity scoring
"""

import os
import numpy as np
import librosa
import pyloudnorm as pyln
from typing import Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from io import BytesIO
import soundfile as sf

# Initialize FastAPI app
app = FastAPI(title="AURA-X Quality Scoring Service")

# Constants
AMAPIANO_TEMPO_RANGE = (108, 116)  # Typical Amapiano BPM range
AMAPIANO_KEY_SIGNATURES = ['F min', 'G min', 'A min', 'C min', 'D min']  # Common Amapiano keys
TARGET_LUFS = -14.0  # Industry standard
SAMPLE_RATE = 44100

class QualityScoreRequest(BaseModel):
    audio_url: str
    genre: str = "amapiano"
    target_loudness: float = -14.0

class QualityScoreResponse(BaseModel):
    overall_score: float  # 0-100
    lufs: float
    peak_db: float
    dynamic_range: float
    spectral_balance: str  # "poor", "fair", "good", "excellent"
    cultural_authenticity_score: float  # 0-100 for Amapiano
    tempo_detected: Optional[float]
    key_detected: Optional[str]
    recommendations: List[str]
    detailed_metrics: Dict

def download_audio(url: str) -> Tuple[np.ndarray, int]:
    """
    Download audio file from URL and return audio data + sample rate
    """
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        audio_data, sr = sf.read(BytesIO(response.content))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        return audio_data, sr
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download audio: {str(e)}")

def measure_loudness(audio: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Measure LUFS (Loudness Units relative to Full Scale) using pyloudnorm
    """
    # Initialize loudness meter
    meter = pyln.Meter(sr)
    
    # Measure integrated loudness
    loudness = meter.integrated_loudness(audio)
    
    # Measure peak
    peak = np.max(np.abs(audio))
    peak_db = 20 * np.log10(peak) if peak > 0 else -np.inf
    
    # Calculate dynamic range (simplified: difference between peak and RMS)
    rms = np.sqrt(np.mean(audio**2))
    rms_db = 20 * np.log10(rms) if rms > 0 else -np.inf
    dynamic_range = peak_db - rms_db
    
    return {
        "lufs": float(loudness),
        "peak_db": float(peak_db),
        "dynamic_range": float(dynamic_range),
        "rms_db": float(rms_db)
    }

def analyze_spectral_balance(audio: np.ndarray, sr: int) -> Dict:
    """
    Analyze spectral balance using librosa
    """
    # Compute STFT
    stft = librosa.stft(audio)
    magnitude = np.abs(stft)
    
    # Frequency bins
    freqs = librosa.fft_frequencies(sr=sr)
    
    # Define frequency bands (Hz)
    sub_bass = (20, 60)
    bass = (60, 250)
    low_mid = (250, 500)
    mid = (500, 2000)
    high_mid = (2000, 4000)
    presence = (4000, 6000)
    brilliance = (6000, 20000)
    
    bands = {
        "sub_bass": sub_bass,
        "bass": bass,
        "low_mid": low_mid,
        "mid": mid,
        "high_mid": high_mid,
        "presence": presence,
        "brilliance": brilliance
    }
    
    # Calculate energy in each band
    band_energies = {}
    for band_name, (low, high) in bands.items():
        mask = (freqs >= low) & (freqs <= high)
        band_energy = np.mean(magnitude[mask, :])
        band_energies[band_name] = float(band_energy)
    
    # Assess balance (Amapiano typically has strong bass and sub-bass)
    total_energy = sum(band_energies.values())
    band_percentages = {k: (v / total_energy * 100) if total_energy > 0 else 0 
                       for k, v in band_energies.items()}
    
    # Determine balance quality
    bass_energy = band_percentages["sub_bass"] + band_percentages["bass"]
    mid_energy = band_percentages["low_mid"] + band_percentages["mid"]
    high_energy = band_percentages["high_mid"] + band_percentages["presence"] + band_percentages["brilliance"]
    
    # Ideal Amapiano balance: strong bass (40-50%), balanced mids (30-40%), clear highs (20-30%)
    if 40 <= bass_energy <= 50 and 30 <= mid_energy <= 40 and 20 <= high_energy <= 30:
        balance_rating = "excellent"
    elif 35 <= bass_energy <= 55 and 25 <= mid_energy <= 45:
        balance_rating = "good"
    elif 30 <= bass_energy <= 60:
        balance_rating = "fair"
    else:
        balance_rating = "poor"
    
    return {
        "balance_rating": balance_rating,
        "band_energies": band_energies,
        "band_percentages": band_percentages,
        "bass_energy_pct": float(bass_energy),
        "mid_energy_pct": float(mid_energy),
        "high_energy_pct": float(high_energy)
    }

def detect_tempo(audio: np.ndarray, sr: int) -> float:
    """
    Detect tempo using librosa
    """
    tempo, _ = librosa.beat.beat_track(y=audio, sr=sr)
    return float(tempo)

def detect_key(audio: np.ndarray, sr: int) -> str:
    """
    Detect musical key using librosa chroma features
    """
    # Compute chroma features
    chroma = librosa.feature.chroma_cqt(y=audio, sr=sr)
    
    # Average chroma across time
    chroma_mean = np.mean(chroma, axis=1)
    
    # Key names
    keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    # Find dominant pitch class
    dominant_pitch = np.argmax(chroma_mean)
    
    # Simple major/minor detection (simplified heuristic)
    # In real implementation, would use more sophisticated key detection
    key_name = keys[dominant_pitch]
    
    # Check if minor (simplified: if 3rd is flattened)
    third_idx = (dominant_pitch + 3) % 12
    fifth_idx = (dominant_pitch + 7) % 12
    
    is_minor = chroma_mean[third_idx] < chroma_mean[fifth_idx] * 0.8
    
    return f"{key_name} {'min' if is_minor else 'maj'}"

def calculate_cultural_authenticity(
    tempo: float,
    key: str,
    spectral_data: Dict,
    audio: np.ndarray,
    sr: int
) -> Tuple[float, List[str]]:
    """
    Calculate Amapiano cultural authenticity score based on genre-specific features
    """
    score = 100.0
    recommendations = []
    
    # 1. Tempo check (Amapiano: 108-116 BPM)
    if not (AMAPIANO_TEMPO_RANGE[0] <= tempo <= AMAPIANO_TEMPO_RANGE[1]):
        tempo_penalty = min(20, abs(tempo - 112) * 2)  # 112 is ideal
        score -= tempo_penalty
        recommendations.append(
            f"Tempo ({tempo:.1f} BPM) is outside typical Amapiano range ({AMAPIANO_TEMPO_RANGE[0]}-{AMAPIANO_TEMPO_RANGE[1]} BPM). "
            f"Consider adjusting to ~112 BPM for authenticity."
        )
    
    # 2. Key signature check
    if key not in AMAPIANO_KEY_SIGNATURES:
        score -= 10
        recommendations.append(
            f"Key ({key}) is uncommon for Amapiano. "
            f"Consider using: {', '.join(AMAPIANO_KEY_SIGNATURES)}"
        )
    
    # 3. Bass presence (Amapiano has strong log drum bass)
    bass_energy = spectral_data["bass_energy_pct"]
    if bass_energy < 35:
        score -= 15
        recommendations.append(
            f"Bass energy ({bass_energy:.1f}%) is weak. "
            f"Amapiano requires strong log drum presence (40-50%)."
        )
    elif bass_energy > 55:
        score -= 10
        recommendations.append(
            f"Bass energy ({bass_energy:.1f}%) is too dominant. "
            f"May overwhelm other elements."
        )
    
    # 4. Percussive elements detection
    onset_env = librosa.onset.onset_strength(y=audio, sr=sr)
    onset_density = len(librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)) / (len(audio) / sr)
    
    # Amapiano has moderate-to-high percussive density (log drums, shakers)
    if onset_density < 2.0:  # Less than 2 onsets per second
        score -= 15
        recommendations.append(
            "Low percussive density detected. "
            "Amapiano requires prominent log drums and percussion."
        )
    
    # 5. Harmonic complexity (piano chords)
    harmonic = librosa.effects.harmonic(y=audio)
    harmonic_energy = np.mean(np.abs(librosa.stft(harmonic)))
    percussive = librosa.effects.percussive(y=audio)
    percussive_energy = np.mean(np.abs(librosa.stft(percussive)))
    
    hpr_ratio = harmonic_energy / (percussive_energy + 1e-6)
    
    # Amapiano has balanced harmonic/percussive (piano + drums)
    if hpr_ratio < 0.5:
        score -= 10
        recommendations.append(
            "Insufficient harmonic content. "
            "Amapiano requires rich piano chord progressions."
        )
    elif hpr_ratio > 2.0:
        score -= 10
        recommendations.append(
            "Excessive harmonic content relative to percussion. "
            "Balance piano with log drums."
        )
    
    return max(0.0, min(100.0, score)), recommendations

@app.post("/analyze", response_model=QualityScoreResponse)
async def analyze_audio_quality(request: QualityScoreRequest):
    """
    Analyze audio quality with comprehensive metrics
    """
    try:
        # Download audio
        audio, sr = download_audio(request.audio_url)
        
        # Resample if needed
        if sr != SAMPLE_RATE:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=SAMPLE_RATE)
            sr = SAMPLE_RATE
        
        # Measure loudness
        loudness_metrics = measure_loudness(audio, sr)
        
        # Analyze spectral balance
        spectral_metrics = analyze_spectral_balance(audio, sr)
        
        # Detect tempo and key
        tempo = detect_tempo(audio, sr)
        key = detect_key(audio, sr)
        
        # Calculate cultural authenticity (Amapiano-specific)
        cultural_score, cultural_recommendations = calculate_cultural_authenticity(
            tempo, key, spectral_metrics, audio, sr
        )
        
        # Generate recommendations
        recommendations = cultural_recommendations.copy()
        
        # LUFS recommendations
        lufs_diff = abs(loudness_metrics["lufs"] - request.target_loudness)
        if lufs_diff > 2.0:
            if loudness_metrics["lufs"] < request.target_loudness:
                recommendations.append(
                    f"Track is {lufs_diff:.1f} LUFS quieter than target. "
                    f"Apply makeup gain or compression."
                )
            else:
                recommendations.append(
                    f"Track is {lufs_diff:.1f} LUFS louder than target. "
                    f"Reduce gain or apply limiting."
                )
        
        # Dynamic range recommendations
        if loudness_metrics["dynamic_range"] < 6:
            recommendations.append(
                "Low dynamic range detected. Track may sound over-compressed."
            )
        elif loudness_metrics["dynamic_range"] > 15:
            recommendations.append(
                "High dynamic range detected. Consider gentle compression for consistency."
            )
        
        # Peak recommendations
        if loudness_metrics["peak_db"] > -1.0:
            recommendations.append(
                f"Peak level ({loudness_metrics['peak_db']:.1f} dB) is too high. "
                f"Risk of clipping. Apply limiting."
            )
        
        # Calculate overall score (weighted average)
        lufs_score = max(0, 100 - (lufs_diff * 10))  # 10 points per LUFS deviation
        dr_score = 100 if 6 <= loudness_metrics["dynamic_range"] <= 15 else 70
        peak_score = 100 if loudness_metrics["peak_db"] < -1.0 else 60
        spectral_score = {
            "excellent": 100,
            "good": 85,
            "fair": 70,
            "poor": 50
        }[spectral_metrics["balance_rating"]]
        
        overall_score = (
            lufs_score * 0.25 +
            dr_score * 0.15 +
            peak_score * 0.10 +
            spectral_score * 0.20 +
            cultural_score * 0.30  # Cultural authenticity is most important
        )
        
        return QualityScoreResponse(
            overall_score=round(overall_score, 1),
            lufs=round(loudness_metrics["lufs"], 2),
            peak_db=round(loudness_metrics["peak_db"], 2),
            dynamic_range=round(loudness_metrics["dynamic_range"], 2),
            spectral_balance=spectral_metrics["balance_rating"],
            cultural_authenticity_score=round(cultural_score, 1),
            tempo_detected=round(tempo, 1),
            key_detected=key,
            recommendations=recommendations,
            detailed_metrics={
                "loudness": loudness_metrics,
                "spectral": spectral_metrics,
                "tempo": tempo,
                "key": key,
                "scores": {
                    "lufs_score": round(lufs_score, 1),
                    "dynamic_range_score": round(dr_score, 1),
                    "peak_score": round(peak_score, 1),
                    "spectral_score": round(spectral_score, 1),
                    "cultural_score": round(cultural_score, 1)
                }
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "service": "AURA-X Quality Scoring",
        "features": [
            "LUFS measurement (pyloudnorm)",
            "Spectral analysis (librosa)",
            "Tempo detection",
            "Key detection",
            "Cultural authenticity scoring (Amapiano)"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
