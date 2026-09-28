import type { Server } from "node:http";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startJobs, stopJobs } from "./jobs/index.js";

let server: Server | null = null;

async function start(): Promise<void> {
  await connectDB();

  server = app.listen(env.PORT, () => {
    console.log(`🚀 ${env.SITE_NAME} API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  if (env.ENABLE_CRON) startJobs();
}

/**
 * Finish in-flight requests before the process goes away, otherwise a deploy
 * drops whatever was mid-checkout-redirect at that moment.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received — shutting down`);

  stopJobs();

  const closed = new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });

  // A hung connection must not hold the deploy open forever.
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10_000));

  await Promise.race([closed, timeout]);
  await disconnectDB();

  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});

process.on("uncaughtException", (error) => {
  // The process is in an unknown state now; log and let the supervisor restart.
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

start().catch((error) => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
