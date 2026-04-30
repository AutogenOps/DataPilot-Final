import { Plus, Search, Share2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { ChatConversation } from '../types';

type ChatHistoryPanelProps = {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onShareConversation: (id: string) => void;
  isLoading?: boolean;
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function ChatHistoryPanel({
  conversations,
  activeConversationId,
  searchQuery,
  onSearchQueryChange,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onShareConversation,
  isLoading = false,
}: ChatHistoryPanelProps) {
  const filtered = conversations.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const lastUserPrompt = [...c.messages]
      .reverse()
      .find((m) => m.role === 'user')?.content;

    return (
      c.title.toLowerCase().includes(q) ||
      (lastUserPrompt || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Top controls */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNewChat}
          className={clsx(
            'w-full flex items-center gap-2',
            'px-3 py-2 rounded-xl',
            'bg-bg-primary border border-[rgba(255,255,255,0.10)]',
            'hover:border-accent-cyan hover:bg-[rgba(255,184,107,0.07)]',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
          )}
        >
          <Plus className="w-4 h-4 text-text-secondary" />
          <span className="text-sm text-text-primary font-medium">New Chat</span>
        </button>

        <div
          className={clsx(
            'flex items-center gap-2',
            'px-3 py-2 rounded-xl',
            'bg-bg-primary border border-[rgba(255,255,255,0.10)]',
            'focus-within:border-accent-cyan transition-colors'
          )}
        >
          <Search className="w-4 h-4 text-text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Section title */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-text-primary">
          Recent Conversations
        </h3>
        <span className="text-xs font-mono text-text-muted">
          {isLoading ? '…' : filtered.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="mt-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pr-1">
        {isLoading ? (
          <div className="text-sm text-text-muted py-3">Loading conversations…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-text-muted py-3">No conversations found.</div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === activeConversationId;

            return (
              <div
                key={c.id}
                className={clsx(
                  'group flex items-center gap-2',
                  'rounded-xl border',
                  'transition-colors',
                  isActive
                    ? 'border-accent-cyan bg-[rgba(255,184,107,0.09)]'
                    : 'border-[rgba(255,255,255,0.10)] bg-bg-primary hover:border-accent-cyan hover:bg-[rgba(255,184,107,0.07)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectConversation(c.id)}
                  className={clsx(
                    'flex-1 min-w-0 w-full text-left px-3 py-2.5 rounded-xl',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
                  )}
                >
                  <div className="min-w-0 w-full">
                    <div className="text-sm text-text-primary font-medium truncate">
                      {
                        [...c.messages]
                          .reverse()
                          .find((m) => m.role === 'user')?.content?.trim() || c.title
                      }
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-text-muted truncate">
                      {formatTimestamp(c.updatedAt)}
                    </div>
                  </div>
                </button>

                {/* Hover actions: reserve space so layout never shifts */}
                <div className="w-16 shrink-0 flex justify-end gap-1 pr-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareConversation(c.id);
                    }}
                    aria-label="Share conversation"
                    className={clsx(
                      'p-2 rounded-lg',
                      'text-text-muted hover:text-accent-cyan hover:bg-[rgba(255,184,107,0.09)]',
                      'transition-all',
                      'opacity-0 translate-x-1 pointer-events-none',
                      'group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto',
                      'group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
                    )}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                    aria-label="Delete conversation"
                    className={clsx(
                      'p-2 rounded-lg',
                      'text-text-muted hover:text-status-error hover:bg-[rgba(255,107,107,0.12)]',
                      'transition-all',
                      'opacity-0 translate-x-1 pointer-events-none',
                      'group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto',
                      'group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/*
        Future backend integration:
        - Replace props with data loaded from an API (GET /api/conversations)
        - Keep this component presentational; fetch + mutate in parent hooks.
      */}
    </div>
  );
}
