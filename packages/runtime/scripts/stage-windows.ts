import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../../..");
const stage = path.join(root, "release", "stage");
rmSync(stage, { recursive: true, force: true });
mkdirSync(path.join(stage, "app", "apps", "worker", "dist", "src"), {
  recursive: true,
});
mkdirSync(path.join(stage, "app", "packages", "runtime", "dist"), {
  recursive: true,
});
mkdirSync(path.join(stage, "app", "packages", "infrastructure"), {
  recursive: true,
});

cpSync(
  path.join(root, "apps", "worker", "dist", "src", "main.js"),
  path.join(stage, "app", "apps", "worker", "dist", "src", "main.js"),
);
cpSync(
  path.join(root, "packages", "infrastructure", "migrations"),
  path.join(stage, "app", "packages", "infrastructure", "migrations"),
  { recursive: true },
);
cpSync(
  path.join(root, "packages", "runtime", "dist", "agent-base.mjs"),
  path.join(stage, "app", "packages", "runtime", "dist", "agent-base.mjs"),
);
cpSync(
  path.join(root, "apps", "web", ".next", "standalone"),
  path.join(stage, "app", "apps", "web", ".next", "standalone"),
  { recursive: true },
);
cpSync(
  path.join(root, "apps", "web", ".next", "static"),
  path.join(
    stage,
    "app",
    "apps",
    "web",
    ".next",
    "standalone",
    "apps",
    "web",
    ".next",
    "static",
  ),
  { recursive: true },
);
cpSync(
  path.join(root, "packaging", "windows", "controls"),
  path.join(stage, "controls"),
  { recursive: true },
);

console.log(stage);
