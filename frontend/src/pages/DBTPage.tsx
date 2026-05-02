import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { DBTModel } from '../types';
import { getApiBaseUrl } from '../lib/clientSettings';

type DbtModelsResponse = {
  ok: boolean;
  models?: DBTModel[];
  count?: number;
  message?: string;
  error?: string;
};

type DbtRunResponse = {
  ok: boolean;
  message?: string;
  runId?: string | null;
};

export default function DBTPage() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [models, setModels] = useState<DBTModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const selectedModel = models.find((model) => model.id === selectedModelId) || models[0] || null;

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/dbt/models`, { method: 'GET', signal });
      const data = (await res.json()) as DbtModelsResponse;

      if (!res.ok || !data.ok) {
        setModels([]);
        setSelectedModelId('');
        setError(data.message || data.error || `Backend returned ${res.status}`);
        return;
      }

      const nextModels = data.models || [];
      setModels(nextModels);
      setMessage(data.message || '');
      setSelectedModelId((current) =>
        nextModels.some((model) => model.id === current) ? current : nextModels[0]?.id || ''
      );
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      setModels([]);
      setSelectedModelId('');
      setError('Failed to load dbt jobs from Databricks.');
    } finally {
      setLoading(false);
    }
  };

  const runSelected = async () => {
    if (!selectedModel?.jobId) return;

    setError('');
    setMessage('');
    setRunningJobId(selectedModel.jobId);

    try {
      const res = await fetch(`${apiBaseUrl}/api/dbt/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedModel.jobId }),
      });
      const data = (await res.json()) as DbtRunResponse;

      if (!res.ok || !data.ok) {
        setError(data.message || `Run failed (${res.status})`);
        return;
      }

      setMessage(data.runId ? `Run requested. Run id ${data.runId}.` : data.message || 'Run requested.');
      await load();
    } catch {
      setError('Run failed (network/invalid response).');
    } finally {
      setRunningJobId('');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  const statusCounts = {
    total: models.length,
    pass: models.filter((model) => model.status === 'pass').length,
    fail: models.filter((model) => model.status === 'fail').length,
    notRun: models.filter((model) => model.status === 'not-run').length,
  };

  const sqlText = selectedModel?.commands?.length
    ? selectedModel.commands.join('\n')
    : 'No dbt command metadata found on this Databricks job task.';

  return (
    <div className="h-full min-h-screen flex bg-bg-primary overflow-hidden">
      <div className="w-80 min-h-screen bg-bg-surface border-r border-[rgba(255,255,255,0.10)] overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-display font-bold text-text-primary">dbt Assets</h2>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="rounded-md border border-white/10 bg-bg-primary p-2 text-text-secondary hover:border-accent-cyan hover:text-text-primary disabled:opacity-50"
              aria-label="Reload dbt jobs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-white/10 bg-bg-primary p-3">
              <div className="font-mono text-text-muted">TOTAL</div>
              <div className="mt-1 text-xl font-display font-bold text-accent-cyan">{statusCounts.total}</div>
            </div>
            <div className="rounded-md border border-white/10 bg-bg-primary p-3">
              <div className="font-mono text-text-muted">FAILED</div>
              <div className="mt-1 text-xl font-display font-bold text-status-error">{statusCounts.fail}</div>
            </div>
          </div>

          {loading && <div className="mb-3 text-xs font-mono text-text-muted">Loading Databricks dbt jobs...</div>}
          {error && <div className="mb-3 text-xs font-mono text-status-error">{error}</div>}
          {message && <div className="mb-3 text-xs font-mono text-status-success">{message}</div>}

          <div className="space-y-2">
            {models.map((model) => (
              <motion.button
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                whileHover={{ x: 4 }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedModel?.id === model.id
                    ? 'bg-[rgba(255,184,107,0.10)] border-accent-cyan'
                    : 'bg-bg-primary border-[rgba(255,255,255,0.10)] hover:border-accent-cyan'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="truncate text-sm font-mono text-text-primary font-medium">{model.name}</span>
                  {model.status === 'pass' ? (
                    <CheckCircle className="w-4 h-4 text-status-success" />
                  ) : model.status === 'fail' ? (
                    <XCircle className="w-4 h-4 text-status-error" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-text-muted" />
                  )}
                </div>
                <div className="truncate text-xs text-text-muted">{model.jobName || model.schema}</div>
                <div className="text-xs text-text-muted mt-1">{model.tests.length} run checks</div>
              </motion.button>
            ))}

            {!loading && models.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-bg-primary p-4 text-sm text-text-muted">
                No Databricks dbt jobs or configured catalog tables were found.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="p-6 bg-bg-surface border-b border-[rgba(255,255,255,0.10)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
                {selectedModel?.name || 'dbt on Databricks'}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-mono text-text-muted">
                  {selectedModel?.jobId ? `job ${selectedModel.jobId}` : 'live Databricks metadata'}
                </span>
                <span className="text-sm text-text-muted">|</span>
                <span
                  className={`text-sm font-medium ${
                    selectedModel?.status === 'pass'
                      ? 'text-status-success'
                      : selectedModel?.status === 'fail'
                        ? 'text-status-error'
                        : 'text-text-muted'
                  }`}
                >
                  {(selectedModel?.status || 'not-run').toUpperCase()}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: selectedModel?.jobId ? 1.05 : 1 }}
              whileTap={{ scale: selectedModel?.jobId ? 0.95 : 1 }}
              onClick={runSelected}
              disabled={!selectedModel?.jobId || runningJobId === selectedModel?.jobId}
              className="flex items-center gap-2 px-4 py-2 bg-accent-cyan hover:bg-accent-azure text-bg-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {runningJobId === selectedModel?.jobId ? 'Running...' : 'Run dbt Job'}
            </motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-6">
            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">DBT COMMANDS</h3>
              <div className="bg-bg-primary rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
                <pre>{sqlText}</pre>
              </div>
            </div>

            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">LATEST RUN</h3>
              {selectedModel ? (
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-bg-primary p-4">
                    <div className="text-xs font-mono text-text-muted">LAST RUN</div>
                    <div className="mt-2 text-text-primary">
                      {selectedModel.lastRun
                        ? formatDistance(new Date(selectedModel.lastRun), new Date(), { addSuffix: true })
                        : 'Never'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-bg-primary p-4">
                    <div className="text-xs font-mono text-text-muted">RUN ID</div>
                    <div className="mt-2 text-text-primary">{selectedModel.runId || 'N/A'}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-bg-primary p-4">
                    <div className="text-xs font-mono text-text-muted">DURATION</div>
                    <div className="mt-2 text-text-primary">
                      {selectedModel.duration ? `${Math.floor(selectedModel.duration / 60)}m ${selectedModel.duration % 60}s` : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-muted">Select a dbt job to see run details.</div>
              )}
            </div>

            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">DEPENDENCIES</h3>
              <div className="flex flex-wrap gap-2">
                {selectedModel?.dependencies.length ? (
                  selectedModel.dependencies.map((dep) => (
                    <div key={dep} className="px-3 py-1.5 bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg">
                      <span className="text-xs font-mono text-accent-cyan">{dep}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-text-muted">No task dependencies found.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
