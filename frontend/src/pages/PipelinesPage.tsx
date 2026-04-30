import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Square, RefreshCw, Maximize2 } from 'lucide-react';
import { JobStatus, Pipeline } from '../types';
import StatusDot from '../components/StatusDot';
import { getApiBaseUrl } from '../lib/clientSettings';

type PipelinesResponse = {
  ok: boolean;
  pipelines?: Pipeline[];
  message?: string;
  errorType?: string;
  error?: string;
};

type PipelineActionResponse = {
  ok: boolean;
  message?: string;
  updateId?: string | null;
};

type PipelineNodeData = {
  label: string;
  type: 'bronze' | 'silver' | 'gold';
  status: JobStatus;
};

const PipelineNode = ({ data }: { data: PipelineNodeData }) => {
  const getNodeStyle = () => {
    switch (data.type) {
      case 'bronze':
        return 'border-status-warning bg-status-warning/10';
      case 'silver':
        return 'border-accent-azure bg-accent-azure/10';
      case 'gold':
        return 'border-accent-warm bg-accent-warm/10';
      default:
        return 'border-accent-cyan bg-accent-cyan/10';
    }
  };

  const getGlow = () => {
    if (data.status === 'RUNNING') return 'glow-cyan';
    if (data.status === 'FAILED') return 'glow-red';
    return '';
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-4 py-3 rounded-lg border-2 ${getNodeStyle()} ${getGlow()} min-w-[180px]`}
    >
      <div className="flex items-center justify-between mb-2">
        <StatusDot status={data.status} size="sm" />
        <span className="text-xs font-mono text-text-muted uppercase">{data.type}</span>
      </div>
      <div className="text-sm font-mono text-text-primary font-medium">{data.label}</div>
    </motion.div>
  );
};

const nodeTypes = {
  pipelineNode: PipelineNode,
};

export default function PipelinesPage() {
  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [startingPipelineId, setStartingPipelineId] = useState<string>('');
  const [stoppingPipelineId, setStoppingPipelineId] = useState<string>('');

  const fetchPipelines = async (signal?: AbortSignal): Promise<PipelinesResponse> => {
    const res = await fetch(`${apiBaseUrl}/api/pipelines`, { method: 'GET', signal });
    if (!res.ok) {
      return {
        ok: false,
        message: `Backend returned ${res.status} ${res.statusText}`,
      };
    }

    return (await res.json()) as PipelinesResponse;
  };

  const applyPipelines = (data: PipelinesResponse) => {
    const nextPipelines = data.pipelines || [];
    setPipelines(nextPipelines);

    setSelectedPipeline((prev) => {
      if (!prev) return nextPipelines[0] || null;
      const stillExists = nextPipelines.find((p) => p.id === prev.id);
      return stillExists || nextPipelines[0] || null;
    });
  };

  const load = async (signal?: AbortSignal) => {
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const data = await fetchPipelines(signal);
      if (!data.ok) {
        setError(data.message || 'Failed to load pipelines');
        setPipelines([]);
        setSelectedPipeline(null);
        return;
      }

      applyPipelines(data);
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      setError('Failed to load pipelines (network/invalid response)');
      setPipelines([]);
      setSelectedPipeline(null);
    } finally {
      setLoading(false);
    }
  };

  const pollUntilPipelineChanges = async (pipelineId: string, prevLastUpdated: string) => {
    // Poll for up to ~40 seconds (10 * 4s).
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((r) => setTimeout(r, 4000));

      try {
        const data = await fetchPipelines();
        if (!data.ok) continue;

        const next = data.pipelines || [];
        const nextPipeline = next.find((p) => p.id === pipelineId);
        if (nextPipeline && nextPipeline.lastUpdated !== prevLastUpdated) {
          applyPipelines(data);
          return;
        }

        // Even if lastUpdated doesn't move, keep UI list reasonably fresh.
        if (attempt === maxAttempts - 1) {
          applyPipelines(data);
        }
      } catch {
        // ignore polling errors; user can manually refresh
      }
    }
  };

  const start = async (pipelineId: string) => {
    const id = (pipelineId || '').trim();
    if (!id) return;

    setError('');
    setNotice('');
    setStartingPipelineId(id);
    const prevLastUpdated = selectedPipeline?.id === id ? selectedPipeline.lastUpdated : '';

    try {
      const res = await fetch(`${apiBaseUrl}/api/pipelines/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: id }),
      });

      if (!res.ok) {
        setError(`Start failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as PipelineActionResponse;
      if (!data.ok) {
        setError(data.message || 'Start failed');
        return;
      }

      setNotice(data.message || 'Start requested.');
      await pollUntilPipelineChanges(id, prevLastUpdated);
    } catch {
      setError('Start failed (network/invalid response)');
    } finally {
      setStartingPipelineId('');
    }
  };

  const stop = async (pipelineId: string) => {
    const id = (pipelineId || '').trim();
    if (!id) return;

    setError('');
    setNotice('');
    setStoppingPipelineId(id);
    const prevLastUpdated = selectedPipeline?.id === id ? selectedPipeline.lastUpdated : '';

    try {
      const res = await fetch(`${apiBaseUrl}/api/pipelines/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: id }),
      });

      if (!res.ok) {
        setError(`Stop failed: backend returned ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as PipelineActionResponse;
      if (!data.ok) {
        setError(data.message || 'Stop failed');
        return;
      }

      setNotice(data.message || 'Stop requested.');
      await pollUntilPipelineChanges(id, prevLastUpdated);
    } catch {
      setError('Stop failed (network/invalid response)');
    } finally {
      setStoppingPipelineId('');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  const createNodesAndEdges = (pipeline: Pipeline) => {
    const nodes: Node[] = pipeline.tables.map((table, idx) => ({
      id: table.id,
      type: 'pipelineNode',
      position: { x: idx * 250, y: table.type === 'bronze' ? 0 : table.type === 'silver' ? 150 : 300 },
      data: {
        label: table.name,
        type: table.type,
        status: table.status,
      },
    }));

    const edges: Edge[] = [];
    pipeline.tables.forEach((table) => {
      table.dependencies.forEach((depId) => {
        edges.push({
          id: `${depId}-${table.id}`,
          source: depId,
          target: table.id,
          type: 'smoothstep',
          animated: table.status === 'RUNNING',
          style: { stroke: '#FFB86B', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#FFB86B',
          },
        });
      });
    });

    return { nodes, edges };
  };

  const { nodes: initialNodes, edges: initialEdges } = selectedPipeline
    ? createNodesAndEdges(selectedPipeline)
    : { nodes: [], edges: [] };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const next = selectedPipeline ? createNodesAndEdges(selectedPipeline) : { nodes: [], edges: [] };
    setNodes(next.nodes);
    setEdges(next.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipeline?.id]);

  return (
    <div className="h-full min-h-screen flex bg-transparent overflow-hidden">
      <div className="w-80 min-h-screen app-shell border-r border-white/10 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <h2 className="text-lg font-display font-bold text-text-primary mb-4">
            Pipelines
          </h2>
          {error && (
            <div className="mb-4 text-xs font-mono text-status-error">{error}</div>
          )}
          {notice && !error && (
            <div className="mb-4 text-xs font-mono text-text-muted">{notice}</div>
          )}
          <div className="space-y-2">
            {pipelines.map((pipeline) => (
              <motion.button
                key={pipeline.id}
                onClick={() => setSelectedPipeline(pipeline)}
                whileHover={{ x: 4 }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedPipeline?.id === pipeline.id
                    ? 'bg-accent-cyan/10 border-accent-cyan'
                    : 'app-tile border-white/10 hover:border-accent-cyan'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-text-primary font-medium">
                    {pipeline.name}
                  </span>
                  <StatusDot status={pipeline.status} size="sm" />
                </div>
                <div className="text-xs text-text-muted">
                  {pipeline.tables.length} tables
                </div>
                <div className="text-xs font-mono text-text-muted mt-1">
                  Updated{' '}
                  {new Date(pipeline.lastUpdated).toLocaleTimeString()}
                </div>
              </motion.button>
            ))}

            {!loading && !error && pipelines.length === 0 && (
              <div className="text-sm text-text-muted">No pipelines returned.</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {selectedPipeline ? (
          <>
            <div className="p-6 app-shell border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
                    {selectedPipeline.name}
                  </h1>
                  <div className="flex items-center gap-3">
                    <StatusDot status={selectedPipeline.status} showLabel />
                    <span className="text-sm text-text-muted">
                      {selectedPipeline.tables.length} tables
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => start(selectedPipeline.id)}
                    disabled={
                      loading ||
                      startingPipelineId === selectedPipeline.id ||
                      stoppingPipelineId === selectedPipeline.id
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-status-success hover:bg-[#0EDF8F] text-bg-primary rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {startingPipelineId === selectedPipeline.id ? 'Starting…' : 'Start'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => stop(selectedPipeline.id)}
                    disabled={
                      loading ||
                      startingPipelineId === selectedPipeline.id ||
                      stoppingPipelineId === selectedPipeline.id
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-status-error hover:bg-[#DC2626] text-white rounded-lg font-medium transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    {stoppingPipelineId === selectedPipeline.id ? 'Stopping…' : 'Stop'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => load()}
                    disabled={loading}
                    className="p-2 bg-bg-elevated hover:bg-white/[0.08] text-text-secondary rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-bg-elevated hover:bg-white/[0.08] text-text-secondary rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-transparent relative">
              {selectedPipeline.tables.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-transparent h-full w-full"
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="rgba(255,255,255,0.10)"
                  />
                  <Controls
                    className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg"
                  />
                </ReactFlow>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-xl w-full app-surface border rounded-lg p-6 text-center">
                    <div className="text-lg font-display font-bold text-text-primary mb-2">
                      No DAG data available
                    </div>
                    <div className="text-sm text-text-muted">
                      Databricks returned a pipeline, but it did not include table dependency data.
                      The DLT page currently displays the available pipeline status and lets you start/stop runs.
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute bottom-6 right-6 p-4 app-surface border rounded-lg">
                <div className="text-xs font-mono text-text-muted mb-2">LEGEND</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border-2 border-status-warning bg-status-warning/10" />
                    <span className="text-xs text-text-secondary">Bronze</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border-2 border-accent-azure bg-accent-azure/10" />
                    <span className="text-xs text-text-secondary">Silver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border-2 border-accent-warm bg-accent-warm/10" />
                    <span className="text-xs text-text-secondary">Gold</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted">Select a pipeline to view its DAG</p>
          </div>
        )}
      </div>
    </div>
  );
}
