# AURA-X DJ Studio - Modal Backend

Level-5 Autonomous Audio Processing Backend using Modal.com

## Features

- **Track Analysis**: BPM, key, energy curve, segments (FFmpeg + Essentia)
- **Stem Separation**: 4-stem separation using Demucs (vocals, drums, bass, other)
- **GPU Acceleration**: Automatic GPU provisioning for Demucs
- **Model Caching**: Persistent volume for Demucs models (~300MB)
- **S3 Integration**: Download inputs and upload outputs to S3
- **Webhook Callbacks**: Notify Node.js backend on completion

## Setup

### 1. Install Modal CLI

```bash
pip install modal
modal setup
```

### 2. Configure Secrets in Modal Dashboard

Go to https://modal.com/secrets and create a secret named `aura-x-aws-secrets` with:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_REGION=your_region
WEBHOOK_BASE_URL=https://your-backend.com
```

### 3. Deploy

```bash
cd modal_backend
modal deploy modal_app.py
```

## Usage

### Analyze Track

```python
import modal

analyze_track = modal.Function.lookup("aura-x-dj-studio", "analyze_track")
result = analyze_track.remote(track_id=123, file_key="dj-tracks/1/audio.mp3")
```

### Separate Stems

```python
import modal

separate_stems = modal.Function.lookup("aura-x-dj-studio", "separate_stems")
result = separate_stems.remote(track_id=123, file_key="dj-tracks/1/audio.mp3", user_id=1)
```

## Architecture

```
┌─────────────────┐
│  Node.js Backend │
│  (tRPC API)      │
└────────┬─────────┘
         │
         │ Trigger Modal function
         ▼
┌─────────────────┐
│  Modal Worker    │
│  (Python)        │
├─────────────────┤
│ • Download S3    │
│ • Process Audio  │
│ • Upload Results │
│ • Send Webhook   │
└────────┬─────────┘
         │
         │ Webhook callback
         ▼
┌─────────────────┐
│  Node.js Backend │
│  (Update DB)     │
└─────────────────┘
```

## Cost Optimization

- **CPU Workers**: ~$0.0001/second for analysis
- **GPU Workers**: ~$0.001/second for stem separation
- **Model Caching**: Saves ~30s per request
- **Typical Costs**:
  - Analysis: ~$0.01 per track (60s audio)
  - Stem Separation: ~$0.10 per track (60s audio)

## Development

### Local Testing

```bash
modal run modal_app.py::analyze_track --track-id 123 --file-key "test.mp3"
```

### View Logs

```bash
modal app logs aura-x-dj-studio
```

### Update Deployment

```bash
modal deploy modal_app.py
```

## Troubleshooting

### "Secret not found"

Create the `aura-x-aws-secrets` secret in Modal dashboard with all required environment variables.

### "GPU not available"

Ensure your Modal account has GPU access enabled. Contact Modal support if needed.

### "Model download timeout"

The first run downloads Demucs models (~300MB). Subsequent runs use cached models from the volume.

## Next Steps

1. Implement set rendering worker (crossfade, tempo adjustment)
2. Add progress tracking for long-running jobs
3. Implement batch processing for multiple tracks
4. Add error recovery and retry logic
