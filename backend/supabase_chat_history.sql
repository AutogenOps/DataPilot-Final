-- Supabase Chat History Schema (run in Supabase SQL editor)
-- Provides persistent, per-user chat conversation history with strong user isolation (RLS).

create extension if not exists "pgcrypto";

-- 1) Conversations
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create index if not exists chat_conversations_user_id_idx on public.chat_conversations (user_id);
create index if not exists chat_conversations_last_message_at_idx on public.chat_conversations (last_message_at desc nulls last);

-- 2) Messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_id_idx on public.chat_messages (conversation_id);
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);

-- Keep updated_at fresh on conversation updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_conversations_set_updated_at on public.chat_conversations;
create trigger trg_chat_conversations_set_updated_at
before update on public.chat_conversations
for each row execute function public.set_updated_at();

-- Maintain last_message_at when inserting messages
create or replace function public.touch_conversation_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_conversations
    set last_message_at = now(), updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_touch_conversation on public.chat_messages;
create trigger trg_chat_messages_touch_conversation
after insert on public.chat_messages
for each row execute function public.touch_conversation_last_message_at();

-- 3) RLS
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Conversations: user can only see/manage their own rows

drop policy if exists "chat_conversations_select_own" on public.chat_conversations;
create policy "chat_conversations_select_own"
  on public.chat_conversations
  for select
  using (auth.uid() = user_id);

drop policy if exists "chat_conversations_insert_own" on public.chat_conversations;
create policy "chat_conversations_insert_own"
  on public.chat_conversations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "chat_conversations_update_own" on public.chat_conversations;
create policy "chat_conversations_update_own"
  on public.chat_conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chat_conversations_delete_own" on public.chat_conversations;
create policy "chat_conversations_delete_own"
  on public.chat_conversations
  for delete
  using (auth.uid() = user_id);

-- Messages: user can only access messages that belong to their own conversations

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  using (auth.uid() = user_id);

-- 4) Grants (required for PostgREST)
-- The frontend uses the anon key + the user's JWT (role: authenticated).
-- These grants allow access, while RLS policies enforce isolation.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.chat_conversations to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
