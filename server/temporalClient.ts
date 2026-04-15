/**
 * Temporal Client for AURA-X AI Music Generation
 * Level 5 Autonomous Agent Architecture
 * 
 * This module provides a Temporal client for executing workflows
 * from the Node.js backend. It connects to the Temporal server
 * and provides type-safe workflow execution methods.
 */

import { Connection, Client, WorkflowHandle } from '@temporalio/client';

// Temporal connection configuration
const TEMPORAL_SERVER_URL = process.env.TEMPORAL_SERVER_URL || 'localhost:7233';
const TEMPORAL_TASK_QUEUE = 'aura-x-music-generation';
const TEMPORAL_DJ_TASK_QUEUE = 'aura-x-dj-studio';

// Singleton client instance
let temporalClient: Client | null = null;

/**
 * Get or create Temporal client instance
 */
export async function getTemporalClient(): Promise<Client> {
  if (!temporalClient) {
    try {
      const connection = await Connection.connect({
        address: TEMPORAL_SERVER_URL,
        // Add TLS configuration for production:
        // tls: {
        //   clientCertPair: {
        //     crt: Buffer.from(process.env.TEMPORAL_TLS_CERT || ''),
        //     key: Buffer.from(process.env.TEMPORAL_TLS_KEY || ''),
        //   },
        // },
      });
      temporalClient = new Client({ connection });
      console.log(`[Temporal] Connected to ${TEMPORAL_SERVER_URL}`);
    } catch (error) {
      console.error('[Temporal] Failed to connect:', error);
      throw new Error('Failed to connect to Temporal server');
    }
  }
  return temporalClient;
}

/**
 * Execute music generation workflow
 * 
 * @param params Workflow parameters
 * @returns Workflow handle for status tracking
 */
export async function executeMusicGenerationWorkflow(params: {
  generationId: number;
  userId: number;
  prompt: string;
  lyrics?: string;
  duration?: number;
  temperature?: number;
  modalBaseUrl: string;
  modalApiKey: string;
}): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  
  // Start workflow execution
  const handle = await client.workflow.start('MusicGenerationWorkflow', {
    taskQueue: TEMPORAL_TASK_QUEUE,
    workflowId: `music-gen-${params.generationId}-${Date.now()}`,
    args: [
      {
        generation_id: params.generationId,
        user_id: params.userId,
        prompt: params.prompt,
        lyrics: params.lyrics,
        duration: params.duration || 30,
        temperature: params.temperature || 1.0,
        modal_base_url: params.modalBaseUrl,
        modal_api_key: params.modalApiKey,
      },
    ],
  });
  
  console.log(`[Temporal] Started MusicGenerationWorkflow: ${handle.workflowId}`);
  return handle;
}

/**
 * Execute stem separation workflow
 * 
 * @param params Workflow parameters
 * @returns Workflow handle for status tracking
 */
export async function executeStemSeparationWorkflow(params: {
  generationId: number;
  userId: number;
  audioUrl: string;
  modalBaseUrl: string;
  modalApiKey: string;
}): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  
  // Start workflow execution
  const handle = await client.workflow.start('StemSeparationWorkflow', {
    taskQueue: TEMPORAL_TASK_QUEUE,
    workflowId: `stem-sep-${params.generationId}-${Date.now()}`,
    args: [
      {
        generation_id: params.generationId,
        user_id: params.userId,
        audio_url: params.audioUrl,
        modal_base_url: params.modalBaseUrl,
        modal_api_key: params.modalApiKey,
      },
    ],
  });
  
  console.log(`[Temporal] Started StemSeparationWorkflow: ${handle.workflowId}`);
  return handle;
}

/**
 * Get workflow status
 * 
 * @param workflowId Workflow ID
 * @returns Workflow handle
 */
export async function getWorkflowHandle(workflowId: string): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  return client.workflow.getHandle(workflowId);
}

/**
 * Cancel workflow
 * 
 * @param workflowId Workflow ID
 */
export async function cancelWorkflow(workflowId: string): Promise<void> {
  const handle = await getWorkflowHandle(workflowId);
  await handle.cancel();
  console.log(`[Temporal] Cancelled workflow: ${workflowId}`);
}

/**
 * Get workflow result (blocks until completion)
 * 
 * @param workflowId Workflow ID
 * @returns Workflow result
 */
export async function getWorkflowResult(workflowId: string): Promise<any> {
  const handle = await getWorkflowHandle(workflowId);
  return await handle.result();
}

/**
 * Query workflow status without blocking
 * 
 * @param workflowId Workflow ID
 * @returns Workflow description with status
 */
export async function queryWorkflowStatus(workflowId: string): Promise<{
  workflowId: string;
  runId: string;
  status: string;
}> {
  try {
    const handle = await getWorkflowHandle(workflowId);
    const description = await handle.describe();
    
    return {
      workflowId: description.workflowId,
      runId: description.runId,
      status: description.status.name,
    };
  } catch (error) {
    console.error(`[Temporal] Failed to query workflow ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Start the analyzeTrackWorkflow for a DJ track
 */
export async function executeAnalyzeTrackWorkflow(trackId: number, fileKey: string): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  const workflowId = `dj-analyze-${trackId}-${Date.now()}`;
  const handle = await client.workflow.start('analyzeTrackWorkflow', {
    taskQueue: TEMPORAL_DJ_TASK_QUEUE,
    workflowId,
    args: [trackId, fileKey],
  });
  console.log(`[Temporal] Started analyzeTrackWorkflow: ${workflowId}`);
  return handle;
}

/**
 * Start the separateStemsWorkflow for a DJ track
 */
export async function executeSeparateStemsWorkflow(
  trackId: number,
  fileKey: string,
  userId: number
): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  const workflowId = `dj-stems-${trackId}-${Date.now()}`;
  const handle = await client.workflow.start('separateStemsWorkflow', {
    taskQueue: TEMPORAL_DJ_TASK_QUEUE,
    workflowId,
    args: [trackId, fileKey, userId],
  });
  console.log(`[Temporal] Started separateStemsWorkflow: ${workflowId}`);
  return handle;
}

/**
 * Start the generateDJSetWorkflow
 */
export async function executeGenerateDJSetWorkflow(
  userId: number,
  trackIds: number[],
  config: { durationMinutes: number; vibePreset: string; riskLevel: number; allowVocalOverlay: boolean }
): Promise<WorkflowHandle> {
  const client = await getTemporalClient();
  const workflowId = `dj-set-${userId}-${Date.now()}`;
  const handle = await client.workflow.start('generateDJSetWorkflow', {
    taskQueue: TEMPORAL_DJ_TASK_QUEUE,
    workflowId,
    args: [userId, trackIds, config],
  });
  console.log(`[Temporal] Started generateDJSetWorkflow: ${workflowId}`);
  return handle;
}

/**
 * Close Temporal client connection
 * Call this during application shutdown
 */
export async function closeTemporalClient(): Promise<void> {
  if (temporalClient) {
    await temporalClient.connection.close();
    temporalClient = null as Client | null;
    console.log('[Temporal] Connection closed');
  }
}
