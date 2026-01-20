"""
Integrated Cultural Authenticity Pattern Generator

This module integrates all three cultural authenticity components:
1. Linguistic Alignment (language-specific rhythm patterns)
2. Regional Swing (geographic micro-timing variations)
3. Gasp Taxonomy (strategic silence patterns)

It generates complete, culturally authentic Amapiano patterns that combine
linguistic phonetics, regional groove characteristics, and signature gasp moments.

Usage:
    python generate_authentic_pattern.py --language zulu --region gauteng_jhb --gasp classic --text "Ngiyakuthanda"
"""

import sys
import json
import argparse
from typing import Dict, List, Tuple, Optional
import numpy as np

# Import our modules
from linguistic_alignment import (
    get_linguistic_pattern,
    map_syllable_to_rhythm,
    SALanguage
)
from regional_swing import (
    get_swing_profile,
    apply_swing_to_sequence,
    SARegion
)
from gasp_taxonomy import (
    get_gasp_pattern,
    apply_gasp_to_sequence,
    GaspType
)


def generate_authentic_amapiano_pattern(
    language: str,
    region: str,
    gasp_type: str,
    text: Optional[str] = None,
    bars: int = 4,
    base_bpm: int = 115
) -> Dict[str, any]:
    """
    Generate a complete, culturally authentic Amapiano pattern.
    
    Args:
        language: SA language code (e.g., 'zulu', 'xhosa')
        region: SA region code (e.g., 'gauteng_jhb', 'kzn_durban')
        gasp_type: Gasp pattern type (e.g., 'classic', 'double')
        text: Optional text for linguistic mapping
        bars: Number of bars to generate
        base_bpm: Base tempo in BPM
        
    Returns:
        Dictionary with complete pattern data
    """
    
    # Step 1: Get linguistic profile
    lang_profile = get_linguistic_pattern(SALanguage(language))
    
    # Step 2: Get regional swing profile
    swing_profile = get_swing_profile(SARegion(region))
    
    # Step 3: Get gasp pattern
    gasp_pattern = get_gasp_pattern(GaspType(gasp_type))
    
    # Step 4: Generate base rhythm from linguistic patterns
    if text:
        # Map text to rhythm
        # Count syllables (simplified - count vowels)
        syllable_count = sum(1 for c in text.lower() if c in 'aeiou')
        rhythm_data = map_syllable_to_rhythm(syllable_count, SALanguage(language), bars=bars)
        note_sequence = rhythm_data.note_sequence
        duration_sequence = rhythm_data.duration_sequence
        velocity_sequence = rhythm_data.velocity_sequence
        swing_offsets = rhythm_data.swing_offsets
    else:
        # Generate generic pattern based on language characteristics
        steps_per_bar = 16
        total_steps = bars * steps_per_bar
        
        # Create basic note sequence
        note_sequence = []
        duration_sequence = []
        velocity_sequence = []
        
        for i in range(total_steps):
            # Downbeats get root note
            if i % 4 == 0:
                note_sequence.append(60)  # C4
                velocity_sequence.append(100)
            # Off-beats get higher note
            elif i % 2 == 1:
                note_sequence.append(63)  # Eb4
                velocity_sequence.append(70)
            # Other beats
            else:
                note_sequence.append(60)
                velocity_sequence.append(85)
            
            duration_sequence.append(0.25)  # 16th notes
        
        # Apply linguistic swing offset
        swing_offsets = [lang_profile.swing_offset_percent] * total_steps
    
    # Step 5: Apply regional swing to timing
    straight_sequence = [i * 0.25 for i in range(len(note_sequence))]
    swung_timing = apply_swing_to_sequence(straight_sequence, SARegion(region), humanize=True)
    
    # Step 6: Apply gasp pattern to velocities
    # Pad velocity sequence to multiple of 16 if needed
    steps_per_bar = 16
    total_steps = bars * steps_per_bar
    
    # Pad or trim velocity sequence to exact length
    if len(velocity_sequence) < total_steps:
        velocity_sequence.extend([70] * (total_steps - len(velocity_sequence)))
    elif len(velocity_sequence) > total_steps:
        velocity_sequence = velocity_sequence[:total_steps]
    
    # Apply gasp pattern to velocities
    gasp_applied_velocities = velocity_sequence.copy()
    
    # Apply gasp to affected steps in the appropriate bar
    gasp_bar_idx = gasp_pattern.frequency_bars - 1  # Which bar gets the gasp
    if gasp_bar_idx < bars:
        for step in gasp_pattern.affected_steps:
            global_step = gasp_bar_idx * steps_per_bar + step
            if global_step < len(gasp_applied_velocities):
                # Apply intensity reduction
                intensity_factors = {
                    'full': 0.0,
                    'heavy': 0.15,
                    'moderate': 0.35,
                    'light': 0.60,
                    'subtle': 0.85,
                }
                reduction_factor = intensity_factors.get(gasp_pattern.intensity.value, 0.0)
                gasp_applied_velocities[global_step] = int(gasp_applied_velocities[global_step] * reduction_factor)
    
    # Step 7: Calculate cultural authenticity scores
    authenticity_scores = {
        "linguistic_authenticity": calculate_linguistic_score(
            velocity_sequence,
            lang_profile.stress_pattern
        ),
        "regional_authenticity": calculate_regional_score(
            swung_timing,
            straight_sequence,
            swing_profile.swing_offset_percent
        ),
        "gasp_authenticity": calculate_gasp_score(
            gasp_applied_velocities,
            gasp_pattern
        ),
    }
    
    # Overall score (weighted average)
    overall_score = (
        authenticity_scores["linguistic_authenticity"] * 0.35 +
        authenticity_scores["regional_authenticity"] * 0.35 +
        authenticity_scores["gasp_authenticity"] * 0.30
    )
    authenticity_scores["overall_authenticity"] = round(overall_score, 2)
    authenticity_scores["grade"] = get_grade(overall_score)
    
    # Step 8: Compile complete pattern
    pattern = {
        "metadata": {
            "language": language,
            "region": region,
            "gasp_type": gasp_type,
            "bars": bars,
            "bpm": base_bpm,
            "text": text,
        },
        "linguistic_profile": {
            "language": lang_profile.language.value,
            "swing_offset": lang_profile.swing_offset_percent,
            "stress_pattern": lang_profile.stress_pattern,
            "syllable_structure": lang_profile.syllable_structure,
            "tonal_levels": lang_profile.tonal_levels,
            "has_clicks": lang_profile.click_consonants,
        },
        "regional_profile": {
            "region": swing_profile.region.value,
            "swing_offset": swing_profile.swing_offset_percent,
            "bpm_range": swing_profile.typical_bpm_range,
            "groove_tightness": swing_profile.groove_tightness,
            "micro_timing_jitter": swing_profile.micro_timing_jitter,
            "cultural_influences": swing_profile.cultural_influences,
        },
        "gasp_profile": {
            "type": gasp_pattern.gasp_type.value,
            "intensity": gasp_pattern.intensity.value,
            "affected_steps": gasp_pattern.affected_steps,
            "duration_beats": gasp_pattern.duration_beats,
            "frequency_bars": gasp_pattern.frequency_bars,
            "subgenres": gasp_pattern.subgenre_association,
        },
        "pattern_data": {
            "note_sequence": note_sequence,
            "timing_sequence": [round(t, 4) for t in swung_timing],
            "velocity_sequence": gasp_applied_velocities,
            "duration_sequence": duration_sequence,
        },
        "authenticity_scores": authenticity_scores,
        "recommendations": generate_recommendations(authenticity_scores, lang_profile, swing_profile, gasp_pattern),
    }
    
    return pattern


