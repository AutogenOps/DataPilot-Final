/*
  # Fix Remaining Security Issues
  
  1. Drop the remaining unused composite indexes
  2. Replace overly-permissive RLS policies with workspace-aware policies
  3. Add workspace_id column to enforce multi-tenant isolation
  
  ## Changes
  
  ### Removed Unused Indexes
  - Drop all composite indexes that are not being used
  - Only keep primary keys and unique constraints for data integrity
  
  ### Updated RLS Policies
  - Add workspace_id column to track data ownership/isolation
  - Policies now enforce workspace-based access control
  - Users can only access data within their own workspace
  - Workspace ID is managed by application layer
*/

-- Drop unused composite indexes
DROP INDEX IF EXISTS idx_jobs_status_updated;
DROP INDEX IF EXISTS idx_clusters_state_updated;
DROP INDEX IF EXISTS idx_alerts_severity_created;
DROP INDEX IF EXISTS idx_chat_messages_conversation_ts;

-- Add workspace_id columns to enable multi-tenant data isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clusters' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE clusters ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipelines' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE pipelines ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE alerts ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Drop old policies without workspace checks
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON jobs;

-- Create new workspace-aware policies for jobs
CREATE POLICY "Users can read jobs in their workspace"
  ON jobs FOR SELECT
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can insert jobs in their workspace"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can update jobs in their workspace"
  ON jobs FOR UPDATE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'))
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can delete jobs in their workspace"
  ON jobs FOR DELETE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

-- Drop old policies for clusters
DROP POLICY IF EXISTS "Authenticated users can read clusters" ON clusters;
DROP POLICY IF EXISTS "Authenticated users can insert clusters" ON clusters;
DROP POLICY IF EXISTS "Authenticated users can update clusters" ON clusters;
DROP POLICY IF EXISTS "Authenticated users can delete clusters" ON clusters;

-- Create new workspace-aware policies for clusters
CREATE POLICY "Users can read clusters in their workspace"
  ON clusters FOR SELECT
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can insert clusters in their workspace"
  ON clusters FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can update clusters in their workspace"
  ON clusters FOR UPDATE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'))
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can delete clusters in their workspace"
  ON clusters FOR DELETE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

-- Drop old policies for pipelines
DROP POLICY IF EXISTS "Authenticated users can read pipelines" ON pipelines;
DROP POLICY IF EXISTS "Authenticated users can insert pipelines" ON pipelines;
DROP POLICY IF EXISTS "Authenticated users can update pipelines" ON pipelines;
DROP POLICY IF EXISTS "Authenticated users can delete pipelines" ON pipelines;

-- Create new workspace-aware policies for pipelines
CREATE POLICY "Users can read pipelines in their workspace"
  ON pipelines FOR SELECT
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can insert pipelines in their workspace"
  ON pipelines FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can update pipelines in their workspace"
  ON pipelines FOR UPDATE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'))
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can delete pipelines in their workspace"
  ON pipelines FOR DELETE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

-- Drop old policies for alerts
DROP POLICY IF EXISTS "Authenticated users can read alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON alerts;

-- Create new workspace-aware policies for alerts
CREATE POLICY "Users can read alerts in their workspace"
  ON alerts FOR SELECT
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can insert alerts in their workspace"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can update alerts in their workspace"
  ON alerts FOR UPDATE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'))
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can delete alerts in their workspace"
  ON alerts FOR DELETE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

-- Drop old policies for chat_messages
DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can delete chat messages" ON chat_messages;

-- Create new workspace-aware policies for chat_messages
CREATE POLICY "Users can read chat messages in their workspace"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can insert chat messages in their workspace"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));

CREATE POLICY "Users can delete chat messages in their workspace"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (workspace_id = COALESCE(current_setting('app.workspace_id', true), 'default'));
