"""
Cultural Authenticity Scorer for Amapiano Music
Level 5 Autonomous Music Generation Platform

Implements multidimensional authenticity matrix for validating
Amapiano cultural DNA in generated music.

Scoring Pillars:
1. Rhythmic Authenticity (Swing Quotient)
2. Harmonic & Timbral Scoring (Yanos Signature)
3. Mixing & Effects Scoring (Space Factor)
"""

import numpy as np
from typing import List, Dict, Tuple
import json


# Golden Amapiano Prototypes
SGIJA_PROTOTYPE = np.array([1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0])
SOULFUL_PROTOTYPE = np.array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0])
BACARDI_PROTOTYPE = np.array([1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0])


def calculate_rhythmic_authenticity(
    midi_sequence: List[int],
    prototype: str = "sgija"
) -> Dict:
    """
    Calculate rhythmic authenticity score using Euclidean distance.
    
    Measures how closely a MIDI pattern matches the "Golden" Amapiano
    prototype patterns for different sub-genres.
    
    Args:
        midi_sequence: Binary list of 16 steps (1=hit, 0=rest)
        prototype: One of "sgija", "soulful", "bacardi"
        
    Returns:
        Dictionary with rhythmic authenticity metrics
    """
    # Select prototype
    prototypes = {
        "sgija": SGIJA_PROTOTYPE,
        "soulful": SOULFUL_PROTOTYPE,
        "bacardi": BACARDI_PROTOTYPE,
    }
    
    if prototype not in prototypes:
        raise ValueError(f"Unknown prototype: {prototype}")
    
    golden_pattern = prototypes[prototype]
    input_seq = np.array(midi_sequence)
    
    # Ensure input is 16 steps
    if len(input_seq) != 16:
        raise ValueError("MIDI sequence must be exactly 16 steps")
    
    # 1. Rhythmic Affinity (Euclidean distance from prototype)
    distance = np.linalg.norm(input_seq - golden_pattern)
    affinity = max(0, 100 - (distance * 20))
    
    # 2. Syncopation Index (off-beat density)
    off_beat_indices = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]
    off_beats = sum(input_seq[i] for i in off_beat_indices)
    total_hits = sum(input_seq)
    sync_score = (off_beats / total_hits * 100) if total_hits > 0 else 0
    
    # 3. Gasp Detection (silence on beat 1 of bar 3, which is step 8)
    has_gasp = bool(input_seq[8] == 0)
    gasp_bonus = 15 if has_gasp else 0
    
    # 4. Swing Quotient (8-12% offset is ideal for "Soulful" feel)
    # Calculate timing variance on off-beats
    swing_score = 0
    if sync_score >= 60 and sync_score <= 85:
        swing_score = 100  # Ideal syncopation range
    elif sync_score >= 50:
        swing_score = 75
    else:
        swing_score = 50
    
    # Final score
    final_score = (affinity * 0.4 + sync_score * 0.3 + swing_score * 0.2 + gasp_bonus * 0.1)
    
    return {
        "affinity_to_heritage": round(affinity, 2),
        "syncopation_intensity": round(sync_score, 2),
        "swing_quotient": round(swing_score, 2),
        "gasp_detected": has_gasp,
        "gasp_bonus": gasp_bonus,
        "overall_authenticity": round(final_score, 2),
        "prototype_used": prototype,
        "grade": get_authenticity_grade(final_score),
    }


def get_authenticity_grade(score: float) -> str:
    """Convert numerical score to letter grade."""
    if score >= 90:
        return "A+ (Authentic Amapiano)"
    elif score >= 80:
        return "A (Strong Amapiano DNA)"
    elif score >= 70:
        return "B (Good Amapiano Elements)"
    elif score >= 60:
        return "C (Some Amapiano Influence)"
    else:
        return "D (Needs Improvement)"


