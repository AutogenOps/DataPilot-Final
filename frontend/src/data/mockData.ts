import { Job, Cluster, Pipeline, Alert, DBTModel, ChatMessage } from '../types';

export const mockJobs: Job[] = [
  {
    id: 'job-1',
    name: 'Daily ETL Pipeline',
    status: 'RUNNING',
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    duration: 1847,
    schedule: '0 2 * * *',
    nextRun: new Date(Date.now() + 43200000).toISOString(),
  },
  {
    id: 'job-2',
    name: 'Customer Data Sync',
    status: 'SUCCEEDED',
    lastRun: new Date(Date.now() - 7200000).toISOString(),
    duration: 423,
    schedule: '0 */4 * * *',
  },
  {
    id: 'job-3',
    name: 'ML Model Training',
    status: 'FAILED',
    lastRun: new Date(Date.now() - 1800000).toISOString(),
    duration: 8934,
    schedule: '0 0 * * 0',
  },
  {
    id: 'job-4',
    name: 'Real-time Stream Processor',
    status: 'RUNNING',
    lastRun: new Date(Date.now() - 900000).toISOString(),
    duration: 2341,
  },
  {
    id: 'job-5',
    name: 'Data Quality Checks',
    status: 'SUCCEEDED',
    lastRun: new Date(Date.now() - 14400000).toISOString(),
    duration: 156,
    schedule: '0 1 * * *',
  },
];

export const mockClusters: Cluster[] = [
  {
    id: 'cluster-1',
    name: 'production-etl-cluster',
    state: 'RUNNING',
    cores: 32,
    memory: '128 GB',
    workers: 8,
    uptime: '3d 12h',
    cpuUsage: 67,
  },
  {
    id: 'cluster-2',
    name: 'ml-training-cluster',
    state: 'TERMINATED',
    cores: 64,
    memory: '256 GB',
    workers: 16,
    cpuUsage: 0,
  },
  {
    id: 'cluster-3',
    name: 'dev-sandbox',
    state: 'RUNNING',
    cores: 8,
    memory: '32 GB',
    workers: 2,
    uptime: '1d 4h',
    cpuUsage: 23,
  },
  {
    id: 'cluster-4',
    name: 'analytics-cluster',
    state: 'PENDING',
    cores: 16,
    memory: '64 GB',
    workers: 4,
    cpuUsage: 0,
  },
];

export const mockPipelines: Pipeline[] = [
  {
    id: 'pipeline-1',
    name: 'customer_360_pipeline',
    status: 'RUNNING',
    lastUpdated: new Date().toISOString(),
    tables: [
      {
        id: 'table-1',
        name: 'raw_customers',
        type: 'bronze',
        status: 'SUCCEEDED',
        dependencies: [],
      },
      {
        id: 'table-2',
        name: 'cleaned_customers',
        type: 'silver',
        status: 'RUNNING',
        dependencies: ['table-1'],
      },
      {
        id: 'table-3',
        name: 'customer_metrics',
        type: 'gold',
        status: 'PENDING',
        dependencies: ['table-2'],
      },
    ],
  },
  {
    id: 'pipeline-2',
    name: 'sales_analytics_pipeline',
    status: 'STOPPED',
    lastUpdated: new Date(Date.now() - 3600000).toISOString(),
    tables: [],
  },
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    severity: 'critical',
    title: 'ML Model Training Job Failed',
    message: 'Job exceeded memory limit and terminated',
    resource: 'job-3',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-2',
    severity: 'warning',
    title: 'Daily ETL Running Longer Than Expected',
    message: 'Current runtime 30m exceeds SLA of 20m',
    resource: 'job-1',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-3',
    severity: 'info',
    title: 'Cluster Auto-Scaling Event',
    message: 'production-etl-cluster scaled from 6 to 8 workers',
    resource: 'cluster-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: true,
  },
];

export const mockDBTModels: DBTModel[] = [
  {
    id: 'model-1',
    name: 'dim_customers',
    schema: 'analytics',
    status: 'pass',
    tests: [
      { id: 'test-1', name: 'not_null_customer_id', status: 'pass' },
      { id: 'test-2', name: 'unique_customer_id', status: 'pass' },
    ],
    dependencies: ['stg_customers'],
  },
  {
    id: 'model-2',
    name: 'fct_orders',
    schema: 'analytics',
    status: 'fail',
    tests: [
      { id: 'test-3', name: 'not_null_order_id', status: 'pass' },
      {
        id: 'test-4',
        name: 'accepted_values_status',
        status: 'fail',
        error: 'Found invalid status value: CANCELLED',
      },
    ],
    dependencies: ['stg_orders', 'dim_customers'],
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Welcome to DataPilot! I can help you monitor and manage your Azure + Databricks infrastructure. What would you like to know?',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
];
