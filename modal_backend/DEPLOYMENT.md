# Modal Backend Deployment Guide

## Prerequisites

1. **Install Modal CLI**
   ```bash
   pip install modal
   ```

2. **Authenticate with Modal**
   ```bash
   modal token new
   ```

## Configuration

### 1. Set Modal Secrets

The backend requires these secrets to be configured in Modal:

```bash
# AWS S3 credentials (for audio file storage)
modal secret create aws-s3 \
  AWS_ACCESS_KEY_ID="your_access_key" \
  AWS_SECRET_ACCESS_KEY="your_secret_key" \
  S3_BUCKET="your_bucket_name" \
  S3_REGION="us-east-1"

# Webhook URL (Node.js backend endpoint)
modal secret create dj-studio-webhook \
  WEBHOOK_URL="https://your-domain.com/api/dj-studio-webhooks"
```

**Note:** Replace the placeholder values with your actual credentials:
- `AWS_ACCESS_KEY_ID`: From your AWS IAM user
- `AWS_SECRET_ACCESS_KEY`: From your AWS IAM user
- `S3_BUCKET`: Your S3 bucket name (e.g., `aura-x-audio-storage`)
- `WEBHOOK_URL`: Your deployed Node.js backend URL + `/api/dj-studio-webhooks`

### 2. Verify Secrets

```bash
modal secret list
```

You should see:
- `aws-s3`
- `dj-studio-webhook`

## Deployment

### Local Testing

Test the Modal app locally before deploying:

```bash
cd /home/ubuntu/aura-x-platform/modal_backend
modal run modal_app.py
```

This will:
- Build the Modal image with dependencies
- Cache models (Demucs) in persistent volume
- Start local Modal server
- Print function URLs for testing

### Production Deployment

Deploy to Modal's production environment:

```bash
cd /home/ubuntu/aura-x-platform/modal_backend
modal deploy modal_app.py
```

This will:
- Build and push the Modal image
- Deploy all functions as webhooks
- Print production URLs

**Save these URLs** - you'll need them in your Node.js backend:
- `analyze_track_modal` URL
- `separate_stems_modal` URL
- `render_dj_set_modal` URL (after implementing)

### Update Node.js Backend

After deployment, update your Node.js backend with the Modal function URLs:

1. Add to `.env` or environment variables:
   ```
   MODAL_ANALYZE_TRACK_URL=https://your-workspace--analyze-track-modal.modal.run
   MODAL_SEPARATE_STEMS_URL=https://your-workspace--separate-stems-modal.modal.run
   MODAL_RENDER_SET_URL=https://your-workspace--render-dj-set-modal.modal.run
   ```

2. Update `server/routers/djStudio.ts` to call these URLs instead of placeholders

## Testing

### 1. Test Analysis Workflow

```bash
# Upload a test track via DJ Studio UI
# Check Modal logs:
modal app logs your-workspace/modal_app

# Verify webhook received in Node.js logs
# Check database for saved features
```

### 2. Test Stem Separation

```bash
# Trigger stem separation from DJ Studio UI
# Monitor Modal logs for Demucs progress
# Verify stems uploaded to S3
# Check database for stem URLs
```

### 3. Test Set Generation

```bash
# Select tracks in DJ Studio
# Generate set with vibe preset
# Monitor Modal logs for planner execution
# Verify performance plan saved to database
```

## Monitoring

### View Logs

```bash
# Real-time logs
modal app logs your-workspace/modal_app --follow

# Filter by function
modal app logs your-workspace/modal_app --function analyze_track_modal
```

### Check Function Status

```bash
modal app list
modal app show your-workspace/modal_app
```

### Monitor Costs

```bash
modal profile
```

Modal pricing:
- CPU: ~$0.000025/second
- GPU (T4): ~$0.00065/second
- Storage: ~$0.15/GB/month

Estimated costs for DJ Studio:
- Track analysis (CPU, ~30s): $0.00075
- Stem separation (GPU, ~60s): $0.039
- Set rendering (CPU, ~120s): $0.003

## Troubleshooting

### "Secret not found" Error

```bash
# List secrets
modal secret list

# Recreate if missing
modal secret create aws-s3 ...
```

### "Module not found" Error

Check `requirements.txt` includes all dependencies:
```
modal
essentia
demucs
numpy
boto3
requests
```

### Webhook Not Received

1. Check webhook URL is accessible:
   ```bash
   curl https://your-domain.com/api/dj-studio-webhooks/analysis-complete \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"track_id": 1, "test": true}'
   ```

2. Check Modal logs for webhook errors:
   ```bash
   modal app logs your-workspace/modal_app | grep webhook
   ```

3. Verify WEBHOOK_URL secret is correct:
   ```bash
   modal secret list
   ```

### Demucs Model Download Slow

First run downloads ~350MB model. Subsequent runs use cached model from persistent volume.

To pre-download:
```bash
modal run modal_app.py::download_models
```

## Scaling

Modal automatically scales based on load:
- **Cold start**: ~10-30s (image pull + model load)
- **Warm instances**: <1s
- **Concurrent limit**: 100 (default)

To increase concurrency:
```python
@app.function(
    concurrency_limit=500,  # Increase limit
    ...
)
```

## Rollback

To rollback to previous version:

```bash
# List deployments
modal app history your-workspace/modal_app

# Rollback to specific version
modal app rollback your-workspace/modal_app --version <version_id>
```

## Next Steps

1. ✅ Deploy Modal backend
2. ⏳ Integrate waveform visualization
3. ⏳ Build set renderer worker
4. ⏳ Test end-to-end pipeline
5. ⏳ Monitor production usage and optimize costs

---

**Need help?** Check Modal docs: https://modal.com/docs
