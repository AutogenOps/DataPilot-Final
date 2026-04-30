import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Play, Rocket } from 'lucide-react';
import { mockDBTModels } from '../data/mockData';

export default function DBTPage() {
  const [selectedModel, setSelectedModel] = useState(mockDBTModels[0]);
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'production'>('dev');

  return (
    <div className="h-full min-h-screen flex bg-bg-primary overflow-hidden">
      <div className="w-80 min-h-screen bg-bg-surface border-r border-[rgba(255,255,255,0.10)] overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <h2 className="text-lg font-display font-bold text-text-primary mb-4">
            dbt Models
          </h2>
          <div className="space-y-2">
            {mockDBTModels.map((model) => (
              <motion.button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                whileHover={{ x: 4 }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedModel?.id === model.id
                    ? 'bg-[rgba(255,184,107,0.10)] border-accent-cyan'
                    : 'bg-bg-primary border-[rgba(255,255,255,0.10)] hover:border-accent-cyan'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-text-primary font-medium">
                    {model.name}
                  </span>
                  {model.status === 'pass' ? (
                    <CheckCircle className="w-4 h-4 text-status-success" />
                  ) : model.status === 'fail' ? (
                    <XCircle className="w-4 h-4 text-status-error" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-text-muted" />
                  )}
                </div>
                <div className="text-xs text-text-muted">{model.schema}</div>
                <div className="text-xs text-text-muted mt-1">
                  {model.tests.length} tests
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="p-6 bg-bg-surface border-b border-[rgba(255,255,255,0.10)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
                {selectedModel.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-text-muted">
                  {selectedModel.schema}
                </span>
                <span className="text-sm text-text-muted">•</span>
                <span
                  className={`text-sm font-medium ${
                    selectedModel.status === 'pass'
                      ? 'text-status-success'
                      : selectedModel.status === 'fail'
                      ? 'text-status-error'
                      : 'text-text-muted'
                  }`}
                >
                  {selectedModel.status.toUpperCase()}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-cyan hover:bg-accent-azure text-bg-primary rounded-lg font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Model
            </motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-6">
            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">
                MODEL SQL
              </h3>
              <div className="bg-bg-primary rounded-lg p-4 font-mono text-sm text-text-secondary overflow-x-auto">
                <pre>
                  {`SELECT
  customer_id,
  customer_name,
  email,
  created_at,
  updated_at
FROM {{ ref('stg_customers') }}
WHERE is_active = true`}
                </pre>
              </div>
            </div>

            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">
                TEST RESULTS
              </h3>
              <div className="space-y-3">
                {selectedModel.tests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 rounded-lg border ${
                      test.status === 'pass'
                        ? 'bg-[rgba(126,231,135,0.06)] border-status-success'
                        : 'bg-[rgba(255,107,107,0.06)] border-status-error'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {test.status === 'pass' ? (
                          <CheckCircle className="w-5 h-5 text-status-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-status-error" />
                        )}
                        <span className="text-sm font-mono text-text-primary">
                          {test.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          test.status === 'pass'
                            ? 'text-status-success'
                            : 'text-status-error'
                        }`}
                      >
                        {test.status.toUpperCase()}
                      </span>
                    </div>
                    {test.error && (
                      <div className="mt-2 text-xs font-mono text-status-error">
                        {test.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg p-6">
              <h3 className="text-sm font-display font-bold text-text-primary mb-4">
                DEPENDENCIES
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedModel.dependencies.map((dep) => (
                  <div
                    key={dep}
                    className="px-3 py-1.5 bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg"
                  >
                    <span className="text-xs font-mono text-accent-cyan">{dep}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.10)] p-6 bg-bg-surface">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-bold text-text-primary mb-2">
                  Deploy Models
                </h3>
                <div className="flex gap-2">
                  {(['dev', 'staging', 'production'] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setEnvironment(env)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        environment === env
                          ? 'bg-accent-cyan text-bg-primary'
                          : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-3 bg-status-success hover:bg-[#0EDF8F] text-bg-primary rounded-lg font-medium transition-colors"
              >
                <Rocket className="w-5 h-5" />
                Deploy All Models
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
