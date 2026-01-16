# Modal Backend Deployment Guide

This guide explains how to deploy the AURA-X AI music generation backend to Modal.com.

## Prerequisites

1. **Modal Account**: Sign up at [modal.com](https://modal.com)
2. **Python 3.11+**: Required for Modal CLI
3. **S3 Bucket**: For storing generated audio files

## Step 1: Install Modal CLI

```bash
pip install modal
```

## Step 2: Authenticate with Modal

```bash
modal token new
```

This will open a browser window to authenticate. Follow the prompts to link your Modal account.

## Step 3: Configure Environment Variables

Modal needs access to your S3 bucket for storing generated audio. Set these secrets in Modal:

```bash
modal secret create aura-x-s3 \
  AWS_ACCESS_KEY_ID=your_access_key \
  AWS_SECRET_ACCESS_KEY=your_secret_key \
  S3_BUCKET=your_bucket_name \
  S3_REGION=us-east-1
```

## Step 4: Deploy the Modal App

From the project root directory:

```bash
modal deploy modal_app.py
```

This will:
- Build the container image with PyTorch, MusicGen, and Demucs
- Deploy the `generate_music` and `separate_stems` functions
- Return the deployment URL

## Step 5: Update Environment Variables

After deployment, Modal will output the app URL. Update your `.env` file:

```env
MODAL_BASE_URL=https://your-username--aura-x-ai-music.modal.run
MODAL_API_KEY=your_modal_api_key  # Optional, for authentication
```

## Step 6: Test the Deployment

### Test Music Generation

```bash
modal run modal_app.py
```

This runs the `main()` function which tests both music generation and stem separation.

### Test via API

```bash
curl -X POST https://your-username--aura-x-ai-music.modal.run/generate-music \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Upbeat Amapiano track with log drums",
    "duration": 15,
    "bpm": 112,
    "key": "F minor"
  }'
```

## Architecture

### MusicGen Function
- **Model**: `facebook/musicgen-medium` (1.5B parameters)
- **GPU**: NVIDIA T4
- **Max Duration**: 30 seconds
- **Features**:
  - Text-to-music generation
  - BPM and key conditioning
  - Amapiano-specific prompt enhancement
  - Automatic S3 upload

### Demucs Function
- **Model**: `htdemucs_ft` (hybrid transformer, fine-tuned)
- **GPU**: NVIDIA T4
- **Stems**: drums, bass, vocals, other
- **Features**:
  - 4-stem separation
  - 44.1kHz output
  - Organized S3 storage

## Monitoring

View logs and metrics in the Modal dashboard:
```
https://modal.com/apps/aura-x-ai-music
```

## Troubleshooting

### "Model not found" error
The first run downloads models (~2GB for MusicGen, ~1GB for Demucs). This is cached for subsequent runs.

### S3 upload fails
Verify your S3 credentials and bucket permissions:
```bash
modal secret list
```

### GPU timeout
For longer generations, increase the timeout in `modal_app.py`:
```python
@app.function(
    timeout=900,  # 15 minutes
    ...
)
```

## Cost Optimization

Modal charges per GPU-second:
- **T4 GPU**: ~$0.00060/second
- **30s generation**: ~$0.018
- **Stem separation**: ~$0.03

Use the free tier for development (30 GPU-hours/month).

## Next Steps

1. Test the complete workflow in AI Studio
2. Monitor generation quality and adjust parameters
3. Implement Temporal workflows for retry logic
4. Add generation queue for batch processing
