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
import { initializeInstallation } from "@agent-base/application/initialize-installation.js";
import postgres from "postgres";
import { PostgresInstallationRepository } from "./postgres-installation-repository.js";
import { createRuntimeConfig } from "./runtime-config.js";

type RuntimeStatus = {
  status: "healthy" | "unhealthy" | "stopped";
  origin: string;
  services: Record<string, { status: string; pid?: number }>;
};

export class AgentBaseRuntime {
  private readonly password: string;
  private readonly config;
  private readonly appRoot: string;
  private readonly postgresBin: string;
  private readonly nodeBin: string;

  constructor(dataDirectory = defaultDataDirectory()) {
    mkdirSync(dataDirectory, { recursive: true });
    const credentialPath = path.join(dataDirectory, "database-password");
    this.password = loadOrCreateSecret(credentialPath);
    this.config = createRuntimeConfig({
      dataDirectory,
      databasePassword: this.password,
    });
    this.appRoot = process.env.AGENT_BASE_APP_ROOT ?? process.cwd();
    this.postgresBin =
      process.env.AGENT_BASE_POSTGRES_BIN ?? defaultPostgresBin(this.appRoot);
    this.nodeBin = process.env.AGENT_BASE_NODE ?? process.execPath;
  }

  async initialize(): Promise<void> {
    mkdirSync(this.config.logsDirectory, { recursive: true });
    mkdirSync(this.config.runDirectory, { recursive: true });
    if (
      !existsSync(path.join(this.config.database.dataDirectory, "PG_VERSION"))
    ) {
      this.runPostgres("initdb", [
        "-D",
        this.config.database.dataDirectory,
        "-U",
        "agent_base",
        "--encoding=UTF8",
        "--auth-host=scram-sha-256",
        "--auth-local=trust",
        `--pwfile=${path.join(this.config.dataDirectory, "database-password")}`,
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
        [
          "local all all trust",
          "host agent_base agent_base 127.0.0.1/32 scram-sha-256",
          "host all all 0.0.0.0/0 reject",
          "host all all ::0/0 reject",
        ].join("\n"),
      );
    }

    this.startDatabase();
    const adminUrl = this.config.database.url.replace(
      /\/agent_base$/,
      "/postgres",
    );
    const admin = postgres(adminUrl, { max: 1 });
    const databases = await admin<{ exists: boolean }[]>`
      select exists(select from pg_database where datname = 'agent_base') as exists
    `;
    if (!databases[0]?.exists) await admin.unsafe("create database agent_base");
    await admin.end();

    const sql = postgres(this.config.database.url, { max: 1 });
    await sql.unsafe("create extension if not exists vector");
    await sql.unsafe(`
      create table if not exists owner (
        id uuid primary key,
        name text not null
      );
      create table if not exists workspace (
        id uuid primary key,
        owner_id uuid not null references owner(id),
        name text not null
      );
      create table if not exists runtime_heartbeat (
        process_name text primary key,
        last_seen_at timestamptz not null
      );
    `);
    await initializeInstallation(new PostgresInstallationRepository(sql));
    await sql.end();
  }

  async start(): Promise<RuntimeStatus> {
    await this.initialize();
    this.startManagedProcess(
      "worker",
      path.join(this.appRoot, "apps/worker/dist/src/main.js"),
    );
    this.startManagedProcess(
      "web",
      path.join(this.appRoot, "apps/web/.next/standalone/apps/web/server.js"),
      {
        HOSTNAME: this.config.web.host,
        PORT: String(this.config.web.port),
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
    try {
      const response = await fetch(`${this.config.web.origin}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      const report = (await response.json()) as RuntimeStatus;
      return {
        ...report,
        origin: this.config.web.origin,
        services: {
          ...report.services,
          web: {
            status: report.services.web?.status ?? "unhealthy",
            ...(pids.web ? { pid: pids.web } : {}),
          },
          worker: {
            status: report.services.worker?.status ?? "unhealthy",
            ...(pids.worker ? { pid: pids.worker } : {}),
          },
        },
      };
    } catch {
      return {
        status: pids.web || pids.worker ? "unhealthy" : "stopped",
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
          database: { status: "unknown" },
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
    if (result.status !== 0)
      throw new Error(
        `${executable} failed: ${result.stderr || result.stdout}`,
      );
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
