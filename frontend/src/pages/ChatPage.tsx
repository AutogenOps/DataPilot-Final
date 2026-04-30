import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  TrendingUp,
  Database,
  Play,
  Activity,
  Calendar,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import clsx from 'clsx';
import ChatHistoryPanel from '../components/ChatHistoryPanel';
import type { ChatConversation, ChatMessage } from '../types';
import { mockChatMessages } from '../data/mockData';
import {
  CHAT_CONVERSATIONS_KEY,
  CHAT_MESSAGES_KEY,
  getApiBaseUrl,
} from '../lib/clientSettings';
import {
  appendSupabaseMessage,
  createSupabaseConversationWithWelcome,
  deleteSupabaseConversation,
  fetchSupabaseConversations,
  isChatHistorySupabaseEnabled,
  updateSupabaseConversationTitle,
} from '../lib/chatHistory';
import { supabase } from '../lib/supabase';
import DataPilotMark from '../components/DataPilotMark';

const suggestedPrompts = [
  { icon: Activity, text: 'What jobs failed in the last 24 hours?', color: 'status-error' },
  { icon: TrendingUp, text: 'Show me the status of all DLT pipelines', color: 'accent-azure' },
  { icon: Play, text: 'Run the daily ETL job', color: 'status-success' },
  { icon: Database, text: 'Deploy the latest dbt models', color: 'accent-cyan' },
  { icon: Activity, text: 'Which clusters are currently running?', color: 'status-warning' },
  { icon: Calendar, text: 'Check SLA compliance for this week', color: 'text-secondary' },
];

const promptIconColor: Record<string, string> = {
  'status-error': 'text-status-error',
  'accent-azure': 'text-accent-azure',
  'status-success': 'text-status-success',
  'accent-cyan': 'text-accent-cyan',
  'status-warning': 'text-status-warning',
  'text-secondary': 'text-text-secondary',
};

function createConversationFromMessages(messages: ChatMessage[], now = new Date()): ChatConversation {
  const createdAt = messages[0]?.timestamp || now.toISOString();
  const updatedAt = messages[messages.length - 1]?.timestamp || createdAt;
  const firstUserPrompt = messages.find((m) => m.role === 'user')?.content?.trim() || '';

  return {
    id: `conv-${now.getTime()}`,
    title: firstUserPrompt ? firstUserPrompt.slice(0, 48) : 'New chat',
    createdAt,
    updatedAt,
    messages,
  };
}

function loadStoredConversations(): ChatConversation[] {
  // Preferred (new): conversations list
  try {
    const raw = localStorage.getItem(CHAT_CONVERSATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ChatConversation[];
      }
    }
  } catch {
    // ignore
  }

  // Backward-compat (old): flat messages array
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (!raw) return [createConversationFromMessages(mockChatMessages)];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createConversationFromMessages(mockChatMessages)];
    }
    const msgs = parsed as ChatMessage[];
    return [createConversationFromMessages(msgs)];
  } catch {
    return [createConversationFromMessages(mockChatMessages)];
  }
}

const CHAT_CONTEXT_PANEL_COLLAPSED_KEY = 'datapilot.chat.contextPanelCollapsed';

