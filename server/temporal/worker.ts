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

async function runWorker(taskQueue: string): Promise<Worker> {
  const connection = await NativeConnection.connect({
    address: TEMPORAL_SERVER_URL,
  });

  const worker = await Worker.create({
    connection,
    taskQueue,
    // Workflows are loaded from this file's sibling workflows.ts.
    // The workflowsPath must point to the compiled JS or TSX-transpiled module.
    workflowsPath: require.resolve("./workflows"),
    activities,
    // Concurrency limits — tune to available CPU/memory.
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
  });

  console.log(
    `[Worker] Registered on queue "${taskQueue}" → ${TEMPORAL_SERVER_URL}`
  );

  return worker;
}

async function main(): Promise<void> {
  console.log("[Worker] Starting AURA-X Temporal workers...");

  // Both workers share the same activity implementations — Temporal dispatches
  // workflow tasks to the correct queue automatically.
  const [musicWorker, djWorker] = await Promise.all([
    runWorker("aura-x-music-generation"),
    runWorker("aura-x-dj-studio"),
  ]);

  // Run both workers concurrently; either one failing will reject the promise.
  await Promise.all([musicWorker.run(), djWorker.run()]);
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
