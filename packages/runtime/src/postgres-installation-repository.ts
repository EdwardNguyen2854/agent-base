import type { InstallationRepository } from "@agent-base/application/initialize-installation.js";
import type { Owner, Workspace } from "@agent-base/domain/installation.js";
import type postgres from "postgres";

export class PostgresInstallationRepository implements InstallationRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async ensureOwner(owner: Owner): Promise<void> {
    await this.sql`
      insert into owner (id, name) values (${owner.id}, ${owner.name})
      on conflict (id) do nothing
    `;
  }

  async ensureWorkspace(workspace: Workspace, ownerId: string): Promise<void> {
    await this.sql`
      insert into workspace (id, owner_id, name)
      values (${workspace.id}, ${ownerId}, ${workspace.name})
      on conflict (id) do nothing
    `;
  }
}
