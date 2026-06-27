import { startWorkerHeartbeat } from "@agent-base/infrastructure";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const workerHeartbeat = startWorkerHeartbeat(databaseUrl);

await workerHeartbeat.heartbeat();
const timer = setInterval(() => void workerHeartbeat.heartbeat(), 5_000);

async function shutdown() {
  clearInterval(timer);
  await workerHeartbeat.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
