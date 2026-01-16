# Temporal Deployment Checklist
**Level 5 Autonomous Agent Architecture**

Complete this checklist before deploying AURA-X to production.

---

## Pre-Deployment Validation

### 1. Environment Setup

- [ ] **Docker Installed**
  ```bash
  docker --version
  # Expected: Docker version 20.x or higher
  ```

- [ ] **docker-compose Installed**
  ```bash
  docker-compose --version
  # Expected: docker-compose version 1.29.x or higher
  ```

- [ ] **Python 3.11+ Installed**
  ```bash
  python3 --version
  # Expected: Python 3.11.0 or higher
  ```

- [ ] **Node.js 22+ Installed**
  ```bash
  node --version
  # Expected: v22.x.x or higher
  ```

### 2. Environment Variables

- [ ] **DATABASE_URL** - MySQL/TiDB connection string
  ```bash
  echo $DATABASE_URL
  # Expected: mysql://user:password@host:port/database
  ```

- [ ] **MODAL_API_KEY** - Modal.com API key
  ```bash
  echo $MODAL_API_KEY
  # Expected: Non-empty string
  ```

- [ ] **MODAL_BASE_URL** - Modal app URL
  ```bash
  echo $MODAL_BASE_URL
  # Expected: https://your-modal-app.modal.run
  ```

- [ ] **TEMPORAL_SERVER_URL** (Optional for local dev)
  ```bash
  echo $TEMPORAL_SERVER_URL
  # Expected: localhost:7233 (local) or your-namespace.tmprl.cloud:7233 (cloud)
  ```

### 3. Python Dependencies

- [ ] **temporalio SDK**
  ```bash
  python3 -c "import temporalio; print('✅ temporalio installed')"
  ```

- [ ] **httpx**
  ```bash
  python3 -c "import httpx; print('✅ httpx installed')"
  ```

- [ ] **modal SDK**
  ```bash
  python3 -c "import modal; print('✅ modal installed')"
  ```

Install missing dependencies:
```bash
pip3 install temporalio httpx modal
```

### 4. Node.js Dependencies

- [ ] **@temporalio/client**
  ```bash
  pnpm list @temporalio/client
  ```

- [ ] **@temporalio/worker**
  ```bash
  pnpm list @temporalio/worker
  ```

Install if missing:
```bash
pnpm add @temporalio/client @temporalio/worker
```

### 5. Database Schema

- [ ] **Run migrations**
  ```bash
  pnpm db:push
  ```

- [ ] **Verify tables exist**
  ```sql
  SHOW TABLES LIKE 'generation_queue';
  SHOW TABLES LIKE 'user_queue_stats';
  SHOW TABLES LIKE 'users';
  ```

- [ ] **Verify tier column exists**
  ```sql
  DESCRIBE users;
  # Should show 'tier' column with enum('free','pro','enterprise')
  ```

---

## Deployment Steps

### Step 1: Health Check

Run the automated health check:

```bash
./scripts/check-temporal-health.sh
```

Expected output:
```
✅ Docker installed
✅ docker-compose installed
✅ Temporal server running on localhost:7233
✅ Temporal Web UI running on localhost:8080
✅ Python installed
✅ temporalio installed
✅ modal installed
✅ MODAL_API_KEY set
✅ DATABASE_URL set
```

### Step 2: Start Temporal Server

```bash
./scripts/start-temporal.sh
```

Expected output:
```
✅ Temporal server is running!
📊 Temporal Web UI: http://localhost:8080
🔌 Temporal Server: localhost:7233
```

Verify:
- [ ] Temporal Web UI accessible at http://localhost:8080
- [ ] No error messages in docker logs: `docker-compose logs temporal`

### Step 3: Start Temporal Worker

In a **new terminal**:

```bash
./scripts/start-worker.sh
```

Expected output:
```
✅ Starting Temporal worker process...
📊 Worker will process workflows from task queue: music-generation-queue
[Temporal] Connected to localhost:7233
[Temporal] Worker started on task queue: aura-x-music-generation
```

Verify:
- [ ] Worker connected to Temporal server
- [ ] No connection errors
- [ ] Task queue registered in Temporal Web UI

### Step 4: Start Node.js Backend

In a **new terminal**:

```bash
pnpm dev
```

Expected output:
```
Server running on http://localhost:3000/
[OAuth] Initialized with baseURL: https://api.manus.im
```

Verify:
- [ ] Backend server running
- [ ] No database connection errors
- [ ] tRPC endpoints accessible

---

## Functional Testing

### Test 1: Queue Analytics

```bash
curl http://localhost:3000/api/trpc/queue.getAnalytics
```

Expected: JSON response with `queuedCount`, `processingCount`, `avgWaitTime`

### Test 2: User Queue Stats

```bash
curl http://localhost:3000/api/trpc/queue.getUserStats
```

Expected: JSON response with user's concurrent jobs and limits

### Test 3: Music Generation Workflow

1. Open AI Studio: http://localhost:3000/ai-studio
2. Enter prompt: "Amapiano beat with log drums"
3. Click "Generate"
4. Verify:
   - [ ] Generation queued in database
   - [ ] Workflow visible in Temporal Web UI
   - [ ] Worker logs show activity execution
   - [ ] Modal API called successfully
   - [ ] Database updated with results
   - [ ] User notification sent

