/**
 * Standalone Temporal worker entrypoint.
 *
 * Use this when running the worker as a separate process:
 *   npx tsx server/temporal/worker-standalone.ts
 *
 * In production the worker starts in-process via server/_core/index.ts.
 */
import "dotenv/config";
import { startWorkers } from "./worker";

startWorkers().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
