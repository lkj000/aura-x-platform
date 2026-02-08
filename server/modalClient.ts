import axios from 'axios';
import { storagePut } from './storage';
import crypto from 'crypto';

/**
 * Modal.com API Client
 * Connects to your deployed Modal functions for AI music generation
 */

// Modal endpoint URLs (configured via environment variables)
const MODAL_BASE_URL = process.env.VITE_MODAL_API_URL || 'https://mabgwej--aura-x-ai-fastapi-app.modal.run';
const MODAL_API_KEY = process.env.MODAL_API_KEY || '';  // Modal doesn't require API key for public endpoints

const modalClient = axios.create({
  baseURL: MODAL_BASE_URL,
  timeout: 120000, // 2 minutes for AI operations
  headers: {
    'Content-Type': 'application/json',
    ...(MODAL_API_KEY && { 'Authorization': `Bearer ${MODAL_API_KEY}` }),
  },
});

export interface MusicGenerationParams {
  prompt: string;
  tempo?: number;
  key?: string;
  mode?: string; // Amapiano subgenre
  instruments?: string[];
  duration?: number; // in seconds
  seed?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  cfgScale?: number;
  generationMode?: 'creative' | 'production';
  culturalAuthenticityWeight?: number; // 0-1
}

export interface MusicGenerationResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  culturalScore?: number;
  processingTime?: number;
  error?: string;
}

export interface StemSeparationParams {
  audioUrl: string;
  stemTypes?: string[]; // e.g., ['vocals', 'drums', 'bass', 'other']
}

export interface StemSeparationResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stems?: {
    type: string;
    url: string;
  }[];
  error?: string;
}

export interface MasteringParams {
  audioUrl: string;
  targetLoudness?: number; // LUFS
  style?: string; // 'amapiano', 'commercial', etc.
}

export interface MasteringResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  error?: string;
}

/**
 * Generate music using AI
 */
export async function generateMusic(params: MusicGenerationParams): Promise<MusicGenerationResponse> {
  try {
    console.log('[ModalClient] Generating music with params:', params);
    
    // Check if Modal is configured
    if (MODAL_BASE_URL.includes('your-modal-app')) {
      console.warn('[ModalClient] Modal not configured, using demo mode');
      // Return a demo response that simulates async processing
      const jobId = `demo-${Date.now()}`;
      
      // Simulate async processing - in real implementation, this would be handled by Modal
      setTimeout(() => {
        console.log('[ModalClient] Demo generation complete');
      }, 2000);
      
      return {
        jobId,
        status: 'pending',
      };
    }
    
    // Call the deployed Modal endpoint
    const response = await modalClient.post('/generate_music', {
      prompt: params.prompt,
      duration: params.duration || 30,
      temperature: params.temperature || 1.0,
      top_k: params.topK || 250,
      top_p: params.topP || 0.0,
      cfg_scale: params.cfgScale || 3.0,
      seed: params.seed,
    });
    
    // Modal returns audio as base64, upload to S3 for persistence
    if (response.data.status === 'success' && response.data.audio_base64) {
      console.log('[ModalClient] Generation successful, uploading to S3...');
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(response.data.audio_base64, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filename = `generated-music/${timestamp}-${randomId}.wav`;
      
      // Upload to S3
      const { url: audioUrl } = await storagePut(filename, audioBuffer, 'audio/wav');
      
      console.log('[ModalClient] Audio uploaded to S3:', audioUrl);
      
      return {
        jobId: `modal-${timestamp}`,
        status: 'completed',
        audioUrl,
        processingTime: 0,
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('[ModalClient] Music generation failed:', error);
    throw new Error(`Music generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Separate audio into stems
 */
export async function separateStems(params: StemSeparationParams): Promise<StemSeparationResponse> {
  try {
    console.log('[ModalClient] Separating stems for:', params.audioUrl);
    
    const response = await modalClient.post('/separate_stems', {
      audio_url: params.audioUrl,
      stem_types: params.stemTypes || ['vocals', 'drums', 'bass', 'other'],
    });
    
    // Modal returns stems as base64, upload to S3 for persistence
    if (response.data.status === 'success' && response.data.stems) {
      console.log('[ModalClient] Stem separation successful, uploading to S3...');
      
      const uploadedStems = await Promise.all(
        Object.entries(response.data.stems).map(async ([stemType, base64Data]: [string, any]) => {
          // Convert base64 to buffer
          const stemBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomId = crypto.randomBytes(8).toString('hex');
          const filename = `stems/${timestamp}-${randomId}-${stemType}.wav`;
          
          // Upload to S3
          const { url: stemUrl } = await storagePut(filename, stemBuffer, 'audio/wav');
          
          console.log(`[ModalClient] ${stemType} stem uploaded to S3:`, stemUrl);
          
          return {
            type: stemType,
            url: stemUrl,
          };
        })
      );
      
      return {
        jobId: `stems-${Date.now()}`,
        status: 'completed',
        stems: uploadedStems,
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('[ModalClient] Stem separation failed:', error);
    throw new Error(`Stem separation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Master audio track
 */
export async function masterAudio(params: MasteringParams): Promise<MasteringResponse> {
  try {
    console.log('[ModalClient] Mastering audio:', params.audioUrl);
    
    const response = await modalClient.post<MasteringResponse>('/master-audio', params);
    
    return response.data;
  } catch (error) {
    console.error('[ModalClient] Mastering failed:', error);
    throw new Error(`Mastering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check the status of a Modal job
 */
export async function checkJobStatus(jobId: string): Promise<MusicGenerationResponse | StemSeparationResponse | MasteringResponse> {
  try {
    // Handle demo mode
    if (jobId.startsWith('demo-')) {
      // Return a real Amapiano sample from S3 (no CORS issues)
      return {
        jobId,
        status: 'completed',
        audioUrl: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663056762557/cGc3ksRef3yLzHbZBSFWXj/samples/Intro(Ad-libs)(1)-l8p0wj.mp3',
        culturalScore: 85,
        processingTime: 2000,
      };
    }
    
    const response = await modalClient.get(`/job-status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('[ModalClient] Job status check failed:', error);
    throw new Error(`Job status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
