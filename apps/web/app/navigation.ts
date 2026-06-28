import type { FrontendState } from "../lib/frontend-data";

export type AppArea =
  | "dashboard"
  | "harness"
  | "workspaces"
  | "projects"
  | "workflows"
  | "connectors"
  | "runs"
  | "settings";

export type SearchResult = {
  href: string;
  kind: string;
  title: string;
  description: string;
};

export function areaForPath(path: string): AppArea {
  if (path.startsWith("/agents")) return "harness";
  if (path.startsWith("/workspaces")) return "workspaces";
  if (path.startsWith("/projects") || path.startsWith("/tasks"))
    return "projects";
  if (path.startsWith("/workflows")) return "workflows";
  if (path.startsWith("/connectors")) return "connectors";
  if (path.startsWith("/runs") || path.startsWith("/reports")) return "runs";
  if (path.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function searchWorkspace(
  state: FrontendState,
  query: string,
): SearchResult[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];

  const results: SearchResult[] = [];
  for (const agent of state.agents) {
    if (
      `${agent.name} ${agent.description}`.toLocaleLowerCase().includes(needle)
    )
      results.push({
        href: `/agents/${agent.id}`,
        kind: "Agent",
        title: agent.name,
        description: agent.description,
      });
  }
  for (const project of state.projects) {
    if (
      `${project.name} ${project.description}`
        .toLocaleLowerCase()
        .includes(needle)
    )
      results.push({
        href: `/projects/${project.id}`,
        kind: "Project",
        title: project.name,
        description: project.description || "Project workspace",
      });
  }
  for (const task of state.tasks) {
    if (`${task.title} ${task.goal}`.toLocaleLowerCase().includes(needle))
      results.push({
        href: `/tasks/${task.id}`,
        kind: "Task",
        title: task.title,
        description: task.goal,
      });
  }
  for (const run of state.runs) {
    const task = state.tasks.find((item) => item.id === run.taskId);
    if (`${run.id} ${task?.title ?? ""}`.toLocaleLowerCase().includes(needle))
      results.push({
        href: `/runs/${run.id}`,
        kind: "Run",
        title: task?.title ?? run.id,
        description: `${run.id} · ${run.state.replaceAll("_", " ")}`,
      });
  }
  return results.slice(0, 12);
}
