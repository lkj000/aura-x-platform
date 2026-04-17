import { Request, Response } from 'express';
import * as db from './db';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext['req'],
    res: { clearCookie: () => {} } as unknown as TrpcContext['res'],
  };
}

export async function handleModalWebhook(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  console.log('[Modal Webhook] Received:', JSON.stringify(body).slice(0, 300));

  try {
    // ── Music generation webhook ─────────────────────────────────────────────
    if (body.generation_id !== undefined || body.generationId !== undefined) {
      const generationId = (body.generationId || body.generation_id) as number;
      const status = body.status as string;
      const audioUrl = (body.audioUrl || body.audio_url) as string | undefined;
      const error = (body.error || body.errorMessage) as string | undefined;
      const culturalScore = (body.culturalScore || body.cultural_score) as number | undefined;
      const processingTime = (body.processingTime || body.processing_time) as number | undefined;

      await db.updateGeneration(generationId, {
        status: status === 'completed' ? 'completed' : 'failed',
        resultUrl: audioUrl || null,
        errorMessage: error || null,
        culturalScore: culturalScore != null ? culturalScore.toString() : null,
        processingTime: processingTime || null,
        completedAt: new Date(),
      });

      console.log(`[Modal Webhook] Updated generation ${generationId} status: ${status}`);
      return res.status(200).json({ success: true });
    }

    const caller = appRouter.createCaller(publicCtx());

    // ── DJ set render webhook ────────────────────────────────────────────────
    if (body.plan_id !== undefined) {
      await caller.djStudioWebhooks.renderComplete(body as Parameters<typeof caller.djStudioWebhooks.renderComplete>[0]);
      return res.status(200).json({ success: true });
    }

    // ── Track analysis / stems webhook ───────────────────────────────────────
    if (body.track_id !== undefined) {
      if (body.bpm !== undefined) {
        // Analysis complete — groove_fingerprint and contrast_score land here
        await caller.djStudioWebhooks.analysisComplete(body as Parameters<typeof caller.djStudioWebhooks.analysisComplete>[0]);
        console.log(`[Modal Webhook] Analysis saved for track ${body.track_id}`);
      } else if (body.stem_map !== undefined) {
        // Stem separation complete
        await caller.djStudioWebhooks.stemsComplete(body as Parameters<typeof caller.djStudioWebhooks.stemsComplete>[0]);
        console.log(`[Modal Webhook] Stems saved for track ${body.track_id}`);
      } else {
        console.warn('[Modal Webhook] Unrecognised track_id payload, keys:', Object.keys(body).join(', '));
        return res.status(400).json({ error: 'Unrecognised track payload' });
      }
      return res.status(200).json({ success: true });
    }

    console.error('[Modal Webhook] Unrecognised payload, keys:', Object.keys(body).join(', '));
    return res.status(400).json({ error: 'Unrecognised webhook payload' });

  } catch (err) {
    console.error('[Modal Webhook] Error processing webhook:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
