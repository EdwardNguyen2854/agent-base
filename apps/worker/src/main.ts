import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 1 });

async function heartbeat() {
  await sql`
    insert into runtime_heartbeat (process_name, last_seen_at)
    values ('worker', now())
    on conflict (process_name) do update set last_seen_at = excluded.last_seen_at
  `;
}

await heartbeat();
const timer = setInterval(() => void heartbeat(), 5_000);

async function shutdown() {
  clearInterval(timer);
  await sql.end({ timeout: 2 });
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
