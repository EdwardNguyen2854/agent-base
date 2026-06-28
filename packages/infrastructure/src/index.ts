import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
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
  type CredentialEncryptionPort,
  type CredentialRepository,
} from "@agent-base/application/credential-management.js";
import type {
  ProjectRepository,
  SearchResult,
} from "@agent-base/application/project-management.js";
import {
  type InstallationRepository,
  initializeInstallation,
  OWNER,
  WORKSPACE,
} from "@agent-base/application/initialize-installation.js";
import type { Credential as CredentialType } from "@agent-base/domain/credential.js";
import type { Owner, Workspace } from "@agent-base/domain/installation.js";
import type {
  Project,
  ProjectId,
  ProjectSource,
  SourceChunk,
  SourceId,
  SourceState,
} from "@agent-base/domain/project.js";
import { eq, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
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

// ── Project & Source tables ──────────────────────────────────────

export const projects = pgTable("project", {
  id: uuid().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text().notNull(),
  description: text().notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const projectSources = pgTable("project_source", {
  id: uuid().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text().notNull(),
  kind: text().notNull(),
  size: integer().notNull(),
  state: text().notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  error: text(),
});

export const sourceChunks = pgTable("source_chunk", {
  id: uuid().primaryKey(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => projectSources.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text().notNull(),
  locatorType: text("locator_type").notNull(),
  locatorValue: text("locator_value").notNull(),
  tokenCount: integer("token_count").notNull(),
  embedding: vector("embedding", { dimensions: 384 }),
});

export const credentials = pgTable("credential", {
  provider: text("provider").primaryKey(),
  id: uuid().notNull(),
  encryptedSecret: text("encrypted_secret").notNull(),
  nonce: text().notNull(),
  hint: text().notNull(),
  status: text().notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

type Database = ReturnType<typeof createDatabase>;

function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { connect_timeout: 2, max: 1 });
  return { client, db: drizzle(client) };
}

// ── Installation repository ──────────────────────────────────────

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

// ── Agent repository ─────────────────────────────────────────────

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

// ── Project repository ──────────────────────────────────────────

function toProjectSource(row: typeof projectSources.$inferSelect): ProjectSource {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    kind: row.kind as ProjectSource["kind"],
    size: row.size,
    state: row.state as ProjectSource["state"],
    uploadedAt: row.uploadedAt,
    ...(row.error ? { error: row.error } : {}),
  };
}

export class PostgresProjectRepository implements ProjectRepository {
  constructor(private readonly database: Database) {}
  private get db() { return this.database.db; }

  async createProject(project: Project): Promise<Project> {
    await this.db.insert(projects).values(project);
    return project;
  }

  async loadProject(id: ProjectId): Promise<Project | undefined> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(sql`${projects.id} = ${id}`)
      .limit(1);
    return rows[0];
  }

  async listProjects(workspaceId: string): Promise<readonly Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(sql`${projects.workspaceId} = ${workspaceId}`)
      .orderBy(projects.createdAt);
  }

  async addSource(source: ProjectSource): Promise<ProjectSource> {
    await this.db.insert(projectSources).values({
      id: source.id,
      projectId: source.projectId,
      name: source.name,
      kind: source.kind,
      size: source.size,
      state: source.state,
      uploadedAt: source.uploadedAt,
    });
    return source;
  }

  async removeSource(sourceId: SourceId): Promise<void> {
    await this.db
      .delete(projectSources)
      .where(sql`${projectSources.id} = ${sourceId}`);
  }

  async loadProjectSources(
    projectId: ProjectId,
  ): Promise<readonly ProjectSource[]> {
    const rows = await this.db
      .select()
      .from(projectSources)
      .where(sql`${projectSources.projectId} = ${projectId}`)
      .orderBy(projectSources.uploadedAt);
    return rows.map(toProjectSource);
  }

  async loadSource(sourceId: SourceId): Promise<ProjectSource | undefined> {
    const rows = await this.db
      .select()
      .from(projectSources)
      .where(sql`${projectSources.id} = ${sourceId}`)
      .limit(1);
    return rows[0] ? toProjectSource(rows[0]) : undefined;
  }

  async updateSourceState(
    sourceId: SourceId,
    state: SourceState,
    error?: string,
  ): Promise<void> {
    const values: Record<string, unknown> = { state };
    if (error !== undefined) values.error = error;
    await this.db
      .update(projectSources)
      .set(values)
      .where(sql`${projectSources.id} = ${sourceId}`);
  }

  async storeChunks(chunks: readonly SourceChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    const rows = chunks.map((chunk) => ({
      id: chunk.id,
      sourceId: chunk.sourceId,
      projectId: chunk.projectId,
      content: chunk.content,
      locatorType: chunk.locator.type,
      locatorValue: chunk.locator.value,
      tokenCount: chunk.tokenCount,
      embedding: chunk.embedding
        ? `[${chunk.embedding.join(",")}]`
        : undefined,
    }));
    for (const row of rows) {
      await this.db
        .insert(sourceChunks)
        .values(row as typeof sourceChunks.$inferInsert);
    }
  }

  async deleteChunksBySource(sourceId: SourceId): Promise<void> {
    await this.db
      .delete(sourceChunks)
      .where(sql`${sourceChunks.sourceId} = ${sourceId}`);
  }

  async deleteChunksByProject(projectId: ProjectId): Promise<void> {
    await this.db
      .delete(sourceChunks)
      .where(sql`${sourceChunks.projectId} = ${projectId}`);
  }

  async searchProjectChunks(
    projectId: ProjectId,
    query: string,
  ): Promise<readonly SearchResult[]> {
    if (!query.trim()) return [];
    const tsquery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(" & ");
    const sqlQuery = sql`
      WITH ts_matches AS (
        SELECT
          ch.id,
          ch.source_id,
          ch.project_id,
          ch.content,
          ch.locator_type,
          ch.locator_value,
          ch.token_count,
          ts_rank(to_tsvector('english', ch.content), to_tsquery('english', ${tsquery})) AS ts_rank
        FROM ${sourceChunks} ch
        WHERE
          ch.project_id = ${projectId}
          AND to_tsvector('english', ch.content) @@ to_tsquery('english', ${tsquery})
      ),
      trgm_matches AS (
        SELECT
          ch.id,
          ch.source_id,
          ch.project_id,
          ch.content,
          ch.locator_type,
          ch.locator_value,
          ch.token_count,
          similarity(ch.content, ${query}) AS trgm_rank
        FROM ${sourceChunks} ch
        WHERE
          ch.project_id = ${projectId}
          AND ch.content % ${query}
      )
      SELECT
        COALESCE(ts.id, trgm.id) AS id,
        COALESCE(ts.source_id, trgm.source_id) AS source_id,
        COALESCE(ts.project_id, trgm.project_id) AS project_id,
        COALESCE(ts.content, trgm.content) AS content,
        COALESCE(ts.locator_type, trgm.locator_type) AS locator_type,
        COALESCE(ts.locator_value, trgm.locator_value) AS locator_value,
        COALESCE(ts.token_count, trgm.token_count) AS token_count,
        COALESCE(ts.ts_rank, 0) + COALESCE(trgm.trgm_rank, 0) AS rank
      FROM ts_matches ts
      FULL OUTER JOIN trgm_matches trgm ON ts.id = trgm.id
      ORDER BY rank DESC
      LIMIT 12
    `;
    const rows = await this.db.execute<{
      id: string;
      source_id: string;
      project_id: string;
      content: string;
      locator_type: string;
      locator_value: string;
      token_count: number;
      rank: number;
    }>(sqlQuery);
    return rows.map((row) => ({
      chunk: {
        id: row.id,
        sourceId: row.source_id,
        projectId: row.project_id,
        content: row.content,
        locator:
          row.locator_type === "page"
            ? { type: "page" as const, value: row.locator_value }
            : row.locator_type === "heading"
              ? { type: "heading" as const, value: row.locator_value }
              : { type: "paragraph" as const, value: row.locator_value },
        tokenCount: row.token_count,
      },
      score: row.rank,
    }));
  }

  async listReadySourceIds(
    projectId: ProjectId,
  ): Promise<readonly SourceId[]> {
    const rows = await this.db
      .select({ id: projectSources.id })
      .from(projectSources)
      .where(
        sql`${projectSources.projectId} = ${projectId} AND ${projectSources.state} = 'ready'`,
      );
    return rows.map((r) => r.id);
  }
}

export type ProjectDatabaseHandle = Readonly<{
  repository: PostgresProjectRepository;
  close(): Promise<void>;
}>;

export async function createProjectDatabase(
  databaseUrl: string,
): Promise<ProjectDatabaseHandle> {
  const database = createDatabase(databaseUrl);
  return {
    repository: new PostgresProjectRepository(database),
    close: async () => {
      await database.client.end({ timeout: 1 });
    },
  };
}

// ── Shared utilities ────────────────────────────────────────────

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

type Provider = "MiniMax" | "Tavily";
type CredentialRow = typeof credentials.$inferSelect;

function rowToCredential(row: CredentialRow): CredentialType {
  return {
    id: row.id,
    provider: row.provider as Provider,
    encryptedSecret: row.encryptedSecret,
    nonce: row.nonce,
    hint: row.hint,
    status: row.status as CredentialType["status"],
    validatedAt: row.validatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function credentialToRow(credential: CredentialType) {
  return {
    provider: credential.provider,
    id: credential.id,
    encryptedSecret: credential.encryptedSecret,
    nonce: credential.nonce,
    hint: credential.hint,
    status: credential.status,
    validatedAt: credential.validatedAt,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  };
}

export class PostgresCredentialRepository implements CredentialRepository {
  constructor(private readonly database: Database) {}

  async loadAll(): Promise<CredentialType[]> {
    const rows = await this.database.db.select().from(credentials);
    return rows.map(rowToCredential);
  }

  async load(provider: Provider): Promise<CredentialType | undefined> {
    const rows = await this.database.db
      .select()
      .from(credentials)
      .where(eq(credentials.provider, provider))
      .limit(1);
    return rows[0] ? rowToCredential(rows[0]) : undefined;
  }

  async save(credential: CredentialType): Promise<void> {
    await this.database.db
      .insert(credentials)
      .values(credentialToRow(credential))
      .onConflictDoUpdate({
        target: credentials.provider,
        set: credentialToRow(credential),
      });
  }
}

export function createCredentialDatabase(databaseUrl: string) {
  const database = createDatabase(databaseUrl);
  return {
    repository: new PostgresCredentialRepository(database),
    close: () => database.client.end({ timeout: 1 }),
  };
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export class Aes256GcmEncryption implements CredentialEncryptionPort {
  private readonly key: Buffer;

  constructor(masterKeyHex: string) {
    const key = Buffer.from(masterKeyHex, "hex");
    if (key.byteLength !== 32) {
      throw new Error("Encryption key must be 32 bytes (64 hex characters)");
    }
    this.key = key;
  }

  async encrypt(plaintext: string): Promise<{ encrypted: string; nonce: string }> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return {
      encrypted: Buffer.concat([encrypted, authTag]).toString("hex"),
      nonce: iv.toString("hex"),
    };
  }

  async decrypt(encryptedHex: string, nonceHex: string): Promise<string> {
    const iv = Buffer.from(nonceHex, "hex");
    const data = Buffer.from(encryptedHex, "hex");
    const authTag = data.subarray(-16);
    const ciphertext = data.subarray(0, -16);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
  }
}
