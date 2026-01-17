"""
Euclidean Rhythm Generation for Amapiano Patterns
Level 5 Autonomous Music Generation Platform

Based on Bjorklund's algorithm for maximal evenness distribution.
Used to generate culturally authentic Amapiano log drum patterns.

References:
- Bjorklund, E. (2003). "The Theory of Rep-Rate Pattern Generation in the SNS Timing System"
- Toussaint, G. (2013). "The Geometry of Musical Rhythm"
"""

import numpy as np
from typing import List, Tuple, Dict
import json


def bjorklund_algorithm(k: int, n: int) -> List[int]:
    """
    Generate Euclidean rhythm pattern E(k,n) using Bjorklund's algorithm.
    
    This algorithm distributes k pulses as evenly as possible over n steps,
    creating "maximal evenness" patterns found in traditional African and
    Afro-Cuban rhythms.
    
    Args:
        k: Number of hits (pulses)
        n: Total number of steps
        
    Returns:
        Binary list where 1 = hit, 0 = rest
        
    Example:
        >>> bjorklund_algorithm(5, 16)
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]
    """
    if k == 0:
        return [0] * n
    if k >= n:
        return [1] * n
    
    # Initialize pattern with k ones and (n-k) zeros
    pattern = [[1]] * k + [[0]] * (n - k)
    
    # Bjorklund's recursive distribution
    while len(set(map(tuple, pattern))) > 1:
        # Count occurrences of each unique sub-pattern
        counts = {}
        for p in pattern:
            key = tuple(p)
            counts[key] = counts.get(key, 0) + 1
        
        # Find the two most common patterns
        sorted_patterns = sorted(counts.items(), key=lambda x: -x[1])
        if len(sorted_patterns) < 2:
            break
            
        first_pattern, first_count = sorted_patterns[0]
        second_pattern, second_count = sorted_patterns[1]
        
        # Distribute second pattern among first pattern
        min_count = min(first_count, second_count)
        
        new_pattern = []
        first_used = 0
        second_used = 0
        
        for p in pattern:
            if tuple(p) == first_pattern and first_used < min_count:
                new_pattern.append(list(first_pattern) + list(second_pattern))
                first_used += 1
                second_used += 1
            elif tuple(p) == first_pattern:
                new_pattern.append(list(first_pattern))
            elif tuple(p) == second_pattern and second_used < second_count:
                new_pattern.append(list(second_pattern))
                second_used += 1
        
        pattern = new_pattern
    
    # Flatten the pattern
    result = []
    for p in pattern:
        result.extend(p)
    
    return result[:n]


def generate_amapiano_pattern(
    pattern_type: str = "classic",
    custom_k: int = None,
    custom_n: int = None
) -> Dict:
    """
    Generate Amapiano rhythm patterns based on predefined types or custom values.
    
    Args:
        pattern_type: One of "sparse", "classic", "intense", "docking", or "custom"
        custom_k: Custom number of hits (required if pattern_type="custom")
        custom_n: Custom number of steps (required if pattern_type="custom")
        
    Returns:
        Dictionary with pattern data and metadata
    """
    # Predefined Amapiano patterns
    patterns = {
        "sparse": (3, 16),      # E(3,16) - Sparse, space-like feel
        "classic": (5, 16),     # E(5,16) - Classic Amapiano foundation
        "moderate": (7, 16),    # E(7,16) - Moderate intensity
        "intense": (9, 16),     # E(9,16) - High-intensity Sgija
        "docking": (11, 16),    # E(11,16) - "Docking scene" maximum energy
    }
    
    if pattern_type == "custom":
        if custom_k is None or custom_n is None:
            raise ValueError("custom_k and custom_n required for custom pattern")
        k, n = custom_k, custom_n
        description = f"Custom E({k},{n}) pattern"
    elif pattern_type in patterns:
        k, n = patterns[pattern_type]
        description = f"{pattern_type.capitalize()} Amapiano pattern E({k},{n})"
    else:
        raise ValueError(f"Unknown pattern_type: {pattern_type}")
    
    # Generate the pattern
    pattern = bjorklund_algorithm(k, n)
    
    # Calculate pattern metrics
    density = (k / n) * 100
    off_beat_hits = sum(pattern[i] for i in range(1, min(len(pattern), n), 2))
    syncopation = (off_beat_hits / k) * 100 if k > 0 else 0
    
    return {
        "pattern": pattern,
        "k": k,
        "n": n,
        "type": pattern_type,
        "description": description,
        "density": round(density, 2),
        "syncopation": round(syncopation, 2),
        "has_gasp": pattern[8] == 0 if n >= 9 else False,  # Check for "Amapiano Gasp"
    }


def calculate_swing_offset(pattern: List[int], swing_percentage: float = 10.0) -> List[Tuple[int, float]]:
    """
    Calculate timing offsets for "soulful swing" effect.
    
    Amapiano requires 8-12% swing offset for authentic "soulful" feel.
    
    Args:
        pattern: Binary rhythm pattern
        swing_percentage: Swing amount (8-12% for authentic Amapiano)
        
    Returns:
        List of (step_index, time_offset) tuples
    """
    offsets = []
    for i, hit in enumerate(pattern):
        if hit == 1:
            # Apply swing to off-beats (odd indices)
            if i % 2 == 1:
                offset = swing_percentage / 100.0
            else:
                offset = 0.0
            offsets.append((i, offset))
    
    return offsets


