"""
AURA-X Modal Backend - AI Music Generation & Stem Separation
Implements MusicGen for music generation and Demucs for stem separation
"""

import modal
import os
from pathlib import Path

# Create Modal app
app = modal.App("aura-x-ai-music")

# Define container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.1.0",
        "torchaudio==2.1.0",
        "audiocraft==1.3.0",  # Meta's MusicGen
        "demucs==4.0.1",  # Stem separation
        "boto3==1.34.0",  # S3 upload
        "numpy==1.26.0",
        "scipy==1.11.0",
    )
)

# S3 configuration from environment
S3_BUCKET = os.environ.get("S3_BUCKET", "aura-x-generations")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")


@app.function(
    image=image,
    gpu="T4",  # NVIDIA T4 for inference
    timeout=600,  # 10 minutes max
    memory=16384,  # 16GB RAM
)
def generate_music(
    prompt: str,
    lyrics: str | None = None,
    duration: int = 30,
    bpm: int | None = None,
    key: str | None = None,
    mood: str | None = None,
    vocal_style: str | None = None,
    temperature: float = 1.0,
    top_k: int = 250,
    top_p: float = 0.0,
    cfg_coef: float = 3.0,
) -> dict:
    """
    Generate music using Meta's MusicGen model
    
    Args:
        prompt: Text description of the music
        lyrics: Optional lyrics to condition the generation
        duration: Length in seconds (max 30s for medium model)
        bpm: Target BPM (will be added to prompt)
        key: Musical key (will be added to prompt)
        mood: Mood descriptor (will be added to prompt)
        vocal_style: Vocal characteristics (will be added to prompt)
        temperature: Sampling temperature (higher = more random)
        top_k: Top-k sampling parameter
        top_p: Top-p (nucleus) sampling parameter
        cfg_coef: Classifier-free guidance coefficient
    
    Returns:
        dict with 'audio_url', 'duration', 'sample_rate'
    """
    import torch
    from audiocraft.models import MusicGen
    from audiocraft.data.audio import audio_write
    import boto3
    import tempfile
    from pathlib import Path
    
    print(f"[MusicGen] Starting generation with prompt: {prompt}")
    
    # Load MusicGen model (medium quality, 1.5B parameters)
    model = MusicGen.get_pretrained('facebook/musicgen-medium')
    
    # Configure generation parameters
    model.set_generation_params(
        duration=min(duration, 30),  # Cap at 30s for medium model
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        cfg_coef=cfg_coef,
    )
    
    # Enhance prompt with musical parameters
    enhanced_prompt = prompt
    if bpm:
        enhanced_prompt += f", {bpm} BPM"
    if key:
        enhanced_prompt += f", in {key}"
    if mood:
        enhanced_prompt += f", {mood} mood"
    if vocal_style and lyrics:
        enhanced_prompt += f", {vocal_style} vocals"
    
    # Add Amapiano-specific characteristics if mentioned
    if "amapiano" in prompt.lower():
        enhanced_prompt += ", log drum, percussive bassline, jazz-influenced chords, South African house"
    
    print(f"[MusicGen] Enhanced prompt: {enhanced_prompt}")
    
    # Generate audio
    with torch.no_grad():
        wav = model.generate([enhanced_prompt])
    
    # Save to temporary file
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = Path(tmpdir) / "generated"
        audio_write(
            output_path,
            wav[0].cpu(),
            model.sample_rate,
            strategy="loudness",
            loudness_compressor=True,
        )
        
        # Upload to S3
        s3_client = boto3.client(
            's3',
            region_name=S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
        
        audio_file = f"{output_path}.wav"
        s3_key = f"generations/{prompt[:50].replace(' ', '-')}-{int(torch.rand(1).item() * 10000)}.wav"
        
        print(f"[MusicGen] Uploading to S3: {s3_key}")
        s3_client.upload_file(audio_file, S3_BUCKET, s3_key)
        
        audio_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
        
        return {
            "audio_url": audio_url,
            "duration": duration,
            "sample_rate": model.sample_rate,
            "prompt": enhanced_prompt,
        }


@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    memory=16384,
)
def separate_stems(
    audio_url: str,
    stem_types: list[str] | None = None,
) -> dict:
    """
    Separate audio into stems using Demucs
    
    Args:
        audio_url: URL of the audio file to separate
        stem_types: Types of stems to extract (default: ['drums', 'bass', 'vocals', 'other'])
    
    Returns:
        dict with 'stems' list containing {type, url} for each stem
    """
    import torch
    import torchaudio
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import boto3
    import tempfile
    import requests
    from pathlib import Path
    
    print(f"[Demucs] Starting stem separation for: {audio_url}")
    
    # Default stem types
    if stem_types is None:
        stem_types = ['drums', 'bass', 'vocals', 'other']
    
    # Load Demucs model (htdemucs_ft - fine-tuned hybrid transformer)
    model = get_model('htdemucs_ft')
    model.eval()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Download audio file
        audio_path = Path(tmpdir) / "input.wav"
        print(f"[Demucs] Downloading audio from {audio_url}")
        response = requests.get(audio_url)
        audio_path.write_bytes(response.content)
        
        # Load audio
        wav, sr = torchaudio.load(str(audio_path))
        
        # Resample to 44.1kHz if needed (Demucs requirement)
        if sr != 44100:
            resampler = torchaudio.transforms.Resample(sr, 44100)
            wav = resampler(wav)
            sr = 44100
        
        # Ensure stereo
        if wav.shape[0] == 1:
            wav = wav.repeat(2, 1)
        
        # Separate stems
        print("[Demucs] Running separation...")
        with torch.no_grad():
            sources = apply_model(model, wav.unsqueeze(0), device='cuda' if torch.cuda.is_available() else 'cpu')[0]
        
        # Demucs outputs: [drums, bass, other, vocals]
        stem_mapping = {
            'drums': 0,
            'bass': 1,
            'other': 2,
            'vocals': 3,
        }
        
        # Upload stems to S3
        s3_client = boto3.client(
            's3',
            region_name=S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
        
        stems = []
        for stem_type in stem_types:
            if stem_type not in stem_mapping:
                continue
            
            stem_idx = stem_mapping[stem_type]
            stem_audio = sources[stem_idx]
            
            # Save stem
            stem_path = Path(tmpdir) / f"{stem_type}.wav"
            torchaudio.save(str(stem_path), stem_audio.cpu(), sr)
            
            # Upload to S3
            s3_key = f"stems/{audio_url.split('/')[-1].replace('.wav', '')}/{stem_type}.wav"
            print(f"[Demucs] Uploading {stem_type} stem to S3: {s3_key}")
            s3_client.upload_file(str(stem_path), S3_BUCKET, s3_key)
            
            stem_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
            stems.append({
                "type": stem_type,
                "url": stem_url,
            })
        
        print(f"[Demucs] Separation complete. Generated {len(stems)} stems")
        return {"stems": stems}


@app.local_entrypoint()
def main():
    """Test the functions locally"""
    # Test music generation
    result = generate_music.remote(
        prompt="Upbeat Amapiano track with log drums and jazzy piano",
        duration=15,
        bpm=112,
        key="F minor",
        mood="energetic",
    )
    print("Generation result:", result)
    
    # Test stem separation
    if result.get("audio_url"):
        stems_result = separate_stems.remote(
            audio_url=result["audio_url"],
        )
        print("Stem separation result:", stems_result)
