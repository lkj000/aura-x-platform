# AURA-X Quality Scoring Service

Real audio quality analysis with LUFS measurement, spectral analysis, and Amapiano cultural authenticity scoring.

## Overview

The Quality Scoring Service provides comprehensive audio analysis for AURA-X platform, including:

- **LUFS Measurement** - Industry-standard loudness measurement using pyloudnorm
- **Spectral Analysis** - Frequency band energy distribution using librosa
- **Tempo Detection** - BPM detection for genre compliance
- **Key Detection** - Musical key identification
- **Cultural Authenticity Scoring** - Amapiano-specific feature analysis

## Setup

### 1. Install Dependencies

```bash
cd /home/ubuntu/aura-x-platform
pip install -r quality_scoring_requirements.txt
```

### 2. Run the Service

```bash
python quality_scoring_service.py
```

The service will start on `http://localhost:8001`

## API Endpoints

### Analyze Audio Quality

```bash
POST /analyze
Content-Type: application/json

{
  "audio_url": "https://storage.example.com/track.mp3",
  "genre": "amapiano",
  "target_loudness": -14.0
}
```

Response:
```json
{
  "overall_score": 85.3,
  "lufs": -13.8,
  "peak_db": -1.2,
  "dynamic_range": 8.5,
  "spectral_balance": "good",
  "cultural_authenticity_score": 88.0,
  "tempo_detected": 112.0,
  "key_detected": "F min",
  "recommendations": [
    "Track is 0.2 LUFS louder than target. Reduce gain slightly.",
    "Excellent tempo for Amapiano (112 BPM)."
  ],
  "detailed_metrics": {
    "loudness": {
      "lufs": -13.8,
      "peak_db": -1.2,
      "dynamic_range": 8.5,
      "rms_db": -22.3
    },
    "spectral": {
      "balance_rating": "good",
      "bass_energy_pct": 45.2,
      "mid_energy_pct": 35.8,
      "high_energy_pct": 19.0,
      "band_energies": {...},
      "band_percentages": {...}
    },
    "tempo": 112.0,
    "key": "F min",
    "scores": {
      "lufs_score": 98.0,
      "dynamic_range_score": 100.0,
      "peak_score": 100.0,
      "spectral_score": 85.0,
      "cultural_score": 88.0
    }
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
  "service": "AURA-X Quality Scoring",
  "features": [
    "LUFS measurement (pyloudnorm)",
    "Spectral analysis (librosa)",
    "Tempo detection",
    "Key detection",
    "Cultural authenticity scoring (Amapiano)"
  ]
}
```

## Quality Metrics Explained

### LUFS (Loudness Units relative to Full Scale)

Industry-standard loudness measurement. Target values:
- **-14 LUFS**: Streaming platforms (Spotify, Apple Music)
- **-16 LUFS**: YouTube
- **-23 LUFS**: Broadcast (EBU R128)

### Dynamic Range

Difference between peak and RMS levels:
- **< 6 dB**: Over-compressed, fatiguing
- **6-15 dB**: Ideal range for most genres
- **> 15 dB**: May lack punch, inconsistent levels

### Spectral Balance

Frequency energy distribution:
- **Excellent**: Ideal Amapiano balance (40-50% bass, 30-40% mids, 20-30% highs)
- **Good**: Acceptable balance with minor deviations
- **Fair**: Noticeable imbalance but usable
- **Poor**: Significant imbalance requiring EQ correction

### Cultural Authenticity Score (Amapiano)

Weighted score based on:

1. **Tempo Compliance** (20 points)
   - Ideal: 108-116 BPM (112 BPM optimal)
   - Penalty: 2 points per BPM deviation

2. **Key Signature** (10 points)
   - Common keys: F min, G min, A min, C min, D min
   - Penalty: 10 points for uncommon keys

3. **Bass Presence** (15 points)
   - Ideal: 40-50% bass energy (log drums)
   - Penalty: 15 points if < 35%, 10 points if > 55%

4. **Percussive Density** (15 points)
   - Ideal: 2+ onsets per second (log drums, shakers)
   - Penalty: 15 points if < 2 onsets/sec

5. **Harmonic/Percussive Balance** (10 points)
   - Ideal: 0.5-2.0 H/P ratio (piano + drums)
   - Penalty: 10 points for imbalance

## Integration with AURA-X

### 1. Add Quality Scoring Client

Create `client/src/services/QualityScoring.ts`:

