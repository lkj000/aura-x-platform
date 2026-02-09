"""
AURA-X Modal Deployment Script
Deploys AI services for music generation, stem separation, and mastering on Modal.com
"""

import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List

# Create Modal app
app = modal.App("aura-x-ai")

# Define GPU image with required dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("pkg-config", "libavformat-dev", "libavcodec-dev", "libavdevice-dev", "libavutil-dev", "libswscale-dev", "libswresample-dev", "libavfilter-dev", "ffmpeg")
    .pip_install(
        "torch==2.1.0",
        "torchaudio==2.1.0",
        "transformers==4.35.0",
        "audiocraft==1.3.0",  # MusicGen
        "demucs==4.0.1",  # Stem separation
        "pydub==0.25.1",
        "librosa==0.10.1",
        "numpy==1.24.3",
        "scipy==1.11.4",
        "pyloudnorm==0.1.1",
        "fastapi==0.104.1",
        "boto3==1.34.0",  # AWS S3 SDK
    )
)

# Volume for model caching
model_volume = modal.Volume.from_name("aura-x-models", create_if_missing=True)

# Request/Response models
class GenerateMusicRequest(BaseModel):
    prompt: str
    duration: int = 30
    temperature: float = 1.0
    top_k: int = 250
    top_p: float = 0.0
    cfg_scale: float = 3.0
    seed: Optional[int] = None
    webhook_url: Optional[str] = None
    generation_id: Optional[int] = None

class SeparateStemsRequest(BaseModel):
    audio_url: str
    model: str = "htdemucs"

class MasterAudioRequest(BaseModel):
    audio_url: str
    target_lufs: float = -14.0
    preset: str = "amapiano"

# Create FastAPI app
web_app = FastAPI(title="AURA-X AI Services")

@web_app.post("/generate_music")
def generate_music_endpoint(request: GenerateMusicRequest):
    """Generate music using MusicGen"""
    request_dict = request.dict()
    webhook_url = request_dict.pop("webhook_url", None)
    generation_id = request_dict.pop("generation_id", None)
    return generate_music.remote(
        request_data=request_dict,
        webhook_url=webhook_url,
        generation_id=generation_id
    )

@web_app.post("/separate_stems")
def separate_stems_endpoint(request: SeparateStemsRequest):
    """Separate audio into stems"""
    return separate_stems.remote(request.dict())

@web_app.post("/master_audio")
def master_audio_endpoint(request: MasterAudioRequest):
    """Master audio"""
    return master_audio.remote(request.dict())

@web_app.get("/health")
def health_endpoint():
    """Health check"""
    return {
        "status": "healthy",
        "service": "AURA-X AI Services",
        "endpoints": [
            "/generate_music",
            "/separate_stems",
            "/master_audio"
        ]
    }

