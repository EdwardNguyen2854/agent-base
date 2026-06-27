import type {
  Installation,
  Owner,
  Workspace,
} from "@agent-base/domain/installation.js";

const OWNER: Owner = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Owner",
};

const WORKSPACE: Workspace = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Agent Base",
};

export interface InstallationRepository {
  ensureOwner(owner: Owner): Promise<void>;
  ensureWorkspace(workspace: Workspace, ownerId: string): Promise<void>;
}

export async function initializeInstallation(
  repository: InstallationRepository,
): Promise<Installation> {
  await repository.ensureOwner(OWNER);
  await repository.ensureWorkspace(WORKSPACE, OWNER.id);

  return { owner: OWNER, workspace: WORKSPACE };
}