### Test 4: Queue Position Indicator

1. Queue multiple generations
2. Verify queue position displayed in AI Studio
3. Check queue position updates as jobs complete

### Test 5: Rate Limiting

1. Create test users with different tiers (free/pro/enterprise)
2. Queue jobs for each user
3. Verify:
   - [ ] Free user limited to 1 concurrent job
   - [ ] Pro user limited to 3 concurrent jobs
   - [ ] Enterprise user limited to 10 concurrent jobs
   - [ ] Additional jobs queued, not rejected

### Test 6: Priority Queue

1. Queue jobs from users with different tiers
2. Verify in Temporal Web UI:
   - [ ] Enterprise jobs processed first (priority 10)
   - [ ] Pro jobs processed second (priority 5)
   - [ ] Free jobs processed last (priority 1)

### Test 7: Automatic Retries

1. Temporarily break Modal API (invalid URL)
2. Queue a generation
3. Verify in Temporal Web UI:
   - [ ] Workflow retries with exponential backoff
   - [ ] Max retries respected (3/5/10 based on tier)
   - [ ] Workflow marked as failed after max retries
   - [ ] User notified of failure

---

## Production Deployment

### Option 1: Temporal Cloud (Recommended)

- [ ] Create Temporal Cloud account
- [ ] Create production namespace
- [ ] Download client certificates
- [ ] Update `TEMPORAL_SERVER_URL` with cloud URL
- [ ] Update `temporalClient.ts` with TLS configuration
- [ ] Deploy worker to long-running server (EC2, Modal, etc.)
- [ ] Configure systemd service for worker auto-restart

### Option 2: Self-Hosted Temporal

- [ ] Deploy Temporal server with Helm (Kubernetes)
- [ ] Configure PostgreSQL for persistence
- [ ] Set up load balancer for gRPC endpoint
- [ ] Deploy worker to long-running server
- [ ] Configure monitoring (Prometheus + Grafana)

---

## Monitoring & Observability

### Temporal Web UI

- [ ] Access Temporal Web UI: http://localhost:8080 (local) or cloud dashboard
- [ ] Monitor workflow execution history
- [ ] Check for failed workflows
- [ ] Review retry attempts
- [ ] Analyze workflow duration

### Database Monitoring

```sql
-- Check queue status
SELECT status, COUNT(*) FROM generation_queue GROUP BY status;

-- Check user stats
SELECT userId, concurrentJobs, maxConcurrentJobs, totalJobsCompleted, totalJobsFailed 
FROM user_queue_stats;

-- Check recent generations
SELECT * FROM generation_queue ORDER BY createdAt DESC LIMIT 10;
```

### Queue Dashboard

- [ ] Access Queue Dashboard: http://localhost:3000/queue
- [ ] Verify analytics display (queued/processing counts, avg wait time)
- [ ] Check user stats (concurrent jobs, rate limits)
- [ ] Monitor queue items with status updates

---

## Troubleshooting

### Worker Not Connecting

**Symptom**: Worker fails to connect to Temporal server

**Solutions**:
1. Verify Temporal server is running: `docker ps | grep temporal`
2. Check `TEMPORAL_SERVER_URL` environment variable
3. Test connectivity: `telnet localhost 7233`
4. Review worker logs for error messages

### Workflow Stuck in Processing

**Symptom**: Workflow never completes

**Solutions**:
1. Check Temporal Web UI for error messages
2. Verify Modal API is responding: `curl $MODAL_BASE_URL/health`
3. Check worker logs: `docker logs temporal-worker`
4. Increase workflow timeout in `temporal_workflows.py`

### Rate Limiting Not Working

**Symptom**: Users can queue unlimited jobs

**Solutions**:
1. Verify `user_queue_stats` table exists: `pnpm db:push`
2. Check `canUserQueueJob()` is called before enqueuing
3. Verify `maxConcurrentJobs` is set correctly for user tier
4. Check database for user's queue stats

### Database Connection Issues

**Symptom**: "Database not available" errors

**Solutions**:
1. Verify `DATABASE_URL` environment variable
2. Test database connection: `mysql -h host -u user -p`
3. Check database schema: `pnpm db:push`
4. Review database logs for connection errors

---

## Post-Deployment Validation

- [ ] All health checks passing
- [ ] Temporal server running and accessible
- [ ] Worker processing workflows
- [ ] Backend server responding
- [ ] Queue analytics displaying correctly
- [ ] Music generation working end-to-end
- [ ] Rate limiting enforced
- [ ] Priority queue ordering correct
- [ ] Automatic retries working
- [ ] User notifications sent

---

## Rollback Plan

If deployment fails:

1. **Stop worker**: `Ctrl+C` in worker terminal
2. **Stop Temporal**: `docker-compose down`
3. **Rollback database**: Restore from backup
4. **Rollback code**: `git checkout <previous-version>`
5. **Restart services**: Follow deployment steps with previous version

---

## Support

- **Temporal Documentation**: https://docs.temporal.io
- **Modal Documentation**: https://modal.com/docs
- **AURA-X Issues**: Contact support

---

**Deployment Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

Mark this checklist as complete when all items are checked.
