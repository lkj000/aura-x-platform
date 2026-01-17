import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { handleStripeWebhook } from './stripe-webhook';
import { getDb } from './db';
import { users, userQueueStats } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Integration Tests for Stripe Webhook Handler
 * Level 5 Autonomous Agent Architecture - Tier Upgrade Flow
 * 
 * Tests cover:
 * - Tier upgrade webhook processing
 * - Database tier updates
 * - Queue stats maxConcurrentJobs updates
 * - Error handling
 * - Test event verification
 */

describe.skip('Stripe Webhook Handler', () => {
  let testUserId: number;
  let db: Awaited<ReturnType<typeof getDb>>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error('Database not available');

    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      tier: 'free',
      role: 'user',
    });
    testUserId = user.insertId;

    // Initialize queue stats
    await db.insert(userQueueStats).values({
      userId: testUserId,
      concurrentJobs: 0,
      maxConcurrentJobs: 1, // Free tier default
      totalJobsQueued: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
    });

    // Setup mock request and response
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, send: vi.fn() }));

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  afterEach(async () => {
    if (!db) return;

    // Cleanup test data
    await db.delete(userQueueStats).where(eq(userQueueStats.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    vi.clearAllMocks();
  });

  describe('Test Event Verification', () => {
    it('should return verification response for test events', async () => {
      const testEvent: Stripe.Event = {
        id: 'evt_test_123',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: {},
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(testEvent)),
        headers: {
          'stripe-signature': 'test_signature',
        },
      };

      // Mock Stripe webhook verification to return test event
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => testEvent,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        verified: true,
      });
    });
  });

  describe('Tier Upgrade - Pro', () => {
    it('should upgrade user to pro tier and update queue limits', async () => {
      const checkoutSession: Stripe.Checkout.Session = {
        id: 'cs_test_123',
        object: 'checkout.session',
        mode: 'subscription',
        metadata: {
          userId: testUserId.toString(),
          tier: 'pro',
          userEmail: 'test@example.com',
          userName: 'Test User',
        },
        customer_details: {
          email: 'test@example.com',
          name: 'Test User',
          phone: null,
          tax_exempt: 'none',
          tax_ids: null,
        },
        payment_intent: 'pi_test_123',
        // Add other required fields with minimal values
        after_expiration: null,
        allow_promotion_codes: null,
        amount_subtotal: 2900,
        amount_total: 2900,
        automatic_tax: { enabled: false, liability: null, status: null },
        billing_address_collection: null,
        cancel_url: 'http://localhost:3000/cancel',
        client_reference_id: null,
        client_secret: null,
        consent: null,
        consent_collection: null,
        created: Date.now(),
        currency: 'usd',
        currency_conversion: null,
        custom_fields: [],
        custom_text: {
          after_submit: null,
          shipping_address: null,
          submit: null,
          terms_of_service_acceptance: null,
        },
        customer: null,
        customer_creation: null,
        customer_email: 'test@example.com',
        expires_at: Date.now() + 86400,
        invoice: null,
        invoice_creation: null,
        livemode: false,
        locale: null,
        payment_method_collection: null,
        payment_method_configuration_details: null,
        payment_method_options: null,
        payment_method_types: ['card'],
        payment_status: 'paid',
        phone_number_collection: null,
        recovered_from: null,
        saved_payment_method_options: null,
        setup_intent: null,
        shipping_address_collection: null,
        shipping_cost: null,
        shipping_details: null,
        shipping_options: [],
        status: 'complete',
        submit_type: null,
        subscription: 'sub_test_123',
        success_url: 'http://localhost:3000/success',
        total_details: {
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax: 0,
        },
        ui_mode: 'hosted',
        url: null,
      };

      const event: Stripe.Event = {
        id: 'evt_123',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: checkoutSession,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(event)),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      };

      // Mock Stripe webhook verification
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => event,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Verify user tier updated
      const [updatedUser] = await db!
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(updatedUser.tier).toBe('pro');

      // Verify queue stats updated
      const [updatedStats] = await db!
        .select()
        .from(userQueueStats)
        .where(eq(userQueueStats.userId, testUserId));

      expect(updatedStats.maxConcurrentJobs).toBe(3); // Pro tier limit

      // Verify response
      expect(jsonMock).toHaveBeenCalledWith({
        received: true,
        tierUpgrade: 'pro',
        userId: testUserId.toString(),
      });
    });
  });

  describe('Tier Upgrade - Enterprise', () => {
    it('should upgrade user to enterprise tier and update queue limits', async () => {
      const checkoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_456',
        mode: 'subscription',
        metadata: {
          userId: testUserId.toString(),
          tier: 'enterprise',
          userEmail: 'test@example.com',
          userName: 'Test User',
        },
        customer_details: {
          email: 'test@example.com',
          name: 'Test User',
          phone: null,
          tax_exempt: 'none',
          tax_ids: null,
        },
        payment_intent: 'pi_test_456',
      };

      const event: Stripe.Event = {
        id: 'evt_456',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: checkoutSession,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(event)),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      };

      // Mock Stripe webhook verification
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => event,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Verify user tier updated
      const [updatedUser] = await db!
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(updatedUser.tier).toBe('enterprise');

      // Verify queue stats updated
      const [updatedStats] = await db!
        .select()
        .from(userQueueStats)
        .where(eq(userQueueStats.userId, testUserId));

      expect(updatedStats.maxConcurrentJobs).toBe(10); // Enterprise tier limit
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing signature', async () => {
      mockReq = {
        body: Buffer.from('{}'),
        headers: {},
      };

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing userId in tier upgrade', async () => {
      const checkoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_789',
        mode: 'subscription',
        metadata: {
          tier: 'pro',
          // Missing userId
        },
      };

      const event: Stripe.Event = {
        id: 'evt_789',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: checkoutSession,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(event)),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      };

      // Mock Stripe webhook verification
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => event,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing userId' });
    });

    it('should return 500 for database errors', async () => {
      const checkoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_error',
        mode: 'subscription',
        metadata: {
          userId: '999999', // Non-existent user
          tier: 'pro',
        },
      };

      const event: Stripe.Event = {
        id: 'evt_error',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: checkoutSession,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(event)),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      };

      // Mock Stripe webhook verification
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => event,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('Non-Tier Events', () => {
    it('should handle pack purchases separately from tier upgrades', async () => {
      const checkoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_pack',
        mode: 'payment', // Not subscription
        metadata: {
          userId: testUserId.toString(),
          pack_id: '123',
          // No tier field
        },
        payment_intent: 'pi_test_pack',
      };

      const event: Stripe.Event = {
        id: 'evt_pack',
        object: 'event',
        api_version: '2025-12-15',
        created: Date.now(),
        data: {
          object: checkoutSession,
        },
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'checkout.session.completed',
      };

      mockReq = {
        body: Buffer.from(JSON.stringify(event)),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      };

      // Mock Stripe webhook verification
      vi.mock('stripe', () => ({
        default: class {
          webhooks = {
            constructEvent: () => event,
          };
        },
      }));

      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Verify user tier NOT changed (should still be free)
      const [user] = await db!
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.tier).toBe('free');

      // Verify queue stats NOT changed
      const [stats] = await db!
        .select()
        .from(userQueueStats)
        .where(eq(userQueueStats.userId, testUserId));

      expect(stats.maxConcurrentJobs).toBe(1); // Still free tier limit
    });
  });
});
