import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
  else delete process.env.DATABASE_URL;
});

describe("GET /api/health", () => {
  it("keeps the web status observable when the database is unavailable", async () => {
    delete process.env.DATABASE_URL;

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "unhealthy",
      services: {
        web: { status: "healthy" },
        worker: { status: "unhealthy" },
        database: { status: "unhealthy" },
      },
    });
  });
});