```typescript
const QUALITY_API_URL = 'http://localhost:8001';

export interface QualityScore {
  overall_score: number;
  lufs: number;
  peak_db: number;
  dynamic_range: number;
  spectral_balance: string;
  cultural_authenticity_score: number;
  tempo_detected?: number;
  key_detected?: string;
  recommendations: string[];
  detailed_metrics: any;
}

export async function analyzeAudioQuality(
  audioUrl: string,
  targetLoudness: number = -14.0
): Promise<QualityScore> {
  const response = await fetch(`${QUALITY_API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      genre: 'amapiano',
      target_loudness: targetLoudness,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Quality analysis failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

### 2. Add to Orchestration Agent

Update `orchestration_agent.py`:

```python
import requests

QUALITY_API_URL = "http://localhost:8001"

def check_quality_tool(audio_url: str) -> Dict:
    """
    Analyze audio quality using real quality scoring service
    """
    try:
        response = requests.post(
            f"{QUALITY_API_URL}/analyze",
            json={
                "audio_url": audio_url,
                "genre": "amapiano",
                "target_loudness": -14.0
            },
            timeout=60
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}
```

### 3. Display in Analysis Page

Add quality score visualization to `client/src/pages/Analysis.tsx`:

```typescript
const { data: qualityScore, isLoading } = useQuery({
  queryKey: ['quality', audioUrl],
  queryFn: () => analyzeAudioQuality(audioUrl),
});

// Display score with visual indicators
<div className="quality-score">
  <div className="score-circle">
    {qualityScore?.overall_score}/100
  </div>
  <div className="metrics">
    <div>LUFS: {qualityScore?.lufs}</div>
    <div>Peak: {qualityScore?.peak_db} dB</div>
    <div>Cultural: {qualityScore?.cultural_authenticity_score}/100</div>
  </div>
  <div className="recommendations">
    {qualityScore?.recommendations.map(rec => (
      <div key={rec}>{rec}</div>
    ))}
  </div>
</div>
```

## Production Deployment

### Option 1: Deploy with Modal.com

Add to `modal_deploy.py`:

```python
@app.function(
    image=image.pip_install_from_requirements("quality_scoring_requirements.txt"),
)
@modal.asgi_app()
def quality_scoring_api():
    from quality_scoring_service import app
    return app
```

### Option 2: Deploy with Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY quality_scoring_requirements.txt .
RUN pip install -r quality_scoring_requirements.txt

COPY quality_scoring_service.py .

CMD ["python", "quality_scoring_service.py"]
```

## Testing

### Test with Sample Audio

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "genre": "amapiano",
    "target_loudness": -14.0
  }'
```

### Expected Response

```json
{
  "overall_score": 72.5,
  "lufs": -12.3,
  "peak_db": -0.8,
  "dynamic_range": 9.2,
  "spectral_balance": "fair",
  "cultural_authenticity_score": 65.0,
  "tempo_detected": 120.0,
  "key_detected": "C maj",
  "recommendations": [
    "Tempo (120.0 BPM) is outside typical Amapiano range (108-116 BPM). Consider adjusting to ~112 BPM for authenticity.",
    "Key (C maj) is uncommon for Amapiano. Consider using: F min, G min, A min, C min, D min",
    "Track is 1.7 LUFS louder than target. Reduce gain or apply limiting."
  ]
}
```

## Cost Estimates

- **CPU Usage**: ~2-5 seconds per track analysis
- **Memory**: ~500MB per concurrent analysis
- **Recommended**: 2 CPU cores, 2GB RAM for production

## Troubleshooting

### librosa Installation Issues

If librosa fails to install:
```bash
# Install system dependencies first
sudo apt-get install libsndfile1 ffmpeg

# Then install Python packages
pip install librosa
```

### Audio Download Failures

- Ensure audio URL is publicly accessible
- Check firewall/network restrictions
- Verify audio format is supported (MP3, WAV, FLAC, OGG)

### Slow Analysis

- Analysis time scales with audio duration
- Consider caching results for repeated analyses
- Use shorter audio clips for real-time feedback

## Next Steps

1. **Deploy service** to production (Modal or Docker)
2. **Integrate with orchestration agent** for autonomous quality checks
3. **Add to Analysis page** for manual quality inspection
4. **Enable auto-mastering** based on quality recommendations
5. **Build quality dashboard** for tracking improvements over time
