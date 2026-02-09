# Modal Pro Test Plan

**Date:** 2026-02-09  
**Purpose:** Comprehensive testing after Modal Pro upgrade

---

## Pre-Test Verification

### 1. Verify Modal Pro Status
```bash
modal profile current
```
**Expected output:**
```
Workspace: mabgwej
Tier: pro
```

### 2. Check Modal Deployment
```bash
modal app list
```
**Expected:** `aura-x-ai` app should be listed

### 3. Verify Secrets
```bash
modal secret list
```
**Expected:** `aura-x-secrets` should be present

---

## Test Suite

### Test 1: Single Generation (Cold Start)
**Purpose:** Measure first-time generation with model download

**Steps:**
1. Clear any existing generations from database
2. Trigger new generation from frontend
3. Monitor status every 10 seconds
4. Record timestamps for each phase

**Expected Timeline:**
- Request sent: 0s
- Status → processing: 1-2s
- Model download: 8s
- Audio generation: 30s
- S3 upload: 2s
- Webhook callback: 1s
- Status → completed: **~42s total**

**Success Criteria:**
- ✅ No queue delays
- ✅ Completion in 40-45 seconds
- ✅ Valid audio URL returned
- ✅ Audio file accessible and playable
- ✅ Cultural score calculated

### Test 2: Rapid Sequential Generations
**Purpose:** Verify model caching and consistent performance

**Steps:**
1. Trigger 5 generations back-to-back
2. Monitor completion time for each
3. Verify all complete successfully

**Expected Timeline (per generation):**
- Generation 1: ~42s (cold start)
- Generation 2: ~34s (warm start)
- Generation 3: ~34s (cached)
- Generation 4: ~34s (cached)
- Generation 5: ~34s (cached)

**Success Criteria:**
- ✅ All 5 generations complete
- ✅ Generations 2-5 faster than generation 1
- ✅ Consistent performance across cached runs
- ✅ No errors or timeouts

### Test 3: Concurrent Generations
**Purpose:** Test parallel processing capability

**Steps:**
1. Open 3 browser tabs
2. Trigger generation in each tab simultaneously
3. Monitor all 3 generations

**Expected Behavior:**
- All 3 should process in parallel
- Each completes in ~40 seconds
- No queue delays between them

**Success Criteria:**
- ✅ All 3 complete within 60 seconds
- ✅ No "waiting for GPU" messages
- ✅ All audio files valid

### Test 4: Different Parameters
**Purpose:** Verify generation works with various configurations

**Test Cases:**
| Test | Duration | Tempo | Key | Style | Expected Time |
|------|----------|-------|-----|-------|---------------|
| 4a   | 10s      | 100   | C maj | Kasi | ~25s |
| 4b   | 30s      | 112   | F min | Bacardi | ~40s |
| 4c   | 60s      | 120   | G min | Soulful | ~70s |

**Success Criteria:**
- ✅ All parameter combinations work
- ✅ Longer durations take proportionally longer
- ✅ No parameter-specific errors

### Test 5: Error Handling
**Purpose:** Verify graceful error handling

**Test Cases:**
1. Invalid prompt (empty string)
2. Extreme duration (180s)
3. Invalid tempo (300 BPM)

**Expected Behavior:**
- Validation errors caught before Modal call
- User-friendly error messages
- No crashes or stuck states

**Success Criteria:**
- ✅ Appropriate error messages shown
- ✅ System remains stable
- ✅ Can retry after error

### Test 6: End-to-End Workflow
**Purpose:** Complete user journey validation

**Steps:**
1. Navigate to Instruments page
2. Configure parameters
3. Write custom prompt
4. Generate track
5. Preview audio in player
6. Download audio file
7. Verify file plays locally

**Success Criteria:**
- ✅ Smooth user experience
- ✅ Audio preview works in browser
- ✅ Downloaded file is valid WAV
- ✅ Cultural score displayed
- ✅ Generation saved to history

### Test 7: Cost Validation
**Purpose:** Verify billing is accurate

**Steps:**
1. Note starting Modal credits
2. Run 10 generations
3. Check Modal dashboard for usage
4. Calculate cost per generation

**Expected Cost:**
- A10G: $0.60/hour
- 40 seconds = 0.011 hours
- Cost per generation: $0.0066 (~0.7 cents)
- 10 generations: $0.066 (~7 cents)

**Success Criteria:**
- ✅ Billing matches expected cost
- ✅ No unexpected charges
- ✅ Usage dashboard shows accurate GPU time

---

## Performance Benchmarks

### Target Metrics
| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Cold start | 40s | 60s | 90s+ |
| Warm start | 34s | 45s | 60s+ |
| Queue delay | 0s | 5s | 30s+ |
| Success rate | 100% | 95% | <90% |

### Monitoring Commands

**Check generation status:**
```bash
cd /home/ubuntu/aura-x-platform && node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query('SELECT id, status, resultUrl, processingTime FROM generations ORDER BY id DESC LIMIT 10');
  console.table(rows);
  await conn.end();
})();
"
```

**Monitor Modal logs:**
```bash
modal container logs <container_id>
```

**Check S3 bucket:**
```bash
cd /home/ubuntu/aura-x-platform && node -e "
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3 = new S3Client({ region: 'us-east-1' });
(async () => {
  const result = await s3.send(new ListObjectsV2Command({ Bucket: 'aura-x-audio-generation', MaxKeys: 10 }));
  console.log('Recent files:', result.Contents?.map(f => f.Key));
})();
"
```

---

## Troubleshooting

### Issue: Still seeing queue delays
**Solution:** Verify Pro tier with `modal profile current`

### Issue: Generations timing out
**Solution:** Check Modal logs for errors, verify secrets are correct

### Issue: Audio URLs not accessible
**Solution:** Verify S3 bucket policy allows public read

### Issue: High costs
**Solution:** Check for stuck containers, implement timeout handling

---

## Success Criteria Summary

**Must Pass:**
- ✅ Test 1: Cold start < 60s
- ✅ Test 2: Warm start < 45s
- ✅ Test 3: Concurrent processing works
- ✅ Test 6: End-to-end workflow smooth
- ✅ Test 7: Costs match expectations

**Nice to Have:**
- ✅ Test 4: All parameters work
- ✅ Test 5: Error handling graceful

---

## Post-Test Actions

### If All Tests Pass
1. Update documentation with actual performance metrics
2. Save checkpoint with "Production Ready" status
3. Create user guide for generation feature
4. Implement monitoring and alerts

### If Tests Fail
1. Document specific failures
2. Investigate root cause
3. Implement fixes
4. Re-run failed tests
5. Update test plan based on learnings

---

## Next Steps After Testing

1. **Implement timeout handling** (15 minute limit)
2. **Add progress tracking** (show estimated time)
3. **Optimize costs** (implement container keep-alive)
4. **Add monitoring** (track success rate, avg time)
5. **User documentation** (how to use generation feature)

---

## Ready to Test!

Once you've upgraded to Modal Pro, let me know and I'll execute this comprehensive test plan. Expected total test time: ~15 minutes.
