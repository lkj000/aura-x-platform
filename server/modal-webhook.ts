import { Request, Response } from 'express';
import * as db from './db';

export async function handleModalWebhook(req: Request, res: Response) {
  console.log('[Modal Webhook] Received callback:', req.body);

  try {
    // Accept both camelCase (from Modal) and snake_case
    const generationId = req.body.generationId || req.body.generation_id;
    const status = req.body.status;
    const audioUrl = req.body.audioUrl || req.body.audio_url;
    const error = req.body.error || req.body.errorMessage;
    const culturalScore = req.body.culturalScore || req.body.cultural_score;
    const processingTime = req.body.processingTime || req.body.processing_time;

    if (!generationId) {
      console.error('[Modal Webhook] Missing generationId');
      return res.status(400).json({ error: 'Missing generationId' });
    }

    // Update generation in database
    await db.updateGeneration(generationId, {
      status: status === 'completed' ? 'completed' : 'failed',
      resultUrl: audioUrl || null,
      errorMessage: error || null,
      culturalScore: culturalScore ? culturalScore.toString() : null,
      processingTime: processingTime || null,
      completedAt: new Date(),
    });

    console.log(`[Modal Webhook] Updated generation ${generationId} with status: ${status}`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Modal Webhook] Error processing webhook:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
