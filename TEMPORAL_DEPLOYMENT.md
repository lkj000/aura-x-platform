# Temporal Workflow Deployment Guide
**Level 5 Autonomous Agent Architecture for AURA-X**

This guide provides complete instructions for deploying the Temporal workflow engine to enable autonomous AI music generation with automatic retries, error handling, and queue management.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Testing Workflows](#testing-workflows)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Level 5 Autonomous Agent Components

```
┌─────────────────────────────────────────────────────────────┐
│                     AURA-X Frontend                         │
│  (React + tRPC client)                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ tRPC API calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend (Express + tRPC)               │
│  - temporalClient.ts: Workflow execution                    │
│  - queueDb.ts: Queue management & rate limiting             │
│  - routers.ts: API endpoints                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Start workflows
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Temporal Server                            │
│  - Workflow orchestration                                   │
│  - Automatic retries (exponential backoff)                  │
│  - State persistence                                        │
│  - Progress tracking                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Execute activities
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Temporal Worker (Python)                       │
│  temporal_workflows.py:                                     │
│  - MusicGenerationWorkflow                                  │
│  - StemSeparationWorkflow                                   │
│  - Activities: call_modal_music_generation                  │
│               call_modal_stem_separation                    │
│               update_generation_status                      │
│               send_completion_notification                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Modal API calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Modal.com Backend                          │
│  modal_app.py:                                              │
│  - MusicGen (music generation)                              │
│  - Demucs (stem separation)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Automatic Retries**: Exponential backoff (1s → 60s) with max 5 attempts
- **Error Handling**: Workflow-level compensation and error recovery
- **Queue Management**: Priority queue with rate limiting (max 3 concurrent jobs per user)
- **Progress Tracking**: Real-time status updates in database
- **Notifications**: Automatic user notifications on completion/failure

---

## Prerequisites

### Required Software

- **Node.js** 22.x or higher
- **Python** 3.11 or higher
- **Docker** 20.x or higher (for local Temporal server)
- **PostgreSQL** or **MySQL** (for Temporal persistence)

### Required Accounts

- **Modal.com** account with API key
- **Temporal Cloud** account (optional, for production)

### Environment Variables

Add these to your `.env` file:

```bash
# Temporal Configuration
TEMPORAL_SERVER_URL=localhost:7233  # or your Temporal Cloud URL
TEMPORAL_NAMESPACE=default          # or your namespace

# Modal Configuration
MODAL_BASE_URL=https://your-modal-app.modal.run
MODAL_API_KEY=your_modal_api_key_here

# Database
DATABASE_URL=mysql://user:password@host:port/database
```

---

## Local Development Setup

### Step 1: Start Temporal Server with Docker Compose

Create `docker-compose.yml` in your project root:

```yaml
version: '3.8'

services:
  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - "7233:7233"  # gRPC
      - "8233:8233"  # Web UI
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
    depends_on:
      - postgresql
    networks:
      - temporal-network

  postgresql:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: temporal
      POSTGRES_USER: temporal
    ports:
      - "5432:5432"
    networks:
      - temporal-network

  temporal-ui:
    image: temporalio/ui:latest
    ports:
      - "8080:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    depends_on:
      - temporal
    networks:
      - temporal-network

networks:
  temporal-network:
    driver: bridge
```

Start the services:

```bash
docker-compose up -d
```

Verify Temporal is running:
- Web UI: http://localhost:8080
- gRPC endpoint: localhost:7233

### Step 2: Install Python Dependencies

```bash
pip install temporalio httpx
```

### Step 3: Install Node.js Dependencies

Already installed in your project:

```bash
pnpm add @temporalio/client @temporalio/worker
```

### Step 4: Run Temporal Worker (Python)

The worker processes workflows and activities:

```bash
python temporal_workflows.py
```

You should see:

```
[Temporal] Connected to localhost:7233
[Temporal] Worker started on task queue: aura-x-music-generation
```

### Step 5: Start Your Node.js Backend

```bash
pnpm dev
```

### Step 6: Test Workflow Execution

Use the AI Studio page in your frontend to trigger a music generation. The workflow will:

1. Create a generation record in the database
2. Execute `MusicGenerationWorkflow` via Temporal
3. Call Modal MusicGen API
4. Poll for completion every 5 seconds
5. Update database with results
6. Send notification to user

Monitor workflow execution in Temporal Web UI: http://localhost:8080

---

## Production Deployment

### Option 1: Temporal Cloud (Recommended)

Temporal Cloud provides a fully managed service with high availability.

#### 1. Create Temporal Cloud Account

Sign up at https://temporal.io/cloud

#### 2. Create Namespace

```bash
temporal namespace create aura-x-production
```

#### 3. Generate Client Certificates

Download client certificates from Temporal Cloud dashboard.

#### 4. Update Environment Variables

```bash
TEMPORAL_SERVER_URL=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=aura-x-production
TEMPORAL_TLS_CERT=<base64-encoded-cert>
TEMPORAL_TLS_KEY=<base64-encoded-key>
```

#### 5. Update temporalClient.ts

Uncomment TLS configuration:

```typescript
temporalClient = await Client.connect({
  address: TEMPORAL_SERVER_URL,
  tls: {
    clientCertPair: {
      crt: Buffer.from(process.env.TEMPORAL_TLS_CERT || '', 'base64'),
      key: Buffer.from(process.env.TEMPORAL_TLS_KEY || '', 'base64'),
    },
  },
});
```

#### 6. Deploy Worker

Deploy `temporal_workflows.py` to a long-running server (e.g., AWS EC2, Modal.com):

```bash
# On your server
python temporal_workflows.py
```

Or use a process manager like systemd:

```ini
[Unit]
Description=Temporal Worker for AURA-X
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/aura-x-platform
ExecStart=/usr/bin/python3 temporal_workflows.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable temporal-worker
sudo systemctl start temporal-worker
```

### Option 2: Self-Hosted Temporal Server

For full control, deploy Temporal server on your infrastructure.

#### 1. Deploy Temporal Server

Use Helm chart for Kubernetes:

```bash
helm repo add temporalio https://go.temporal.io/helm-charts
helm install temporal temporalio/temporal
```

Or use Docker Compose (see local setup above).

#### 2. Configure Load Balancer

Expose Temporal gRPC endpoint (port 7233) via load balancer.

#### 3. Deploy Worker

Same as Temporal Cloud option above.

---

## Testing Workflows

### Unit Tests

Create `server/temporal.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { executeMusicGenerationWorkflow } from './temporalClient';

describe('Temporal Workflows', () => {
  it('should execute music generation workflow', async () => {
    const handle = await executeMusicGenerationWorkflow({
      generationId: 1,
      userId: 1,
      prompt: 'Amapiano beat with log drums',
      duration: 30,
      temperature: 1.0,
      modalBaseUrl: process.env.MODAL_BASE_URL || '',
      modalApiKey: process.env.MODAL_API_KEY || '',
    });
    
    expect(handle.workflowId).toBeDefined();
  });
});
```

Run tests:

```bash
pnpm test
```

### Integration Tests

Test complete workflow execution:

```bash
# Start Temporal server
docker-compose up -d

# Start worker
python temporal_workflows.py &

# Run integration tests
pnpm test:integration
```

### Manual Testing

1. Open AI Studio page
2. Enter a prompt and click "Generate"
3. Monitor Temporal Web UI: http://localhost:8080
4. Check database for status updates
5. Verify notification sent to user

---

## Monitoring & Observability

### Temporal Web UI

Access at http://localhost:8080 (local) or your Temporal Cloud dashboard.

Features:
- Workflow execution history
- Activity logs
- Retry attempts
- Error messages
- Workflow state

### Database Monitoring

Query `generation_queue` table:

```sql
SELECT * FROM generation_queue WHERE status = 'processing';
SELECT * FROM user_queue_stats;
```

### Queue Analytics

Use `getQueueAnalytics()` function:

```typescript
import * as queueDb from './queueDb';

const analytics = await queueDb.getQueueAnalytics();
console.log(analytics);
// {
//   queuedCount: 5,
//   processingCount: 3,
//   avgWaitTime: 45
// }
```

### Prometheus Metrics (Optional)

Add Temporal metrics exporter:

```python
from temporalio.contrib.prometheus import PrometheusMetricsExporter

exporter = PrometheusMetricsExporter()
```

---

## Troubleshooting

### Worker Not Connecting

**Error**: `Failed to connect to Temporal server`

**Solution**:
1. Verify Temporal server is running: `docker ps`
2. Check `TEMPORAL_SERVER_URL` environment variable
3. Test connection: `telnet localhost 7233`

### Workflow Stuck in Processing

**Error**: Workflow never completes

**Solution**:
1. Check Temporal Web UI for error messages
2. Verify Modal API is responding
3. Check worker logs: `docker logs temporal-worker`
4. Increase workflow timeout in `temporal_workflows.py`

### Rate Limiting Not Working

**Error**: Users can queue unlimited jobs

**Solution**:
1. Verify `user_queue_stats` table exists: `pnpm db:push`
2. Check `canUserQueueJob()` is called before enqueuing
3. Verify `maxConcurrentJobs` is set correctly

### Database Connection Issues

**Error**: `Database not available`

**Solution**:
1. Verify `DATABASE_URL` environment variable
2. Test database connection: `mysql -h host -u user -p`
3. Check database schema: `pnpm db:push`

---

## Next Steps

1. **Deploy Modal Backend**: Follow `MODAL_DEPLOYMENT.md`
2. **Test End-to-End**: Generate music from AI Studio
3. **Monitor Performance**: Use Temporal Web UI and queue analytics
4. **Scale Workers**: Add more worker instances for higher throughput
5. **Optimize Retries**: Tune retry policies based on Modal API latency

---

## Support

- **Temporal Documentation**: https://docs.temporal.io
- **Modal Documentation**: https://modal.com/docs
- **AURA-X Issues**: https://github.com/your-repo/issues

---

**Level 5 Autonomous Agent Architecture** ✅
- Automatic retries and error handling
- Queue management with rate limiting
- Progress tracking and notifications
- Production-ready deployment
