"""
South African Linguistic Alignment System for Amapiano Music Generation

This module provides comprehensive linguistic pattern analysis and rhythm mapping
for all major South African languages and dialects, enabling culturally authentic
music generation that respects the phonetic, tonal, and rhythmic characteristics
of each language.

Supported Languages:
- Zulu (isiZulu)
- Xhosa (isiXhosa) - including click consonants
- Tsonga (Xitsonga)
- Tswana (Setswana)
- Sotho (Sesotho) - North & South variants
- English (South African dialect)
- Afrikaans
- Venda (Tshivenda)
- Ndebele (isiNdebele)
- Swazi (siSwati)

Key Features:
- Phonetic pattern extraction
- Tonal mapping to musical notes
- Syllable stress to rhythm conversion
- Click consonant to percussive element mapping
- Language-specific swing offset calculation
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class SALanguage(Enum):
    """South African languages supported by the system"""
    ZULU = "zulu"
    XHOSA = "xhosa"
    TSONGA = "tsonga"
    TSWANA = "tswana"
    SOTHO_NORTH = "sotho_north"
    SOTHO_SOUTH = "sotho_south"
    ENGLISH_SA = "english_sa"
    AFRIKAANS = "afrikaans"
    VENDA = "venda"
    NDEBELE = "ndebele"
    SWAZI = "swazi"


@dataclass
class LinguisticPattern:
    """Represents linguistic characteristics of a language"""
    language: SALanguage
    syllable_structure: str  # e.g., "CV", "CVC", "CVCV"
    tonal_levels: int  # Number of distinct tones
    stress_pattern: str  # e.g., "penultimate", "final", "initial"
    click_consonants: bool
    vowel_harmony: bool
    typical_tempo_bpm: Tuple[int, int]  # (min, max) BPM range
    swing_offset_percent: float  # Micro-timing offset
    phonetic_density: float  # Syllables per second
    

@dataclass
class RhythmicMapping:
    """Maps linguistic features to musical rhythm"""
    note_sequence: List[int]  # MIDI note numbers
    duration_sequence: List[float]  # Note durations in beats
    velocity_sequence: List[int]  # MIDI velocities (0-127)
    swing_offsets: List[float]  # Micro-timing offsets in ms
    accent_pattern: List[bool]  # Which notes are accented
    

# Linguistic pattern database for each SA language
LINGUISTIC_PATTERNS: Dict[SALanguage, LinguisticPattern] = {
    SALanguage.ZULU: LinguisticPattern(
        language=SALanguage.ZULU,
        syllable_structure="CV",  # Consonant-Vowel (open syllables)
        tonal_levels=2,  # High and low tone
        stress_pattern="penultimate",  # Stress on second-to-last syllable
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(110, 118),
        swing_offset_percent=0.55,  # 55% swing (slightly laid-back)
        phonetic_density=4.5,  # Syllables per second
    ),
    
    SALanguage.XHOSA: LinguisticPattern(
        language=SALanguage.XHOSA,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=True,  # Distinctive feature!
        vowel_harmony=True,
        typical_tempo_bpm=(108, 116),
        swing_offset_percent=0.52,  # Slightly tighter than Zulu
        phonetic_density=4.2,
    ),
    
    SALanguage.TSONGA: LinguisticPattern(
        language=SALanguage.TSONGA,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=False,
        typical_tempo_bpm=(112, 120),
        swing_offset_percent=0.58,  # More relaxed swing
        phonetic_density=4.8,
    ),
    
    SALanguage.TSWANA: LinguisticPattern(
        language=SALanguage.TSWANA,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(110, 116),
        swing_offset_percent=0.54,
        phonetic_density=4.3,
    ),
    
    SALanguage.SOTHO_NORTH: LinguisticPattern(
        language=SALanguage.SOTHO_NORTH,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(108, 114),
        swing_offset_percent=0.53,
        phonetic_density=4.1,
    ),
    
    SALanguage.SOTHO_SOUTH: LinguisticPattern(
        language=SALanguage.SOTHO_SOUTH,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(108, 114),
        swing_offset_percent=0.53,
        phonetic_density=4.0,
    ),
    
    SALanguage.ENGLISH_SA: LinguisticPattern(
        language=SALanguage.ENGLISH_SA,
        syllable_structure="CVC",  # Closed syllables common
        tonal_levels=0,  # Non-tonal (stress-timed)
        stress_pattern="variable",  # Lexical stress
        click_consonants=False,
        vowel_harmony=False,
        typical_tempo_bpm=(112, 120),
        swing_offset_percent=0.50,  # Straight feel
        phonetic_density=3.8,
    ),
    
    SALanguage.AFRIKAANS: LinguisticPattern(
        language=SALanguage.AFRIKAANS,
        syllable_structure="CVC",
        tonal_levels=0,
        stress_pattern="initial",  # Often first syllable
        click_consonants=False,
        vowel_harmony=False,
        typical_tempo_bpm=(114, 122),
        swing_offset_percent=0.48,  # Slightly ahead of the beat
        phonetic_density=3.5,
    ),
    
    SALanguage.VENDA: LinguisticPattern(
        language=SALanguage.VENDA,
        syllable_structure="CV",
        tonal_levels=3,  # High, mid, low tone
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(110, 118),
        swing_offset_percent=0.56,
        phonetic_density=4.6,
    ),
    
    SALanguage.NDEBELE: LinguisticPattern(
        language=SALanguage.NDEBELE,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=True,  # Has clicks like Xhosa
        vowel_harmony=True,
        typical_tempo_bpm=(110, 116),
        swing_offset_percent=0.54,
        phonetic_density=4.4,
    ),
    
    SALanguage.SWAZI: LinguisticPattern(
        language=SALanguage.SWAZI,
        syllable_structure="CV",
        tonal_levels=2,
        stress_pattern="penultimate",
        click_consonants=False,
        vowel_harmony=True,
        typical_tempo_bpm=(110, 118),
        swing_offset_percent=0.55,
        phonetic_density=4.5,
    ),
}


# Click consonant types in Xhosa and Ndebele
CLICK_TYPES = {
    "dental": "c",  # Dental click (like "tsk tsk")
    "lateral": "x",  # Lateral click
    "alveolar": "q",  # Alveolar click
    "palatal": "qh",  # Aspirated palatal click
}


def get_linguistic_pattern(language: SALanguage) -> LinguisticPattern:
    """
    Retrieve linguistic pattern for a given language.
    
    Args:
        language: SALanguage enum value
        
    Returns:
        LinguisticPattern object with language characteristics
    """
    return LINGUISTIC_PATTERNS[language]


def map_tone_to_pitch(tone_level: int, base_pitch: int = 60) -> int:
    """
    Map linguistic tone to MIDI pitch.
    
    Args:
        tone_level: 0 (low), 1 (mid), 2 (high)
        base_pitch: Base MIDI note number (default: C4 = 60)
        
    Returns:
        MIDI note number
    """
    tone_offsets = {
        0: 0,    # Low tone: base pitch
        1: 3,    # Mid tone: +3 semitones (minor third)
        2: 7,    # High tone: +7 semitones (perfect fifth)
    }
    return base_pitch + tone_offsets.get(tone_level, 0)


def map_syllable_to_rhythm(
    syllable_count: int,
    language: SALanguage,
    bars: int = 4
) -> RhythmicMapping:
    """
    Convert syllable count and language characteristics to rhythmic pattern.
    
    Args:
        syllable_count: Number of syllables in the phrase
        language: SALanguage enum value
        bars: Number of bars to distribute syllables across
        
    Returns:
        RhythmicMapping object with note sequence, durations, velocities
    """
    pattern = get_linguistic_pattern(language)
    steps_per_bar = 16  # 16th notes
    total_steps = bars * steps_per_bar
    
    # Distribute syllables evenly across the bars
    step_interval = total_steps // syllable_count if syllable_count > 0 else total_steps
    
    note_sequence = []
    duration_sequence = []
    velocity_sequence = []
    swing_offsets = []
    accent_pattern = []
    
    base_pitch = 60  # C4
    
    for i in range(syllable_count):
        step_position = i * step_interval
        
        # Map tone to pitch (for tonal languages)
        if pattern.tonal_levels > 0:
            tone = i % pattern.tonal_levels
            pitch = map_tone_to_pitch(tone, base_pitch)
        else:
            pitch = base_pitch
        
        # Duration based on syllable structure
        if pattern.syllable_structure == "CV":
            duration = 0.5  # Shorter, open syllables
        else:
            duration = 0.75  # Longer, closed syllables
        
        # Velocity based on stress pattern
        is_stressed = False
        if pattern.stress_pattern == "penultimate" and i == syllable_count - 2:
            is_stressed = True
        elif pattern.stress_pattern == "final" and i == syllable_count - 1:
            is_stressed = True
        elif pattern.stress_pattern == "initial" and i == 0:
            is_stressed = True
        
        velocity = 100 if is_stressed else 70
        
        # Swing offset based on language
        swing_ms = pattern.swing_offset_percent * 100  # Convert to milliseconds
        
        note_sequence.append(pitch)
        duration_sequence.append(duration)
        velocity_sequence.append(velocity)
        swing_offsets.append(swing_ms)
        accent_pattern.append(is_stressed)
    
    return RhythmicMapping(
        note_sequence=note_sequence,
        duration_sequence=duration_sequence,
        velocity_sequence=velocity_sequence,
        swing_offsets=swing_offsets,
        accent_pattern=accent_pattern,
    )


def detect_click_consonants(text: str, language: SALanguage) -> List[int]:
    """
    Detect click consonants in text and return their positions.
    
    Args:
        text: Input text in the specified language
        language: SALanguage enum value
        
    Returns:
        List of character positions where clicks occur
    """
    pattern = get_linguistic_pattern(language)
    
    if not pattern.click_consonants:
        return []
    
    click_positions = []
    for i, char in enumerate(text.lower()):
        if char in CLICK_TYPES.values():
            click_positions.append(i)
    
    return click_positions


def map_clicks_to_percussion(
    click_positions: List[int],
    total_length: int,
    percussion_note: int = 42  # MIDI note for closed hi-hat
) -> List[Tuple[float, int]]:
    """
    Map click consonant positions to percussive hits.
    
    Args:
        click_positions: List of character positions with clicks
        total_length: Total length of the text
        percussion_note: MIDI note number for percussion
        
    Returns:
        List of (time_position, note_number) tuples
    """
    percussion_hits = []
    
    for pos in click_positions:
        # Normalize position to 0-1 range
        normalized_pos = pos / total_length if total_length > 0 else 0
        percussion_hits.append((normalized_pos, percussion_note))
    
    return percussion_hits


def calculate_linguistic_authenticity(
    generated_rhythm: RhythmicMapping,
    expected_language: SALanguage
) -> Dict[str, float]:
    """
    Score the linguistic authenticity of a generated rhythm.
    
    Args:
        generated_rhythm: RhythmicMapping object
        expected_language: Expected SALanguage
        
    Returns:
        Dictionary with authenticity scores
    """
    pattern = get_linguistic_pattern(expected_language)
    
    # 1. Swing offset accuracy
    expected_swing = pattern.swing_offset_percent * 100
    actual_swing = np.mean(generated_rhythm.swing_offsets) if generated_rhythm.swing_offsets else 0
    swing_accuracy = 100 - abs(expected_swing - actual_swing)
    swing_accuracy = max(0, min(100, swing_accuracy))
    
    # 2. Syllable density accuracy
    note_density = len(generated_rhythm.note_sequence) / 4  # Per bar
    expected_density = pattern.phonetic_density
    density_accuracy = 100 - abs(expected_density - note_density) * 10
    density_accuracy = max(0, min(100, density_accuracy))
    
    # 3. Stress pattern accuracy
    accent_count = sum(generated_rhythm.accent_pattern)
    expected_accents = len(generated_rhythm.accent_pattern) // 4  # Rough estimate
    stress_accuracy = 100 - abs(expected_accents - accent_count) * 20
    stress_accuracy = max(0, min(100, stress_accuracy))
    
    # Overall score
    overall_score = (swing_accuracy * 0.4 + density_accuracy * 0.3 + stress_accuracy * 0.3)
    
    return {
        "swing_accuracy": round(swing_accuracy, 2),
        "density_accuracy": round(density_accuracy, 2),
        "stress_accuracy": round(stress_accuracy, 2),
        "overall_linguistic_authenticity": round(overall_score, 2),
        "language": expected_language.value,
        "grade": get_grade(overall_score),
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


# Example usage and testing
if __name__ == "__main__":
    import json
    
    print("South African Linguistic Alignment System")
    print("=" * 60)
    
    # Test 1: Zulu linguistic pattern
    print("\n1. Testing Zulu Linguistic Pattern")
    zulu_pattern = get_linguistic_pattern(SALanguage.ZULU)
    print(f"Language: {zulu_pattern.language.value}")
    print(f"Syllable Structure: {zulu_pattern.syllable_structure}")
    print(f"Tonal Levels: {zulu_pattern.tonal_levels}")
    print(f"Swing Offset: {zulu_pattern.swing_offset_percent * 100}%")
    print(f"Typical BPM Range: {zulu_pattern.typical_tempo_bpm}")
    
    # Test 2: Map Zulu syllables to rhythm
    print("\n2. Mapping Zulu Syllables to Rhythm")
    zulu_rhythm = map_syllable_to_rhythm(
        syllable_count=8,
        language=SALanguage.ZULU,
        bars=2
    )
    print(f"Note Sequence: {zulu_rhythm.note_sequence}")
    print(f"Duration Sequence: {zulu_rhythm.duration_sequence}")
    print(f"Velocity Sequence: {zulu_rhythm.velocity_sequence}")
    print(f"Swing Offsets (ms): {zulu_rhythm.swing_offsets}")
    print(f"Accent Pattern: {zulu_rhythm.accent_pattern}")
    
    # Test 3: Xhosa with click consonants
    print("\n3. Testing Xhosa with Click Consonants")
    xhosa_text = "iqaqa lixelele uqhoqhoqho"  # Example with clicks
    click_positions = detect_click_consonants(xhosa_text, SALanguage.XHOSA)
    print(f"Text: {xhosa_text}")
    print(f"Click Positions: {click_positions}")
    
    percussion_hits = map_clicks_to_percussion(click_positions, len(xhosa_text))
    print(f"Percussion Hits (time, note): {percussion_hits}")
    
    # Test 4: Linguistic authenticity scoring
    print("\n4. Linguistic Authenticity Scoring")
    authenticity = calculate_linguistic_authenticity(zulu_rhythm, SALanguage.ZULU)
    print(json.dumps(authenticity, indent=2))
    
    # Test 5: Compare all languages
    print("\n5. Comparing All SA Languages")
    print(f"{'Language':<15} {'Swing%':<10} {'BPM Range':<15} {'Clicks':<8} {'Tones':<8}")
    print("-" * 60)
    for lang in SALanguage:
        pattern = get_linguistic_pattern(lang)
        print(f"{lang.value:<15} {pattern.swing_offset_percent*100:<10.1f} "
              f"{str(pattern.typical_tempo_bpm):<15} "
              f"{'Yes' if pattern.click_consonants else 'No':<8} "
              f"{pattern.tonal_levels:<8}")
