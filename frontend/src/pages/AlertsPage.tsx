import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { formatDistance } from 'date-fns';
import type { Alert, Job } from '../types';
import { getApiBaseUrl } from '../lib/clientSettings';

type AlertsResponse = {
  ok: boolean;
  alerts?: Alert[];
  counts?: {
    critical: number;
    warning: number;
    info: number;
  };
  sources?: Record<string, boolean>;
  message?: string;
};

type JobsResponse = {
  ok: boolean;
  jobs?: Job[];
  message?: string;
};

export default function AlertsPage() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<Record<string, boolean>>({});
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibleAlerts = alerts.map((alert) => ({
    ...alert,
    acknowledged: alert.acknowledged || acknowledgedIds.has(alert.id),
  }));

  const counts = {
    critical: visibleAlerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length,
    warning: visibleAlerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length,
    info: visibleAlerts.filter((a) => a.severity === 'info' && !a.acknowledged).length,
  };

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');

    try {
      const [alertsRes, jobsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/alerts`, { signal }),
        fetch(`${apiBaseUrl}/api/jobs`, { signal }),
      ]);

      if (!alertsRes.ok) {
        setError(`Alerts backend returned ${alertsRes.status} ${alertsRes.statusText}`);
        setAlerts([]);
        return;
      }

      const alertsData = (await alertsRes.json()) as AlertsResponse;
      if (!alertsData.ok) {
        setError(alertsData.message || 'Failed to load alerts');
        setAlerts([]);
        return;
      }

      setAlerts(alertsData.alerts || []);
      setSources(alertsData.sources || {});

      if (jobsRes.ok) {
        const jobsData = (await jobsRes.json()) as JobsResponse;
        setJobs(jobsData.ok ? jobsData.jobs || [] : []);
      } else {
        setJobs([]);
      }
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      setError('Failed to load live monitoring data');
      setAlerts([]);
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

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-status-error" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-status-warning" />;
      default:
        return <Info className="w-5 h-5 text-accent-cyan" />;
    }
  };

  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-status-error/10 border-status-error/70';
      case 'warning':
        return 'bg-status-warning/10 border-status-warning/70';
      default:
        return 'bg-accent-cyan/10 border-accent-cyan/70';
    }
  };

  const slaRows = jobs.slice(0, 8).map((job) => {
    const slaTarget = 1800;
    const duration = job.duration ?? 0;
    const compliance = duration > 0 && duration <= slaTarget && job.status !== 'FAILED' ? 100 : job.status === 'FAILED' ? 0 : 75;
    return { job, compliance, isCompliant: compliance === 100 };
  });

  const overallCompliance =
    slaRows.length === 0
      ? null
      : Math.round(slaRows.reduce((sum, row) => sum + row.compliance, 0) / slaRows.length);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              Alerts & Monitoring
            </h1>
            <p className="text-text-secondary">
              Live alerts derived from Databricks jobs, pipelines, clusters, and API health
            </p>
          </div>

          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 app-surface border hover:border-accent-cyan rounded-lg text-sm text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-status-error/10 border border-status-error rounded-lg text-sm text-status-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {[
            { label: 'CRITICAL', value: counts.critical, icon: AlertTriangle, color: 'text-status-error' },
            { label: 'WARNINGS', value: counts.warning, icon: AlertCircle, color: 'text-status-warning' },
            { label: 'INFO', value: counts.info, icon: Info, color: 'text-accent-cyan' },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-6 app-surface border rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono text-text-muted">{item.label}</span>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className={`text-4xl font-display font-bold ${item.color}`}>
                {item.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="app-surface border rounded-lg">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-display font-bold text-text-primary">
                Live Alert Feed
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono text-text-muted">
                {Object.entries(sources).map(([name, ok]) => (
                  <span key={name} className={ok ? 'text-status-success' : 'text-status-error'}>
                    {name}: {ok ? 'ok' : 'issue'}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
              {!loading && visibleAlerts.length === 0 && (
                <div className="text-sm text-text-muted">No active alerts found.</div>
              )}

              {visibleAlerts.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`p-4 rounded-lg border ${getAlertStyle(alert.severity)} ${
                    alert.acknowledged ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-text-primary mb-1">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-text-secondary mb-2">
                        {alert.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span className="font-mono">{alert.resource}</span>
                        <span>•</span>
                        <span>
                          {formatDistance(new Date(alert.timestamp), new Date(), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      type="button"
                      onClick={() =>
                        setAcknowledgedIds((prev) => new Set(prev).add(alert.id))
                      }
                      className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated hover:bg-white/[0.08] text-accent-cyan rounded text-xs font-medium transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Acknowledge
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="app-surface border rounded-lg">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-display font-bold text-text-primary">
                Job SLA Snapshot
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Target: latest successful job duration under 1800 seconds
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {slaRows.length === 0 && (
                  <div className="text-sm text-text-muted">No jobs returned for SLA tracking.</div>
                )}

                {slaRows.map(({ job, compliance, isCompliant }, idx) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="truncate text-sm font-mono text-text-primary">
                        {job.name}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          isCompliant ? 'text-status-success' : compliance === 0 ? 'text-status-error' : 'text-status-warning'
                        }`}
                      >
                        {compliance}%
                      </span>
                    </div>
                    <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${compliance}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isCompliant ? 'bg-status-success' : compliance === 0 ? 'bg-status-error' : 'bg-status-warning'
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 app-tile border rounded-lg">
                <div className="text-xs text-text-muted mb-2">OVERALL COMPLIANCE</div>
                <div
                  className={`text-2xl font-display font-bold ${
                    overallCompliance === null
                      ? 'text-text-muted'
                      : overallCompliance >= 90
                        ? 'text-status-success'
                        : overallCompliance >= 70
                          ? 'text-status-warning'
                          : 'text-status-error'
                  }`}
                >
                  {overallCompliance === null ? 'N/A' : `${overallCompliance}%`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