def analyze_harmonic_authenticity(
    chord_extensions: List[str],
    piano_velocity_variance: float = None
) -> Dict:
    """
    Analyze harmonic and timbral authenticity (Yanos Signature).
    
    Args:
        chord_extensions: List of chord types used (e.g., ["7th", "9th", "11th"])
        piano_velocity_variance: Variance in MIDI velocity (0-1, higher = more human)
        
    Returns:
        Dictionary with harmonic authenticity metrics
    """
    # Check for required jazz chord extensions
    required_extensions = {"7th", "9th", "11th", "13th"}
    present_extensions = set(chord_extensions)
    extension_score = (len(present_extensions & required_extensions) / len(required_extensions)) * 100
    
    # Piano velocity scoring (high variance = soulful, low = mechanical)
    if piano_velocity_variance is not None:
        if piano_velocity_variance >= 0.3:
            velocity_score = 100  # Human/Soulful
            velocity_label = "Soulful (Human-like)"
        elif piano_velocity_variance >= 0.15:
            velocity_score = 75   # Good variance
            velocity_label = "Natural"
        elif piano_velocity_variance >= 0.05:
            velocity_score = 50   # Moderate
            velocity_label = "Moderate"
        else:
            velocity_score = 25   # Mechanical
            velocity_label = "Mechanical (Too Rigid)"
    else:
        velocity_score = None
        velocity_label = "Not Analyzed"
    
    # Overall harmonic score
    if velocity_score is not None:
        overall = (extension_score * 0.6 + velocity_score * 0.4)
    else:
        overall = extension_score
    
    return {
        "chord_extension_score": round(extension_score, 2),
        "required_extensions": list(required_extensions),
        "present_extensions": list(present_extensions),
        "missing_extensions": list(required_extensions - present_extensions),
        "piano_velocity_score": round(velocity_score, 2) if velocity_score else None,
        "velocity_label": velocity_label,
        "overall_harmonic_authenticity": round(overall, 2),
        "grade": get_authenticity_grade(overall),
    }


def analyze_mixing_authenticity(
    reverb_wet_dry_ratio: float = None,
    log_drum_stereo_width: float = None,
    dynamic_range_db: float = None,
    has_gasp_silence: bool = False
) -> Dict:
    """
    Analyze mixing and effects authenticity (Space Factor).
    
    Args:
        reverb_wet_dry_ratio: Reverb mix (0-1, >0.6 = cinematic)
        log_drum_stereo_width: Stereo width percentage (0-100, <5% = authentic mono)
        dynamic_range_db: Dynamic range in dB (>10dB = good, avoid over-compression)
        has_gasp_silence: Whether track contains the "Amapiano Gasp"
        
    Returns:
        Dictionary with mixing authenticity metrics
    """
    scores = []
    details = {}
    
    # 1. Reverb Decay (Cosmic Metric)
    if reverb_wet_dry_ratio is not None:
        if reverb_wet_dry_ratio >= 0.6:
            reverb_score = 100  # Cinematic/Atmospheric
            reverb_label = "Cinematic (Interstellar-like)"
        elif reverb_wet_dry_ratio >= 0.4:
            reverb_score = 75   # Good atmosphere
            reverb_label = "Atmospheric"
        elif reverb_wet_dry_ratio >= 0.2:
            reverb_score = 50   # Moderate
            reverb_label = "Moderate"
        else:
            reverb_score = 25   # Too dry
            reverb_label = "Too Dry"
        
        scores.append(reverb_score)
        details["reverb_score"] = round(reverb_score, 2)
        details["reverb_label"] = reverb_label
    
    # 2. Mono-Compatibility (Critical for township clubs)
    if log_drum_stereo_width is not None:
        if log_drum_stereo_width < 5:
            mono_score = 100  # Authentic mono
            mono_label = "Authentic Mono (Club-Ready)"
        elif log_drum_stereo_width < 15:
            mono_score = 75   # Acceptable
            mono_label = "Acceptable"
        elif log_drum_stereo_width < 30:
            mono_score = 50   # Too wide
            mono_label = "Too Wide"
        else:
            mono_score = 25   # Phasing issues
            mono_label = "Phasing Issues (Not Club-Compatible)"
        
        scores.append(mono_score)
        details["mono_compatibility_score"] = round(mono_score, 2)
        details["mono_label"] = mono_label
    
    # 3. Dynamic Range (Avoid over-compression)
    if dynamic_range_db is not None:
        if dynamic_range_db >= 10:
            dynamic_score = 100  # Excellent dynamics
            dynamic_label = "Excellent (Not Over-Compressed)"
        elif dynamic_range_db >= 7:
            dynamic_score = 75   # Good
            dynamic_label = "Good"
        elif dynamic_range_db >= 5:
            dynamic_score = 50   # Moderate compression
            dynamic_label = "Moderate Compression"
        else:
            dynamic_score = 25   # Over-compressed (Western EDM style)
            dynamic_label = "Over-Compressed (Avoid)"
        
        scores.append(dynamic_score)
        details["dynamic_range_score"] = round(dynamic_score, 2)
        details["dynamic_label"] = dynamic_label
    
    # 4. Gasp Detection
    if has_gasp_silence:
        gasp_score = 100
        gasp_label = "Present (Authentic Sgija)"
    else:
        gasp_score = 50
        gasp_label = "Absent (Consider Adding)"
    
    scores.append(gasp_score)
    details["gasp_score"] = round(gasp_score, 2)
    details["gasp_label"] = gasp_label
    
    # Overall mixing score
    overall = sum(scores) / len(scores) if scores else 0
    
    return {
        **details,
        "overall_mixing_authenticity": round(overall, 2),
        "grade": get_authenticity_grade(overall),
    }


