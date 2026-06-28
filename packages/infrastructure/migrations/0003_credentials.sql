CREATE TABLE IF NOT EXISTS "credential" (
  "provider" text PRIMARY KEY,
  "id" uuid NOT NULL,
  "encrypted_secret" text NOT NULL,
  "nonce" text NOT NULL,
  "hint" text NOT NULL,
  "status" text NOT NULL,
  "validated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
