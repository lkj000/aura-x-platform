import { Request, Response } from 'express';
import * as db from './db';

export async function handleModalWebhook(req: Request, res: Response) {
  console.log('[Modal Webhook] Received callback:', req.body);

  try {
    const {
      generation_id,
      status,
      audio_url,
      error,
      cultural_score,
      processing_time,
    } = req.body;

    if (!generation_id) {
      console.error('[Modal Webhook] Missing generation_id');
      return res.status(400).json({ error: 'Missing generation_id' });
    }

    // Update generation in database
    await db.updateGeneration(generation_id, {
      status: status === 'completed' ? 'completed' : 'failed',
      resultUrl: audio_url || null,
      errorMessage: error || null,
      culturalScore: cultural_score ? cultural_score.toString() : null,
      processingTime: processing_time || null,
      completedAt: new Date(),
    });

    console.log(`[Modal Webhook] Updated generation ${generation_id} with status: ${status}`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Modal Webhook] Error processing webhook:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
