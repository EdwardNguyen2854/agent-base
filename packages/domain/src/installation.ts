export type Owner = Readonly<{ id: string; name: string }>;
export type Workspace = Readonly<{ id: string; name: string }>;

export type Installation = Readonly<{
  owner: Owner;
  workspace: Workspace;
}>;
