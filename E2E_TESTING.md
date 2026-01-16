# End-to-End Testing Guide
**AURA-X Platform - Level 5 Autonomous Agent Architecture**

This guide provides comprehensive testing procedures for the complete AURA-X workflow from AI Studio through Temporal to Modal with database updates and notifications.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Pre-Test Setup](#pre-test-setup)
3. [AI Studio Generation Flow](#ai-studio-generation-flow)
4. [Temporal Workflow Verification](#temporal-workflow-verification)
5. [Modal API Monitoring](#modal-api-monitoring)
6. [Database State Verification](#database-state-verification)
7. [Notification Delivery Testing](#notification-delivery-testing)
8. [Queue System Testing](#queue-system-testing)
9. [Tier System Testing](#tier-system-testing)
10. [Error Handling Testing](#error-handling-testing)

---

## Testing Overview

### Complete Workflow Path

```
User Action (AI Studio)
    ↓
tRPC API Call (aiStudio.generateMusic)
    ↓
Queue Management (enqueueGeneration)
    ↓
Temporal Workflow Execution (MusicGenerationWorkflow)
    ↓
Modal API Call (call_modal_music_generation activity)
    ↓
Poll for Completion (5-second intervals)
    ↓
Database Update (update_generation_status activity)
    ↓
User Notification (send_completion_notification activity)
    ↓
Frontend Update (tRPC query refetch)
```

### Test Objectives

- ✅ Verify complete workflow execution without errors
- ✅ Confirm automatic retry logic works correctly
- ✅ Validate queue management and rate limiting
- ✅ Test tier-based priority and concurrent job limits
- ✅ Verify database state consistency
- ✅ Confirm notification delivery
- ✅ Test error handling and compensation

---

## Pre-Test Setup

### 1. Start All Services

```bash
# Terminal 1: Start Temporal server
./scripts/start-temporal.sh

# Terminal 2: Start Temporal worker
./scripts/start-worker.sh

# Terminal 3: Start Node.js backend
pnpm dev
```

### 2. Verify Services Are Running

```bash
# Check Temporal server
curl http://localhost:7233

# Check Temporal Web UI
open http://localhost:8080

# Check Node.js backend
curl http://localhost:3000/api/health

# Check worker logs
# Should see: "[Temporal] Worker started on task queue: aura-x-music-generation"
```

### 3. Prepare Test Data

```sql
-- Check your user ID
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Check current tier
SELECT id, name, email, tier FROM users WHERE id = YOUR_USER_ID;

-- Check queue stats
SELECT * FROM user_queue_stats WHERE userId = YOUR_USER_ID;
```

### 4. Clear Previous Test Data (Optional)

```sql
-- Clear old generations
DELETE FROM generations WHERE userId = YOUR_USER_ID AND createdAt < NOW() - INTERVAL 1 HOUR;

-- Clear old queue items
DELETE FROM generation_queue WHERE userId = YOUR_USER_ID AND status IN ('completed', 'failed');
```

---

## AI Studio Generation Flow

### Test Case 1: Simple Mode Generation

**Objective:** Verify basic music generation workflow

**Steps:**

1. **Open AI Studio** (http://localhost:3000/ai-studio)

2. **Select Simple Mode** (default)

3. **Enter Test Prompt:**
   ```
   Amapiano beat with log drums and piano
   ```

4. **Click "Generate Music"**

5. **Expected Behavior:**
   - Button changes to "Generating..."
   - Loading spinner appears
   - Toast notification: "Generation started"
   - Queue position badge appears (if queued)

6. **Monitor Progress:**
   - Watch for status updates every 3 seconds
   - Queue position should decrease
   - Status should change: queued → processing → completed

7. **Verify Completion:**
   - Audio player appears with generated track
   - Download button is enabled
   - Generation card shows in history
   - Toast notification: "Generation complete!"

**Expected Timeline:**
- Queue wait: 0-30 seconds (depends on queue)
- Generation: 30-60 seconds (depends on Modal)
- Total: 30-90 seconds

### Test Case 2: Custom Mode Generation

**Objective:** Verify advanced parameters work correctly

**Steps:**

1. **Switch to Custom Mode**

2. **Configure Parameters:**
   - Duration: 45 seconds
   - Temperature: 1.2
   - Top-k: 300
   - Top-p: 0.95
   - Classifier Free Guidance: 4.0

3. **Enter Prompt:**
   ```
   Energetic Amapiano track with heavy bass and vocal chops
   ```

4. **Click "Generate Music"**

5. **Verify Parameters Sent:**
   - Check Network tab in browser DevTools
   - Verify tRPC call includes all custom parameters

6. **Wait for Completion**

7. **Verify Output:**
   - Track duration matches requested (45s)
   - Audio quality reflects temperature setting

---

## Temporal Workflow Verification

### Using Temporal Web UI

1. **Open Temporal Web UI:** http://localhost:8080

2. **Navigate to Workflows:**
   - Click "Workflows" in sidebar
   - Filter by "Running" status

3. **Find Your Workflow:**
   - Search for workflow ID (shown in AI Studio)
   - Or filter by task queue: `aura-x-music-generation`

4. **Inspect Workflow Details:**
   - **Input:** Verify generation parameters
   - **History:** Check activity execution timeline
   - **Status:** Should show "Running" or "Completed"

5. **Monitor Activities:**
   - `call_modal_music_generation`: Initial API call
   - `poll_modal_job`: Repeated polling (every 5s)
   - `update_generation_status`: Database updates
   - `send_completion_notification`: Final notification

6. **Check for Retries:**
   - If Modal API fails, should see retry attempts
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s
   - Max 5 attempts

### Using Temporal CLI (Optional)

```bash
# Install Temporal CLI
brew install temporal

# List workflows
temporal workflow list --namespace default

# Describe specific workflow
temporal workflow describe --workflow-id music-generation-123

# Show workflow history
temporal workflow show --workflow-id music-generation-123
```

---

## Modal API Monitoring

### Check Modal Logs

1. **Open Modal Dashboard:** https://modal.com/apps

2. **Select Your App:** (e.g., `aura-x-music-generation`)

3. **View Function Logs:**
   - Click on `generate_music` function
   - Check recent invocations
   - Verify input parameters
   - Check execution time

4. **Monitor Errors:**
   - Look for failed invocations
   - Check error messages
   - Verify retry attempts from Temporal

### Test Modal API Directly (Optional)

```bash
# Test music generation endpoint
curl -X POST https://your-modal-app.modal.run/generate-music \
  -H "Authorization: Bearer $MODAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Amapiano beat",
    "duration": 30,
    "temperature": 1.0
  }'

# Response should include job_id
# {"job_id": "job-abc123", "status": "processing"}
```

---

## Database State Verification

### Check Generation Record

```sql
-- Find your generation
SELECT * FROM generations 
WHERE userId = YOUR_USER_ID 
ORDER BY createdAt DESC 
LIMIT 1;

-- Expected fields:
-- id, userId, prompt, status, audioUrl, createdAt, updatedAt
```

**Status Progression:**
1. `queued` - Initial state
2. `processing` - Workflow started
3. `completed` - Success
4. `failed` - Error occurred

### Check Queue Record

```sql
-- Find queue entry
SELECT * FROM generation_queue 
WHERE generationId = YOUR_GENERATION_ID;

-- Expected fields:
-- id, userId, generationId, status, priority, queuePosition, retryCount, maxRetries
```

**Queue Status:**
- `queued` - Waiting in queue
- `processing` - Workflow executing
- `completed` - Finished successfully
- `failed` - Max retries exceeded

### Check User Queue Stats

```sql
-- Check your queue stats
SELECT * FROM user_queue_stats 
WHERE userId = YOUR_USER_ID;

-- Expected fields:
-- userId, concurrentJobs, maxConcurrentJobs, totalJobsQueued, totalJobsCompleted, totalJobsFailed
```

**Verify:**
- `concurrentJobs` increments when generation starts
- `concurrentJobs` decrements when generation completes
- `totalJobsQueued` increments for each new generation
- `totalJobsCompleted` increments on success
- `totalJobsFailed` increments on failure

---

## Notification Delivery Testing

### Check Notification Logs

```bash
# Check server logs for notification activity
grep "Notification" logs/server.log

# Expected output:
# [Notification] Sending to user 123: Generation complete
# [Notification] Delivered successfully
```

### Verify Notification Content

**Success Notification:**
```
Title: Music Generation Complete
Content: Your Amapiano track is ready!
Generation ID: 123
Duration: 30 seconds
```

**Failure Notification:**
```
Title: Music Generation Failed
Content: We couldn't generate your track after 5 attempts.
Generation ID: 123
Error: Modal API timeout
```

---

## Queue System Testing

### Test Case 1: Queue Position Updates

**Objective:** Verify queue position decreases as jobs complete

**Steps:**

1. **Create Multiple Generations:**
   - Submit 3 generations in quick succession
   - Note the queue positions (e.g., #1, #2, #3)

2. **Monitor Queue Positions:**
   - Watch AI Studio queue position badges
   - Positions should decrease as jobs complete
   - #3 → #2 → #1 → Processing

3. **Verify in Database:**
   ```sql
   SELECT id, generationId, queuePosition, status 
   FROM generation_queue 
   WHERE userId = YOUR_USER_ID 
   ORDER BY queuePosition;
   ```

### Test Case 2: Rate Limiting

**Objective:** Verify concurrent job limits work correctly

**Steps:**

1. **Check Your Tier:**
   ```sql
   SELECT tier FROM users WHERE id = YOUR_USER_ID;
   ```
   - Free: 1 concurrent job
   - Pro: 3 concurrent jobs
   - Enterprise: 10 concurrent jobs

2. **Submit Jobs Up to Limit:**
   - Free: Submit 1 job → should process immediately
   - Pro: Submit 3 jobs → all should process
   - Enterprise: Submit 10 jobs → all should process

3. **Submit One More Job:**
   - Should be queued (not processing)
   - Queue position badge should appear

4. **Wait for One Job to Complete:**
   - Queued job should start processing automatically

5. **Verify in Database:**
   ```sql
   SELECT concurrentJobs, maxConcurrentJobs 
   FROM user_queue_stats 
   WHERE userId = YOUR_USER_ID;
   ```

### Test Case 3: Queue Analytics

**Objective:** Verify queue analytics are accurate

**Steps:**

1. **Open Queue Dashboard:** http://localhost:3000/queue

2. **Check Metrics:**
   - **Queued Jobs:** Count of jobs waiting
   - **Processing:** Count of jobs running
   - **Avg Wait Time:** Average time in queue

3. **Verify Against Database:**
   ```sql
   -- Queued count
   SELECT COUNT(*) FROM generation_queue WHERE status = 'queued';
   
   -- Processing count
   SELECT COUNT(*) FROM generation_queue WHERE status = 'processing';
   
   -- Avg wait time
   SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, startedAt)) 
   FROM generation_queue 
   WHERE status = 'completed' AND startedAt IS NOT NULL;
   ```

---

## Tier System Testing

### Test Case 1: Tier-Based Priority

**Objective:** Verify higher tiers get priority in queue

**Setup:**

1. **Create Test Users:**
   ```sql
   -- User 1: Free tier
   UPDATE users SET tier = 'free' WHERE id = 1;
   
   -- User 2: Pro tier
   UPDATE users SET tier = 'pro' WHERE id = 2;
   
   -- User 3: Enterprise tier
   UPDATE users SET tier = 'enterprise' WHERE id = 3;
   ```

2. **Submit Jobs Simultaneously:**
   - User 1 (free) submits job → priority 1
   - User 2 (pro) submits job → priority 5
   - User 3 (enterprise) submits job → priority 10

3. **Verify Queue Order:**
   ```sql
   SELECT userId, priority, queuePosition 
   FROM generation_queue 
   WHERE status = 'queued' 
   ORDER BY priority DESC, createdAt ASC;
   ```

4. **Expected Order:**
   - Enterprise job processes first (priority 10)
   - Pro job processes second (priority 5)
   - Free job processes last (priority 1)

### Test Case 2: Tier Upgrade Flow

**Objective:** Verify tier upgrade increases limits immediately

**Steps:**

1. **Check Current Limits (Free Tier):**
   ```sql
   SELECT tier, maxConcurrentJobs 
   FROM user_queue_stats 
   JOIN users ON users.id = user_queue_stats.userId 
   WHERE userId = YOUR_USER_ID;
   ```
   - Expected: tier='free', maxConcurrentJobs=1

2. **Upgrade to Pro:**
   - Open Queue Dashboard
   - Click "Upgrade Plan"
   - Select "Pro" tier
   - Complete Stripe checkout (use test card: 4242 4242 4242 4242)

3. **Verify Tier Updated:**
   ```sql
   SELECT tier, maxConcurrentJobs 
   FROM user_queue_stats 
   JOIN users ON users.id = user_queue_stats.userId 
   WHERE userId = YOUR_USER_ID;
   ```
   - Expected: tier='pro', maxConcurrentJobs=3

4. **Test New Limits:**
   - Submit 3 jobs → all should process immediately
   - Submit 4th job → should be queued

---

## Error Handling Testing

### Test Case 1: Modal API Failure

**Objective:** Verify automatic retry logic works

**Steps:**

1. **Simulate Modal Failure:**
   - Temporarily set invalid `MODAL_API_KEY`
   - Or use Modal dashboard to disable function

2. **Submit Generation:**
   - Should fail initially
   - Temporal should retry automatically

3. **Monitor Retries:**
   - Check Temporal Web UI
   - Should see 5 retry attempts
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s

4. **Verify Failure Notification:**
   - After 5 failed attempts, user should receive notification
   - Generation status should be 'failed'

5. **Check Database:**
   ```sql
   SELECT status, retryCount, maxRetries 
   FROM generation_queue 
   WHERE generationId = YOUR_GENERATION_ID;
   ```
   - Expected: status='failed', retryCount=5, maxRetries=5

### Test Case 2: Database Connection Loss

**Objective:** Verify workflow handles database errors gracefully

**Steps:**

1. **Simulate Database Failure:**
   - Stop database temporarily
   - Or set invalid `DATABASE_URL`

2. **Submit Generation:**
   - Should fail to create queue entry
   - Error should be caught and returned to user

3. **Verify Error Message:**
   - Toast notification should show error
   - No orphaned workflow should be created

4. **Restore Database:**
   - Restart database
   - Retry generation → should work

---

## Test Checklist

Use this checklist to verify all functionality:

### Basic Workflow
- [ ] Simple mode generation completes successfully
- [ ] Custom mode generation with parameters works
- [ ] Audio file is playable
- [ ] Download button works
- [ ] Generation appears in history

### Temporal Integration
- [ ] Workflow appears in Temporal Web UI
- [ ] All activities execute in correct order
- [ ] Workflow completes successfully
- [ ] No orphaned workflows

### Modal Integration
- [ ] Modal function is invoked
- [ ] Job ID is returned
- [ ] Polling works correctly
- [ ] Audio URL is returned

### Database
- [ ] Generation record created
- [ ] Queue entry created
- [ ] User stats updated correctly
- [ ] Status progression is correct

### Notifications
- [ ] Completion notification sent
- [ ] Failure notification sent (on error)
- [ ] Notification content is correct

### Queue System
- [ ] Queue position updates correctly
- [ ] Rate limiting enforced
- [ ] Concurrent job count accurate
- [ ] Queue analytics correct

### Tier System
- [ ] Priority based on tier
- [ ] Concurrent limits enforced
- [ ] Tier upgrade works
- [ ] Limits update immediately

### Error Handling
- [ ] Automatic retries work
- [ ] Exponential backoff applied
- [ ] Max retries enforced
- [ ] Failure notifications sent
- [ ] Database errors handled

---

## Performance Benchmarks

### Expected Timings

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Queue enqueue | < 100ms | Database insert |
| Workflow start | < 500ms | Temporal client call |
| Modal API call | 30-60s | Music generation |
| Poll interval | 5s | Configurable |
| Database update | < 100ms | Per status change |
| Notification | < 500ms | Async operation |
| **Total (success)** | **30-90s** | Queue wait + generation |

### Load Testing

Test with multiple concurrent users:

```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: 'Generate Music'
    flow:
      - post:
          url: '/api/trpc/aiStudio.generateMusic'
          json:
            prompt: 'Amapiano beat'
            duration: 30
EOF

# Run load test
artillery run load-test.yml
```

---

## Troubleshooting

### Generation Stuck in "Processing"

**Check:**
1. Temporal worker is running
2. Modal API is accessible
3. Check Temporal Web UI for errors
4. Check worker logs for exceptions

**Fix:**
```bash
# Restart worker
./scripts/start-worker.sh

# Check workflow status
temporal workflow describe --workflow-id YOUR_WORKFLOW_ID
```

### Queue Position Not Updating

**Check:**
1. Frontend is polling correctly (every 3s)
2. tRPC endpoint is working
3. Database connection is stable

**Fix:**
```bash
# Check tRPC endpoint
curl http://localhost:3000/api/trpc/queue.getUserQueue

# Restart backend
pnpm dev
```

### Notifications Not Received

**Check:**
1. `notifyOwner` function is configured
2. Check server logs for notification errors
3. Verify notification service is running

**Fix:**
```bash
# Check logs
grep "Notification" logs/server.log

# Test notification manually
curl -X POST http://localhost:3000/api/trpc/system.notifyOwner \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Test notification"}'
```

---

## Next Steps

After completing all tests:

1. **Document Results:** Record any failures or unexpected behavior
2. **Performance Tuning:** Adjust poll intervals, retry limits based on results
3. **Production Deployment:** Follow `TEMPORAL_DEPLOYMENT.md` for production setup
4. **Monitoring Setup:** Configure Prometheus/Grafana for production monitoring

---

**Last Updated:** January 2026
**Platform Version:** e24b61d1
