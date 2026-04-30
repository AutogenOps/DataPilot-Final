import { mockChatMessages } from '../data/mockData';
import type { ChatConversation, ChatMessage } from '../types';

export const API_BASE_URL_OVERRIDE_KEY = 'datapilot.apiBaseUrlOverride.v1';
export const CHAT_MESSAGES_KEY = 'datapilot.chat.messages.v1';
export const CHAT_CONVERSATIONS_KEY = 'datapilot.chat.conversations.v1';

function normalizeBaseUrl(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  return trimmed;
}

export function getDefaultApiBaseUrl(): string {
  const envValue = import.meta.env.VITE_API_BASE_URL?.toString().trim() || '';
  if (envValue) return envValue;

  // When deploying frontend + backend together (e.g., Vercel), default to same-origin.
  if (import.meta.env.PROD) return '';

  // Local dev fallback.
  return 'http://127.0.0.1:8080';
}

export function getApiBaseUrl(): string {
  try {
    const override = localStorage.getItem(API_BASE_URL_OVERRIDE_KEY);
    const normalized = normalizeBaseUrl(override || '');
    if (normalized) return normalized;
  } catch {
    // ignore
  }
  return getDefaultApiBaseUrl();
}

export function setApiBaseUrlOverride(url: string): { ok: true; value: string } | { ok: false; message: string } {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    try {
      localStorage.removeItem(API_BASE_URL_OVERRIDE_KEY);
    } catch {
      // ignore
    }
    return { ok: true, value: '' };
  }

  try {
    // Validate URL shape.
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, message: 'API base URL must start with http:// or https://.' };
    }
  } catch {
    return { ok: false, message: 'Invalid API base URL.' };
  }

  try {
    localStorage.setItem(API_BASE_URL_OVERRIDE_KEY, normalized);
  } catch {
    return { ok: false, message: 'Failed to save setting (storage unavailable).' };
  }

  return { ok: true, value: normalized };
}

function createNewConversation(now = new Date()): ChatConversation {
  const ts = now.toISOString();
  return {
    id: `conv-${now.getTime()}`,
    title: 'New chat',
    createdAt: ts,
    updatedAt: ts,
    messages: (mockChatMessages satisfies ChatMessage[]),
  };
}

export function resetChatMessages(): void {
  // Backward-compatible reset (older builds stored a flat messages array).
  try {
    localStorage.setItem(
      CHAT_MESSAGES_KEY,
      JSON.stringify(mockChatMessages satisfies ChatMessage[])
    );
  } catch {
    // ignore
  }

  // New storage format (conversations list).
  try {
    localStorage.setItem(
      CHAT_CONVERSATIONS_KEY,
      JSON.stringify([createNewConversation()] satisfies ChatConversation[])
    );
  } catch {
    // ignore
  }
}
