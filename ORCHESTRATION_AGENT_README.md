# AURA-X Level 5 Orchestration Agent

LangChain-based autonomous music production workflow automation for AURA-X platform.

## Overview

The Orchestration Agent is the brain of AURA-X's Level 5 autonomous architecture. It uses LangChain and GPT-4 to:

- **Understand natural language goals** ("Create a 2-minute Amapiano track in F minor")
- **Break down complex workflows** into actionable steps
- **Execute production pipelines** autonomously using AI tools
- **Apply quality control** at each step
- **Ensure cultural authenticity** in Amapiano productions

## Architecture

```
User Goal → LangChain Agent → Tool Selection → Modal AI Endpoints → Quality Check → Export
```

### Available Tools

1. **GenerateMusic** - AI music generation via Modal MusicGen
2. **SeparateStems** - Stem separation via Modal Demucs
3. **ApplyMastering** - Professional mastering via Modal
4. **CheckQuality** - LUFS, spectral analysis, cultural scoring
5. **ExportTrack** - Final track export in multiple formats

## Setup

### 1. Install Dependencies

```bash
cd /home/ubuntu/aura-x-platform
pip install -r orchestration_requirements.txt
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
# Modal.com configuration
MODAL_BASE_URL=https://your-username--aura-x-ai-dev.modal.run
MODAL_API_KEY=your_modal_api_key

# OpenAI configuration (for LangChain agent)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Run the Agent

```bash
python orchestration_agent.py
```

The agent will start on `http://localhost:8000`

## API Endpoints

### Execute Full Workflow

```bash
POST /workflow/execute
Content-Type: application/json

{
  "goal": "Create a 2-minute Amapiano track in F minor at 112 BPM with log drums and piano",
  "user_id": 1,
  "project_id": 1,
  "parameters": {
    "mode": "kasi",
    "cultural_authenticity_weight": 0.9
  }
}
```

Response:
```json
{
  "workflow_id": "wf-1-1705234567",
  "status": "completed",
  "steps": [
    {"step": "parse_goal", "status": "completed"},
    {"step": "generate_music", "status": "completed"},
    {"step": "quality_check", "status": "completed"},
    {"step": "mastering", "status": "completed"},
    {"step": "export", "status": "completed"}
  ],
  "result": {
    "message": "Successfully created Amapiano track...",
    "audio_url": "https://...",
    "quality_score": 85
  }
}
```

### Execute Single Step

```bash
POST /workflow/step?step_name=generate
Content-Type: application/json

{
  "prompt": "Energetic Amapiano track with log drums",
  "parameters": {
    "tempo": 112,
    "key": "F min",
    "duration": 120
  }
}
```

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "modal_configured": true,
  "openai_configured": true
}
```

## Integration with AURA-X Frontend

### 1. Add Orchestration Client

Create `client/src/services/OrchestrationClient.ts`:

```typescript
const ORCHESTRATION_URL = 'http://localhost:8000';

export async function executeWorkflow(goal: string, userId: number, projectId?: number) {
  const response = await fetch(`${ORCHESTRATION_URL}/workflow/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, user_id: userId, project_id: projectId }),
  });
  return response.json();
}
```

### 2. Add "Autonomous Mode" Toggle

In `client/src/pages/Instruments.tsx`, add:

```typescript
const [autonomousMode, setAutonomousMode] = useState(false);

// In the UI:
<Switch
  checked={autonomousMode}
  onCheckedChange={setAutonomousMode}
  label="Autonomous Mode (Level 5)"
/>

// In handleGenerate:
if (autonomousMode) {
  const result = await executeWorkflow(
    `Create ${params.duration}s Amapiano track: ${params.prompt}`,
    user.id,
    currentProjectId
  );
  // Handle autonomous workflow result
} else {
  // Use existing manual generation
}
```

## Example Workflows

### Workflow 1: Simple Generation

**Goal**: "Create a 30-second Amapiano track"

**Agent Actions**:
1. Parse goal → extract duration, genre
2. Generate music with default Amapiano parameters
3. Check quality → LUFS, cultural score
4. Export track

### Workflow 2: Full Production

**Goal**: "Create a 2-minute Kasi Amapiano track, separate stems, and master to -14 LUFS"

**Agent Actions**:
1. Parse goal → extract subgenre, duration, mastering target
2. Generate music with Kasi parameters
3. Check initial quality
4. Separate stems (drums, bass, piano, vocals)
5. Apply mastering to -14 LUFS
6. Final quality check
7. Export stems + master

### Workflow 3: Iterative Refinement

**Goal**: "Create an Amapiano track, if cultural score < 80, regenerate with higher authenticity weight"

**Agent Actions**:
1. Generate music
2. Check quality → cultural_score = 75
3. Regenerate with cultural_authenticity_weight = 0.95
4. Check quality → cultural_score = 88
5. Apply mastering
6. Export

## Level 5 Autonomy Features

✅ **Natural Language Understanding** - Parses complex production goals
✅ **Autonomous Decision Making** - Selects tools and parameters automatically
✅ **Quality-Driven Iteration** - Regenerates if quality thresholds not met
✅ **Cultural Authenticity** - Ensures Amapiano authenticity at every step
✅ **Multi-Step Workflows** - Handles generation → separation → mastering → export
✅ **Error Recovery** - Retries failed steps with adjusted parameters

## Production Deployment

### Option 1: Deploy with Modal.com

```python
# Add to modal_deploy.py
@app.function(
    image=image.pip_install_from_requirements("orchestration_requirements.txt"),
    secrets=[modal.Secret.from_name("openai-secret")],
)
@modal.asgi_app()
def orchestration_api():
    from orchestration_agent import app
    return app
```

### Option 2: Deploy with Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY orchestration_requirements.txt .
RUN pip install -r orchestration_requirements.txt
COPY orchestration_agent.py .
CMD ["python", "orchestration_agent.py"]
```

## Cost Estimates

- **GPT-4 API**: ~$0.03-0.06 per workflow (depending on complexity)
- **Modal AI Endpoints**: See `MODAL_DEPLOYMENT_GUIDE.md`
- **Total per autonomous workflow**: ~$0.50-1.00

## Next Steps

1. **Deploy orchestration agent** to production
2. **Add autonomous mode toggle** in Instruments page
3. **Implement quality scoring** with real spectral analysis
4. **Add workflow templates** for common production patterns
5. **Build observability dashboard** for monitoring agent decisions

## Troubleshooting

### Agent not making decisions

- Check OpenAI API key is valid
- Increase `temperature` in LLM initialization
- Add more examples to system prompt

### Tools failing

- Verify Modal endpoints are deployed and accessible
- Check `MODAL_BASE_URL` and `MODAL_API_KEY` are correct
- Test individual tools with `/workflow/step` endpoint

### Quality checks failing

- Implement real quality analysis (currently placeholder)
- Integrate pyloudnorm for LUFS measurement
- Add spectral analysis with librosa
