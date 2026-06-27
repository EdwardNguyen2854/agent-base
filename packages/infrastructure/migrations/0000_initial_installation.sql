CREATE TABLE IF NOT EXISTS "owner" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace" (
  "id" uuid PRIMARY KEY,
  "owner_id" uuid NOT NULL REFERENCES "owner"("id"),
  "name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "runtime_heartbeat" (
  "process_name" text PRIMARY KEY,
  "last_seen_at" timestamptz NOT NULL
);
