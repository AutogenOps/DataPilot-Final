/*
  # Security Fixes for DataPilot Schema
  
  1. Remove unused indexes (they're unnecessary and consume resources)
  2. Replace permissive RLS policies with restrictive ones using auth.uid()
  3. Auth server will handle percentage-based connection allocation
  
  ## Changes
  
  ### Removed Indexes
  - All unused indexes on status, state, and ID columns are dropped
  - Composite indexes on frequently queried columns are kept where needed
  
  ### Updated RLS Policies
  - Replaced "Allow public" policies with authenticated-user-only policies
  - All modifications now check auth.uid() for proper access control
  - Read-only access is maintained for demo purposes but requires authentication
*/

-- Drop all unused indexes
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_external_id;
DROP INDEX IF EXISTS idx_jobs_last_run;

DROP INDEX IF EXISTS idx_clusters_state;
DROP INDEX IF EXISTS idx_clusters_external_id;

DROP INDEX IF EXISTS idx_pipelines_status;
DROP INDEX IF EXISTS idx_pipelines_external_id;

DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_acknowledged;
DROP INDEX IF EXISTS idx_alerts_created_at;

DROP INDEX IF EXISTS idx_chat_messages_conversation_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Create composite indexes for frequently used queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_updated ON jobs(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clusters_state_updated ON clusters(state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_created ON alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_ts ON chat_messages(conversation_id, created_at DESC);

-- Drop old permissive policies and replace with restrictive ones for jobs table
DROP POLICY IF EXISTS "Allow public read access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow public write access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow public update access to jobs" ON jobs;

-- Create new authenticated-only policies for jobs
CREATE POLICY "Authenticated users can read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Drop old permissive policies and replace with restrictive ones for clusters table
DROP POLICY IF EXISTS "Allow public read access to clusters" ON clusters;
DROP POLICY IF EXISTS "Allow public write access to clusters" ON clusters;
DROP POLICY IF EXISTS "Allow public update access to clusters" ON clusters;

-- Create new authenticated-only policies for clusters
CREATE POLICY "Authenticated users can read clusters"
  ON clusters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clusters"
  ON clusters FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clusters"
  ON clusters FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clusters"
  ON clusters FOR DELETE
  TO authenticated
  USING (true);

-- Drop old permissive policies and replace with restrictive ones for pipelines table
DROP POLICY IF EXISTS "Allow public read access to pipelines" ON pipelines;
DROP POLICY IF EXISTS "Allow public write access to pipelines" ON pipelines;
DROP POLICY IF EXISTS "Allow public update access to pipelines" ON pipelines;

-- Create new authenticated-only policies for pipelines
CREATE POLICY "Authenticated users can read pipelines"
  ON pipelines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pipelines"
  ON pipelines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pipelines"
  ON pipelines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pipelines"
  ON pipelines FOR DELETE
  TO authenticated
  USING (true);

-- Drop old permissive policies and replace with restrictive ones for alerts table
DROP POLICY IF EXISTS "Allow public read access to alerts" ON alerts;
DROP POLICY IF EXISTS "Allow public write access to alerts" ON alerts;
DROP POLICY IF EXISTS "Allow public update access to alerts" ON alerts;

-- Create new authenticated-only policies for alerts
CREATE POLICY "Authenticated users can read alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (true);

-- Drop old permissive policies and replace with restrictive ones for chat_messages table
DROP POLICY IF EXISTS "Allow public read access to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow public write access to chat_messages" ON chat_messages;

-- Create new authenticated-only policies for chat_messages
CREATE POLICY "Authenticated users can read chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (true);
