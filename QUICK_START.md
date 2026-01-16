# AURA-X Quick Start Guide
**Level 5 Autonomous Music Generation Platform**

Get AURA-X up and running in 15 minutes with this streamlined deployment guide.

---

## Prerequisites

- **Docker** installed and running
- **Node.js 22+** and **pnpm** installed
- **Python 3.11+** installed
- **Modal.com** account with API key
- **Stripe** account (optional, for tier upgrades)

---

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/aura-x-platform.git
cd aura-x-platform

# Install Node.js dependencies
pnpm install

# Install Python dependencies
pip install temporalio httpx modal
```

---

## Step 2: Configure Environment (3 minutes)

Create `.env` file in project root:

```bash
# Database (provided by Manus)
DATABASE_URL=mysql://user:password@host:port/database

# Modal.com (get from https://modal.com/settings)
MODAL_API_KEY=your_modal_api_key_here
MODAL_BASE_URL=https://your-modal-app.modal.run

# Temporal (local development)
TEMPORAL_SERVER_URL=localhost:7233
TEMPORAL_NAMESPACE=default

# Stripe (optional, for tier upgrades)
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

---

## Step 3: Deploy Temporal Infrastructure (5 minutes)

### Option A: Automated Scripts (Recommended)

```bash
# Check system health
./scripts/check-temporal-health.sh

# Start Temporal server
./scripts/start-temporal.sh

# Start worker process (in new terminal)
./scripts/start-worker.sh
```

### Option B: Manual Docker Compose

```bash
# Start Temporal server
docker-compose up -d

# Verify services
docker-compose ps

# Start worker
python temporal_workflows.py
```

**Verify Temporal is running:**
- Web UI: http://localhost:8080
- gRPC: localhost:7233

---

## Step 4: Start Application (2 minutes)

```bash
# Start Node.js backend + frontend
pnpm dev
```

**Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

---

## Step 5: Test Music Generation (3 minutes)

1. **Open AI Studio:** http://localhost:3000/ai-studio

2. **Enter a prompt:**
   ```
   Amapiano beat with log drums and piano
   ```

3. **Click "Generate Music"**

4. **Monitor progress:**
   - Check Temporal Web UI: http://localhost:8080
   - Watch queue position in AI Studio
   - Wait 30-60 seconds for completion

5. **Verify output:**
   - Audio player appears
   - Download button enabled
   - Track plays successfully

---

## Architecture Overview

```
Frontend (React + tRPC)
    ↓
Node.js Backend (Express + tRPC)
    ↓
Temporal Server (Workflow Orchestration)
    ↓
Python Worker (Workflow Activities)
    ↓
Modal.com (AI Music Generation)
```

---

## Key Features

### ✅ Autonomous Workflow Engine
- Automatic retries with exponential backoff
- Error handling and compensation
- Progress tracking and notifications

### ✅ Priority Queue System
- Tier-based priority (free/pro/enterprise)
- Rate limiting (1/3/10 concurrent jobs)
- Real-time queue position updates

### ✅ Stripe Integration
- Subscription-based tier upgrades
- Automatic tier updates via webhooks
- Test mode with 99% discount code

---

## Common Commands

### Development
```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format

# Database migration
pnpm db:push
```

### Temporal
```bash
# Check health
./scripts/check-temporal-health.sh

# Restart Temporal
docker-compose restart

# View logs
docker-compose logs -f temporal

# Stop all services
docker-compose down
```

### Database
```bash
# Check generations
mysql> SELECT * FROM generations ORDER BY createdAt DESC LIMIT 10;

# Check queue
mysql> SELECT * FROM generation_queue WHERE status = 'processing';

# Check user stats
mysql> SELECT * FROM user_queue_stats;
```

---

## Troubleshooting

### Generation Stuck

**Problem:** Generation status stuck at "processing"

**Solution:**
```bash
# Check Temporal worker is running
ps aux | grep temporal_workflows.py

# Restart worker
./scripts/start-worker.sh

# Check Modal API
curl $MODAL_BASE_URL/health
```

### Queue Not Moving

**Problem:** Queue position not updating

**Solution:**
```bash
# Restart backend
pnpm dev

# Check database connection
mysql> SELECT 1;

# Clear stuck jobs
mysql> UPDATE generation_queue SET status = 'failed' WHERE status = 'processing' AND updatedAt < NOW() - INTERVAL 5 MINUTE;
```

### Temporal Connection Failed

**Problem:** Cannot connect to Temporal server

**Solution:**
```bash
# Check Docker is running
docker ps

# Restart Temporal
docker-compose restart temporal

# Check port 7233 is open
netstat -an | grep 7233
```

---

## Next Steps

### 1. Set Up Stripe (Optional)

Follow `STRIPE_SETUP.md` to:
- Create subscription products
- Configure webhook endpoint
- Test tier upgrade flow

### 2. Deploy to Production

Follow `TEMPORAL_DEPLOYMENT.md` for:
- Temporal Cloud setup
- Worker deployment
- Production environment configuration

### 3. Run End-to-End Tests

Follow `E2E_TESTING.md` for:
- Complete workflow testing
- Queue system validation
- Error handling verification

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview and architecture |
| `QUICK_START.md` | **This file** - Get started in 15 minutes |
| `TEMPORAL_DEPLOYMENT.md` | Detailed Temporal setup and deployment |
| `STRIPE_SETUP.md` | Stripe integration and tier upgrades |
| `E2E_TESTING.md` | Comprehensive testing procedures |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deployment validation checklist |

---

## Support

### Issues
- Check `TEMPORAL_DEPLOYMENT.md` for workflow issues
- Check `E2E_TESTING.md` for testing procedures
- Review server logs: `logs/server.log`

### Resources
- Temporal Docs: https://docs.temporal.io
- Modal Docs: https://modal.com/docs
- Stripe Docs: https://stripe.com/docs

---

## Level 5 Architecture Status

### ✅ Implemented
- [x] Temporal workflow orchestration
- [x] Python worker with Modal integration
- [x] Priority queue management
- [x] Tier-based rate limiting
- [x] Automatic retry logic
- [x] Error handling and compensation
- [x] Progress tracking and notifications
- [x] Stripe tier upgrade flow

### 🚧 In Progress
- [ ] End-to-end testing with real Modal API
- [ ] Production Temporal deployment
- [ ] Load testing and performance optimization

### 📋 Planned
- [ ] Multi-region deployment
- [ ] Advanced monitoring and alerting
- [ ] Workflow versioning and rollback
- [ ] A/B testing for generation parameters

---

**Last Updated:** January 2026
**Platform Version:** e24b61d1
**Architecture:** Level 5 Autonomous Agent
