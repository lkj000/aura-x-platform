import axios from 'axios';

/**
 * Modal.com API Client
 * Connects to your deployed Modal functions for AI music generation
 */

// Modal endpoint URLs (to be configured via environment variables)
const MODAL_BASE_URL = process.env.MODAL_BASE_URL || 'https://your-modal-app.modal.run';
const MODAL_API_KEY = process.env.MODAL_API_KEY || '';

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
    
    const response = await modalClient.post<MusicGenerationResponse>('/generate-music', params);
    
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
    
    const response = await modalClient.post<StemSeparationResponse>('/separate-stems', params);
    
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
    const response = await modalClient.get(`/job-status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('[ModalClient] Job status check failed:', error);
    throw new Error(`Job status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
