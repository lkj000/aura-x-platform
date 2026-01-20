"""
Regional Swing Variations Module for South African Amapiano

This module implements region-specific micro-timing patterns (swing) that define
the rhythmic "feel" of Amapiano music across different South African cities and
provinces. Each region has developed distinct swing characteristics influenced by
local musical traditions, cultural practices, and production styles.

Key Concepts:
- Swing Offset: Percentage delay of off-beat notes (50% = straight, >50% = laid-back)
- Micro-timing: Subtle timing variations that create groove and human feel
- Regional Identity: How geographic location influences rhythmic interpretation

Supported Regions:
- Gauteng (Johannesburg/Pretoria) - The birthplace of Amapiano
- KwaZulu-Natal (Durban) - Gqom-influenced swing
- Western Cape (Cape Town) - House-influenced swing
- Limpopo - Traditional rhythms influence
- Mpumalanga - Rural Amapiano style
- Free State - Central SA characteristics
- Eastern Cape - Xhosa cultural influence
- North West - Motswako influence
- Northern Cape - Sparse, desert-like feel
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class SARegion(Enum):
    """South African regions with distinct Amapiano styles"""
    GAUTENG_JHB = "gauteng_jhb"  # Johannesburg - Original Amapiano
    GAUTENG_PTA = "gauteng_pta"  # Pretoria - Slightly different from JHB
    KZN_DURBAN = "kzn_durban"    # Durban - Gqom influence
    WESTERN_CAPE = "western_cape"  # Cape Town - House influence
    LIMPOPO = "limpopo"          # Traditional influence
    MPUMALANGA = "mpumalanga"    # Rural style
    FREE_STATE = "free_state"    # Central SA
    EASTERN_CAPE = "eastern_cape"  # Xhosa influence
    NORTH_WEST = "north_west"    # Motswako influence
    NORTHERN_CAPE = "northern_cape"  # Sparse style


@dataclass
class SwingProfile:
    """Defines the swing characteristics of a region"""
    region: SARegion
    swing_offset_percent: float  # Main swing offset (50-70%)
    swing_variance: float  # How much swing varies (humanization)
    micro_timing_jitter: float  # Random timing variation in ms
    shuffle_intensity: float  # Triplet feel intensity (0-1)
    groove_tightness: float  # How "locked" the groove is (0-1, 1=tight)
    typical_bpm_range: Tuple[int, int]
    cultural_influences: List[str]
    description: str


# Regional swing profile database
REGIONAL_SWING_PROFILES: Dict[SARegion, SwingProfile] = {
    SARegion.GAUTENG_JHB: SwingProfile(
        region=SARegion.GAUTENG_JHB,
        swing_offset_percent=0.583,  # The famous "Gauteng Swing" - 58.3%
        swing_variance=0.03,  # Moderate variance
        micro_timing_jitter=8.0,  # 8ms jitter
        shuffle_intensity=0.4,  # Subtle shuffle
        groove_tightness=0.75,  # Fairly tight
        typical_bpm_range=(112, 118),
        cultural_influences=["Kwaito", "Deep House", "Jazz"],
        description="The original Amapiano sound - laid-back but precise, with signature 58.3% swing offset that defines the genre. Influenced by Kwaito's relaxed groove and deep house sophistication."
    ),
    
    SARegion.GAUTENG_PTA: SwingProfile(
        region=SARegion.GAUTENG_PTA,
        swing_offset_percent=0.570,  # Slightly tighter than JHB
        swing_variance=0.025,
        micro_timing_jitter=7.0,
        shuffle_intensity=0.35,
        groove_tightness=0.80,  # Tighter than JHB
        typical_bpm_range=(113, 119),
        cultural_influences=["Kwaito", "Bacardi", "Gospel"],
        description="Pretoria's interpretation - slightly tighter and more structured than JHB, with gospel music influence creating a more 'proper' feel while maintaining the Amapiano essence."
    ),
    
    SARegion.KZN_DURBAN: SwingProfile(
        region=SARegion.KZN_DURBAN,
        swing_offset_percent=0.520,  # Tighter swing (Gqom influence)
        swing_variance=0.04,  # Higher variance
        micro_timing_jitter=12.0,  # More jitter (raw energy)
        shuffle_intensity=0.25,  # Less shuffle
        groove_tightness=0.60,  # Looser, more energetic
        typical_bpm_range=(115, 125),  # Faster tempo
        cultural_influences=["Gqom", "Maskandi", "Zulu traditional"],
        description="Durban's high-energy interpretation - influenced by Gqom's aggressive, minimal aesthetic. Tighter swing with more jitter creates raw, urgent feel. Faster tempos reflect Gqom heritage."
    ),
    
    SARegion.WESTERN_CAPE: SwingProfile(
        region=SARegion.WESTERN_CAPE,
        swing_offset_percent=0.500,  # Straight feel (House influence)
        swing_variance=0.02,
        micro_timing_jitter=5.0,  # Very tight
        shuffle_intensity=0.20,
        groove_tightness=0.85,  # Very tight
        typical_bpm_range=(118, 124),  # House tempo range
        cultural_influences=["Deep House", "Tech House", "Afro House"],
        description="Cape Town's sophisticated take - heavily influenced by the city's strong house music culture. Straighter swing, tighter groove, higher BPM. More European house aesthetic."
    ),
    
    SARegion.LIMPOPO: SwingProfile(
        region=SARegion.LIMPOPO,
        swing_offset_percent=0.600,  # Very laid-back
        swing_variance=0.05,  # High variance (organic feel)
        micro_timing_jitter=15.0,  # High jitter (traditional influence)
        shuffle_intensity=0.50,  # Strong shuffle
        groove_tightness=0.55,  # Loose, organic
        typical_bpm_range=(108, 114),  # Slower tempo
        cultural_influences=["Traditional Pedi", "Marabi", "Shangaan Electro"],
        description="Limpopo's traditional-infused style - very laid-back swing with strong traditional music influence. Organic, loose feel with significant micro-timing variations reflecting live drumming traditions."
    ),
    
    SARegion.MPUMALANGA: SwingProfile(
        region=SARegion.MPUMALANGA,
        swing_offset_percent=0.590,
        swing_variance=0.045,
        micro_timing_jitter=13.0,
        shuffle_intensity=0.45,
        groove_tightness=0.65,
        typical_bpm_range=(110, 116),
        cultural_influences=["Rural Kwaito", "Swazi traditional", "Gospel"],
        description="Rural Amapiano style - combines Gauteng influence with rural sensibilities. Slightly more relaxed than Gauteng with stronger gospel and traditional elements."
    ),
    
    SARegion.FREE_STATE: SwingProfile(
        region=SARegion.FREE_STATE,
        swing_offset_percent=0.560,
        swing_variance=0.03,
        micro_timing_jitter=9.0,
        shuffle_intensity=0.38,
        groove_tightness=0.72,
        typical_bpm_range=(111, 117),
        cultural_influences=["Kwaito", "Sotho traditional", "Gospel"],
        description="Central SA style - balanced approach between Gauteng sophistication and rural authenticity. Moderate swing with gospel music structure."
    ),
    
    SARegion.EASTERN_CAPE: SwingProfile(
        region=SARegion.EASTERN_CAPE,
        swing_offset_percent=0.555,
        swing_variance=0.04,
        micro_timing_jitter=11.0,
        shuffle_intensity=0.42,
        groove_tightness=0.68,
        typical_bpm_range=(110, 116),
        cultural_influences=["Xhosa traditional", "Maskandi", "Gospel"],
        description="Xhosa-influenced style - incorporates click consonant rhythms and traditional Xhosa music patterns. Moderate swing with distinctive percussive elements."
    ),
    
    SARegion.NORTH_WEST: SwingProfile(
        region=SARegion.NORTH_WEST,
        swing_offset_percent=0.565,
        swing_variance=0.035,
        micro_timing_jitter=10.0,
        shuffle_intensity=0.40,
        groove_tightness=0.70,
        typical_bpm_range=(111, 117),
        cultural_influences=["Motswako", "Kwaito", "Tswana traditional"],
        description="Motswako-influenced style - incorporates hip-hop elements from the region's Motswako tradition. Moderate swing with rap-influenced rhythmic phrasing."
    ),
    
    SARegion.NORTHERN_CAPE: SwingProfile(
        region=SARegion.NORTHERN_CAPE,
        swing_offset_percent=0.540,
        swing_variance=0.025,
        micro_timing_jitter=6.0,
        shuffle_intensity=0.30,
        groove_tightness=0.78,
        typical_bpm_range=(112, 118),
        cultural_influences=["Kwaito", "House", "Boeremusiek"],
        description="Sparse, minimalist style - reflects the region's desert landscape. Tighter swing with less ornamentation, more space between elements."
    ),
}


def get_swing_profile(region: SARegion) -> SwingProfile:
    """
    Retrieve swing profile for a given region.
    
    Args:
        region: SARegion enum value
        
    Returns:
        SwingProfile object with region characteristics
    """
    return REGIONAL_SWING_PROFILES[region]


def apply_swing_to_sequence(
    straight_sequence: List[float],
    region: SARegion,
    humanize: bool = True
) -> List[float]:
    """
    Apply regional swing offset to a straight timing sequence.
    
    Args:
        straight_sequence: List of note timings in beats (straight 16th notes)
        region: SARegion enum value
        humanize: Whether to add micro-timing variations
        
    Returns:
        List of swung note timings with regional characteristics
    """
    profile = get_swing_profile(region)
    swung_sequence = []
    
    for i, timing in enumerate(straight_sequence):
        # Apply swing to off-beats (odd indices in 16th note grid)
        if i % 2 == 1:  # Off-beat
            # Calculate swing offset
            swing_offset = profile.swing_offset_percent - 0.5  # Convert to offset from straight
            swung_timing = timing + (swing_offset * 0.25)  # 0.25 = 16th note duration
            
            # Add humanization if enabled
            if humanize:
                # Add variance to swing
                variance = np.random.normal(0, profile.swing_variance * 0.25)
                swung_timing += variance
                
                # Add micro-timing jitter
                jitter_ms = np.random.normal(0, profile.micro_timing_jitter)
                jitter_beats = jitter_ms / 1000 / (60 / 115)  # Convert ms to beats at 115 BPM
                swung_timing += jitter_beats
            
            swung_sequence.append(swung_timing)
        else:  # On-beat
            # On-beats stay mostly straight, but can have slight jitter
            on_beat_timing = timing
            if humanize:
                jitter_ms = np.random.normal(0, profile.micro_timing_jitter * 0.3)  # Less jitter on beats
                jitter_beats = jitter_ms / 1000 / (60 / 115)
                on_beat_timing += jitter_beats
            swung_sequence.append(on_beat_timing)
    
    return swung_sequence


def calculate_swing_offset(
    timing_sequence: List[float],
    expected_straight_sequence: List[float]
) -> float:
    """
    Calculate the swing offset percentage from a timing sequence.
    
    Args:
        timing_sequence: Actual note timings
        expected_straight_sequence: Expected straight timings
        
    Returns:
        Swing offset as percentage (0.5 = straight, 0.583 = Gauteng swing)
    """
    if len(timing_sequence) != len(expected_straight_sequence):
        raise ValueError("Sequences must be same length")
    
    # Calculate average offset for off-beats
    offsets = []
    for i in range(len(timing_sequence)):
        if i % 2 == 1:  # Off-beat
            offset = timing_sequence[i] - expected_straight_sequence[i]
            sixteenth_note_duration = 0.25
            offset_percent = 0.5 + (offset / sixteenth_note_duration)
            offsets.append(offset_percent)
    
    return np.mean(offsets) if offsets else 0.5


def detect_regional_swing(
    timing_sequence: List[float],
    expected_straight_sequence: List[float]
) -> Dict[str, any]:
    """
    Detect which regional swing style a timing sequence most closely matches.
    
    Args:
        timing_sequence: Actual note timings
        expected_straight_sequence: Expected straight timings
        
    Returns:
        Dictionary with detected region and confidence scores
    """
    measured_swing = calculate_swing_offset(timing_sequence, expected_straight_sequence)
    
    # Calculate distance to each regional profile
    region_scores = {}
    for region in SARegion:
        profile = get_swing_profile(region)
        distance = abs(measured_swing - profile.swing_offset_percent)
        confidence = max(0, 100 - (distance * 1000))  # Convert to 0-100 scale
        region_scores[region.value] = {
            "confidence": round(confidence, 2),
            "expected_swing": profile.swing_offset_percent,
            "swing_difference": round(distance, 4)
        }
    
    # Find best match
    best_region = max(region_scores.items(), key=lambda x: x[1]["confidence"])
    
    return {
        "measured_swing_offset": round(measured_swing, 4),
        "detected_region": best_region[0],
        "confidence": best_region[1]["confidence"],
        "all_region_scores": region_scores
    }


def generate_regional_groove(
    region: SARegion,
    bars: int = 4,
    humanize: bool = True
) -> Dict[str, any]:
    """
    Generate a complete groove pattern with regional swing characteristics.
    
    Args:
        region: SARegion enum value
        bars: Number of bars to generate
        humanize: Whether to add micro-timing variations
        
    Returns:
        Dictionary with timing sequence and groove metadata
    """
    profile = get_swing_profile(region)
    steps_per_bar = 16  # 16th notes
    total_steps = bars * steps_per_bar
    
    # Generate straight sequence
    straight_sequence = [i * 0.25 for i in range(total_steps)]  # 16th notes
    
    # Apply regional swing
    swung_sequence = apply_swing_to_sequence(straight_sequence, region, humanize)
    
    # Generate velocity pattern based on groove tightness
    velocities = []
    for i in range(total_steps):
        if i % 4 == 0:  # Downbeat
            base_velocity = 100
        elif i % 2 == 0:  # On-beat
            base_velocity = 85
        else:  # Off-beat
            base_velocity = 70
        
        # Add velocity variance based on groove tightness
        if humanize:
            variance = np.random.normal(0, (1 - profile.groove_tightness) * 15)
            velocity = int(np.clip(base_velocity + variance, 1, 127))
        else:
            velocity = base_velocity
        
        velocities.append(velocity)
    
    return {
        "region": region.value,
        "swing_offset": profile.swing_offset_percent,
        "timing_sequence": swung_sequence,
        "velocity_sequence": velocities,
        "bpm_range": profile.typical_bpm_range,
        "cultural_influences": profile.cultural_influences,
        "description": profile.description,
        "groove_characteristics": {
            "swing_variance": profile.swing_variance,
            "micro_timing_jitter_ms": profile.micro_timing_jitter,
            "shuffle_intensity": profile.shuffle_intensity,
            "groove_tightness": profile.groove_tightness
        }
    }


def compare_regional_swings() -> Dict[str, any]:
    """
    Generate a comparison of all regional swing profiles.
    
    Returns:
        Dictionary with comparative analysis of all regions
    """
    comparison = {
        "regions": [],
        "swing_range": {"min": 1.0, "max": 0.0},
        "tempo_range": {"min": 200, "max": 0},
        "tightest_groove": None,
        "loosest_groove": None,
        "most_jitter": None,
        "least_jitter": None
    }
    
    for region in SARegion:
        profile = get_swing_profile(region)
        
        region_data = {
            "region": region.value,
            "swing_offset": profile.swing_offset_percent,
            "bpm_range": profile.typical_bpm_range,
            "groove_tightness": profile.groove_tightness,
            "jitter_ms": profile.micro_timing_jitter,
            "cultural_influences": profile.cultural_influences
        }
        comparison["regions"].append(region_data)
        
        # Update ranges
        if profile.swing_offset_percent < comparison["swing_range"]["min"]:
            comparison["swing_range"]["min"] = profile.swing_offset_percent
        if profile.swing_offset_percent > comparison["swing_range"]["max"]:
            comparison["swing_range"]["max"] = profile.swing_offset_percent
        
        if profile.typical_bpm_range[0] < comparison["tempo_range"]["min"]:
            comparison["tempo_range"]["min"] = profile.typical_bpm_range[0]
        if profile.typical_bpm_range[1] > comparison["tempo_range"]["max"]:
            comparison["tempo_range"]["max"] = profile.typical_bpm_range[1]
        
        # Track extremes
        if comparison["tightest_groove"] is None or profile.groove_tightness > REGIONAL_SWING_PROFILES[SARegion(comparison["tightest_groove"])].groove_tightness:
            comparison["tightest_groove"] = region.value
        
        if comparison["loosest_groove"] is None or profile.groove_tightness < REGIONAL_SWING_PROFILES[SARegion(comparison["loosest_groove"])].groove_tightness:
            comparison["loosest_groove"] = region.value
        
        if comparison["most_jitter"] is None or profile.micro_timing_jitter > REGIONAL_SWING_PROFILES[SARegion(comparison["most_jitter"])].micro_timing_jitter:
            comparison["most_jitter"] = region.value
        
        if comparison["least_jitter"] is None or profile.micro_timing_jitter < REGIONAL_SWING_PROFILES[SARegion(comparison["least_jitter"])].micro_timing_jitter:
            comparison["least_jitter"] = region.value
    
    return comparison


# Example usage and testing
if __name__ == "__main__":
    import json
    
    print("Regional Swing Variations Module")
    print("=" * 70)
    
    # Test 1: Gauteng Swing Profile
    print("\n1. Gauteng (Johannesburg) Swing Profile - The Original")
    gauteng_profile = get_swing_profile(SARegion.GAUTENG_JHB)
    print(f"Swing Offset: {gauteng_profile.swing_offset_percent * 100}%")
    print(f"BPM Range: {gauteng_profile.typical_bpm_range}")
    print(f"Groove Tightness: {gauteng_profile.groove_tightness}")
    print(f"Micro-timing Jitter: {gauteng_profile.micro_timing_jitter}ms")
    print(f"Cultural Influences: {', '.join(gauteng_profile.cultural_influences)}")
    print(f"Description: {gauteng_profile.description}")
    
    # Test 2: Generate Gauteng groove
    print("\n2. Generating Gauteng Groove (2 bars)")
    gauteng_groove = generate_regional_groove(SARegion.GAUTENG_JHB, bars=2, humanize=True)
    print(f"Timing Sequence (first 8 steps): {[round(t, 3) for t in gauteng_groove['timing_sequence'][:8]]}")
    print(f"Velocity Sequence (first 8 steps): {gauteng_groove['velocity_sequence'][:8]}")
    
    # Test 3: Compare all regional swings
    print("\n3. Comparing All Regional Swings")
    comparison = compare_regional_swings()
    print(f"Swing Range: {comparison['swing_range']['min']*100:.1f}% - {comparison['swing_range']['max']*100:.1f}%")
    print(f"Tempo Range: {comparison['tempo_range']['min']} - {comparison['tempo_range']['max']} BPM")
    print(f"Tightest Groove: {comparison['tightest_groove']}")
    print(f"Loosest Groove: {comparison['loosest_groove']}")
    print(f"Most Jitter: {comparison['most_jitter']}")
    print(f"Least Jitter: {comparison['least_jitter']}")
    
    # Test 4: Regional swing table
    print("\n4. Regional Swing Comparison Table")
    print(f"{'Region':<18} {'Swing%':<10} {'BPM Range':<15} {'Tightness':<12} {'Jitter(ms)':<12}")
    print("-" * 70)
    for region_data in comparison["regions"]:
        print(f"{region_data['region']:<18} {region_data['swing_offset']*100:<10.1f} "
              f"{str(region_data['bpm_range']):<15} "
              f"{region_data['groove_tightness']:<12.2f} "
              f"{region_data['jitter_ms']:<12.1f}")
    
    # Test 5: Detect regional swing from timing
    print("\n5. Detecting Regional Swing from Timing Sequence")
    # Generate a KZN-style groove
    kzn_groove = generate_regional_groove(SARegion.KZN_DURBAN, bars=2, humanize=False)
    straight_seq = [i * 0.25 for i in range(len(kzn_groove['timing_sequence']))]
    detection = detect_regional_swing(kzn_groove['timing_sequence'], straight_seq)
    print(f"Measured Swing: {detection['measured_swing_offset']*100:.1f}%")
    print(f"Detected Region: {detection['detected_region']}")
    print(f"Confidence: {detection['confidence']:.1f}%")
