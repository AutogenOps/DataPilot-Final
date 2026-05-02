export type JobStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'TERMINATED' | 'SKIPPED';
export type ClusterState = 'RUNNING' | 'TERMINATED' | 'PENDING' | 'RESTARTING' | 'TERMINATING' | 'ERROR';
export type PipelineStatus = 'RUNNING' | 'STOPPED' | 'FAILED' | 'IDLE';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  lastRun?: string;
  duration?: number;
  schedule?: string;
  nextRun?: string;
}

export interface JobRun {
  id: string;
  jobId: string;
  status: JobStatus;
  startTime: string;
  endTime?: string;
  duration: number;
}

export interface Cluster {
  id: string;
  name: string;
  state: ClusterState;
  cores: number;
  memory: string;
  workers: number;
  uptime?: string;
  cpuUsage?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  status: PipelineStatus;
  lastUpdated: string;
  tables: PipelineTable[];
}

export interface PipelineTable {
  id: string;
  name: string;
  type: 'bronze' | 'silver' | 'gold';
  status: JobStatus;
  dependencies: string[];
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  resource: string;
  timestamp: string;
  acknowledged: boolean;
  logs?: string;
  type?: string;
}

export interface DBTModel {
  id: string;
  name: string;
  schema: string;
  status: 'pass' | 'fail' | 'not-run';
  tests: DBTTest[];
  dependencies: string[];
  jobId?: string | null;
  jobName?: string;
  taskKey?: string | null;
  commands?: string[];
  lastRun?: string | null;
  duration?: number | null;
  runId?: string | null;
}

export interface DBTTest {
  id: string;
  name: string;
  status: 'pass' | 'fail';
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  richComponents?: RichComponent[];
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type RichComponent = {
  type: 'job_status_card' | 'data_table' | 'metric_chips' | 'code_block' | 'pipeline_flow' | 'progress_tracker';
  data: unknown;
};
