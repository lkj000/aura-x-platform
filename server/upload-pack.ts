import type { Request, Response } from 'express';
import { storagePut } from './storage';

/**
 * Upload Pack File Endpoint
 * 
 * Handles file uploads for sample packs to S3 storage.
 * Accepts base64-encoded file data and returns the S3 URL.
 */
export async function handlePackUpload(req: Request, res: Response) {
  try {
    const { filename, data, contentType } = req.body;

    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    // Decode base64 data
    const buffer = Buffer.from(data, 'base64');

    // Generate unique file key with random suffix to prevent enumeration
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    const fileKey = `marketplace/packs/${timestamp}-${randomSuffix}-${filename}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      buffer,
      contentType || 'application/zip'
    );

    console.log('[Pack Upload] File uploaded successfully:', fileKey);

    return res.json({
      url,
      fileKey,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('[Pack Upload] Upload failed:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message,
    });
  }
}
