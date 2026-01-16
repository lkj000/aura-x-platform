import type { Request, Response } from 'express';
import Stripe from 'stripe';
import * as db from './db';
import { notifyOwner } from './_core/notification';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

/**
 * Stripe Webhook Handler
 * 
 * Handles webhook events from Stripe, specifically checkout.session.completed
 * to create purchase records after successful payments.
 * 
 * CRITICAL: This endpoint must be registered with express.raw({ type: 'application/json' })
 * BEFORE express.json() to ensure signature verification works.
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Stripe Webhook] No signature found');
    return res.status(400).send('Webhook Error: No signature');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log('[Stripe Webhook] Test event detected, returning verification response');
    return res.json({ 
      verified: true,
    });
  }

  console.log('[Stripe Webhook] Event received:', event.type, event.id);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('[Stripe Webhook] Checkout session completed:', session.id);
        console.log('[Stripe Webhook] Metadata:', session.metadata);

        // Extract metadata
        const userId = session.metadata?.user_id;
        const packId = session.metadata?.pack_id;
        const bundleId = session.metadata?.bundle_id;
        const type = session.metadata?.type; // 'bundle' or undefined (single pack)
        const paymentIntentId = session.payment_intent as string;

        if (!userId) {
          console.error('[Stripe Webhook] Missing userId:', { userId });
          return res.status(400).json({ 
            error: 'Missing required metadata',
            received: { userId }
          });
        }

        let purchaseIds: number[] = [];

        if (type === 'bundle' && bundleId) {
          // Bundle purchase - create purchase records for all packs in bundle
          console.log('[Stripe Webhook] Processing bundle purchase:', bundleId);
          const bundle = await db.getMarketplaceBundle(Number(bundleId));
          
          if (!bundle || !bundle.packs) {
            console.error('[Stripe Webhook] Bundle not found:', bundleId);
            return res.status(404).json({ error: 'Bundle not found' });
          }

          // Create purchase record for each pack in bundle
          for (const pack of bundle.packs) {
            const purchase = await db.createMarketplacePurchase({
              userId: Number(userId),
              packId: pack.id,
              paymentIntentId: paymentIntentId,
            });
            purchaseIds.push(purchase.id);
          }

          console.log('[Stripe Webhook] Bundle purchases created:', purchaseIds);
        } else {
          // Single pack purchase
          if (!packId) {
            console.error('[Stripe Webhook] Missing packId for single purchase');
            return res.status(400).json({ 
              error: 'Missing required metadata',
              received: { userId, packId }
            });
          }

          const pack = await db.getMarketplacePack(Number(packId));
          if (!pack) {
            console.error('[Stripe Webhook] Pack not found:', packId);
            return res.status(404).json({ error: 'Pack not found' });
          }

          const purchase = await db.createMarketplacePurchase({
            userId: Number(userId),
            packId: Number(packId),
            paymentIntentId: paymentIntentId,
          });

          purchaseIds.push(purchase.id);
          console.log('[Stripe Webhook] Purchase created:', purchase.id);
        }

        // Send email notifications
        try {
          const metadata = session.metadata || {};
          const customerEmail = session.customer_details?.email || metadata.customer_email;
          const customerName = session.customer_details?.name || metadata.customer_name || 'Customer';
          const amountPaid = (session.amount_total || 0) / 100;
          const packTitle = metadata.pack_title || 'Sample Pack';

          // Notify buyer
          await notifyOwner({
            title: `Purchase Confirmation - ${packTitle}`,
            content: `Thank you for your purchase, ${customerName}!\n\nYou've successfully purchased: ${packTitle}\nAmount: $${amountPaid.toFixed(2)}\n\nYou can download your pack from the Library page.`,
          });

          // Notify seller
          await notifyOwner({
            title: `New Sale! 🎉`,
            content: `You just made a sale!\n\nPack: ${packTitle}\nBuyer: ${customerName} (${customerEmail})\nAmount: $${amountPaid.toFixed(2)}\n\nCheck your Seller Dashboard for details.`,
          });

          console.log('[Stripe Webhook] Email notifications sent');
        } catch (emailError) {
          console.error('[Stripe Webhook] Failed to send email notifications:', emailError);
          // Don't fail the webhook if email fails
        }

        return res.json({ 
          received: true,
          purchaseIds,
        });
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe Webhook] Payment intent succeeded:', paymentIntent.id);
        // Payment already handled in checkout.session.completed
        return res.json({ received: true });
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('[Stripe Webhook] Payment failed:', paymentIntent.id);
        // TODO: Notify user of payment failure
        return res.json({ received: true });
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
        return res.json({ received: true });
    }
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message,
    });
  }
}
