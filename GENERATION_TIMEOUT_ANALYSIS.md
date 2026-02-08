# Generation Timeout Issue Analysis

## Problem Summary
AI music generation consistently times out after reaching 70-90% progress, despite multiple timeout increases.

## Timeline of Fixes Attempted
1. **Increased Modal client timeout**: 120s → 600s (10 minutes)
2. **Increased frontend polling timeout**: 5 minutes → 15 minutes  
3. **Removed S3 upload**: Switched to base64 data URLs to isolate S3 issues
4. **Added debug logging**: Confirmed Modal receives requests and starts generation

## Current Behavior
- Generation starts successfully (0% → 70-90%)
- Progress updates work correctly through model loading and audio generation
- **Fails during final phase** (cultural authenticity processing or finalization)
- Frontend shows "Generation Timeout" toast
- Page resets to "No track generated yet"

## Root Cause Hypothesis
The issue is **NOT**:
- S3 upload (still fails with base64 return)
- Frontend timeout (increased to 15 minutes)
- Modal client timeout (increased to 10 minutes)

The issue **IS LIKELY**:
- **HTTP connection timeout** between AURA-X backend (`server/modalClient.ts`) and Modal endpoint
- Node.js/Axios default timeout overriding our configured timeout
- Modal function taking longer than HTTP keep-alive allows

## Evidence
1. Modal logs show successful request receipt
2. Frontend progress updates work (polling succeeds)
3. Timeout occurs at same phase (70-90%) regardless of S3 vs base64
4. Console error: "Generation Timeout - Generation is taking longer than expected"

## Recommended Solution: Webhook Pattern

Replace synchronous HTTP request/response with async webhook pattern:

### Current Flow (Failing)
```
Frontend → Backend → Modal (7-10 min wait) → Backend → Frontend
                     ↑ HTTP timeout here
```

### Proposed Flow (Webhook)
```
1. Frontend → Backend → Modal (returns immediately with job_id)
2. Modal generates audio (7-10 minutes)
3. Modal → Backend webhook (/api/modal/webhook) when complete
4. Frontend polls /api/trpc/generate.status?job_id=X
5. Backend returns completed audio when webhook received
```

### Implementation Steps
1. Add `/api/modal/webhook` endpoint to receive completion callbacks
2. Store generation jobs in database with status (pending/processing/completed/failed)
3. Modal calls webhook with job_id and audio_url when complete
4. Frontend polls for job status instead of waiting for HTTP response
5. Display audio player when status changes to "completed"

## Alternative: Server-Sent Events (SSE)
Use SSE for real-time progress updates instead of polling:
- Modal streams progress to backend
- Backend streams to frontend via SSE
- No timeout issues since connection stays open with periodic updates

## Next Steps
1. Implement webhook pattern (recommended)
2. OR implement SSE streaming
3. Test with real Modal generation
4. Add S3 upload back once async pattern works
