# Autonomous AI Music System Blueprint - Key Findings

## Architecture Overview
**Workflow**: User Prompt → Orchestration Agent → Music Generation → Stem Separation → Remix Engine → Mastering → Export & Distribution

## Core Components
1. **Orchestration Layer**: LangChain or custom planner for task sequencing and quality feedback
2. **Music Generation Engine**: MusicGen / Riffusion / Jukebox for text-to-music and melody-based generation
3. **Stem Separation Engine**: Demucs / Spleeter for vocal/instrument isolation and remixing
4. **Mastering Engine**: DSP + ML pipeline for EQ, compression, stereo imaging, loudness normalization
5. **Export & Distribution**: WAV, MP3, FLAC formats, metadata tagging, optional streaming platform integration

## Tech Stack
- **Models**: MusicGen / Riffusion, Demucs, custom DSP + ML
- **Frameworks**: LangChain, FastAPI / Flask
- **Cloud**: Azure ML or GCP Vertex AI
- **Frontend**: React + WebAudio API
- **Data**: Vector DB (Pinecone / Weaviate)
- **Monitoring**: Azure App Insights / GCP Cloud Monitoring

## Implementation Phases
### Phase 1: MVP (4-6 weeks)
- Implement MusicGen or Riffusion for generation
- Build basic DSP mastering pipeline
- Create orchestration logic for Generate → Master → Export
- Deploy on Azure ML or GCP Vertex AI
- Minimal web UI for prompt input and playback

### Phase 2: Stem Separation & Remix (6-8 weeks)
- Integrate Demucs for stem separation
- Enable tempo/key adjustment
- Add remix tools
- Update orchestration agent

### Phase 3: Full Autonomy & Advanced Mastering (8-12 weeks)
- Implement quality scoring (spectral analysis, LUFS compliance)
- Add reinforcement learning or heuristic scoring
- Expand mastering pipeline with stereo imaging and genre presets
- Integrate metadata tagging and distribution APIs

### Phase 4: Scaling & Optimization
- Optimize GPU usage and latency
- Implement caching for embeddings and stems
- Add multi-user support and RBAC
- Monitor with App Insights / Cloud Logging

## Repeatability & Deterministic Generation Strategy

### Why Current Tools Fail
- Stochastic generation introduces randomness
- Non-deterministic GPU operations
- Lack of seed control and workflow snapshots

### Solution Approach
1. **Seed Control**: Fixed random seeds for all steps
2. **Versioned Artifacts**: Store prompt, model version, hyperparameters, seed
3. **Deterministic Inference**: Use deterministic GPU kernels
4. **Workflow Snapshots**: Pipeline state manager for replay
5. **Creative vs Production Mode**:
   - Creative Mode: Random seeds for diversity
   - Production Mode: Fixed seeds for repeatability

### API Changes
- Add `seed` parameter to generation endpoints
- Add `GET /replay?track_id=<hash>` for exact regeneration

### Example Code for Deterministic Generation
```python
import torch
torch.use_deterministic_algorithms(True)

model = MusicGen.get_pretrained('medium')
model.set_generation_params(duration=180, temperature=0.8, top_k=250, seed=12345)
wav = model.generate(["Create an EDM track with female vocals"])
```

### Reproducibility Workflow Diagram
```
User Prompt → Mode Selector (Creative | Production)
  ├─ Creative: random seed → Generate → Score → Master → Export
  └─ Production: fixed seed → Generate → Snapshot → Master → Export
      └─ Replay API → Regenerate (same hash)
```

**Key Artifacts**: Prompt, Seed, Model Version, Hyperparameters, Latent Snapshot, Track Hash (SHA256 of all artifacts)

## UI Design: Creative vs Production Mode

### Dashboard Controls
- Toggle: `Creative | Production`
- Seed input (numeric)
- Advanced panel: temperature, top-k, top-p
- Button group: `Generate`, `Separate Stems`, `Master`, `Export`, `Replay`

### UX Notes
- In Production mode, disable randomization; show immutable **Track ID** and **Replay** button
- Surface LUFS meter, spectrum analyzer, and genre similarity score

## Deployment Strategy
- **Azure**: Azure ML for model hosting, Blob Storage for audio assets, App Service for API
- **GCP**: Vertex AI for model hosting, GCS for storage, Cloud Run for API
- **CI/CD**: GitHub Actions with GPU runners, Dockerized services
- **Optimization**: FP16 inference for speed, Batch generation for efficiency

## Observability
- Prometheus ServiceMonitor for metrics
- Grafana Dashboard: GPU utilization, job latency, integrated LUFS
- Security: OIDC auth + RBAC, rate limiting, input validation, secrets in Key Vault/Secret Manager, TLS, audit logging, dependency hygiene

## Dockerfile, FastAPI, Helm, Docker Compose & k6
See appended sections in the blueprint for full templates and code.
