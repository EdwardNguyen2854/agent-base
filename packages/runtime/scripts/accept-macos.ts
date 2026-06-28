import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

if (process.platform !== "darwin") {
  throw new Error("macOS lifecycle acceptance must run on macOS");
}

const root = path.resolve(import.meta.dirname, "../../..");
const dataDirectory = mkdtempSync(
  path.join(tmpdir(), "agent-base-acceptance-"),
);
const sourcesDirectory = path.join(dataDirectory, "sources");
const cli = path.join(root, "packages/runtime/dist/agent-base.mjs");
const environment = {
  ...process.env,
  AGENT_BASE_APP_ROOT: root,
  AGENT_BASE_HOME: dataDirectory,
  AGENT_BASE_SOURCES_DIRECTORY: sourcesDirectory,
};

function run(command: string) {
  return execFileSync(process.execPath, [cli, command], {
    encoding: "utf8",
    env: environment,
    timeout: 60_000,
  });
}

function portIsOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

try {
  const started = JSON.parse(run("start"));
  if (started.status !== "healthy")
    throw new Error("Runtime did not become healthy");
  if (started.origin !== "http://127.0.0.1:3210") {
    throw new Error("Web origin is not loopback-only");
  }
  if (!(await portIsOpen(3210)) || !(await portIsOpen(54321))) {
    throw new Error("Expected runtime ports are not listening");
  }

  run("stop");
  const stopped = JSON.parse(run("health"));
  if (stopped.status !== "stopped") throw new Error("Runtime did not stop");
  if ((await portIsOpen(3210)) || (await portIsOpen(54321))) {
    throw new Error("A runtime port remains open after stop");
  }
} finally {
  try {
    run("stop");
  } catch {
    // Preserve the original acceptance failure.
  }
  rmSync(dataDirectory, { recursive: true, force: true });
}
