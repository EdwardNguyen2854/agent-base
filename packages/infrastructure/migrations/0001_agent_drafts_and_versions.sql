CREATE TABLE IF NOT EXISTS "agent" (
  "id" uuid PRIMARY KEY,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id"),
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_draft" (
  "agent_id" uuid PRIMARY KEY REFERENCES "agent"("id"),
  "id" uuid NOT NULL,
  "purpose" text NOT NULL,
  "instructions" text NOT NULL,
  "research_method" text NOT NULL,
  "report_requirements" text NOT NULL,
  "web_search" boolean NOT NULL,
  "model_turns" integer NOT NULL,
  "tavily_searches" integer NOT NULL,
  "page_fetches" integer NOT NULL,
  "active_minutes" integer NOT NULL,
  "updated_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_version" (
  "id" uuid PRIMARY KEY,
  "agent_id" uuid NOT NULL REFERENCES "agent"("id"),
  "number" integer NOT NULL,
  "purpose" text NOT NULL,
  "instructions" text NOT NULL,
  "research_method" text NOT NULL,
  "report_requirements" text NOT NULL,
  "web_search" boolean NOT NULL,
  "model_turns" integer NOT NULL,
  "tavily_searches" integer NOT NULL,
  "page_fetches" integer NOT NULL,
  "active_minutes" integer NOT NULL,
  "published_at" timestamptz NOT NULL,
  "published_by" uuid NOT NULL REFERENCES "owner"("id"),
  CONSTRAINT "agent_version_agent_number_unique" UNIQUE ("agent_id","number")
);
