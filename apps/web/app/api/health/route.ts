import { readServiceHealth } from "@agent-base/infrastructure";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json(
      { status: "unhealthy", services: unavailableServices() },
      { status: 503 },
    );
  }
  const { database, worker } = await readServiceHealth(databaseUrl);

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
