import { startWorkerHeartbeat } from "@agent-base/infrastructure";
import { PgBossSourceIngestionQueue } from "@agent-base/infrastructure/source-ingestion-queue.js";
import { createSourceIngestionService } from "@agent-base/infrastructure/source-ingestion-service.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const sourcesDirectory =
  process.env.AGENT_BASE_SOURCES_DIRECTORY ?? process.env.AGENT_BASE_HOME;
if (!sourcesDirectory) throw new Error("AGENT_BASE_HOME is required");

const workerHeartbeat = startWorkerHeartbeat(databaseUrl);

await workerHeartbeat.heartbeat();
const heartbeatTimer = setInterval(
  () => void workerHeartbeat.heartbeat(),
  5_000,
);

const ingestion = await createSourceIngestionService({
  databaseUrl,
  sourcesDirectory,
});
const queue = new PgBossSourceIngestionQueue(databaseUrl);
await queue.work(async (sourceId) => {
  await ingestion.ingestSource(sourceId);
});
await queue.scheduleWatchdog(async () => {
  try {
    await ingestion.runWatchdog();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Source ingestion watchdog failed: ${message}`);
  }
});

async function shutdown() {
  clearInterval(heartbeatTimer);
  await queue.close();
  await ingestion.close();
  await workerHeartbeat.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
