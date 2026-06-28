CREATE TABLE IF NOT EXISTS "research_task" (
  "id" uuid PRIMARY KEY,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id"),
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "goal" text NOT NULL,
  "report_language" text NOT NULL,
  "selected_sources" jsonb NOT NULL,
  "web_research" boolean NOT NULL,
  "state" text NOT NULL,
  "created_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "research_run" (
  "id" uuid PRIMARY KEY,
  "task_id" uuid NOT NULL REFERENCES "research_task"("id") ON DELETE CASCADE,
  "state" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "research_plan" jsonb NOT NULL,
  "approval_owner_id" uuid REFERENCES "owner"("id"),
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "cancelled_at" timestamptz
);
