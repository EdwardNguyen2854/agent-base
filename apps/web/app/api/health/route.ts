import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json(
      { status: "unhealthy", services: unavailableServices() },
      { status: 503 },
    );
  }
  const sql = postgres(databaseUrl, { connect_timeout: 2, max: 1 });
  let database: "healthy" | "unhealthy" = "unhealthy";
  let worker: "healthy" | "unhealthy" = "unhealthy";

  try {
    await sql`select 1`;
    database = "healthy";
    const rows = await sql<{ recent: boolean }[]>`
      select coalesce(last_seen_at > now() - interval '15 seconds', false) as recent
      from runtime_heartbeat where process_name = 'worker'
    `;
    worker = rows[0]?.recent ? "healthy" : "unhealthy";
  } catch {
    // Report component state without exposing connection details.
  } finally {
    await sql.end({ timeout: 1 });
  }

  const status =
    database === "healthy" && worker === "healthy" ? "healthy" : "unhealthy";
  return Response.json(
    {
      status,
      services: {
        web: { status: "healthy" },
        worker: { status: worker },
        database: { status: database },
      },
    },
    { status: status === "healthy" ? 200 : 503 },
  );
}

function unavailableServices() {
  return {
    web: { status: "healthy" },
    worker: { status: "unhealthy" },
    database: { status: "unhealthy" },
  };
}
