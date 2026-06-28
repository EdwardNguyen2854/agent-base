import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { seedGeneralResearchAgent } from "@agent-base/application/agent-publishing.js";
import {
  OWNER,
  WORKSPACE,
} from "@agent-base/application/initialize-installation.js";
import type { Installation } from "@agent-base/domain/installation.js";
import {
  initializeApplicationDatabase,
  probeDatabase,
  provisionApplicationDatabase,
} from "@agent-base/infrastructure";
import {
  createPostgresHostAuthentication,
  createRuntimeConfig,
} from "./runtime-config.js";

type RuntimeStatus = {
  status: "healthy" | "unhealthy" | "stopped";
  origin: string;
  services: Record<string, { status: string; pid?: number }>;
};

type RuntimeDependencies = {
  probeDatabase: (databaseUrl: string) => Promise<"healthy" | "unhealthy">;
};

export class AgentBaseRuntime {
  private readonly password: string;
  private readonly adminPassword: string;
  private readonly config;
  private readonly appRoot: string;
  private readonly postgresBin: string;
  private readonly nodeBin: string;

  private readonly dependencies: RuntimeDependencies;

  constructor(
    dataDirectory = defaultDataDirectory(),
    dependencies: Partial<RuntimeDependencies> = {},
  ) {
    mkdirSync(dataDirectory, { recursive: true });
    const credentialPath = path.join(dataDirectory, "database-password");
    this.password = loadOrCreateSecret(credentialPath);
    this.adminPassword = loadOrCreateSecret(
      path.join(dataDirectory, "database-admin-password"),
    );
    this.config = createRuntimeConfig({
      dataDirectory,
      databasePassword: this.password,
      databaseAdminPassword: this.adminPassword,
    });
    this.appRoot = process.env.AGENT_BASE_APP_ROOT ?? process.cwd();
    this.postgresBin =
      process.env.AGENT_BASE_POSTGRES_BIN ?? defaultPostgresBin(this.appRoot);
    this.nodeBin = process.env.AGENT_BASE_NODE ?? process.execPath;
    this.dependencies = { probeDatabase, ...dependencies };
  }

  async initialize(): Promise<Installation> {
    mkdirSync(this.config.logsDirectory, { recursive: true });
    mkdirSync(this.config.runDirectory, { recursive: true });
    if (
      !existsSync(path.join(this.config.database.dataDirectory, "PG_VERSION"))
    ) {
      this.runPostgres("initdb", [
        "-D",
        this.config.database.dataDirectory,
        "-U",
        "agent_base_admin",
        "--encoding=UTF8",
        "--auth-host=scram-sha-256",
        "--auth-local=scram-sha-256",
        `--pwfile=${path.join(this.config.dataDirectory, "database-admin-password")}`,
      ]);
      writeFileSync(
        path.join(this.config.database.dataDirectory, "postgresql.auto.conf"),
        [
          `listen_addresses = '${this.config.database.listenAddresses}'`,
          `port = ${this.config.database.port}`,
          "max_connections = 20",
          "shared_buffers = '128MB'",
        ].join("\n"),
      );
      writeFileSync(
        path.join(this.config.database.dataDirectory, "pg_hba.conf"),
        createPostgresHostAuthentication().join("\n"),
      );
    }

    this.startDatabase();
    await provisionApplicationDatabase(
      this.config.database.adminUrl,
      this.password,
    );
    return initializeApplicationDatabase(
      this.config.database.url,
      path.join(this.appRoot, "packages/infrastructure/migrations"),
      async (repositories) => {
        await seedGeneralResearchAgent(
          repositories.agent,
          WORKSPACE.id,
          OWNER.id,
        );
        return { owner: OWNER, workspace: WORKSPACE };
      },
    );
  }

