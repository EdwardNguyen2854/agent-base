"use client";

import { usePathname } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { PageHeader } from "../components/ui/page";
import { useData } from "./data-provider";

export { DashboardView } from "../components/views/dashboard-view";
export { AgentsView } from "../components/views/agents-view";
export { AgentDetailView } from "../components/views/agent-detail-view";
export { AgentSettings } from "../components/views/agent-settings";
export { ProjectsView, NewProjectView } from "../components/views/projects-view";
export { ProjectDetailView } from "../components/views/project-detail-view";
export { TasksView, TaskDetailView, NewTaskView } from "../components/views/tasks-view";
export { RunsView, RunDetailView } from "../components/views/runs-view";
export { ReportView } from "../components/views/report-view";
export { SetupView } from "../components/views/setup-view";
export { CredentialsView } from "../components/views/settings-view";

export function SystemView() {
  const [state, source] = useData();
  const [toast, setToast] = useState("");
  const backup = () => {
    const url = URL.createObjectURL(
      new Blob([source.exportBackup()], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agent-base-demo-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup snapshot exported.");
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      source.restoreBackup(await file.text());
      setToast("Backup restored successfully.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Restore failed.");
    }
  };
  return (
    <>
      <PageHeader
        title="System"
        description="Inspect health, manage local data, and simulate installed operations."
      />
    </>
  );
}

export function HelpCenter() {
  return null;
}
