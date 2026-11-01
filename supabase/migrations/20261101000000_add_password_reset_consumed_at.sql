BEGIN;

ALTER TABLE "public"."password_reset_otps"
    ADD COLUMN IF NOT EXISTS "consumed_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "idx_password_reset_otps_active"
    ON "public"."password_reset_otps" ("id", "user_id")
    WHERE "verified_at" IS NOT NULL AND "consumed_at" IS NULL;

COMMIT;