def generate_full_authenticity_report(
    midi_sequence: List[int],
    prototype: str = "sgija",
    chord_extensions: List[str] = None,
    piano_velocity_variance: float = None,
    reverb_wet_dry_ratio: float = None,
    log_drum_stereo_width: float = None,
    dynamic_range_db: float = None
) -> Dict:
    """
    Generate comprehensive authenticity report across all dimensions.
    
    Args:
        midi_sequence: Binary rhythm pattern (16 steps)
        prototype: Amapiano sub-genre prototype
        chord_extensions: List of chord types used
        piano_velocity_variance: Piano velocity variance (0-1)
        reverb_wet_dry_ratio: Reverb mix (0-1)
        log_drum_stereo_width: Stereo width percentage (0-100)
        dynamic_range_db: Dynamic range in dB
        
    Returns:
        Complete authenticity report with scores and recommendations
    """
    # 1. Rhythmic Analysis
    rhythmic = calculate_rhythmic_authenticity(midi_sequence, prototype)
    
    # 2. Harmonic Analysis (if data provided)
    if chord_extensions:
        harmonic = analyze_harmonic_authenticity(chord_extensions, piano_velocity_variance)
    else:
        harmonic = {"overall_harmonic_authenticity": None, "grade": "Not Analyzed"}
    
    # 3. Mixing Analysis (if data provided)
    mixing = analyze_mixing_authenticity(
        reverb_wet_dry_ratio,
        log_drum_stereo_width,
        dynamic_range_db,
        rhythmic["gasp_detected"]
    )
    
    # Calculate weighted overall score
    scores = [rhythmic["overall_authenticity"]]
    weights = [0.5]  # Rhythm is most important
    
    if harmonic["overall_harmonic_authenticity"]:
        scores.append(harmonic["overall_harmonic_authenticity"])
        weights.append(0.3)
    
    scores.append(mixing["overall_mixing_authenticity"])
    weights.append(0.2)
    
    # Normalize weights
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    overall_score = sum(s * w for s, w in zip(scores, normalized_weights))
    
    # Generate recommendations
    recommendations = []
    if rhythmic["overall_authenticity"] < 70:
        recommendations.append("Increase syncopation and off-beat hits")
    if not rhythmic["gasp_detected"]:
        recommendations.append("Add 'Amapiano Gasp' (silence on beat 1 of bar 3)")
    if harmonic.get("missing_extensions"):
        recommendations.append(f"Add jazz chord extensions: {', '.join(harmonic['missing_extensions'])}")
    if mixing.get("mono_label") and "Phasing" in mixing["mono_label"]:
        recommendations.append("Make log drum more mono-compatible (reduce stereo width)")
    if mixing.get("dynamic_label") and "Over-Compressed" in mixing["dynamic_label"]:
        recommendations.append("Increase dynamic range (reduce compression)")
    
    return {
        "overall_score": round(overall_score, 2),
        "overall_grade": get_authenticity_grade(overall_score),
        "rhythmic_analysis": rhythmic,
        "harmonic_analysis": harmonic,
        "mixing_analysis": mixing,
        "recommendations": recommendations,
        "cultural_dna_strength": "Strong" if overall_score >= 80 else "Moderate" if overall_score >= 60 else "Weak",
    }


# Example usage and testing
if __name__ == "__main__":
    print("Cultural Authenticity Scorer for Amapiano\n")
    print("="*60)
    
    # Test 1: Classic Amapiano pattern
    print("\n1. Testing Classic Amapiano Pattern (E5,16)")
    classic_pattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]
    result1 = calculate_rhythmic_authenticity(classic_pattern, "soulful")
    print(json.dumps(result1, indent=2))
    
    # Test 2: Interstellar-Amapiano fusion
    print("\n2. Testing Interstellar-Amapiano Fusion Pattern")
    interstellar_pattern = [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1]
    result2 = calculate_rhythmic_authenticity(interstellar_pattern, "sgija")
    print(json.dumps(result2, indent=2))
    
    # Test 3: Full authenticity report
    print("\n3. Full Authenticity Report")
    full_report = generate_full_authenticity_report(
        midi_sequence=classic_pattern,
        prototype="soulful",
        chord_extensions=["7th", "9th", "11th"],
        piano_velocity_variance=0.35,
        reverb_wet_dry_ratio=0.65,
        log_drum_stereo_width=3.5,
        dynamic_range_db=11.2
    )
    print(json.dumps(full_report, indent=2))
