"""
Complete Amapiano Gasp Taxonomy Module

The "Gasp" is one of the most distinctive elements of Amapiano music - a strategic
use of silence or dramatic reduction in density that creates tension, anticipation,
and rhythmic punctuation. This module provides a comprehensive taxonomy of all Gasp
variations used across different Amapiano subgenres and production styles.

What is a Gasp?
--------------
A Gasp is a moment of silence or near-silence in the arrangement, typically occurring
at predictable rhythmic positions. It creates a "breathing space" in the music, allows
the groove to reset, and builds anticipation for the next section. The term "gasp"
comes from the feeling of catching your breath before diving back into the groove.

Cultural Significance:
- Originated from Kwaito's use of space and minimalism
- Influenced by traditional African call-and-response patterns
- Creates the signature "Amapiano bounce" when dancers anticipate the drop
- Differentiates Amapiano from other house music subgenres

Gasp Types:
1. Classic Gasp (Beat 1 Silence) - The original and most common
2. Double Gasp (Beat 1 + Beat 3) - Creates more tension
3. Half-Bar Gasp - Silence for 2 beats
4. Full-Bar Gasp - Entire bar of silence
5. Stutter Gasp - Rapid on/off pattern
6. Reverse Gasp - Silence everywhere except beat 1
7. Progressive Gasp - Gradual reduction in density
8. Selective Gasp - Only certain elements drop out
9. Echo Gasp - Elements fade with reverb/delay
10. Build-Up Gasp - Silence before a drop
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class GaspType(Enum):
    """Types of Gasp variations in Amapiano"""
    CLASSIC = "classic"  # Beat 1 silence (most common)
    DOUBLE = "double"  # Beat 1 + Beat 3 silence
    HALF_BAR = "half_bar"  # 2 beats of silence
    FULL_BAR = "full_bar"  # Entire bar silence
    STUTTER = "stutter"  # Rapid on/off pattern
    REVERSE = "reverse"  # Silence everywhere except beat 1
    PROGRESSIVE = "progressive"  # Gradual density reduction
    SELECTIVE = "selective"  # Only certain elements drop
    ECHO = "echo"  # Elements fade with effects
    BUILD_UP = "build_up"  # Silence before drop
    NONE = "none"  # No gasp


class GaspIntensity(Enum):
    """Intensity levels of Gasp effect"""
    FULL = "full"  # Complete silence
    HEAVY = "heavy"  # 80-100% reduction
    MODERATE = "moderate"  # 50-80% reduction
    LIGHT = "light"  # 20-50% reduction
    SUBTLE = "subtle"  # 10-20% reduction


@dataclass
class GaspPattern:
    """Defines a specific Gasp pattern"""
    gasp_type: GaspType
    intensity: GaspIntensity
    affected_steps: List[int]  # Which steps in 16th note grid are affected
    affected_elements: List[str]  # Which elements drop out
    duration_beats: float  # How long the gasp lasts
    frequency_bars: int  # How often it occurs (every N bars)
    subgenre_association: List[str]  # Which Amapiano subgenres use this
    description: str
    cultural_context: str


# Comprehensive Gasp pattern database
GASP_PATTERNS: Dict[GaspType, GaspPattern] = {
    GaspType.CLASSIC: GaspPattern(
        gasp_type=GaspType.CLASSIC,
        intensity=GaspIntensity.FULL,
        affected_steps=[8],  # Beat 1 of bar 3 (step 8 in 16-step pattern)
        affected_elements=["bass", "chords", "percussion"],
        duration_beats=0.5,  # Half beat of silence
        frequency_bars=4,  # Every 4 bars
        subgenre_association=["Soulful", "Private School", "Sgija"],
        description="The original Amapiano Gasp - silence on beat 1 of bar 3. Creates the signature 'bounce' that defines the genre. Dancers anticipate this moment.",
        cultural_context="Originated in early Johannesburg Amapiano (2016-2017). Became the defining characteristic that separated Amapiano from deep house."
    ),
    
    GaspType.DOUBLE: GaspPattern(
        gasp_type=GaspType.DOUBLE,
        intensity=GaspIntensity.FULL,
        affected_steps=[8, 10],  # Beat 1 and Beat 3 of bar 3
        affected_elements=["bass", "chords", "percussion"],
        duration_beats=0.5,  # Each gasp is half beat
        frequency_bars=4,
        subgenre_association=["Sgija", "Bacardi"],
        description="Double Gasp - silence on both beat 1 and beat 3 of bar 3. Creates more tension and energy. Common in high-tempo Sgija.",
        cultural_context="Evolved from Classic Gasp in 2018-2019 as producers pushed for more aggressive, dance-floor oriented sounds."
    ),
    
    GaspType.HALF_BAR: GaspPattern(
        gasp_type=GaspType.HALF_BAR,
        intensity=GaspIntensity.FULL,
        affected_steps=[8, 9],  # Beats 1-2 of bar 3
        affected_elements=["bass", "chords", "percussion", "vocals"],
        duration_beats=2.0,  # Two beats of silence
        frequency_bars=8,  # Every 8 bars (less frequent)
        subgenre_association=["Soulful", "Spiritual"],
        description="Half-Bar Gasp - two beats of silence. Creates dramatic pause for vocal phrases or key changes. More contemplative feel.",
        cultural_context="Used in slower, more emotional Amapiano tracks. Allows space for vocal expression and spiritual themes."
    ),
    
    GaspType.FULL_BAR: GaspPattern(
        gasp_type=GaspType.FULL_BAR,
        intensity=GaspIntensity.FULL,
        affected_steps=[8, 9, 10, 11],  # Entire bar 3
        affected_elements=["bass", "chords", "percussion", "vocals", "effects"],
        duration_beats=4.0,  # Full bar of silence
        frequency_bars=16,  # Very rare, every 16 bars
        subgenre_association=["Experimental", "Spiritual"],
        description="Full-Bar Gasp - entire bar of silence. Extremely dramatic, used for major transitions or spiritual moments. Rare but powerful.",
        cultural_context="Experimental technique, not common in mainstream Amapiano. Used by avant-garde producers like Kabza De Small in conceptual tracks."
    ),
    
    GaspType.STUTTER: GaspPattern(
        gasp_type=GaspType.STUTTER,
        intensity=GaspIntensity.MODERATE,
        affected_steps=[8, 9, 10, 11],  # Rapid on/off throughout bar
        affected_elements=["bass", "chords"],
        duration_beats=0.25,  # Very short, rapid cuts
        frequency_bars=4,
        subgenre_association=["Sgija", "Bacardi"],
        description="Stutter Gasp - rapid on/off pattern creating stuttering effect. High energy, glitchy feel. Common in Sgija subgenre.",
        cultural_context="Influenced by gqom's aggressive production techniques. Creates tension and urgency on the dancefloor."
    ),
    
    GaspType.REVERSE: GaspPattern(
        gasp_type=GaspType.REVERSE,
        intensity=GaspIntensity.HEAVY,
        affected_steps=[9, 10, 11, 12, 13, 14, 15],  # Everything except beat 1
        affected_elements=["chords", "percussion", "effects"],
        duration_beats=3.5,  # Most of the bar is silent
        frequency_bars=8,
        subgenre_association=["Experimental", "Minimal"],
        description="Reverse Gasp - silence everywhere except beat 1. Creates extreme minimalism and space. Bass hits alone on beat 1.",
        cultural_context="Experimental technique exploring minimalism. Challenges conventional Amapiano structure while maintaining the essential kick."
    ),
    
    GaspType.PROGRESSIVE: GaspPattern(
        gasp_type=GaspType.PROGRESSIVE,
        intensity=GaspIntensity.MODERATE,
        affected_steps=[8, 9, 10, 11, 12, 13, 14, 15],  # Gradual across 2 bars
        affected_elements=["percussion", "chords", "effects"],
        duration_beats=8.0,  # Gradual over 2 bars
        frequency_bars=8,
        subgenre_association=["Soulful", "Private School"],
        description="Progressive Gasp - gradual reduction in density over 2 bars. Elements drop out one by one. Creates build-up tension.",
        cultural_context="Sophisticated production technique used in 'Private School' Amapiano. Demonstrates musical maturity and arrangement skill."
    ),
    
    GaspType.SELECTIVE: GaspPattern(
        gasp_type=GaspType.SELECTIVE,
        intensity=GaspIntensity.LIGHT,
        affected_steps=[8],  # Same timing as Classic
        affected_elements=["chords", "percussion"],  # Bass continues
        duration_beats=0.5,
        frequency_bars=4,
        subgenre_association=["Soulful", "Jazz-influenced"],
        description="Selective Gasp - only certain elements drop out (usually chords/percussion), bass continues. Creates layered dynamics.",
        cultural_context="Jazz-influenced technique. Demonstrates sophisticated arrangement and understanding of musical space."
    ),
    
    GaspType.ECHO: GaspPattern(
        gasp_type=GaspType.ECHO,
        intensity=GaspIntensity.SUBTLE,
        affected_steps=[8],
        affected_elements=["chords", "vocals"],  # Elements fade with reverb/delay
        duration_beats=2.0,  # Fade lasts 2 beats
        frequency_bars=4,
        subgenre_association=["Soulful", "Spiritual"],
        description="Echo Gasp - elements fade out with reverb/delay instead of cutting abruptly. Creates dreamy, atmospheric feel.",
        cultural_context="Influenced by dub and ambient music. Creates spiritual, contemplative atmosphere common in Sunday afternoon Amapiano."
    ),
    
    GaspType.BUILD_UP: GaspPattern(
        gasp_type=GaspType.BUILD_UP,
        intensity=GaspIntensity.FULL,
        affected_steps=[12, 13, 14, 15],  # Last bar before drop
        affected_elements=["bass", "chords", "percussion"],
        duration_beats=4.0,  # Full bar before drop
        frequency_bars=32,  # Rare, only before major drops
        subgenre_association=["Sgija", "Festival"],
        description="Build-Up Gasp - full bar of silence before a major drop. Creates maximum tension and anticipation. Festival/club technique.",
        cultural_context="Adapted from EDM drop techniques. Used in festival-oriented Amapiano tracks for maximum crowd reaction."
    ),
}


def get_gasp_pattern(gasp_type: GaspType) -> GaspPattern:
    """
    Retrieve gasp pattern for a given type.
    
    Args:
        gasp_type: GaspType enum value
        
    Returns:
        GaspPattern object with gasp characteristics
    """
    return GASP_PATTERNS[gasp_type]


def apply_gasp_to_sequence(
    input_sequence: List[int],
    gasp_type: GaspType,
    intensity: Optional[GaspIntensity] = None
) -> List[int]:
    """
    Apply gasp pattern to a note sequence.
    
    Args:
        input_sequence: List of note velocities (0-127) for 16 steps
        gasp_type: Type of gasp to apply
        intensity: Override intensity (uses pattern default if None)
        
    Returns:
        Modified sequence with gasp applied
    """
    if len(input_sequence) != 16:
        raise ValueError("Input sequence must be 16 steps (4 bars of 16th notes)")
    
    pattern = get_gasp_pattern(gasp_type)
    output_sequence = input_sequence.copy()
    
    # Use provided intensity or pattern default
    gasp_intensity = intensity if intensity else pattern.intensity
    
    # Calculate reduction factor based on intensity
    intensity_factors = {
        GaspIntensity.FULL: 0.0,  # Complete silence
        GaspIntensity.HEAVY: 0.15,  # 85% reduction
        GaspIntensity.MODERATE: 0.35,  # 65% reduction
        GaspIntensity.LIGHT: 0.60,  # 40% reduction
        GaspIntensity.SUBTLE: 0.85,  # 15% reduction
    }
    reduction_factor = intensity_factors[gasp_intensity]
    
    # Apply gasp to affected steps
    for step in pattern.affected_steps:
        if step < len(output_sequence):
            output_sequence[step] = int(output_sequence[step] * reduction_factor)
    
    return output_sequence


def detect_gasp_type(sequence: List[int]) -> Dict[str, any]:
    """
    Detect which gasp type is present in a sequence.
    
    Args:
        sequence: List of note velocities (0-127) for 16 steps
        
    Returns:
        Dictionary with detected gasp type and confidence
    """
    if len(sequence) != 16:
        raise ValueError("Sequence must be 16 steps")
    
    # Calculate average velocity for comparison
    avg_velocity = np.mean([v for v in sequence if v > 0]) if any(sequence) else 0
    
    # Check each gasp type
    gasp_scores = {}
    for gasp_type in GaspType:
        if gasp_type == GaspType.NONE:
            continue
        
        pattern = get_gasp_pattern(gasp_type)
        score = 0
        
        # Check if affected steps have reduced velocity
        for step in pattern.affected_steps:
            if step < len(sequence):
                if sequence[step] < avg_velocity * 0.3:  # Significantly reduced
                    score += 1
        
        # Normalize score
        confidence = (score / len(pattern.affected_steps) * 100) if pattern.affected_steps else 0
        gasp_scores[gasp_type.value] = {
            "confidence": round(confidence, 2),
            "affected_steps": pattern.affected_steps,
            "description": pattern.description
        }
    
    # Find best match
    best_match = max(gasp_scores.items(), key=lambda x: x[1]["confidence"])
    
    # If no strong match, return NONE
    if best_match[1]["confidence"] < 50:
        return {
            "detected_gasp": "none",
            "confidence": 0,
            "all_scores": gasp_scores
        }
    
    return {
        "detected_gasp": best_match[0],
        "confidence": best_match[1]["confidence"],
        "all_scores": gasp_scores
    }


def generate_gasp_sequence(
    gasp_type: GaspType,
    base_velocity: int = 100,
    intensity: Optional[GaspIntensity] = None
) -> List[int]:
    """
    Generate a 16-step sequence with specified gasp pattern.
    
    Args:
        gasp_type: Type of gasp to generate
        base_velocity: Base velocity for non-gasp steps
        intensity: Override intensity (uses pattern default if None)
        
    Returns:
        List of 16 velocities with gasp applied
    """
    # Generate base sequence (all steps at base velocity)
    sequence = [base_velocity] * 16
    
    # Apply gasp
    return apply_gasp_to_sequence(sequence, gasp_type, intensity)


def calculate_gasp_authenticity(
    sequence: List[int],
    expected_gasp: GaspType
) -> Dict[str, any]:
    """
    Score the authenticity of a gasp implementation.
    
    Args:
        sequence: Input sequence to analyze
        expected_gasp: Expected gasp type
        
    Returns:
        Dictionary with authenticity scores
    """
    detection = detect_gasp_type(sequence)
    pattern = get_gasp_pattern(expected_gasp)
    
    # Check if detected gasp matches expected
    is_correct_type = detection["detected_gasp"] == expected_gasp.value
    type_score = 100 if is_correct_type else 0
    
    # Check confidence of detection
    confidence_score = detection["confidence"]
    
    # Check if gasp occurs at correct frequency
    # (This would require analyzing multiple bars, simplified here)
    frequency_score = 100  # Placeholder
    
    # Overall score
    overall_score = (type_score * 0.5 + confidence_score * 0.3 + frequency_score * 0.2)
    
    return {
        "type_accuracy": type_score,
        "detection_confidence": confidence_score,
        "frequency_accuracy": frequency_score,
        "overall_gasp_authenticity": round(overall_score, 2),
        "expected_gasp": expected_gasp.value,
        "detected_gasp": detection["detected_gasp"],
        "grade": get_grade(overall_score),
        "cultural_context": pattern.cultural_context
    }


def get_grade(score: float) -> str:
    """Convert numerical score to letter grade"""
    if score >= 90:
        return "A+ (Authentic)"
    elif score >= 80:
        return "A (Strong)"
    elif score >= 70:
        return "B (Good)"
    elif score >= 60:
        return "C (Moderate)"
    else:
        return "D (Weak)"


def compare_all_gasps() -> Dict[str, any]:
    """
    Generate a comparison of all gasp types.
    
    Returns:
        Dictionary with comparative analysis
    """
    comparison = {
        "gasp_types": [],
        "most_common": None,
        "most_intense": None,
        "most_experimental": None
    }
    
    for gasp_type in GaspType:
        if gasp_type == GaspType.NONE:
            continue
        
        pattern = get_gasp_pattern(gasp_type)
        
        gasp_data = {
            "type": gasp_type.value,
            "intensity": pattern.intensity.value,
            "duration_beats": pattern.duration_beats,
            "frequency_bars": pattern.frequency_bars,
            "subgenres": pattern.subgenre_association,
            "description": pattern.description
        }
        comparison["gasp_types"].append(gasp_data)
    
    # Identify most common (Classic)
    comparison["most_common"] = "classic"
    comparison["most_intense"] = "full_bar"
    comparison["most_experimental"] = "reverse"
    
    return comparison


# Example usage and testing
if __name__ == "__main__":
    import json
    
    print("Complete Amapiano Gasp Taxonomy")
    print("=" * 70)
    
    # Test 1: Classic Gasp pattern
    print("\n1. Classic Gasp Pattern (The Original)")
    classic = get_gasp_pattern(GaspType.CLASSIC)
    print(f"Type: {classic.gasp_type.value}")
    print(f"Intensity: {classic.intensity.value}")
    print(f"Affected Steps: {classic.affected_steps}")
    print(f"Duration: {classic.duration_beats} beats")
    print(f"Frequency: Every {classic.frequency_bars} bars")
    print(f"Subgenres: {', '.join(classic.subgenre_association)}")
    print(f"Description: {classic.description}")
    print(f"Cultural Context: {classic.cultural_context}")
    
    # Test 2: Generate sequence with Classic Gasp
    print("\n2. Generating Sequence with Classic Gasp")
    classic_seq = generate_gasp_sequence(GaspType.CLASSIC, base_velocity=100)
    print(f"Sequence: {classic_seq}")
    print(f"Step 8 (Beat 1 of Bar 3): {classic_seq[8]} (should be 0 or very low)")
    
    # Test 3: Detect gasp type
    print("\n3. Detecting Gasp Type from Sequence")
    detection = detect_gasp_type(classic_seq)
    print(f"Detected Gasp: {detection['detected_gasp']}")
    print(f"Confidence: {detection['confidence']}%")
    
    # Test 4: Compare all gasp types
    print("\n4. Comparing All Gasp Types")
    comparison = compare_all_gasps()
    print(f"Total Gasp Types: {len(comparison['gasp_types'])}")
    print(f"Most Common: {comparison['most_common']}")
    print(f"Most Intense: {comparison['most_intense']}")
    print(f"Most Experimental: {comparison['most_experimental']}")
    
    # Test 5: Gasp type table
    print("\n5. Gasp Type Comparison Table")
    print(f"{'Type':<15} {'Intensity':<12} {'Duration':<12} {'Frequency':<12} {'Subgenres':<30}")
    print("-" * 90)
    for gasp_data in comparison["gasp_types"]:
        print(f"{gasp_data['type']:<15} {gasp_data['intensity']:<12} "
              f"{gasp_data['duration_beats']:<12.1f} "
              f"{'Every ' + str(gasp_data['frequency_bars']) + ' bars':<12} "
              f"{', '.join(gasp_data['subgenres'][:2]):<30}")
    
    # Test 6: Authenticity scoring
    print("\n6. Gasp Authenticity Scoring")
    authenticity = calculate_gasp_authenticity(classic_seq, GaspType.CLASSIC)
    print(json.dumps(authenticity, indent=2))
    
    # Test 7: Test all gasp types
    print("\n7. Testing All Gasp Types")
    for gasp_type in [GaspType.CLASSIC, GaspType.DOUBLE, GaspType.STUTTER]:
        seq = generate_gasp_sequence(gasp_type)
        print(f"{gasp_type.value}: Step 8 = {seq[8]}, Step 10 = {seq[10]}")