  async start(): Promise<RuntimeStatus> {
    const installation = await this.initialize();
    this.startManagedProcess(
      "worker",
      path.join(this.appRoot, "apps/worker/dist/src/main.js"),
      {
        AGENT_BASE_OWNER_ID: installation.owner.id,
        AGENT_BASE_WORKSPACE_ID: installation.workspace.id,
        AGENT_BASE_HOME: this.config.dataDirectory,
        AGENT_BASE_SOURCES_DIRECTORY: this.config.sourcesDirectory,
      },
    );
    this.startManagedProcess(
      "web",
      path.join(this.appRoot, "apps/web/.next/standalone/apps/web/server.js"),
      {
        HOSTNAME: this.config.web.host,
        PORT: String(this.config.web.port),
        AGENT_BASE_OWNER_ID: installation.owner.id,
        AGENT_BASE_WORKSPACE_ID: installation.workspace.id,
        AGENT_BASE_HOME: this.config.dataDirectory,
        AGENT_BASE_SOURCES_DIRECTORY: this.config.sourcesDirectory,
      },
    );
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const status = await this.health();
      if (status.status === "healthy") return status;
    }
    return this.health();
  }

  async health(): Promise<RuntimeStatus> {
    const pids = { web: this.readPid("web"), worker: this.readPid("worker") };
    const databaseProbe = await this.dependencies.probeDatabase(
      this.config.database.url,
    );
    const database =
      databaseProbe === "healthy"
        ? "healthy"
        : this.readPostgresPid()
          ? "unhealthy"
          : "stopped";
    try {
      const response = await fetch(`${this.config.web.origin}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      const report = (await response.json()) as RuntimeStatus;
      const web = report.services.web?.status ?? "unhealthy";
      const worker = report.services.worker?.status ?? "unhealthy";
      return {
        ...report,
        status:
          web === "healthy" && worker === "healthy" && database === "healthy"
            ? "healthy"
            : "unhealthy",
        origin: this.config.web.origin,
        services: {
          ...report.services,
          web: {
            status: web,
            ...(pids.web ? { pid: pids.web } : {}),
          },
          worker: {
            status: worker,
            ...(pids.worker ? { pid: pids.worker } : {}),
          },
          database: { status: database },
        },
      };
    } catch {
      const status =
        !pids.web && !pids.worker && database === "stopped"
          ? "stopped"
          : "unhealthy";
      return {
        status,
        origin: this.config.web.origin,
        services: {
          web: {
            status: pids.web ? "unhealthy" : "stopped",
            ...(pids.web ? { pid: pids.web } : {}),
          },
          worker: {
            status: pids.worker ? "unhealthy" : "stopped",
            ...(pids.worker ? { pid: pids.worker } : {}),
          },
          database: { status: database },
        },
      };
    }
  }

  async stop(): Promise<void> {
    for (const processName of ["web", "worker"] as const) {
      const pid = this.readPid(processName);
      if (pid) {
        if (process.platform === "win32") {
          spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
            windowsHide: true,
          });
        } else {
          try {
            process.kill(pid, "SIGTERM");
          } catch {
            /* already stopped */
          }
        }
      }
      if (pid) await waitForProcessExit(pid);
      writeFileSync(this.pidPath(processName), "");
    }
    if (
      existsSync(
        path.join(this.config.database.dataDirectory, "postmaster.pid"),
      )
    ) {
      this.runPostgres("pg_ctl", [
        "stop",
        "-D",
        this.config.database.dataDirectory,
        "-m",
        "fast",
        "-w",
      ]);
    }
    const status = await this.health();
    if (status.status !== "stopped") {
      throw new Error(
        `Agent Base did not stop cleanly: ${JSON.stringify(status.services)}`,
      );
    }
  }

  private startDatabase() {
    if (
      existsSync(
        path.join(this.config.database.dataDirectory, "postmaster.pid"),
      )
    )
      return;
    this.runPostgres("pg_ctl", [
      "start",
      "-D",
      this.config.database.dataDirectory,
      "-l",
      path.join(this.config.logsDirectory, "postgres.log"),
      "-w",
    ]);
  }

  private startManagedProcess(
    name: "web" | "worker",
    script: string,
    extraEnvironment = {},
  ) {
    const existing = this.readPid(name);
    if (existing) return;
    const log = openSync(
      path.join(this.config.logsDirectory, `${name}.log`),
      "a",
    );
    const child = spawn(this.nodeBin, [script], {
      cwd: this.appRoot,
      detached: true,
      env: {
        ...process.env,
        DATABASE_URL: this.config.database.url,
        ...extraEnvironment,
      },
      stdio: ["ignore", log, log],
      windowsHide: true,
    });
    closeSync(log);
    child.unref();
    if (!child.pid) throw new Error(`Could not start ${name}`);
    writeFileSync(this.pidPath(name), String(child.pid));
  }

  private runPostgres(executable: string, args: string[]) {
    const result = spawnSync(
      path.join(this.postgresBin, platformExecutable(executable)),
      args,
      { encoding: "utf8", windowsHide: true },
    );
    if (result.status !== 0) {
      const detail = result.error?.message ?? result.stderr ?? result.stdout;
      throw new Error(
        `${executable} failed: ${detail || `exit status ${result.status}`}`,
      );
    }
  }

  private readPid(name: "web" | "worker"): number | undefined {
    const pidPath = this.pidPath(name);
    if (!existsSync(pidPath)) return undefined;
    const pid = Number.parseInt(readFileSync(pidPath, "utf8"), 10);
    if (!Number.isInteger(pid)) return undefined;
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return undefined;
    }
  }

  private readPostgresPid(): number | undefined {
    const pidPath = path.join(
      this.config.database.dataDirectory,
      "postmaster.pid",
    );
    if (!existsSync(pidPath)) return undefined;
    const [firstLine] = readFileSync(pidPath, "utf8").split(/\r?\n/, 1);
    const pid = Number.parseInt(firstLine ?? "", 10);
    if (!Number.isInteger(pid)) return undefined;
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return undefined;
    }
  }

  private pidPath(name: string) {
    return path.join(this.config.runDirectory, `${name}.pid`);
  }
}

function defaultDataDirectory() {
  if (process.env.AGENT_BASE_HOME) return process.env.AGENT_BASE_HOME;
  if (process.platform === "win32")
    return path.join(
      process.env.LOCALAPPDATA ?? process.env.USERPROFILE ?? ".",
      "Agent Base",
    );
  return path.join(
    process.env.HOME ?? ".",
    "Library",
    "Application Support",
    "Agent Base",
  );
}

function defaultPostgresBin(appRoot: string) {
  if (process.platform === "win32")
    return path.join(appRoot, "runtime", "postgres", "bin");
  return "/opt/homebrew/opt/postgresql@18/bin";
}

function loadOrCreateSecret(secretPath: string) {
  if (existsSync(secretPath)) return readFileSync(secretPath, "utf8").trim();
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

function platformExecutable(name: string) {
  return process.platform === "win32" ? `${name}.exe` : name;
}

async function waitForProcessExit(pid: number) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Managed process ${pid} did not stop within 5 seconds`);
}
