import type { ChatConversation, ChatMessage } from '../types';
import { mockChatMessages } from '../data/mockData';
import { isSupabaseConfigured, supabase } from './supabase';

type DbMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type DbMessageWithConversationRow = DbMessageRow & {
  conversation_id: string;
};

type DbConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

function mapMessage(row: DbMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.created_at,
  };
}

function mapConversation(row: DbConversationRow, messages: DbMessageRow[]): ChatConversation {
  const mappedMessages = messages
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(mapMessage);

  return {
    id: row.id,
    title: row.title?.trim() || 'New chat',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    messages: mappedMessages,
  };
}

const DEBUG =
  import.meta.env.DEV === true ||
  (import.meta.env.VITE_DEBUG_CHAT_HISTORY?.toString() || '').toLowerCase() === 'true';

export const isChatHistorySupabaseEnabled = isSupabaseConfigured;

export async function fetchSupabaseConversations(): Promise<ChatConversation[]> {
  if (!isSupabaseConfigured) return [];

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (DEBUG) console.warn('[chatHistory] getUser failed', userError);
    throw userError;
  }
  if (!userData.user) {
    const err = new Error('Not authenticated');
    if (DEBUG) console.warn('[chatHistory] getUser returned no user');
    throw err;
  }

  const userId = userData.user.id;
  if (DEBUG) console.log('[chatHistory] fetch conversations for user', userId);

  const { data: convRows, error: convErr } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (convErr) {
    if (DEBUG) console.warn('[chatHistory] fetch conversations failed', convErr);
    throw convErr;
  }

  const conversations = (convRows as DbConversationRow[]) ?? [];
  if (DEBUG) console.log('[chatHistory] fetched conversations', conversations.length);
  if (conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);

  const { data: msgRows, error: msgErr } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, role, content, created_at')
    .in('conversation_id', ids)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (msgErr) {
    if (DEBUG) console.warn('[chatHistory] fetch messages failed', msgErr);
    throw msgErr;
  }

  const grouped = new Map<string, DbMessageRow[]>();
  for (const id of ids) grouped.set(id, []);
  for (const m of ((msgRows as DbMessageWithConversationRow[] | null) ?? [])) {
    const convId = m.conversation_id;
    const list = grouped.get(convId);
    if (!list) continue;
    list.push({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    });
  }

  return conversations.map((c) => mapConversation(c, grouped.get(c.id) ?? []));
}

export async function createSupabaseConversationWithWelcome(): Promise<ChatConversation> {
  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    return {
      id: `conv-${Date.now()}`,
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: mockChatMessages,
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (DEBUG) console.warn('[chatHistory] getUser failed (create conversation)', userError);
    throw userError;
  }
  if (!userData.user) throw new Error('Not authenticated');

  const userId = userData.user.id;

  const { data: conv, error: convError } = await supabase
    .from('chat_conversations')
    .insert({ user_id: userId, title: 'New chat' })
    .select('id, title, created_at, updated_at')
    .single();

  if (convError) {
    if (DEBUG) console.warn('[chatHistory] insert conversation failed', convError);
    throw convError;
  }

  if (DEBUG) console.log('[chatHistory] inserted conversation', (conv as DbConversationRow).id);

  const welcomeText = mockChatMessages[0]?.content || 'Welcome to DataPilot!';
  const { data: msg, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: (conv as DbConversationRow).id,
      user_id: userId,
      role: 'assistant',
      content: welcomeText,
    })
    .select('id, role, content, created_at')
    .single();

  if (msgError) {
    if (DEBUG) console.warn('[chatHistory] insert welcome message failed', msgError);
    throw msgError;
  }

  return {
    id: (conv as DbConversationRow).id,
    title: ((conv as DbConversationRow).title ?? 'New chat').trim() || 'New chat',
    createdAt: (conv as DbConversationRow).created_at,
    updatedAt: (conv as DbConversationRow).updated_at,
    messages: [mapMessage(msg as DbMessageRow)],
  };
}

export async function appendSupabaseMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (DEBUG) console.warn('[chatHistory] getUser failed (append message)', userError);
    throw userError;
  }
  if (!userData.user) throw new Error('Not authenticated');

  const userId = userData.user.id;

  const insertRes = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
  });

  if (insertRes.error) {
    if (DEBUG) console.warn('[chatHistory] insert message failed', insertRes.error);
    throw insertRes.error;
  }

  if (DEBUG) console.log('[chatHistory] inserted message', { conversationId, role });

  const updateRes = await supabase
    .from('chat_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (updateRes.error) {
    // Non-fatal: message is persisted; ordering might be slightly stale until next load.
    console.warn('Failed to update conversation last_message_at', updateRes.error);
  }
}

export async function updateSupabaseConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const trimmed = (title || '').trim();
  if (!trimmed) return;

  const res = await supabase
    .from('chat_conversations')
    .update({ title: trimmed.slice(0, 48) })
    .eq('id', conversationId);

  if (res.error) throw res.error;
}

export async function deleteSupabaseConversation(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const res = await supabase.from('chat_conversations').delete().eq('id', conversationId);
  if (res.error) throw res.error;
}

export async function clearSupabaseChatHistory(): Promise<void> {
  if (!isSupabaseConfigured) return;

  // PostgREST requires a filter for DELETE. RLS ensures only the current user's rows are affected.
  const res = await supabase
    .from('chat_conversations')
    .delete()
    .gt('created_at', '1970-01-01T00:00:00Z');

  if (res.error) throw res.error;
}
