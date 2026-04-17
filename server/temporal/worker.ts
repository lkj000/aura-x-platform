/**
 * temporal/worker.ts — Temporal Worker process for AURA-X
 *
 * Run this as a standalone process alongside the Express server:
 *
 *   npx tsx server/temporal/worker.ts
 *
 * The worker connects to Temporal, registers all workflows and activities,
 * and polls two task queues:
 *
 *   aura-x-music-generation  — AI Studio: MusicGenerationWorkflow, StemSeparationWorkflow
 *   aura-x-dj-studio         — DJ Studio: analyzeTrackWorkflow, separateStemsWorkflow, generateDJSetWorkflow
 *
 * Environment variables required:
 *   TEMPORAL_SERVER_URL    — e.g. "localhost:7233" or Temporal Cloud address
 *   MODAL_BASE_URL         — e.g. "https://mabgwej--aura-x-ai-fastapi-app.modal.run"
 *   DATABASE_URL           — MySQL connection string (activities read DB)
 *   PUBLIC_URL             — Public Express URL for Modal webhooks
 */

import "dotenv/config";
import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "./activities";

const TEMPORAL_SERVER_URL = process.env.TEMPORAL_SERVER_URL || "localhost:7233";
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || "default";
const TEMPORAL_API_KEY = process.env.TEMPORAL_API_KEY || "";

function buildNativeConnectionOptions() {
  const isCloud = TEMPORAL_SERVER_URL.includes("tmprl.cloud");
  if (isCloud && TEMPORAL_API_KEY) {
    return {
      address: TEMPORAL_SERVER_URL,
      tls: true as const,
      metadata: {
        authorization: `Bearer ${TEMPORAL_API_KEY}`,
      },
    };
  }
  return { address: TEMPORAL_SERVER_URL };
}

async function createWorker(taskQueue: string): Promise<Worker> {
  const connection = await NativeConnection.connect(buildNativeConnectionOptions());

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue,
    workflowsPath: require.resolve("./workflows"),
    activities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
  });

  console.log(`[Worker] Registered on queue "${taskQueue}" → ${TEMPORAL_SERVER_URL} (namespace: ${TEMPORAL_NAMESPACE})`);
  return worker;
}

/**
 * Start both Temporal workers (music generation + DJ studio).
 * Exported so server/_core/index.ts can call this in-process.
 * If Temporal is unreachable the promise rejects with a clear message.
 */
export async function startWorkers(): Promise<void> {
  console.log("[Worker] Starting AURA-X Temporal workers...");

  const [musicWorker, djWorker] = await Promise.all([
    createWorker("aura-x-music-generation"),
    createWorker("aura-x-dj-studio"),
  ]);

  // Run both workers concurrently. Promise.all rejects if either fails.
  await Promise.all([musicWorker.run(), djWorker.run()]);
}

// Allow running as a standalone process: `npx tsx server/temporal/worker.ts`
if (require.main === module) {
  startWorkers().catch((err) => {
    console.error("[Worker] Fatal error:", err);
    process.exit(1);
  });
}
