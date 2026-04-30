import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Cpu,
  HardDrive,
  Users,
  Play,
  Square,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Circle,
} from 'lucide-react';
import StatusDot from '../components/StatusDot';
import type { Cluster } from '../types';
import { getApiBaseUrl } from '../lib/clientSettings';

type ClustersResponse = {
  ok: boolean;
  clusters?: Cluster[];
  message?: string;
  errorType?: string;
  error?: string;
};

export default function ClustersPage() {
  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [terminatingClusterId, setTerminatingClusterId] = useState<string>('');
  const [startingClusterId, setStartingClusterId] = useState<string>('');

  const load = async (signal?: AbortSignal) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/clusters`, {
        method: 'GET',
        signal,
      });

      if (!res.ok) {
        setError(`Backend returned ${res.status} ${res.statusText}`);
        setClusters([]);
        return;
      }

      const data = (await res.json()) as ClustersResponse;
      if (!data.ok) {
        setError(data.message || 'Failed to load clusters');
        setClusters([]);
        return;
      }

      const nextClusters = data.clusters || [];

      // If a start was requested, keep showing "Starting..." until the cluster is RUNNING.
      if (startingClusterId) {
        const started = nextClusters.find((c) => c.id === startingClusterId);
        if (started?.state === 'RUNNING') {
          setStartingClusterId('');
        }
      }

      setClusters(nextClusters);
    } catch (err) {
      // React 18 strict mode can abort the first effect run in dev.
      if ((err as { name?: string } | null)?.name === 'AbortError') {
        return;
      }

      setError('Failed to load clusters (network/invalid response)');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const terminate = async (clusterId: string) => {
    const id = (clusterId || '').trim();
    if (!id) return;

    setError('');
    setTerminatingClusterId(id);

    try {
      const res = await fetch(`${apiBaseUrl}/api/clusters/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId: id }),
      });

      if (!res.ok) {
        setError(`Terminate failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message || 'Terminate failed');
        return;
      }

      await load();
    } catch {
      setError('Terminate failed (network/invalid response)');
    } finally {
      setTerminatingClusterId('');
    }
  };

  const start = async (clusterId: string) => {
    const id = (clusterId || '').trim();
    if (!id) return;

    setError('');
    setStartingClusterId(id);

    try {
      const res = await fetch(`${apiBaseUrl}/api/clusters/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId: id }),
      });

      if (!res.ok) {
        setError(`Start failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message || 'Start failed');
        return;
      }

      await load();
    } catch {
      setError('Start failed (network/invalid response)');
    } finally {
      // Keep the "Starting..." state until we observe RUNNING via polling.
    }
  };

  useEffect(() => {
    if (!startingClusterId) return;

    const interval = window.setInterval(() => {
      load();
    }, 4000);

    return () => window.clearInterval(interval);
    // Intentionally omit `load` from deps; it's stable enough here and we only
    // need polling while a start is in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingClusterId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              Cluster Management
            </h1>
            <p className="text-text-secondary">
              Monitor and manage Databricks compute clusters
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-text-muted">
              <Circle className="w-3 h-3 text-accent-cyan" />
              <span>Source: {apiBaseUrl}/api/clusters</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 app-surface border hover:border-accent-cyan rounded-lg text-sm text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[rgba(255,107,107,0.10)] border border-status-error rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-status-error mt-0.5" />
            <div>
              <div className="text-xs font-mono text-status-error">{error}</div>
              <div className="text-xs text-text-muted mt-1">
                Ensure the backend is running, CORS allows your frontend origin, and
                Databricks credentials are configured.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {clusters.map((cluster, idx) => (
            <motion.div
              key={cluster.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 14px 34px rgba(67,217,201,0.15)' }}
              className="p-6 app-surface border rounded-lg cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 app-tile border rounded-lg">
                    <Server className="w-6 h-6 text-accent-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-mono font-bold text-text-primary">
                      {cluster.name}
                    </h3>
                    <span className="text-xs font-mono text-text-muted">
                      {cluster.id}
                    </span>
                  </div>
                </div>
                <StatusDot status={cluster.state} size="md" animated />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 app-tile border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-accent-cyan" />
                    <span className="text-xs text-text-muted">Cores</span>
                  </div>
                  <div className="text-xl font-display font-bold text-text-primary">
                    {cluster.cores || '—'}
                  </div>
                </div>

                <div className="p-3 app-tile border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="w-4 h-4 text-accent-azure" />
                    <span className="text-xs text-text-muted">Memory</span>
                  </div>
                  <div className="text-xl font-display font-bold text-text-primary">
                    {cluster.memory || '—'}
                  </div>
                </div>

                <div className="p-3 app-tile border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-status-success" />
                    <span className="text-xs text-text-muted">Workers</span>
                  </div>
                  <div className="text-xl font-display font-bold text-text-primary">
                    {cluster.workers ?? '—'}
                  </div>
                </div>
              </div>

              {cluster.uptime && (
                <div className="mb-4 p-3 app-tile border rounded-lg">
                  <span className="text-xs text-text-muted">Uptime: </span>
                  <span className="text-sm font-mono text-status-success">
                    {cluster.uptime}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                {cluster.state === 'RUNNING' ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => terminate(cluster.id)}
                      disabled={loading || terminatingClusterId === cluster.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-status-error hover:bg-[#DC2626] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      <Square className="w-4 h-4" />
                      {terminatingClusterId === cluster.id ? 'Terminating…' : 'Terminate'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-bg-elevated hover:bg-white/[0.08] text-text-secondary rounded-lg text-sm font-medium transition-colors"
                    >
                      <Terminal className="w-4 h-4" />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => start(cluster.id)}
                    disabled={loading || startingClusterId === cluster.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-status-success hover:bg-[#0EDF8F] text-bg-primary rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {startingClusterId === cluster.id ? 'Starting…' : 'Start'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {!loading && !error && clusters.length === 0 && (
          <div className="mb-8 text-center text-text-muted">
            No clusters returned.
          </div>
        )}

        <div className="app-surface border rounded-lg p-6">
          <h2 className="text-lg font-display font-bold text-text-primary mb-4">
            Resource Utilization
          </h2>
          <div className="h-64 flex items-center justify-center">
            <p className="text-text-muted">Live metrics chart would be rendered here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