@app.function(
    image=image,
    gpu="A10G",
    timeout=600,
    volumes={"/models": model_volume},
    secrets=[modal.Secret.from_name("aura-x-secrets")],
)
def generate_music(request_data: dict, webhook_url: str = None, generation_id: int = None):
    """
    Generate music using MusicGen model
    """
    print(f"[START] Generation {generation_id} starting with params: {request_data}")
    print(f"[START] Webhook URL: {webhook_url}")
    
    import torch
    from audiocraft.models import MusicGen
    from audiocraft.data.audio import audio_write
    import tempfile
    import base64
    import time
    
    start_time = time.time()
    
    try:
        print(f"[GPU] Checking GPU availability...")
        print(f"[GPU] CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"[GPU] Device count: {torch.cuda.device_count()}")
            print(f"[GPU] Current device: {torch.cuda.current_device()}")
            print(f"[GPU] Device name: {torch.cuda.get_device_name(0)}")
    
        # Set deterministic mode if seed provided
        seed = request_data.get("seed")
        if seed is not None:
            print(f"[SEED] Setting seed: {seed}")
            torch.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
        
        # Load MusicGen model (using small model for faster download)
        print(f"[MODEL] Loading MusicGen model...")
        model_load_start = time.time()
        model = MusicGen.get_pretrained('facebook/musicgen-small', device='cuda')
        model_load_time = time.time() - model_load_start
        print(f"[MODEL] Model loaded in {model_load_time:.2f}s")
    
        # Set generation parameters
        duration = request_data.get("duration", 30)
        temperature = request_data.get("temperature", 1.0)
        top_k = request_data.get("top_k", 250)
        top_p = request_data.get("top_p", 0.0)
        cfg_coef = request_data.get("cfg_scale", 3.0)
        
        print(f"[PARAMS] Duration: {duration}s, Temp: {temperature}, Top-K: {top_k}, Top-P: {top_p}, CFG: {cfg_coef}")
        
        model.set_generation_params(
            duration=duration,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            cfg_coef=cfg_coef,
        )
        
        # Generate music
        prompt = request_data["prompt"]
        print(f"[GENERATE] Starting generation with prompt: {prompt}")
        gen_start = time.time()
        wav = model.generate([prompt], progress=False)
        gen_time = time.time() - gen_start
        print(f"[GENERATE] Generation complete in {gen_time:.2f}s")
    
        # Convert to audio file
        print(f"[AUDIO] Writing audio to temporary file...")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            audio_write(
                tmp_file.name.replace(".wav", ""),
                wav[0].cpu(),
                model.sample_rate,
                strategy="loudness",
                loudness_compressor=True
            )
            print(f"[AUDIO] Audio written to {tmp_file.name}")
        
            # Upload to S3
            import boto3
            import os
            from datetime import datetime
            
            print(f"[AUDIO] Reading audio file...")
            with open(tmp_file.name, "rb") as f:
                audio_bytes = f.read()
            
            print(f"[AUDIO] Successfully generated {len(audio_bytes)} bytes of audio")
        
            # Upload to S3
            print(f"[S3] Initializing S3 client...")
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                region_name=os.environ.get('S3_REGION', 'us-east-1')
            )
            print(f"[S3] S3 client initialized")
        
            # Generate unique S3 key
            timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
            s3_key = f"generated-music/{timestamp}-gen{generation_id or 'test'}.wav"
            bucket_name = os.environ.get('S3_BUCKET', 'aura-x-audio-generation')
            
            print(f"[S3] Uploading to s3://{bucket_name}/{s3_key}")
            upload_start = time.time()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=audio_bytes,
                ContentType='audio/wav',
                ACL='public-read'
            )
            upload_time = time.time() - upload_start
            
            audio_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
            print(f"[S3] Upload complete in {upload_time:.2f}s: {audio_url}")
    
        total_time = time.time() - start_time
        print(f"[COMPLETE] Total processing time: {total_time:.2f}s")
        
        result = {
            "status": "success",
            "audio_url": audio_url,
            "sample_rate": model.sample_rate,
            "duration": request_data.get("duration", 30),
            "seed": seed,
            "processing_time": total_time,
        }
        
        # Call webhook if provided
        if webhook_url and generation_id:
            import requests
            try:
                webhook_payload = {
                    "generationId": generation_id,
                    "jobId": f"modal-{generation_id}",
                    "status": "completed",
                    "audioUrl": audio_url,
                    "processingTime": int(total_time * 1000),  # Convert to milliseconds
                }
                print(f"[WEBHOOK] Calling {webhook_url}")
                print(f"[WEBHOOK] Payload: {webhook_payload}")
                webhook_start = time.time()
                webhook_response = requests.post(webhook_url, json=webhook_payload, timeout=30)
                webhook_time = time.time() - webhook_start
                webhook_response.raise_for_status()
                print(f"[WEBHOOK] Success in {webhook_time:.2f}s: {webhook_response.status_code}")
                print(f"[WEBHOOK] Response: {webhook_response.text}")
            except Exception as e:
                print(f"[WEBHOOK] Failed: {type(e).__name__}: {e}")
                # Don't fail the generation if webhook fails
        
        print(f"[SUCCESS] Generation {generation_id} completed successfully")
        return result
        
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[ERROR] Generation {generation_id} failed: {error_msg}")
        import traceback
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        
        # Call webhook with error status
        if webhook_url and generation_id:
            import requests
            try:
                webhook_payload = {
                    "generationId": generation_id,
                    "jobId": f"modal-{generation_id}",
                    "status": "failed",
                    "errorMessage": error_msg,
                }
                print(f"[WEBHOOK] Calling webhook with error status")
                requests.post(webhook_url, json=webhook_payload, timeout=30)
            except Exception as webhook_error:
                print(f"[WEBHOOK] Failed to send error webhook: {webhook_error}")
        
        raise