function getInitialContextPanelCollapsed(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem(CHAT_CONTEXT_PANEL_COLLAPSED_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;

  return window.matchMedia?.('(max-width: 768px)').matches ?? false;
}

export default function ChatPage() {
  const apiBaseUrl = useMemo(
    () => getApiBaseUrl(),
    []
  );

  const useSupabaseHistory = isChatHistorySupabaseEnabled;
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(useSupabaseHistory);

  const [conversations, setConversations] = useState<ChatConversation[]>(() =>
    useSupabaseHistory ? [] : loadStoredConversations()
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c.id === activeConversationId) ?? null;
  }, [activeConversationId, conversations]);

  const messages = activeConversation?.messages ?? [];

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Auto-resize: single-line by default, grow only as content grows.
    el.style.height = 'auto';
    const maxPx = 160;
    const next = Math.min(el.scrollHeight, maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxPx ? 'auto' : 'hidden';
  }, [input]);

  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState<boolean>(() =>
    getInitialContextPanelCollapsed()
  );

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CHAT_CONTEXT_PANEL_COLLAPSED_KEY,
        String(isContextPanelCollapsed)
      );
    } catch {
      // Ignore persistence errors (private mode/quota/etc.).
    }
  }, [isContextPanelCollapsed]);

  useEffect(() => {
    if (!useSupabaseHistory) return;

    let cancelled = false;

    const load = async () => {
      setIsHistoryLoading(true);
      try {
        const fetched = await fetchSupabaseConversations();
        if (cancelled) return;

        // Merge to avoid overwriting locally-created/updated conversations while a load is in-flight.
        setConversations((prev) => {
          const prevById = new Map(prev.map((c) => [c.id, c] as const));
          const merged: ChatConversation[] = fetched.map((remote) => {
            const local = prevById.get(remote.id);
            if (!local) return remote;

            const remoteTime = new Date(remote.updatedAt).getTime();
            const localTime = new Date(local.updatedAt).getTime();

            if (localTime > remoteTime) return local;
            if (localTime === remoteTime && (local.messages?.length ?? 0) > (remote.messages?.length ?? 0)) {
              return local;
            }
            return remote;
          });

          const mergedIds = new Set(merged.map((c) => c.id));
          for (const local of prev) {
            if (!mergedIds.has(local.id)) merged.push(local);
          }

          return merged;
        });
      } catch (err) {
        console.warn('Failed to load chat history from Supabase', err);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        // ChatGPT-like: always reset to New Chat when a user logs in.
        setActiveConversationId(null);
        load();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [useSupabaseHistory]);

  useEffect(() => {
    if (useSupabaseHistory) return;

    try {
      window.localStorage.setItem(
        CHAT_CONVERSATIONS_KEY,
        JSON.stringify(conversations)
      );
    } catch {
      // Ignore persistence errors (private mode/quota/etc.).
    }
  }, [conversations, useSupabaseHistory]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [conversations]);

  // IMPORTANT (ChatGPT-like behavior): never auto-open a conversation.
  // The user must explicitly select a conversation, or we create/select one when they send their first message.

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewChat = () => {
    // ChatGPT-like: "New Chat" does not create DB rows. It only resets the open chat.
    setActiveConversationId(null);
    setSearchQuery('');
    setInput('');
  };

  const handleDeleteConversation = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((current) => (current === id ? null : current));

    if (!useSupabaseHistory) return;

    try {
      await deleteSupabaseConversation(id);
    } catch (err) {
      console.warn('Failed to delete conversation from Supabase', err);
    }
  };

  const handleShareConversation = (id: string) => {
    // Stub: replace with share flow / deep-linking.
    console.log('share conversation', id);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;


    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    let targetConversationId = activeConversationId;

    // If we're on the New Chat screen, create/select a new conversation on first send.
    if (!targetConversationId) {
      if (useSupabaseHistory) {
        const conv = await createSupabaseConversationWithWelcome();
        setConversations((prev) => [conv, ...prev]);
        targetConversationId = conv.id;
        setActiveConversationId(conv.id);
      } else {
        const conv = createConversationFromMessages(mockChatMessages);
        setConversations((prev) => [conv, ...prev]);
        targetConversationId = conv.id;
        setActiveConversationId(conv.id);
      }
    }

    if (!targetConversationId) return;

    setConversations((prev) => {
      return prev.map((c) => {
        if (c.id !== targetConversationId) return c;
        const updatedMessages = [...c.messages, userMessage];
        const updatedAt = userMessage.timestamp;
        const title = c.title === 'New chat' && text ? text.slice(0, 48) : c.title;
        return { ...c, title, updatedAt, messages: updatedMessages };
      });
    });
    setInput('');
    setIsThinking(true);

    if (useSupabaseHistory && targetConversationId) {
      try {
        await appendSupabaseMessage(targetConversationId, 'user', text);

        // Only persist a derived title when this was still the default.
        await updateSupabaseConversationTitle(targetConversationId, text);
      } catch (err) {
        console.warn('Failed to persist user message to Supabase', err);
      }
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      let replyText = '';

      if (!res.ok) {
        try {
          const err = (await res.json()) as { reply?: string; message?: string; error?: string };
          replyText = err.reply || err.message || err.error || `Chat request failed: backend returned ${res.status} ${res.statusText}`;
        } catch {
          replyText = `Chat request failed: backend returned ${res.status} ${res.statusText}`;
        }
      } else {
        const data = (await res.json()) as { ok: boolean; reply?: string; message?: string };
        replyText = data.reply || data.message || 'No response received.';
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) => {
        return prev.map((c) => {
          if (c.id !== targetConversationId) return c;
          return {
            ...c,
            updatedAt: aiMessage.timestamp,
            messages: [...c.messages, aiMessage],
          };
        });
      });

      if (useSupabaseHistory && targetConversationId) {
        try {
          await appendSupabaseMessage(targetConversationId, 'assistant', replyText);
        } catch (err) {
          console.warn('Failed to persist assistant message to Supabase', err);
        }
      }
    } catch {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Chat request failed (network/invalid response).',
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) => {
        return prev.map((c) => {
          if (c.id !== targetConversationId) return c;
          return {
            ...c,
            updatedAt: aiMessage.timestamp,
            messages: [...c.messages, aiMessage],
          };
        });
      });

      if (useSupabaseHistory && targetConversationId) {
        try {
          await appendSupabaseMessage(targetConversationId, 'assistant', aiMessage.content);
        } catch (err) {
          console.warn('Failed to persist assistant error message to Supabase', err);
        }
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-8">
          {!activeConversationId ? (
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <DataPilotMark className="mx-auto mb-4 h-16 w-16" />
                <h2 className="text-4xl font-display font-bold text-gradient-cyan mb-3">
                  Welcome to DataPilot
                </h2>
                <p className="mx-auto max-w-2xl text-text-secondary leading-7">
                  Ask about Jobs, DLT pipelines, clusters, and workspace operations from one connected console.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {suggestedPrompts.map((prompt, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handlePromptClick(prompt.text)}
                    className="p-4 app-surface border rounded-lg text-left hover:border-accent-cyan/80 hover:glow-cyan transition-all group"
                  >
                    <prompt.icon className={clsx('w-5 h-5 mb-3 transition-colors group-hover:text-accent-cyan', promptIconColor[prompt.color])} />
                    <p className="text-sm text-text-primary">{prompt.text}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <motion.div
                  id={`chat-msg-${message.id}`}
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'app-surface border-l-2 border-accent-cyan'
                        : 'bg-accent-cyan/10 border border-white/10'
                    }`}
                  >
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-xs text-text-muted mt-2 font-mono">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] p-4 rounded-lg bg-accent-cyan/10 border border-white/10">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="flex gap-1"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="w-2 h-2 bg-accent-cyan rounded-full" />
                        <span className="w-2 h-2 bg-accent-cyan rounded-full" />
                        <span className="w-2 h-2 bg-accent-cyan rounded-full" />
                      </motion.div>
                      <span className="text-sm text-text-secondary">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <div
              className={clsx(
                'flex items-center gap-3',
                'app-surface border',
                'rounded-full px-4 py-2.5 min-h-[52px]',
                'transition-colors',
                'focus-within:border-accent-cyan focus-within:shadow-[0_0_0_1px_rgba(67,217,201,0.18),0_18px_46px_rgba(0,0,0,0.22)]'
              )}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything…"
                className={clsx(
                  'flex-1 bg-transparent text-sm text-text-primary',
                  'placeholder:text-text-muted',
                  'focus:outline-none',
                  'resize-none scrollbar-thin',
                  'leading-6',
                  'min-h-[24px] max-h-40'
                )}
                rows={1}
              />

              <motion.button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  'bg-accent-cyan text-bg-primary',
                  'transition-colors',
                  'hover:bg-accent-azure',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="font-mono">{input.length} / 2000</span>
            </div>
          </div>
        </div>
      </div>

      <aside
        className={clsx(
          'app-shell border-l border-white/10 overflow-hidden',
          isContextPanelCollapsed ? 'w-16' : 'w-80',
          'transition-[width] duration-200 ease-in-out'
        )}
      >
        <div
          className={clsx(
            'relative h-full',
            isContextPanelCollapsed ? 'px-2 py-4' : 'p-6'
          )}
        >
          <button
            type="button"
            onClick={() => setIsContextPanelCollapsed((v) => !v)}
            aria-label={
              isContextPanelCollapsed
                ? 'Expand chat history panel'
                : 'Collapse chat history panel'
            }
            className={clsx(
              'absolute z-10',
              isContextPanelCollapsed ? 'top-2 right-2' : 'top-4 right-4',
              'p-2 hover:bg-bg-primary rounded-lg transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
            )}
          >
            {isContextPanelCollapsed ? (
              <PanelRightOpen className="w-5 h-5 text-text-secondary" />
            ) : (
              <PanelRightClose className="w-5 h-5 text-text-secondary" />
            )}
          </button>

          <div
            aria-hidden={isContextPanelCollapsed}
            className={clsx(
              'transition-[opacity] duration-200 ease-in-out h-full',
              isContextPanelCollapsed
                ? 'opacity-0 pointer-events-none overflow-hidden'
                : 'opacity-100'
            )}
          >
            <ChatHistoryPanel
              conversations={sortedConversations}
              activeConversationId={activeConversationId}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onNewChat={handleNewChat}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onShareConversation={handleShareConversation}
              isLoading={useSupabaseHistory && isHistoryLoading}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