def calculate_linguistic_score(velocities: List[int], stress_pattern: str) -> float:
    """Calculate how well the pattern matches linguistic stress patterns"""
    # Simplified scoring based on velocity variance
    if not velocities:
        return 0.0
    
    velocity_variance = np.var(velocities)
    # Higher variance = better stress pattern articulation
    score = min(100, velocity_variance / 2)
    return round(score, 2)


def calculate_regional_score(
    swung_timing: List[float],
    straight_timing: List[float],
    expected_swing: float
) -> float:
    """Calculate how well the pattern matches regional swing characteristics"""
    if len(swung_timing) != len(straight_timing):
        return 0.0
    
    # Calculate actual swing offset
    offsets = []
    for i in range(len(swung_timing)):
        if i % 2 == 1:  # Off-beats
            offset = swung_timing[i] - straight_timing[i]
            offset_percent = 0.5 + (offset / 0.25)
            offsets.append(offset_percent)
    
    if not offsets:
        return 0.0
    
    avg_swing = np.mean(offsets)
    # Score based on proximity to expected swing
    distance = abs(avg_swing - expected_swing)
    score = max(0, 100 - (distance * 500))
    return round(score, 2)


def calculate_gasp_score(velocities: List[int], gasp_pattern) -> float:
    """Calculate how well the gasp pattern is implemented"""
    if len(velocities) < 16:
        return 0.0
    
    # Check if affected steps have reduced velocity
    score = 0
    for step in gasp_pattern.affected_steps:
        if step < len(velocities):
            if velocities[step] < 30:  # Should be very low or zero
                score += 1
    
    # Normalize
    if gasp_pattern.affected_steps:
        score = (score / len(gasp_pattern.affected_steps)) * 100
    
    return round(score, 2)


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


