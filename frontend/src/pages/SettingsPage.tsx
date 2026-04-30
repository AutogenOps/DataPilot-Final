import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, PlugZap, XCircle } from 'lucide-react';
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  resetChatMessages,
  setApiBaseUrlOverride,
} from '../lib/clientSettings';
import {
  clearSupabaseChatHistory,
  isChatHistorySupabaseEnabled,
} from '../lib/chatHistory';

type DatabricksPingResponse = {
  ok: boolean;
  userName?: string | null;
  displayName?: string | null;
  message?: string;
  errorType?: string;
  error?: string;
};

type DbAiKitSkill = {
  name: string;
  title?: string;
  description?: string;
  path?: string | null;
  installed?: boolean;
  available?: boolean;
};

type DbAiKitSkillsResponse = {
  ok: boolean;
  profile?: string;
  count?: number;
  installedCount?: number;
  manifest?: string;
  skills?: DbAiKitSkill[];
  message?: string;
};

export default function SettingsPage() {
  const defaultApiBaseUrl = useMemo(() => getDefaultApiBaseUrl(), []);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState<string>(() => getApiBaseUrl());
  const [apiSaveMessage, setApiSaveMessage] = useState<string>('');

  const [pingStatus, setPingStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [pingMessage, setPingMessage] = useState<string>('');

  const [chatMessage, setChatMessage] = useState<string>('');
  const [skillsStatus, setSkillsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [skillsMessage, setSkillsMessage] = useState<string>('');
  const [skillsProfile, setSkillsProfile] = useState<string>('');
  const [skillsManifest, setSkillsManifest] = useState<string>('');
  const [skills, setSkills] = useState<DbAiKitSkill[]>([]);

  const testPing = async () => {
    setPingStatus('loading');
    setPingMessage('');

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/databricks/ping`, { method: 'GET' });
      const data = (await res.json()) as DatabricksPingResponse;
      if (res.ok && data.ok) {
        setPingStatus('ok');
        setPingMessage(`Connected${data.userName ? ` as ${data.userName}` : ''}.`);
      } else {
        setPingStatus('error');
        setPingMessage(data.message || data.error || `Ping failed (${res.status}).`);
      }
    } catch {
      setPingStatus('error');
      setPingMessage('Ping failed (network/invalid response).');
    }
  };

  const loadDbAiKitSkills = async () => {
    setSkillsStatus('loading');
    setSkillsMessage('');

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/api/db-ai-kit/skills`, { method: 'GET' });
      const data = (await res.json()) as DbAiKitSkillsResponse;
      if (res.ok && data.ok) {
        setSkillsStatus('ok');
        setSkillsProfile(data.profile || '');
        setSkillsManifest(data.manifest || '');
        setSkills(data.skills || []);
        setSkillsMessage(
          `Loaded ${data.count ?? data.skills?.length ?? 0} skills from profile '${data.profile || 'unknown'}'.`
        );
      } else {
        setSkillsStatus('error');
        setSkillsMessage(data.message || `Failed to load db-ai-kit skills (${res.status}).`);
        setSkills([]);
      }
    } catch {
      setSkillsStatus('error');
      setSkillsMessage('Failed to load db-ai-kit skills (network/invalid response).');
      setSkills([]);
    }
  };

  useEffect(() => {
    testPing();
    loadDbAiKitSkills();
  }, []);

  const saveApiBaseUrl = () => {
    setApiSaveMessage('');
    const result = setApiBaseUrlOverride(apiBaseUrlInput);
    if (!result.ok) {
      setApiSaveMessage(result.message);
      return;
    }

    setApiSaveMessage('Saved. Reload the app to apply everywhere.');
  };

  const resetApiBaseUrl = () => {
    setApiSaveMessage('');
    const result = setApiBaseUrlOverride('');
    if (!result.ok) {
      setApiSaveMessage(result.message);
      return;
    }
    setApiBaseUrlInput(getDefaultApiBaseUrl());
    setApiSaveMessage('Reset to default. Reload the app to apply everywhere.');
  };

  const clearChat = async () => {
    try {
      if (isChatHistorySupabaseEnabled) {
        await clearSupabaseChatHistory();
        setChatMessage('Chat history cleared.');
        return;
      }
    } catch (err) {
      console.warn('Failed to clear chat history in Supabase', err);
      setChatMessage('Failed to clear chat history.');
      return;
    }

    resetChatMessages();
    setChatMessage('Chat history cleared.');
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-8">
      <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Settings</h1>
      <p className="text-text-secondary">Configure DataPilot preferences and integrations</p>

      <div className="mt-8 grid grid-cols-1 gap-6 max-w-5xl">
        <div className="p-6 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-text-muted">
                <PlugZap className="h-4 w-4 text-accent-cyan" />
                Databricks
              </div>
              <h2 className="text-lg font-display font-bold text-text-primary">
                Workspace connection
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                The backend reads `DATABRICKS_HOST` and `DATABRICKS_TOKEN` from `backend/.env`.
                Tokens stay server-side; the browser only sees connection status.
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${
                pingStatus === 'ok'
                  ? 'border-status-success/40 bg-status-success/10 text-status-success'
                  : pingStatus === 'error'
                    ? 'border-status-error/40 bg-status-error/10 text-status-error'
                    : 'border-white/10 bg-black/40 text-text-muted'
              }`}
            >
              {pingStatus === 'ok' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {pingStatus === 'loading'
                ? 'Checking'
                : pingStatus === 'ok'
                  ? 'Connected'
                  : 'Not connected'}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={testPing}
              disabled={pingStatus === 'loading'}
              className="px-4 py-2 bg-black/70 border border-white/10 rounded-lg text-sm text-text-primary hover:border-accent-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Databricks Connection
            </button>
            {pingMessage && <div className="text-xs text-text-muted">{pingMessage}</div>}
          </div>
        </div>

        <div className="p-6 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-text-muted">
                <BookOpen className="h-4 w-4 text-accent-cyan" />
                db-ai-kit
              </div>
              <h2 className="text-lg font-display font-bold text-text-primary">
                Installed skills
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                The backend reads `db-ai-kit/.ai-dev-kit/.installed-skills`, maps each entry
                to the local `db-ai-kit/.cursor/skills` folder, and exposes them to HTTP, MCP,
                and chat.
              </p>
            </div>

            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${
                skillsStatus === 'ok'
                  ? 'border-status-success/40 bg-status-success/10 text-status-success'
                  : skillsStatus === 'error'
                    ? 'border-status-error/40 bg-status-error/10 text-status-error'
                    : 'border-white/10 bg-black/40 text-text-muted'
              }`}
            >
              {skillsStatus === 'ok' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {skillsStatus === 'loading'
                ? 'Loading'
                : skillsStatus === 'ok'
                  ? `${skills.length} loaded`
                  : 'Unavailable'}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={loadDbAiKitSkills}
              disabled={skillsStatus === 'loading'}
              className="px-4 py-2 bg-black/70 border border-white/10 rounded-lg text-sm text-text-primary hover:border-accent-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reload Skills
            </button>
            {skillsMessage && <div className="text-xs text-text-muted">{skillsMessage}</div>}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 text-xs text-text-muted md:grid-cols-2">
            <div>
              <span className="font-mono text-text-secondary">Profile:</span>{' '}
              {skillsProfile || 'unknown'}
            </div>
            <div>
              <span className="font-mono text-text-secondary">Manifest:</span>{' '}
              {skillsManifest || 'not found'}
            </div>
          </div>

          <div className="mt-5 max-h-72 overflow-y-auto scrollbar-thin rounded-lg border border-white/10 bg-black/30 p-3">
            {skills.length === 0 ? (
              <div className="text-sm text-text-muted">No skills loaded.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="rounded-lg border border-white/10 bg-bg-primary px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {skill.name}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-mono ${
                          skill.available ? 'text-status-success' : 'text-status-error'
                        }`}
                      >
                        {skill.available ? 'available' : 'missing'}
                      </span>
                    </div>
                    {skill.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-text-muted">
                        {skill.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
          <h2 className="text-sm font-display font-bold text-text-primary mb-1">Connections</h2>
          <p className="text-xs text-text-muted mb-6">Configure how the UI talks to the backend.</p>

          <div className="space-y-3">
            <label className="block text-xs font-mono text-text-muted">API Base URL</label>
            <input
              value={apiBaseUrlInput}
              onChange={(e) => setApiBaseUrlInput(e.target.value)}
              placeholder={defaultApiBaseUrl}
              className="w-full bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan"
            />

            <div className="flex gap-3">
              <motion.button
                onClick={saveApiBaseUrl}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-accent-cyan hover:bg-accent-azure text-bg-primary rounded-lg text-sm font-medium transition-colors"
              >
                Save
              </motion.button>
              <button
                onClick={resetApiBaseUrl}
                className="px-4 py-2 bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg text-sm text-text-primary hover:border-accent-cyan transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg text-sm text-text-primary hover:border-accent-cyan transition-colors"
              >
                Reload App
              </button>
            </div>

            {apiSaveMessage && <div className="text-xs text-text-muted">{apiSaveMessage}</div>}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] text-[11px] text-text-muted">
              Workspace URL/host is intentionally not displayed in the browser.
            </div>
          </div>
        </div>

        <div className="p-6 bg-bg-surface border border-[rgba(255,255,255,0.10)] rounded-lg">
          <h2 className="text-sm font-display font-bold text-text-primary mb-1">Chat</h2>
          <p className="text-xs text-text-muted mb-6">Manage your local chat session.</p>

          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="px-4 py-2 bg-bg-primary border border-[rgba(255,255,255,0.10)] rounded-lg text-sm text-text-primary hover:border-accent-cyan transition-colors"
            >
              Clear chat history
            </button>
            {chatMessage && <div className="text-xs text-text-muted">{chatMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
