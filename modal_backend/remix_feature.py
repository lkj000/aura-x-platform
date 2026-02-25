"""
Remix Feature - Level 5 Implementation

Real audio remix implementation for rearranging stems with:
- Stem rearrangement (drag-drop timeline)
- Stem effects (reverb, delay, filter, distortion)
- Stem volume/pan controls
- Quantized editing (snap to beat grid)
- AI-suggested variations

Based on settings.py specification for Level-5 autonomous features.
"""

import subprocess
import tempfile
import os
import json
from typing import Dict, Any, List, Tuple
import random


class StemSegment:
    """Represents a stem segment on the timeline"""
    def __init__(
        self,
        stem_type: str,  # vocals, drums, bass, other
        start_time: float,
        end_time: float,
        volume: float = 1.0,
        pan: float = 0.0,  # -1.0 (left) to 1.0 (right)
        effects: List[Dict[str, Any]] = None
    ):
        self.stem_type = stem_type
        self.start_time = start_time
        self.end_time = end_time
        self.volume = volume
        self.pan = pan
        self.effects = effects or []
    
    def duration(self) -> float:
        return self.end_time - self.start_time


def apply_stem_effects(
    stem_path: str,
    output_path: str,
    effects: List[Dict[str, Any]]
) -> None:
    """
    Apply audio effects to a stem
    
    Supported effects:
    - reverb: {type: "reverb", wet: 0.3, room_size: 0.5}
    - delay: {type: "delay", delay_ms: 500, feedback: 0.4}
    - filter: {type: "filter", filter_type: "highpass", freq: 200}
    - distortion: {type: "distortion", gain: 5}
    """
    filter_chain = []
    
    for effect in effects:
        effect_type = effect.get("type")
        
        if effect_type == "reverb":
            # Use FFmpeg's freeverb filter
            wet = effect.get("wet", 0.3)
            room_size = effect.get("room_size", 0.5)
            filter_chain.append(f"afreqshift=shift=0,aecho=0.8:0.9:{int(room_size*1000)}:{wet}")
        
        elif effect_type == "delay":
            delay_ms = effect.get("delay_ms", 500)
            feedback = effect.get("feedback", 0.4)
            filter_chain.append(f"aecho=1.0:{feedback}:{delay_ms}:0.5")
        
        elif effect_type == "filter":
            filter_type = effect.get("filter_type", "highpass")
            freq = effect.get("freq", 200)
            if filter_type == "highpass":
                filter_chain.append(f"highpass=f={freq}")
            elif filter_type == "lowpass":
                filter_chain.append(f"lowpass=f={freq}")
            elif filter_type == "bandpass":
                filter_chain.append(f"bandpass=f={freq}:width_type=h:w=200")
        
        elif effect_type == "distortion":
            gain = effect.get("gain", 5)
            filter_chain.append(f"afftfilt=real='hypot(re,im)*{gain}':imag='hypot(re,im)*{gain}'")
    
    if not filter_chain:
        # No effects, just copy
        subprocess.run(["cp", stem_path, output_path], check=True)
        return
    
    filter_complex = ",".join(filter_chain)
    
    cmd = [
        "ffmpeg",
        "-i", stem_path,
        "-af", filter_complex,
        "-ar", "44100",
        "-ac", "2",
        "-c:a", "pcm_s16le",
        "-y",
        output_path
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)


def quantize_to_beat_grid(
    time: float,
    bpm: float,
    beats_per_bar: int = 4
) -> float:
    """
    Snap time to nearest beat on the grid
    
    Args:
        time: Time in seconds
        bpm: Beats per minute
        beats_per_bar: Beats per bar (4 for 4/4 time)
    
    Returns:
        Quantized time in seconds
    """
    beat_duration = 60.0 / bpm
    beat_number = round(time / beat_duration)
    return beat_number * beat_duration


