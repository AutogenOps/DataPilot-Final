/*
  # DataPilot Schema Setup
  
  Creates the core database schema for the DataPilot application - an AI orchestration platform
  for Azure + Databricks infrastructure management.

  ## New Tables
  
  ### `jobs`
  Tracks Databricks jobs and their execution history
  - `id` (uuid, primary key) - Unique identifier for the job
  - `external_id` (text, unique) - Databricks job ID
  - `name` (text) - Human-readable job name
  - `status` (text) - Current status: RUNNING, SUCCEEDED, FAILED, PENDING, TERMINATED, SKIPPED
  - `last_run` (timestamptz) - Timestamp of last execution
  - `duration` (integer) - Duration in seconds
  - `schedule` (text) - Cron schedule expression
  - `next_run` (timestamptz) - Scheduled next run time
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `clusters`
  Manages Databricks compute cluster information
  - `id` (uuid, primary key) - Unique identifier
  - `external_id` (text, unique) - Databricks cluster ID
  - `name` (text) - Cluster name
  - `state` (text) - Cluster state: RUNNING, TERMINATED, PENDING, RESTARTING, TERMINATING, ERROR
  - `cores` (integer) - Number of CPU cores
  - `memory` (text) - Memory allocation (e.g., "128 GB")
  - `workers` (integer) - Number of worker nodes
  - `uptime` (text) - Human-readable uptime
  - `cpu_usage` (integer) - Current CPU utilization percentage
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `pipelines`
  Stores Delta Live Tables (DLT) pipeline information
  - `id` (uuid, primary key) - Unique identifier
  - `external_id` (text, unique) - Databricks pipeline ID
  - `name` (text) - Pipeline name
  - `status` (text) - Pipeline status: RUNNING, STOPPED, FAILED, IDLE
  - `last_updated` (timestamptz) - Last update timestamp
  - `tables_count` (integer) - Number of tables in pipeline
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `alerts`
  Tracks system alerts and notifications
  - `id` (uuid, primary key) - Unique identifier
  - `severity` (text) - Alert severity: critical, warning, info
  - `title` (text) - Alert title
  - `message` (text) - Detailed alert message
  - `resource` (text) - Associated resource identifier
  - `acknowledged` (boolean) - Whether alert has been acknowledged
  - `created_at` (timestamptz) - Alert creation timestamp

  ### `chat_messages`
  Stores chat conversation history
  - `id` (uuid, primary key) - Unique identifier
  - `conversation_id` (text) - Conversation session identifier
  - `role` (text) - Message role: user or assistant
  - `content` (text) - Message content
  - `metadata` (jsonb) - Additional metadata (tool calls, rich components, etc.)
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  
  All tables have Row Level Security (RLS) enabled. Public access policies are set for demo purposes.
  In production, these should be restricted to authenticated users with proper authorization checks.
  
  ## Indexes
  
  Performance indexes are created on frequently queried columns:
  - Foreign keys and external IDs
  - Status and state columns for filtering
  - Timestamps for time-based queries
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  last_run timestamptz,
  duration integer,
  schedule text,
  next_run timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clusters table
CREATE TABLE IF NOT EXISTS clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'TERMINATED',
  cores integer NOT NULL DEFAULT 0,
  memory text NOT NULL DEFAULT '0 GB',
  workers integer NOT NULL DEFAULT 0,
  uptime text,
  cpu_usage integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'IDLE',
  last_updated timestamptz DEFAULT now(),
  tables_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  resource text,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create public access policies for demo purposes
-- In production, these should be restricted to authenticated users

CREATE POLICY "Allow public read access to jobs"
  ON jobs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to jobs"
  ON jobs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to jobs"
  ON jobs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to clusters"
  ON clusters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to clusters"
  ON clusters FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to clusters"
  ON clusters FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to pipelines"
  ON pipelines FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to pipelines"
  ON pipelines FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to pipelines"
  ON pipelines FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to alerts"
  ON alerts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to alerts"
  ON alerts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to alerts"
  ON alerts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to chat_messages"
  ON chat_messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to chat_messages"
  ON chat_messages FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_last_run ON jobs(last_run DESC);

CREATE INDEX IF NOT EXISTS idx_clusters_state ON clusters(state);
CREATE INDEX IF NOT EXISTS idx_clusters_external_id ON clusters(external_id);

CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_external_id ON pipelines(external_id);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Insert sample data for demonstration
INSERT INTO jobs (external_id, name, status, last_run, duration, schedule)
VALUES 
  ('job-1', 'Daily ETL Pipeline', 'RUNNING', now() - interval '1 hour', 1847, '0 2 * * *'),
  ('job-2', 'Customer Data Sync', 'SUCCEEDED', now() - interval '2 hours', 423, '0 */4 * * *'),
  ('job-3', 'ML Model Training', 'FAILED', now() - interval '30 minutes', 8934, '0 0 * * 0')
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO clusters (external_id, name, state, cores, memory, workers, uptime, cpu_usage)
VALUES 
  ('cluster-1', 'production-etl-cluster', 'RUNNING', 32, '128 GB', 8, '3d 12h', 67),
  ('cluster-2', 'ml-training-cluster', 'TERMINATED', 64, '256 GB', 16, null, 0),
  ('cluster-3', 'dev-sandbox', 'RUNNING', 8, '32 GB', 2, '1d 4h', 23)
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO pipelines (external_id, name, status, tables_count)
VALUES 
  ('pipeline-1', 'customer_360_pipeline', 'RUNNING', 3),
  ('pipeline-2', 'sales_analytics_pipeline', 'STOPPED', 5)
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO alerts (severity, title, message, resource)
VALUES 
  ('critical', 'ML Model Training Job Failed', 'Job exceeded memory limit and terminated', 'job-3'),
  ('warning', 'Daily ETL Running Longer Than Expected', 'Current runtime 30m exceeds SLA of 20m', 'job-1')
ON CONFLICT DO NOTHING;
