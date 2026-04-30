import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Job, JobStatus } from '../types';
import StatusDot from '../components/StatusDot';
import { formatDistance } from 'date-fns';
import { getApiBaseUrl } from '../lib/clientSettings';

type JobsResponse = {
  ok: boolean;
  jobs?: Job[];
  message?: string;
  errorType?: string;
  error?: string;
};

type JobActionResponse = {
  ok: boolean;
  message?: string;
};

export default function JobsPage() {
  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | 'ALL'>('ALL');
  const [runningJobId, setRunningJobId] = useState<string>('');

  const run = async (jobId: string) => {
    const id = (jobId || '').trim();
    if (!id) return;

    setError('');
    setRunningJobId(id);

    try {
      const res = await fetch(`${apiBaseUrl}/api/jobs/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      });

      if (!res.ok) {
        setError(`Run failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as JobActionResponse;
      if (!data.ok) {
        setError(data.message || 'Run failed');
        return;
      }

      await load();
    } catch {
      setError('Run failed (network/invalid response)');
    } finally {
      setRunningJobId('');
    }
  };

  const view = async (jobId: string) => {
    const id = (jobId || '').trim();
    if (!id) return;

    setError('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/jobs/url?jobId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setError(`View failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
      if (!data.ok || !data.url) {
        setError(data.message || 'View failed');
        return;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('View failed (network/invalid response)');
    }
  };

  const load = async (signal?: AbortSignal) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/jobs`, { method: 'GET', signal });

      if (!res.ok) {
        setError(`Backend returned ${res.status} ${res.statusText}`);
        setJobs([]);
        return;
      }

      const data = (await res.json()) as JobsResponse;
      if (!data.ok) {
        setError(data.message || 'Failed to load jobs');
        setJobs([]);
        return;
      }

      setJobs(data.jobs || []);
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      setError('Failed to load jobs (network/invalid response)');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  const statusCounts = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === 'RUNNING').length,
    failed: jobs.filter((j) => j.status === 'FAILED').length,
    succeeded: jobs.filter((j) => j.status === 'SUCCEEDED').length,
  };

  const filteredJobs =
    selectedStatus === 'ALL'
      ? jobs
      : jobs.filter((j) => j.status === selectedStatus);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            Jobs Dashboard
          </h1>
          <p className="text-text-secondary">Monitor and manage all Databricks jobs</p>
          {loading && (
            <div className="mt-4 text-xs font-mono text-text-muted">Loading…</div>
          )}
          {error && (
            <div className="mt-4 text-xs font-mono text-status-error">{error}</div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 app-surface border rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-mono text-text-muted">TOTAL JOBS</span>
              <Clock className="w-5 h-5 text-accent-cyan" />
            </div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-4xl font-display font-bold text-accent-cyan"
            >
              {statusCounts.total}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 app-surface border rounded-lg glow-green"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-mono text-text-muted">RUNNING</span>
              <Play className="w-5 h-5 text-status-success" />
            </div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-4xl font-display font-bold text-status-success"
            >
              {statusCounts.running}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 app-surface border rounded-lg glow-red"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-mono text-text-muted">FAILED</span>
              <XCircle className="w-5 h-5 text-status-error" />
            </div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-4xl font-display font-bold text-status-error"
            >
              {statusCounts.failed}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 app-surface border rounded-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-mono text-text-muted">SUCCEEDED</span>
              <CheckCircle2 className="w-5 h-5 text-status-success" />
            </div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-4xl font-display font-bold text-status-success"
            >
              {statusCounts.succeeded}
            </motion.div>
          </motion.div>
        </div>

        <div className="app-surface border rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-display font-bold text-text-primary">
                All Jobs
              </h2>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'RUNNING', 'FAILED', 'SUCCEEDED'] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        selectedStatus === status
                          ? 'bg-accent-cyan text-bg-primary'
                          : 'bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-white/[0.06]'
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025]">
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    JOB NAME
                  </th>
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    STATUS
                  </th>
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    LAST RUN
                  </th>
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    DURATION
                  </th>
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    SCHEDULE
                  </th>
                  <th className="text-left p-4 text-xs font-mono text-text-muted">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-white/[0.08] hover:bg-accent-cyan/[0.06] cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">
                          {job.name}
                        </span>
                        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-xs font-mono text-text-muted">
                        {job.id}
                      </span>
                    </td>
                    <td className="p-4">
                      <StatusDot status={job.status} showLabel />
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono text-text-secondary">
                        {job.lastRun
                          ? formatDistance(new Date(job.lastRun), new Date(), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono text-text-secondary">
                        {formatDuration(job.duration)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {job.schedule ? (
                          <>
                            <Calendar className="w-4 h-4 text-text-muted" />
                            <span className="text-sm font-mono text-text-secondary">
                              {job.schedule}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-text-muted">Manual</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => run(job.id)}
                          disabled={runningJobId === job.id}
                          className="px-3 py-1 bg-accent-cyan hover:bg-accent-azure text-bg-primary rounded text-xs font-medium transition-colors"
                        >
                          {runningJobId === job.id ? 'Running…' : 'Run'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => view(job.id)}
                          className="px-3 py-1 bg-bg-elevated hover:bg-white/[0.08] text-text-secondary rounded text-xs font-medium transition-colors"
                        >
                          View
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
