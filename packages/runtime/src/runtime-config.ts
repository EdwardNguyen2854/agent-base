import path from "node:path";

export const LOOPBACK_HOST = "127.0.0.1";

export type RuntimeConfig = ReturnType<typeof createRuntimeConfig>;

export function createRuntimeConfig(input: {
  dataDirectory: string;
  webPort?: number;
  databasePort?: number;
  databasePassword?: string;
}) {
  const webPort = input.webPort ?? 3210;
  const databasePort = input.databasePort ?? 54321;
  const dataDirectory = path.resolve(input.dataDirectory);

  return {
    dataDirectory,
    web: {
      host: LOOPBACK_HOST,
      port: webPort,
      origin: `http://${LOOPBACK_HOST}:${webPort}`,
    },
    database: {
      host: LOOPBACK_HOST,
      port: databasePort,
      listenAddresses: LOOPBACK_HOST,
      dataDirectory: path.join(dataDirectory, "postgres"),
      url:
        `postgresql://agent_base:${encodeURIComponent(input.databasePassword ?? "local-installation")}` +
        `@${LOOPBACK_HOST}:${databasePort}/agent_base`,
    },
    logsDirectory: path.join(dataDirectory, "logs"),
    runDirectory: path.join(dataDirectory, "run"),
  } as const;
}
