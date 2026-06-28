import path from "node:path";

export const LOOPBACK_HOST = "127.0.0.1";

export function createPostgresHostAuthentication() {
  return [
    "local all all reject",
    "host postgres agent_base_admin 127.0.0.1/32 scram-sha-256",
    "host agent_base agent_base_admin 127.0.0.1/32 scram-sha-256",
    "host agent_base agent_base 127.0.0.1/32 scram-sha-256",
    "host all all 0.0.0.0/0 reject",
    "host all all ::0/0 reject",
  ];
}

export type RuntimeConfig = ReturnType<typeof createRuntimeConfig>;

const WEB_HOST = "0.0.0.0";

export function createRuntimeConfig(input: {
  dataDirectory: string;
  webPort?: number;
  databasePort?: number;
  databasePassword?: string;
  databaseAdminPassword?: string;
}) {
  const webPort = input.webPort ?? 3210;
  const databasePort = input.databasePort ?? 54321;
  const dataDirectory = path.resolve(input.dataDirectory);

  return {
    dataDirectory,
    web: {
      host: WEB_HOST,
      port: webPort,
      origin: `http://127.0.0.1:${webPort}`,
    },
    database: {
      host: LOOPBACK_HOST,
      port: databasePort,
      listenAddresses: LOOPBACK_HOST,
      dataDirectory: path.join(dataDirectory, "postgres"),
      url:
        `postgresql://agent_base:${encodeURIComponent(input.databasePassword ?? "local-installation")}` +
        `@${LOOPBACK_HOST}:${databasePort}/agent_base`,
      adminUrl:
        `postgresql://agent_base_admin:${encodeURIComponent(input.databaseAdminPassword ?? "local-installation-admin")}` +
        `@${LOOPBACK_HOST}:${databasePort}/postgres`,
    },
    logsDirectory: path.join(dataDirectory, "logs"),
    runDirectory: path.join(dataDirectory, "run"),
    sourcesDirectory: path.join(dataDirectory, "sources"),
  } as const;
}
