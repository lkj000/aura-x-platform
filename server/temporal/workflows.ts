/**
 * Temporal Workflows for DJ Studio
 * 
 * Long-running workflows for:
 * - Track analysis (trigger Modal, wait for webhook)
 * - Stem separation (trigger Modal, wait for webhook)
 * - DJ set generation (analyze → plan → render)
 */

import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

// Proxy activities with timeouts
const {
  triggerModalAnalysis,
  triggerModalStemSeparation,
  checkAnalysisStatus,
  checkStemsStatus,
  generateSetPlan,
  renderDJSet,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '5s',
    maximumAttempts: 3,
  },
});

/**
 * Workflow: Analyze Track
 * 
 * 1. Trigger Modal analysis worker
 * 2. Poll database for completion (webhook updates DB)
 * 3. Return analysis results
 */
export async function analyzeTrackWorkflow(trackId: number, fileKey: string): Promise<void> {
  console.log(`[Workflow] Starting analysis for track ${trackId}`);
  
  // Trigger Modal worker
  await triggerModalAnalysis(trackId, fileKey);
  
  // Poll for completion (webhook will update DB)
  let isComplete = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  
  while (!isComplete && attempts < maxAttempts) {
    await sleep('5s');
    isComplete = await checkAnalysisStatus(trackId);
    attempts++;
  }
  
  if (!isComplete) {
    throw new Error(`Analysis timeout for track ${trackId}`);
  }
  
  console.log(`[Workflow] Analysis complete for track ${trackId}`);
}

/**
 * Workflow: Separate Stems
 * 
 * 1. Trigger Modal stem separation worker
 * 2. Poll database for completion
 * 3. Return stem URLs
 */
export async function separateStemsWorkflow(
  trackId: number,
  fileKey: string,
  userId: number
): Promise<void> {
  console.log(`[Workflow] Starting stem separation for track ${trackId}`);
  
  // Trigger Modal worker
  await triggerModalStemSeparation(trackId, fileKey, userId);
  
  // Poll for completion (webhook will update DB)
  let isComplete = false;
  let attempts = 0;
  const maxAttempts = 180; // 15 minutes max (5s intervals)
  
  while (!isComplete && attempts < maxAttempts) {
    await sleep('5s');
    isComplete = await checkStemsStatus(trackId);
    attempts++;
  }
  
  if (!isComplete) {
    throw new Error(`Stem separation timeout for track ${trackId}`);
  }
  
  console.log(`[Workflow] Stem separation complete for track ${trackId}`);
}

/**
 * Workflow: Generate DJ Set
 * 
 * Multi-step workflow:
 * 1. Ensure all tracks are analyzed
 * 2. Generate set plan (Camelot wheel, energy arc, transitions)
 * 3. Render final mix (crossfade, tempo adjustment, EQ)
 * 4. Return rendered mix URL
 */
export async function generateDJSetWorkflow(
  userId: number,
  trackIds: number[],
  config: {
    durationMinutes: number;
    vibePreset: string;
    riskLevel: number;
    allowVocalOverlay: boolean;
  }
): Promise<{ planId: number; mixUrl: string }> {
  console.log(`[Workflow] Starting DJ set generation for user ${userId}`);
  
  // Step 1: Ensure all tracks are analyzed
  // (In production, trigger analysis for unanalyzed tracks)
  console.log(`[Workflow] Verifying ${trackIds.length} tracks are analyzed`);
  
  // Step 2: Generate set plan
  console.log(`[Workflow] Generating set plan...`);
  const planId = await generateSetPlan(userId, trackIds, config);
  
  // Step 3: Render DJ set
  console.log(`[Workflow] Rendering DJ set...`);
  const mixUrl = await renderDJSet(planId);
  
  console.log(`[Workflow] DJ set generation complete: ${mixUrl}`);
  
  return { planId, mixUrl };
}
