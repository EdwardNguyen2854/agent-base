import type {
  ResearchPlanGenerator,
  Run,
  Task,
} from "@agent-base/application/task-runs.js";

export const researchPlanGenerator: ResearchPlanGenerator = {
  async generate(snapshot) {
    const evidenceStrategy =
      snapshot.sources.length > 0
        ? ["Review the selected Project Sources"]
        : [];
    if (snapshot.effectivePermissions.webSearch) {
      evidenceStrategy.push("Discover and retrieve eligible public evidence");
    }
    if (evidenceStrategy.length === 0) {
      evidenceStrategy.push("Use only the supplied Task context");
    }
    return {
      objective: snapshot.task.goal,
      questions: [
        `What evidence is needed to answer: ${snapshot.task.goal}?`,
        "Where do the strongest sources agree or conflict?",
        "What limitations should the Report make explicit?",
      ],
      evidenceStrategy,
      boundaries: [
        "Evidence operations remain unavailable until Plan Approval",
        "Use only selected Project Sources and explicitly permitted web research",
        `Write the Report in ${snapshot.task.reportLanguage}`,
      ],
    };
  },
};

export function serializeTask(task: Task) {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
  };
}

export function serializeRun(run: Run) {
  return {
    ...run,
    snapshot: {
      ...run.snapshot,
      agentVersion: {
        ...run.snapshot.agentVersion,
        publishedAt: run.snapshot.agentVersion.publishedAt.toISOString(),
      },
    },
    ...(run.planApproval
      ? {
          planApproval: {
            ...run.planApproval,
            approvedAt: run.planApproval.approvedAt.toISOString(),
          },
        }
      : {}),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    ...(run.cancelledAt ? { cancelledAt: run.cancelledAt.toISOString() } : {}),
  };
}
