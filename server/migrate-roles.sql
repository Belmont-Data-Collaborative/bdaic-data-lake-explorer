-- Migration script for role-based access control
-- This script will migrate existing user roles to the new role system

-- First, create the roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "is_system_role" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create the role_datasets junction table
CREATE TABLE IF NOT EXISTS "role_datasets" (
  "id" serial PRIMARY KEY NOT NULL,
  "role_id" integer NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "dataset_id" integer NOT NULL REFERENCES "datasets"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for role_datasets
CREATE INDEX IF NOT EXISTS "idx_role_datasets_unique" ON "role_datasets" ("role_id", "dataset_id");
CREATE INDEX IF NOT EXISTS "idx_role_datasets_role_id" ON "role_datasets" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_datasets_dataset_id" ON "role_datasets" ("dataset_id");

-- Insert default system roles
INSERT INTO "roles" ("name", "description", "is_system_role") 
VALUES 
  ('full_access', 'Full access to all datasets', true),
  ('no_access', 'No access to any datasets', true)
ON CONFLICT ("name") DO NOTHING;

-- Add new columns to users table if they don't exist
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "system_role" text DEFAULT 'user' NOT NULL,
ADD COLUMN IF NOT EXISTS "custom_role_id" integer REFERENCES "roles"("id") ON DELETE SET NULL;

-- Migrate existing data: copy role to system_role
UPDATE "users" SET "system_role" = "role" WHERE "role" IS NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS "idx_users_system_role" ON "users" ("system_role");
CREATE INDEX IF NOT EXISTS "idx_users_custom_role_id" ON "users" ("custom_role_id");

-- Drop the old role column after migration
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "role";

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS "idx_roles_name" ON "roles" ("name");
CREATE INDEX IF NOT EXISTS "idx_roles_is_system_role" ON "roles" ("is_system_role");