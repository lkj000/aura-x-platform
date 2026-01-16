# Stripe Setup Guide
## AURA-X Platform - Tier Subscription Configuration

This guide walks you through setting up Stripe subscription products for the AURA-X tier system.

---

## Prerequisites

- Stripe account (create at https://stripe.com)
- Access to Stripe Dashboard
- AURA-X platform deployed and running

---

## Step 1: Claim Your Stripe Test Sandbox

Your Stripe test sandbox has been pre-configured but needs to be claimed:

**Claim URL:** https://dashboard.stripe.com/claim_sandbox/YWNjdF8xU3EwaHVHYUx2amx5RmVNLDE3NjkxMzAwNDYv1007YH3YOt9

**Expiration:** 2026-03-17T01:00:46.000Z

**Action Required:**
1. Visit the claim URL above
2. Sign in with your Stripe account (or create one)
3. Complete the sandbox claim process
4. You'll be redirected to your test environment dashboard

---

## Step 2: Create Subscription Products

### Pro Tier Product ($29/month)

1. Navigate to **Products** in Stripe Dashboard
2. Click **+ Add product**
3. Fill in product details:
   - **Name:** `AURA-X Pro`
   - **Description:** `Professional music production with enhanced AI generation capabilities`
   - **Pricing model:** Recurring
   - **Price:** `$29.00 USD`
   - **Billing period:** Monthly
   - **Currency:** USD

4. Click **Save product**
5. **Copy the Price ID** (starts with `price_...`) - you'll need this for environment variables

### Enterprise Tier Product ($99/month)

1. Click **+ Add product** again
2. Fill in product details:
   - **Name:** `AURA-X Enterprise`
   - **Description:** `Enterprise-grade music production with unlimited AI generation`
   - **Pricing model:** Recurring
   - **Price:** `$99.00 USD`
   - **Billing period:** Monthly
   - **Currency:** USD

3. Click **Save product**
4. **Copy the Price ID** (starts with `price_...`)

---

## Step 3: Configure Webhook Endpoint

### Create Webhook

1. Navigate to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter your webhook URL:
   - **Test mode:** `https://your-domain.manus.space/api/stripe/webhook`
   - **Live mode:** `https://your-custom-domain.com/api/stripe/webhook`

4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)

---

## Step 4: Configure Environment Variables

Update your environment variables in the Manus Settings → Secrets panel:

### Required Variables

```bash
# Stripe API Keys (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...  # Test mode secret key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Test mode publishable key

# Stripe Webhook Secret (from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_PRO=price_...  # Pro tier price ID
STRIPE_PRICE_ENTERPRISE=price_...  # Enterprise tier price ID
```

### How to Update in Manus

1. Open your project in Manus
2. Click the **Management UI** icon (top-right)
3. Navigate to **Settings** → **Secrets**
4. Click **Edit** next to each variable
5. Paste the new values
6. Click **Save**

---

## Step 5: Test the Integration

### Test with Stripe Test Cards

Use these test card numbers in test mode:

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined payment |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Test Details:**
- **Expiration:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

### Testing Flow

1. **Open AURA-X** in your browser
2. **Navigate to Queue Dashboard** (/queue)
3. **Click "Upgrade Plan"** button
4. **Select a tier** (Pro or Enterprise)
5. **Click "Upgrade to [Tier]"**
6. **Complete Stripe Checkout** with test card `4242 4242 4242 4242`
7. **Verify tier upgrade:**
   - Check your tier badge in Queue Dashboard
   - Verify concurrent job limit increased
   - Check database: `SELECT * FROM users WHERE id = YOUR_USER_ID;`

### Verify Webhook Delivery

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **Recent deliveries** tab
4. Verify `checkout.session.completed` event was delivered successfully
5. Check response status should be `200 OK`

---

## Step 6: Go Live (Production Setup)

### Before Going Live

1. **Complete Stripe KYC verification:**
   - Navigate to **Settings** → **Account details**
   - Complete business verification
   - Add bank account for payouts

2. **Create live mode products:**
   - Switch to **Live mode** (toggle in top-right)
   - Repeat Step 2 to create Pro and Enterprise products
   - Copy new live mode Price IDs

3. **Create live mode webhook:**
   - Repeat Step 3 with your production domain
   - Copy new live mode Signing secret

4. **Update environment variables:**
   - Replace test keys with live keys
   - Update `STRIPE_SECRET_KEY` with `sk_live_...`
   - Update `VITE_STRIPE_PUBLISHABLE_KEY` with `pk_live_...`
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
   - Update `STRIPE_PRICE_PRO` and `STRIPE_PRICE_ENTERPRISE` with live price IDs

### Live Mode Testing

**Important:** Stripe requires minimum $0.50 USD for live transactions.

**99% Discount Promo Code Available:**
- Use for testing live mode without significant charges
- Contact Stripe support to enable promo codes for your account

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct and accessible
2. SSL certificate is valid (required for webhooks)
3. Firewall/security groups allow Stripe IPs
4. Check webhook logs in Stripe Dashboard

**Test webhook locally:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Tier Not Updating After Payment

**Check:**
1. Webhook event was delivered (check Stripe Dashboard)
2. Webhook response was 200 OK
3. Check server logs for errors
4. Verify metadata in checkout session includes `tier` field
5. Check database: `SELECT * FROM users WHERE id = USER_ID;`

### Price ID Not Found

**Error:** `No such price: price_...`

**Solution:**
1. Verify price ID is correct (copy from Stripe Dashboard)
2. Ensure you're using test mode price IDs in test mode
3. Check environment variables are set correctly

### Checkout Session Creation Fails

**Check:**
1. `STRIPE_SECRET_KEY` is set correctly
2. API key has correct permissions
3. Price IDs exist and are active
4. Check server logs for detailed error message

---

## Monitoring & Analytics

### Stripe Dashboard

Monitor your subscription metrics:
- **Home** → View MRR (Monthly Recurring Revenue)
- **Customers** → View subscriber list
- **Subscriptions** → View active/cancelled subscriptions
- **Payments** → View payment history

### AURA-X Analytics

Monitor tier distribution:
- **Admin Dashboard** (/admin/users)
- View tier statistics (free/pro/enterprise counts)
- Monitor user tier changes

---

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all secrets**
3. **Rotate keys periodically** (every 90 days recommended)
4. **Monitor webhook deliveries** for suspicious activity
5. **Enable Stripe Radar** for fraud detection (available in live mode)
6. **Use restricted API keys** with minimal permissions when possible

---

## Support

### Stripe Support
- Dashboard: https://dashboard.stripe.com
- Documentation: https://stripe.com/docs
- Support: https://support.stripe.com

### AURA-X Support
- Check `TEMPORAL_DEPLOYMENT.md` for workflow issues
- Check `E2E_TESTING.md` for testing procedures
- Review server logs for detailed error messages

---

## Quick Reference

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Test Card
```
Number: 4242 4242 4242 4242
Expiration: 12/34
CVC: 123
ZIP: 12345
```

### Webhook URL
```
https://your-domain.manus.space/api/stripe/webhook
```

### Price Points
- **Pro:** $29.00 USD/month
- **Enterprise:** $99.00 USD/month

---

**Last Updated:** January 2026
**Platform Version:** e24b61d1