def create_remix_from_timeline(
    stems: Dict[str, str],  # {vocals: path, drums: path, ...}
    timeline: List[StemSegment],
    output_path: str,
    bpm: float,
    quantize: bool = True
) -> Dict[str, Any]:
    """
    Create remix by arranging stems on a timeline
    
    Args:
        stems: Dict of stem paths
        timeline: List of stem segments
        output_path: Output remix file
        bpm: Track BPM for quantization
        quantize: Snap segments to beat grid
    
    Returns:
        Remix metadata
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Process each segment
        processed_segments = []
        
        for idx, segment in enumerate(timeline):
            stem_path = stems.get(segment.stem_type)
            if not stem_path:
                continue
            
            # Quantize times if requested
            start_time = segment.start_time
            end_time = segment.end_time
            
            if quantize:
                start_time = quantize_to_beat_grid(start_time, bpm)
                end_time = quantize_to_beat_grid(end_time, bpm)
            
            # Extract segment from stem
            segment_path = os.path.join(tmpdir, f"segment_{idx}_raw.wav")
            cmd = [
                "ffmpeg",
                "-i", stem_path,
                "-ss", str(start_time),
                "-to", str(end_time),
                "-c:a", "pcm_s16le",
                "-y",
                segment_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Apply effects
            if segment.effects:
                effects_path = os.path.join(tmpdir, f"segment_{idx}_fx.wav")
                apply_stem_effects(segment_path, effects_path, segment.effects)
                segment_path = effects_path
            
            # Apply volume and pan
            volume_pan_path = os.path.join(tmpdir, f"segment_{idx}_final.wav")
            pan_filter = f"pan=stereo|c0={1-segment.pan}*c0|c1={1+segment.pan}*c1" if segment.pan != 0 else None
            volume_filter = f"volume={segment.volume}"
            
            filter_parts = [volume_filter]
            if pan_filter:
                filter_parts.append(pan_filter)
            
            filter_complex = ",".join(filter_parts)
            
            cmd = [
                "ffmpeg",
                "-i", segment_path,
                "-af", filter_complex,
                "-c:a", "pcm_s16le",
                "-y",
                volume_pan_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            processed_segments.append({
                "path": volume_pan_path,
                "start_time": start_time,
                "end_time": end_time,
                "stem_type": segment.stem_type,
            })
        
        # Mix all segments with proper timing
        # Build FFmpeg filter complex for timeline mixing
        
        filter_parts = []
        for idx, seg in enumerate(processed_segments):
            # Delay segment to correct position
            delay_ms = int(seg["start_time"] * 1000)
            filter_parts.append(
                f"[{idx}:a]adelay={delay_ms}|{delay_ms}[seg{idx}]"
            )
        
        # Mix all segments
        mix_inputs = "".join([f"[seg{i}]" for i in range(len(processed_segments))])
        filter_parts.append(
            f"{mix_inputs}amix=inputs={len(processed_segments)}:duration=longest[out]"
        )
        
        filter_complex = ";".join(filter_parts)
        
        # Build FFmpeg command
        cmd = ["ffmpeg"]
        for seg in processed_segments:
            cmd.extend(["-i", seg["path"]])
        
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            "-ar", "44100",
            "-ac", "2",
            "-y",
            output_path
        ])
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        # Get final duration
        duration = get_audio_duration(output_path)
        
        return {
            "duration": duration,
            "segment_count": len(processed_segments),
            "quantized": quantize,
            "timeline": [
                {
                    "stem_type": seg["stem_type"],
                    "start_time": seg["start_time"],
                    "end_time": seg["end_time"],
                }
                for seg in processed_segments
            ],
        }


def generate_ai_remix_suggestions(
    stems: Dict[str, str],
    original_duration: float,
    bpm: float,
    beats: List[float]
) -> List[List[StemSegment]]:
    """
    Generate AI-suggested remix variations
    
    Strategy:
    - Variation 1: Intro build (drums → bass → other → vocals)
    - Variation 2: Drop focus (heavy drums/bass, minimal vocals)
    - Variation 3: Breakdown (vocals + minimal drums)
    
    Returns:
        List of timeline variations
    """
    variations = []
    
    # Variation 1: Progressive build
    build_timeline = []
    section_duration = original_duration / 4
    
    # Section 1: Drums only
    build_timeline.append(StemSegment(
        "drums", 0, section_duration,
        volume=0.8, effects=[{"type": "filter", "filter_type": "highpass", "freq": 100}]
    ))
    
    # Section 2: Drums + Bass
    build_timeline.append(StemSegment(
        "drums", section_duration, section_duration * 2, volume=0.9
    ))
    build_timeline.append(StemSegment(
        "bass", section_duration, section_duration * 2, volume=0.7
    ))
    
    # Section 3: Add other
    build_timeline.append(StemSegment(
        "drums", section_duration * 2, section_duration * 3, volume=1.0
    ))
    build_timeline.append(StemSegment(
        "bass", section_duration * 2, section_duration * 3, volume=0.8
    ))
    build_timeline.append(StemSegment(
        "other", section_duration * 2, section_duration * 3, volume=0.6
    ))
    
    # Section 4: Full mix
    for stem in ["drums", "bass", "other", "vocals"]:
        build_timeline.append(StemSegment(
            stem, section_duration * 3, original_duration, volume=1.0
        ))
    
    variations.append(build_timeline)
    
    # Variation 2: Drop-focused (heavy low end)
    drop_timeline = []
    for stem in ["drums", "bass"]:
        drop_timeline.append(StemSegment(
            stem, 0, original_duration, volume=1.2
        ))
    drop_timeline.append(StemSegment(
        "other", 0, original_duration, volume=0.4
    ))
    drop_timeline.append(StemSegment(
        "vocals", 0, original_duration, volume=0.3,
        effects=[{"type": "delay", "delay_ms": 500, "feedback": 0.5}]
    ))
    
    variations.append(drop_timeline)
    
    # Variation 3: Breakdown (vocals + minimal percussion)
    breakdown_timeline = []
    breakdown_timeline.append(StemSegment(
        "vocals", 0, original_duration, volume=1.0,
        effects=[{"type": "reverb", "wet": 0.4, "room_size": 0.7}]
    ))
    breakdown_timeline.append(StemSegment(
        "drums", 0, original_duration, volume=0.3,
        effects=[{"type": "filter", "filter_type": "highpass", "freq": 500}]
    ))
    
    variations.append(breakdown_timeline)
    
    return variations


def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using FFprobe"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


if __name__ == "__main__":
    print("Remix Feature - Level 5 Implementation")
    print("Ready for Modal integration")
