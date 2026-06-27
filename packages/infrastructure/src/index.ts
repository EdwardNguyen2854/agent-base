import {
  type Agent,
  type AgentDraft,
  type AgentRepository,
  type AgentState,
  type AgentVersion,
  AgentVersionConflictError,
  GENERAL_RESEARCH_AGENT_ID,
} from "@agent-base/application/agent-publishing.js";
import {
  type InstallationRepository,
  initializeInstallation,
  OWNER,
  WORKSPACE,
} from "@agent-base/application/initialize-installation.js";
import type { Owner, Workspace } from "@agent-base/domain/installation.js";
import { eq, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
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

export const agents = pgTable("agent", {
  id: uuid().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const agentDrafts = pgTable("agent_draft", {
  agentId: uuid("agent_id")
    .primaryKey()
    .references(() => agents.id),
  id: uuid().notNull(),
  purpose: text().notNull(),
  instructions: text().notNull(),
  researchMethod: text("research_method").notNull(),
  reportRequirements: text("report_requirements").notNull(),
  webSearch: boolean("web_search").notNull(),
  modelTurns: integer("model_turns").notNull(),
  tavilySearches: integer("tavily_searches").notNull(),
  pageFetches: integer("page_fetches").notNull(),
  activeMinutes: integer("active_minutes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const agentVersions = pgTable(
  "agent_version",
  {
    id: uuid().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    number: integer().notNull(),
    purpose: text().notNull(),
    instructions: text().notNull(),
    researchMethod: text("research_method").notNull(),
    reportRequirements: text("report_requirements").notNull(),
    webSearch: boolean("web_search").notNull(),
    modelTurns: integer("model_turns").notNull(),
    tavilySearches: integer("tavily_searches").notNull(),
    pageFetches: integer("page_fetches").notNull(),
    activeMinutes: integer("active_minutes").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => owners.id),
  },
  (table) => ({
    agentNumberUnique: unique("agent_version_agent_number_unique").on(
      table.agentId,
      table.number,
    ),
  }),
);

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

type AgentRow = typeof agents.$inferSelect;
type AgentDraftRow = typeof agentDrafts.$inferSelect;
type AgentVersionRow = typeof agentVersions.$inferSelect;

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
  };
}

function rowToDraft(row: AgentDraftRow): AgentDraft {
  return {
    id: row.id,
    agentId: row.agentId,
    purpose: row.purpose,
    instructions: row.instructions,
    researchMethod: row.researchMethod,
    reportRequirements: row.reportRequirements,
    evidencePermissions: { webSearch: row.webSearch },
    limits: {
      modelTurns: row.modelTurns,
      tavilySearches: row.tavilySearches,
      pageFetches: row.pageFetches,
      activeMinutes: row.activeMinutes,
    },
    updatedAt: row.updatedAt,
  };
}

function rowToVersion(row: AgentVersionRow): AgentVersion {
  return {
    id: row.id,
    agentId: row.agentId,
    number: row.number,
    purpose: row.purpose,
    instructions: row.instructions,
    researchMethod: row.researchMethod,
    reportRequirements: row.reportRequirements,
    evidencePermissions: { webSearch: row.webSearch },
    limits: {
      modelTurns: row.modelTurns,
      tavilySearches: row.tavilySearches,
      pageFetches: row.pageFetches,
      activeMinutes: row.activeMinutes,
    },
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
  };
}

function draftToRow(draft: AgentDraft) {
  return {
    agentId: draft.agentId,
    id: draft.id,
    purpose: draft.purpose,
    instructions: draft.instructions,
    researchMethod: draft.researchMethod,
    reportRequirements: draft.reportRequirements,
    webSearch: draft.evidencePermissions.webSearch,
    modelTurns: draft.limits.modelTurns,
    tavilySearches: draft.limits.tavilySearches,
    pageFetches: draft.limits.pageFetches,
    activeMinutes: draft.limits.activeMinutes,
    updatedAt: draft.updatedAt,
  };
}

function versionToRow(version: AgentVersion) {
  return {
    id: version.id,
    agentId: version.agentId,
    number: version.number,
    purpose: version.purpose,
    instructions: version.instructions,
    researchMethod: version.researchMethod,
    reportRequirements: version.reportRequirements,
    webSearch: version.evidencePermissions.webSearch,
    modelTurns: version.limits.modelTurns,
    tavilySearches: version.limits.tavilySearches,
    pageFetches: version.limits.pageFetches,
    activeMinutes: version.limits.activeMinutes,
    publishedAt: version.publishedAt,
    publishedBy: version.publishedBy,
  };
}

export class PostgresAgentRepository implements AgentRepository {
  constructor(
    private readonly database: Database,
    private readonly generalResearchWorkspaceId: string,
    private readonly ownerId: string,
  ) {}

  async loadAgent(): Promise<AgentState | undefined> {
    const rows = await this.database.db
      .select({ agent: agents, draft: agentDrafts })
      .from(agents)
      .leftJoin(agentDrafts, sql`${agentDrafts.agentId} = ${agents.id}`)
      .where(sql`${agents.id} = ${GENERAL_RESEARCH_AGENT_ID}`)
      .limit(1);
    const row = rows[0];
    if (!row?.draft) return undefined;
    const versionRows = await this.database.db
      .select()
      .from(agentVersions)
      .where(sql`${agentVersions.agentId} = ${GENERAL_RESEARCH_AGENT_ID}`)
      .orderBy(agentVersions.number);
    return {
      agent: rowToAgent(row.agent),
      draft: rowToDraft(row.draft),
      versions: versionRows.map(rowToVersion),
    };
  }

  async saveDraft(draft: AgentDraft): Promise<void> {
    await this.database.db
      .insert(agents)
      .values({
        id: draft.agentId,
        workspaceId: this.generalResearchWorkspaceId,
        name: "General research",
      })
      .onConflictDoNothing();
    await this.database.db
      .insert(agentDrafts)
      .values(draftToRow(draft))
      .onConflictDoUpdate({
        target: agentDrafts.agentId,
        set: {
          id: draft.id,
          purpose: draft.purpose,
          instructions: draft.instructions,
          researchMethod: draft.researchMethod,
          reportRequirements: draft.reportRequirements,
          webSearch: draft.evidencePermissions.webSearch,
          modelTurns: draft.limits.modelTurns,
          tavilySearches: draft.limits.tavilySearches,
          pageFetches: draft.limits.pageFetches,
          activeMinutes: draft.limits.activeMinutes,
          updatedAt: draft.updatedAt,
        },
      });
  }

  async appendVersion(version: AgentVersion): Promise<AgentVersion> {
    try {
      await this.database.db
        .insert(agentVersions)
        .values(versionToRow(version));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AgentVersionConflictError(
          `Agent Version ${version.number} already exists`,
        );
      }
      throw error;
    }
    return version;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === "23505";
}

export type AgentDatabaseHandle = Readonly<{
  repository: AgentRepository;
  close(): Promise<void>;
}>;

export async function createAgentDatabase(
  databaseUrl: string,
  workspaceId: string,
  ownerId: string,
): Promise<AgentDatabaseHandle> {
  const database = createDatabase(databaseUrl);
  return {
    repository: new PostgresAgentRepository(database, workspaceId, ownerId),
    close: async () => {
      await database.client.end({ timeout: 1 });
    },
  };
}

export interface ApplicationRepositories {
  installation: InstallationRepository;
  agent: AgentRepository;
}

export async function initializeApplicationDatabase<T>(
  databaseUrl: string,
  migrationsFolder: string,
  initialize: (repositories: ApplicationRepositories) => Promise<T>,
): Promise<T> {
  const database = createDatabase(databaseUrl);
  try {
    await migrate(database.db, { migrationsFolder });
    const installationRepo = new PostgresInstallationRepository(database);
    await initializeInstallation(installationRepo);
    return await initialize({
      installation: installationRepo,
      agent: new PostgresAgentRepository(database, WORKSPACE.id, OWNER.id),
    });
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