def generate_recommendations(
    scores: Dict[str, float],
    lang_profile,
    swing_profile,
    gasp_pattern
) -> List[str]:
    """Generate recommendations for improving authenticity"""
    recommendations = []
    
    if scores["linguistic_authenticity"] < 70:
        recommendations.append(
            f"Increase velocity variance to better articulate {lang_profile.language.value} stress patterns. "
            f"Target penultimate syllable emphasis."
        )
    
    if scores["regional_authenticity"] < 70:
        recommendations.append(
            f"Adjust swing offset closer to {swing_profile.swing_offset_percent*100:.1f}% "
            f"to match {swing_profile.region.value} groove feel."
        )
    
    if scores["gasp_authenticity"] < 70:
        recommendations.append(
            f"Ensure {gasp_pattern.gasp_type.value} gasp is properly implemented on steps {gasp_pattern.affected_steps}. "
            f"Reduce velocity to near-zero for full gasp effect."
        )
    
    if scores["overall_authenticity"] >= 85:
        recommendations.append(
            "Excellent cultural authenticity! Pattern demonstrates strong understanding of "
            f"{lang_profile.language.value} linguistics, {swing_profile.region.value} groove, "
            f"and {gasp_pattern.gasp_type.value} gasp technique."
        )
    
    return recommendations


def main():
    parser = argparse.ArgumentParser(description='Generate culturally authentic Amapiano pattern')
    parser.add_argument('--language', required=True, choices=[
        'zulu', 'xhosa', 'tsonga', 'tswana', 'sotho_north', 'sotho_south',
        'english_sa', 'afrikaans', 'venda', 'ndebele', 'swazi'
    ])
    parser.add_argument('--region', required=True, choices=[
        'gauteng_jhb', 'gauteng_pta', 'kzn_durban', 'western_cape', 'limpopo',
        'mpumalanga', 'free_state', 'eastern_cape', 'north_west', 'northern_cape'
    ])
    parser.add_argument('--gasp', required=True, choices=[
        'classic', 'double', 'half_bar', 'full_bar', 'stutter', 'reverse',
        'progressive', 'selective', 'echo', 'build_up'
    ])
    parser.add_argument('--text', type=str, help='Optional text for linguistic mapping')
    parser.add_argument('--bars', type=int, default=4, help='Number of bars to generate')
    parser.add_argument('--bpm', type=int, default=115, help='Tempo in BPM')
    
    args = parser.parse_args()
    
    try:
        pattern = generate_authentic_amapiano_pattern(
            language=args.language,
            region=args.region,
            gasp_type=args.gasp,
            text=args.text,
            bars=args.bars,
            base_bpm=args.bpm
        )
        
        print(json.dumps(pattern, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    # If no args, run test
    if len(sys.argv) == 1:
        print("Integrated Cultural Authenticity Pattern Generator")
        print("=" * 70)
        
        # Test 1: Zulu + Gauteng + Classic Gasp
        print("\n1. Generating Zulu + Gauteng JHB + Classic Gasp Pattern")
        pattern1 = generate_authentic_amapiano_pattern(
            language="zulu",
            region="gauteng_jhb",
            gasp_type="classic",
            text="Ngiyakuthanda",
            bars=4
        )
        print(f"Language: {pattern1['linguistic_profile']['language']}")
        print(f"Region: {pattern1['regional_profile']['region']}")
        print(f"Gasp: {pattern1['gasp_profile']['type']}")
        print(f"Overall Authenticity: {pattern1['authenticity_scores']['overall_authenticity']}% "
              f"({pattern1['authenticity_scores']['grade']})")
        print(f"Linguistic Score: {pattern1['authenticity_scores']['linguistic_authenticity']}%")
        print(f"Regional Score: {pattern1['authenticity_scores']['regional_authenticity']}%")
        print(f"Gasp Score: {pattern1['authenticity_scores']['gasp_authenticity']}%")
        
        # Test 2: Xhosa + KZN + Double Gasp
        print("\n2. Generating Xhosa + KZN Durban + Double Gasp Pattern")
        pattern2 = generate_authentic_amapiano_pattern(
            language="xhosa",
            region="kzn_durban",
            gasp_type="double",
            bars=4
        )
        print(f"Language: {pattern2['linguistic_profile']['language']}")
        print(f"Region: {pattern2['regional_profile']['region']}")
        print(f"Gasp: {pattern2['gasp_profile']['type']}")
        print(f"Overall Authenticity: {pattern2['authenticity_scores']['overall_authenticity']}% "
              f"({pattern2['authenticity_scores']['grade']})")
        
        # Test 3: Recommendations
        print("\n3. Authenticity Recommendations")
        for i, rec in enumerate(pattern1['recommendations'], 1):
            print(f"{i}. {rec}")
        
        # Test 4: Pattern data sample
        print("\n4. Pattern Data Sample (first 8 steps)")
        print(f"Notes: {pattern1['pattern_data']['note_sequence'][:8]}")
        print(f"Timing: {pattern1['pattern_data']['timing_sequence'][:8]}")
        print(f"Velocity: {pattern1['pattern_data']['velocity_sequence'][:8]}")
    else:
        main()