@app.function(
    image=image,
    gpu="A10G",
    timeout=600,
    volumes={"/models": model_volume},
)
def separate_stems(request_data: dict):
    """
    Separate audio into stems using Demucs
    """
    import torch
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import torchaudio
    import requests
    import tempfile
    import base64
    from io import BytesIO
    
    # Download audio file
    audio_url = request_data["audio_url"]
    response = requests.get(audio_url, timeout=30)
    response.raise_for_status()
    
    # Load audio
    audio_bytes = BytesIO(response.content)
    waveform, sample_rate = torchaudio.load(audio_bytes)
    
    # Load Demucs model
    model_name = request_data.get("model", "htdemucs")
    model = get_model(model_name)
    model.to('cuda')
    
    # Apply separation
    waveform = waveform.to('cuda')
    sources = apply_model(model, waveform[None], device='cuda')[0]
    
    # sources shape: [stems, channels, samples]
    stem_names = ["drums", "bass", "other", "vocals"]  # htdemucs order
    
    result_stems = {}
    for i, stem_name in enumerate(stem_names):
        # Convert to audio bytes
        stem_audio = sources[i].cpu()
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            torchaudio.save(tmp_file.name, stem_audio, sample_rate)
            
            with open(tmp_file.name, "rb") as f:
                stem_bytes = f.read()
                stem_base64 = base64.b64encode(stem_bytes).decode('utf-8')
                result_stems[stem_name] = stem_base64
    
    return {
        "status": "success",
        "stems": result_stems,
        "sample_rate": sample_rate,
    }


@app.function(
    image=image,
    gpu="T4",
    timeout=300,
    volumes={"/models": model_volume},
)
def master_audio(request_data: dict):
    """
    Master audio with EQ, compression, and loudness normalization
    """
    import torch
    import torchaudio
    import requests
    import tempfile
    import base64
    from io import BytesIO
    import pyloudnorm as pyln
    import numpy as np
    
    # Download audio
    audio_url = request_data["audio_url"]
    response = requests.get(audio_url, timeout=30)
    response.raise_for_status()
    
    # Load audio
    audio_bytes = BytesIO(response.content)
    waveform, sample_rate = torchaudio.load(audio_bytes)
    
    # Convert to numpy for processing
    audio_np = waveform.numpy().T  # [samples, channels]
    
    # Loudness normalization
    target_lufs = request_data.get("target_lufs", -14.0)
    meter = pyln.Meter(sample_rate)
    loudness = meter.integrated_loudness(audio_np)
    
    # Normalize
    normalized_audio = pyln.normalize.loudness(audio_np, loudness, target_lufs)
    
    # Convert back to tensor
    mastered_waveform = torch.from_numpy(normalized_audio.T).float()
    
    # Save to file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        torchaudio.save(tmp_file.name, mastered_waveform, sample_rate)
        
        with open(tmp_file.name, "rb") as f:
            audio_bytes = f.read()
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    
    return {
        "status": "success",
        "audio_base64": audio_base64,
        "sample_rate": sample_rate,
        "lufs_before": float(loudness),
        "lufs_after": float(target_lufs),
    }


# Mount FastAPI app
@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app
