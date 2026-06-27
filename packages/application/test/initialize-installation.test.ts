import { describe, expect, it } from "vitest";
import {
  type InstallationRepository,
  initializeInstallation,
} from "../src/initialize-installation.js";

describe("initial installation", () => {
  it("creates one stable Owner and Workspace and remains idempotent", async () => {
    const records = new Map<string, { id: string; name: string }>();
    const repository: InstallationRepository = {
      ensureOwner: async (owner) => {
        records.set(`owner:${owner.id}`, owner);
      },
      ensureWorkspace: async (workspace) => {
        records.set(`workspace:${workspace.id}`, workspace);
      },
    };

    const first = await initializeInstallation(repository);
    const second = await initializeInstallation(repository);

    expect(second).toEqual(first);
    expect([...records.values()]).toEqual([first.owner, first.workspace]);
  });
});