def pattern_to_midi_notes(
    pattern: List[int],
    base_note: int = 41,  # F1 for log drum
    velocity: int = 110,
    swing: float = 10.0
) -> List[Dict]:
    """
    Convert Euclidean pattern to MIDI note data.
    
    Args:
        pattern: Binary rhythm pattern
        base_note: MIDI note number (41=F1 for log drum)
        velocity: MIDI velocity (0-127)
        swing: Swing percentage (8-12% for Amapiano)
        
    Returns:
        List of MIDI note events with timing
    """
    notes = []
    swing_offsets = calculate_swing_offset(pattern, swing)
    
    for step, hit in enumerate(pattern):
        if hit == 1:
            # Find swing offset for this step
            offset = next((o for i, o in swing_offsets if i == step), 0.0)
            
            # Calculate timing (in 16th notes)
            time = step + offset
            
            notes.append({
                "note": base_note,
                "velocity": velocity,
                "time": time,
                "duration": 0.5,  # 16th note duration
            })
    
    return notes


def generate_interstellar_amapiano_sequence() -> Dict:
    """
    Generate the complete "Interstellar Amapiano" sequence as described in the critique.
    
    This creates the F→G→A progression with proper log drum patterns,
    including the signature "Amapiano Gasp" on bar 3.
    
    Returns:
        Dictionary with complete 4-bar sequence
    """
    # Bar 1: F chord (Fmaj7)
    bar1_pattern = bjorklund_algorithm(5, 16)
    bar1_notes = pattern_to_midi_notes(bar1_pattern, base_note=41, velocity=110)  # F1
    
    # Bar 2: G chord (G6)
    bar2_pattern = bjorklund_algorithm(5, 16)
    bar2_notes = pattern_to_midi_notes(bar2_pattern, base_note=43, velocity=110)  # G1
    
    # Bar 3: A chord (Am) with "Gasp"
    bar3_pattern = [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]  # Starts with silence
    bar3_notes = pattern_to_midi_notes(bar3_pattern, base_note=45, velocity=110)  # A1
    
    # Bar 4: Turnaround with rapid roll
    bar4_pattern = [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1]  # Intense roll
    bar4_notes = pattern_to_midi_notes(bar4_pattern, base_note=45, velocity=120)  # A1 louder
    
    return {
        "title": "Interstellar Amapiano Sequence",
        "description": "4-bar F→G→A progression with log drum patterns",
        "bpm": 115,
        "bars": [
            {"bar": 1, "chord": "Fmaj7", "pattern": bar1_pattern, "notes": bar1_notes},
            {"bar": 2, "chord": "G6", "pattern": bar2_pattern, "notes": bar2_notes},
            {"bar": 3, "chord": "Am", "pattern": bar3_pattern, "notes": bar3_notes, "has_gasp": True},
            {"bar": 4, "chord": "Turnaround", "pattern": bar4_pattern, "notes": bar4_notes},
        ],
        "total_notes": len(bar1_notes) + len(bar2_notes) + len(bar3_notes) + len(bar4_notes),
    }


def visualize_pattern_ascii(pattern: List[int], label: str = "") -> str:
    """
    Create ASCII visualization of rhythm pattern.
    
    Args:
        pattern: Binary rhythm pattern
        label: Optional label for the pattern
        
    Returns:
        ASCII art string
    """
    visual = []
    if label:
        visual.append(f"\n{label}")
        visual.append("=" * len(label))
    
    # Pattern visualization
    visual.append("".join(["█" if hit else "·" for hit in pattern]))
    
    # Beat markers
    visual.append("".join([str(i % 10) for i in range(len(pattern))]))
    
    # Bar markers (every 4 steps)
    bar_markers = "".join(["|" if i % 4 == 0 else " " for i in range(len(pattern))])
    visual.append(bar_markers)
    
    return "\n".join(visual)


# Example usage and testing
if __name__ == "__main__":
    print("Euclidean Rhythm Generation for Amapiano\n")
    
    # Generate classic patterns
    for pattern_type in ["sparse", "classic", "moderate", "intense", "docking"]:
        result = generate_amapiano_pattern(pattern_type)
        print(visualize_pattern_ascii(result["pattern"], result["description"]))
        print(f"Density: {result['density']}% | Syncopation: {result['syncopation']}% | Gasp: {result['has_gasp']}\n")
    
    # Generate Interstellar sequence
    print("\n" + "="*60)
    sequence = generate_interstellar_amapiano_sequence()
    print(f"\n{sequence['title']}")
    print(f"{sequence['description']}")
    print(f"BPM: {sequence['bpm']} | Total Notes: {sequence['total_notes']}\n")
    
    for bar in sequence['bars']:
        print(visualize_pattern_ascii(bar['pattern'], f"Bar {bar['bar']}: {bar['chord']}"))
        if bar.get('has_gasp'):
            print("⚠️  Contains 'Amapiano Gasp' (silence on beat 1)")
        print()
