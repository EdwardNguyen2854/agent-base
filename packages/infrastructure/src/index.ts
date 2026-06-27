import type { InstallationRepository } from "@agent-base/application/initialize-installation.js";
import type { Owner, Workspace } from "@agent-base/domain/installation.js";
import { eq, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const owners = pgTable("owner", {
  id: uuid().primaryKey(),
  name: text().notNull(),
});

export const workspaces = pgTable("workspace", {
  id: uuid().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => owners.id),
  name: text().notNull(),
});

export const runtimeHeartbeats = pgTable("runtime_heartbeat", {
  processName: text("process_name").primaryKey(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});

type Database = ReturnType<typeof createDatabase>;

function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { connect_timeout: 2, max: 1 });
  return { client, db: drizzle(client) };
}

export class PostgresInstallationRepository implements InstallationRepository {
  constructor(private readonly database: Database) {}

  async ensureOwner(owner: Owner): Promise<void> {
    await this.database.db.insert(owners).values(owner).onConflictDoNothing();
  }

  async ensureWorkspace(workspace: Workspace, ownerId: string): Promise<void> {
    await this.database.db
      .insert(workspaces)
      .values({ ...workspace, ownerId })
      .onConflictDoNothing();
  }
}

export async function initializeApplicationDatabase(
  databaseUrl: string,
  migrationsFolder: string,
  initialize: (repository: InstallationRepository) => Promise<unknown>,
) {
  const database = createDatabase(databaseUrl);
  try {
    await migrate(database.db, { migrationsFolder });
    await initialize(new PostgresInstallationRepository(database));
  } finally {
    await database.client.end();
  }
}

export async function provisionApplicationDatabase(
  adminUrl: string,
  applicationPassword: string,
) {
  const admin = postgres(adminUrl, { max: 1 });
  try {
    const roles = await admin<{ exists: boolean }[]>`
      select exists(select from pg_roles where rolname = 'agent_base') as exists
    `;
    if (!roles[0]?.exists) {
      await admin.unsafe(
        `create role agent_base login password '${applicationPassword.replaceAll("'", "''")}' nosuperuser nocreatedb nocreaterole noreplication`,
      );
    }
    await admin.unsafe(
      `alter role agent_base password '${applicationPassword.replaceAll("'", "''")}'`,
    );
    const databases = await admin<{ exists: boolean }[]>`
      select exists(select from pg_database where datname = 'agent_base') as exists
    `;
    if (!databases[0]?.exists) {
      await admin.unsafe("create database agent_base owner agent_base");
    }
  } finally {
    await admin.end();
  }
  const applicationAdmin = postgres(
    adminUrl.replace(/\/postgres$/, "/agent_base"),
    {
      max: 1,
    },
  );
  try {
    await applicationAdmin.unsafe("create extension if not exists vector");
  } finally {
    await applicationAdmin.end();
  }
}

export async function probeDatabase(
  databaseUrl: string,
): Promise<"healthy" | "unhealthy"> {
  const database = createDatabase(databaseUrl);
  try {
    await database.db.execute(sql`select 1`);
    return "healthy";
  } catch {
    return "unhealthy";
  } finally {
    await database.client.end({ timeout: 1 });
  }
}

export async function readServiceHealth(databaseUrl: string) {
  const database = createDatabase(databaseUrl);
  try {
    await database.db.execute(sql`select 1`);
    const rows = await database.db
      .select({ lastSeenAt: runtimeHeartbeats.lastSeenAt })
      .from(runtimeHeartbeats)
      .where(eq(runtimeHeartbeats.processName, "worker"));
    const recent =
      rows[0]?.lastSeenAt !== undefined &&
      rows[0].lastSeenAt.getTime() > Date.now() - 15_000;
    return {
      database: "healthy" as const,
      worker: recent ? ("healthy" as const) : ("unhealthy" as const),
    };
  } catch {
    return { database: "unhealthy" as const, worker: "unhealthy" as const };
  } finally {
    await database.client.end({ timeout: 1 });
  }
}

export function startWorkerHeartbeat(databaseUrl: string) {
  const database = createDatabase(databaseUrl);
  const heartbeat = () =>
    database.db
      .insert(runtimeHeartbeats)
      .values({ processName: "worker", lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: runtimeHeartbeats.processName,
        set: { lastSeenAt: new Date() },
      });
  return {
    heartbeat,
    close: () => database.client.end({ timeout: 2 }),
  };
}
