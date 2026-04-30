import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Circle, AlertTriangle } from 'lucide-react';
import { getApiBaseUrl } from '../lib/clientSettings';

type LogEntry = {
  ts: string;
  level: string;
  message: string;
};

type LogsResponse = {
  ok: boolean;
  entries: LogEntry[];
};

const levelColor: Record<string, string> = {
  ERROR: 'text-status-error',
  WARN: 'text-status-warning',
  WARNING: 'text-status-warning',
  INFO: 'text-text-secondary',
  DEBUG: 'text-text-muted',
};

export default function LogsPage() {
  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string>('');
  const [limit, setLimit] = useState(200);

  const load = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/logs?limit=${limit}`, {
        method: 'GET',
      });

      const data = (await res.json()) as LogsResponse;
      if (!data.ok) {
        setError('Failed to load logs');
        return;
      }

      setEntries(data.entries || []);
    } catch {
      setError('Cannot reach backend logs endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, limit]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      load();
    }, 2000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, apiBaseUrl, limit]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-8 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              System Logs
            </h1>
            <p className="text-text-secondary">
              Backend request + error logs (redacted for safety)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
              <span className="text-xs font-mono text-text-muted">AUTO</span>
              <button
                type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  autoRefresh ? 'bg-accent-cyan' : 'bg-bg-primary'
                }`}
                aria-label="Toggle auto refresh"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-bg-primary transition-transform ${
                    autoRefresh ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
              <span className="text-xs font-mono text-text-muted">LIMIT</span>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="bg-bg-primary border border-[rgba(255,255,255,0.14)] rounded-md px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-bg-surface border border-[rgba(255,255,255,0.10)] hover:border-accent-cyan rounded-lg text-sm text-text-secondary hover:text-accent-cyan transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-text-muted">
          <Circle className="w-3 h-3 text-accent-cyan" />
          <span>Source: {apiBaseUrl}/api/logs</span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[rgba(255,107,107,0.10)] border border-status-error rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-status-error mt-0.5" />
            <div>
              <div className="text-xs font-mono text-status-error">{error}</div>
              <div className="text-xs text-text-muted mt-1">
                Ensure the backend is running and CORS allows your frontend origin.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="h-full bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg overflow-hidden">
          <div className="h-full overflow-auto scrollbar-thin p-4 font-mono text-xs">
            {entries.length === 0 ? (
              <div className="text-text-muted text-center py-10">
                No log entries yet.
              </div>
            ) : (
              <div className="space-y-1">
                {entries.map((e, idx) => (
                  <div key={`${e.ts}-${idx}`} className="flex gap-3">
                    <span className="text-text-muted whitespace-nowrap">{e.ts}</span>
                    <span
                      className={`${levelColor[e.level] || 'text-text-secondary'} whitespace-nowrap`}
                    >
                      [{e.level}]
                    </span>
                    <span className="text-text-primary break-all">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
