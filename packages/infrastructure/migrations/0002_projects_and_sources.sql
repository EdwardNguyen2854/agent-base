CREATE TABLE IF NOT EXISTS "project" (
  "id" uuid PRIMARY KEY,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id"),
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_source" (
  "id" uuid PRIMARY KEY,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "size" integer NOT NULL,
  "state" text NOT NULL DEFAULT 'pending',
  "uploaded_at" timestamptz NOT NULL DEFAULT now(),
  "error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_chunk" (
  "id" uuid PRIMARY KEY,
  "source_id" uuid NOT NULL REFERENCES "project_source"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "locator_type" text NOT NULL,
  "locator_value" text NOT NULL,
  "token_count" integer NOT NULL,
  "embedding" vector(384)
);
