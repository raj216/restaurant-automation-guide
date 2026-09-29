-- Brio's phone calls, for the Live Inbox (/inbox on the website).
--
-- Retell sends a summary of every call when it ends (the retell-events
-- function receives it and saves it here, signed in as the restaurant's
-- "agent" account). Staff read the calls in the Live Inbox, next to the
-- orders taken on them (orders.call_id), and mark the ones they've dealt
-- with. Same rules as the rest of the ordering system: Row Level Security
-- limits everyone to their own restaurant, and nothing is ever deleted.

create table public.calls (
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  call_id text not null check (call_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- From Retell ---------------------------------------------------------------
  call_type text check (call_type in ('phone_call', 'web_call')),
  direction text check (direction in ('inbound', 'outbound')),
  from_number text check (from_number ~ '^\+?[0-9]{3,15}$'),
  to_number text check (to_number ~ '^\+?[0-9]{3,15}$'),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds between 0 and 86400),
  disconnection_reason text check (char_length(disconnection_reason) <= 100),
  -- What the call was about. Retell's post-call analysis sets it when the
  -- agent has a "call_type" field; otherwise the inbox works it out.
  kind text check (kind in ('order', 'reservation', 'alert', 'spam', 'question', 'other')),
  summary text check (char_length(summary) <= 4000),
  transcript text check (char_length(transcript) <= 60000),
  sentiment text check (char_length(sentiment) <= 40),
  successful boolean,
  in_voicemail boolean,
  -- Retell's custom post-call analysis fields (party size, requested time...).
  analysis jsonb not null default '{}'::jsonb check (jsonb_typeof(analysis) = 'object' and pg_column_size(analysis) <= 16384),

  -- From staff ----------------------------------------------------------------
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  staff_note text not null default '' check (char_length(staff_note) <= 4000),

  primary key (restaurant_id, call_id),
  -- Safety rule 9: never keep a spoken card number (the function removes them first).
  constraint calls_no_card_numbers check (
    coalesce(summary, '') !~ '([0-9][ .-]?){12,18}[0-9]'
    and coalesce(transcript, '') !~ '([0-9][ .-]?){12,18}[0-9]'
    and analysis::text !~ '([0-9][ .-]?){12,18}[0-9]'
    and staff_note !~ '([0-9][ .-]?){12,18}[0-9]'
  )
);

comment on table public.calls is
  'Brio''s phone calls as Retell summarised them, one row per call. Written by the retell-events function (as the agent); read and marked handled by staff in the Live Inbox (/inbox).';

create index calls_restaurant_started_idx on public.calls (restaurant_id, (coalesce(started_at, created_at)) desc);

-- Who may change what: the agent writes what Retell sent; staff only mark a
-- call handled and add a note. handled_by is always the signed-in person.
create function private.calls_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor text := private.actor_kind(new.restaurant_id);
  v_staff_fields text[] := array['handled_at', 'handled_by', 'staff_note', 'updated_at'];
begin
  if v_actor is null then
    raise exception 'call_rule: only members of this restaurant can change its calls'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'INSERT' then
    if v_actor = 'staff' then
      raise exception 'call_rule: calls are recorded by the agent, not added by hand'
        using errcode = 'insufficient_privilege';
    end if;
    if v_actor = 'agent' and (new.handled_at is not null or new.handled_by is not null or new.staff_note <> '') then
      raise exception 'call_rule: only staff can mark a call handled'
        using errcode = 'insufficient_privilege';
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.restaurant_id <> old.restaurant_id or new.call_id <> old.call_id then
    raise exception 'call_rule: a call''s restaurant and id never change'
      using errcode = 'check_violation';
  end if;
  if v_actor = 'staff' then
    if (to_jsonb(new) - v_staff_fields) is distinct from (to_jsonb(old) - v_staff_fields) then
      raise exception 'call_rule: staff can only mark a call handled or add a note'
        using errcode = 'insufficient_privilege';
    end if;
    new.handled_by := case when new.handled_at is null then null else auth.uid() end;
  elsif v_actor = 'agent' then
    if new.handled_at is distinct from old.handled_at
       or new.handled_by is distinct from old.handled_by
       or new.staff_note is distinct from old.staff_note then
      raise exception 'call_rule: only staff can mark a call handled'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger calls_before_write
  before insert or update on public.calls
  for each row execute function private.calls_before_write();

create trigger calls_no_delete
  before delete on public.calls
  for each row execute function private.refuse_change('call_rule: calls are never deleted');

alter table public.calls enable row level security;

create policy "members can read their calls"
  on public.calls for select to authenticated
  using (private.has_role(restaurant_id, array['owner', 'staff', 'agent']));

create policy "the ordering agent records calls"
  on public.calls for insert to authenticated
  with check (private.has_role(restaurant_id, array['agent']));

create policy "the agent updates what Retell sent, staff mark calls handled"
  on public.calls for update to authenticated
  using (private.has_role(restaurant_id, array['owner', 'staff', 'agent']))
  with check (private.has_role(restaurant_id, array['owner', 'staff', 'agent']));

-- No delete or truncate for anyone signed in (truncate would skip the triggers).
revoke all on table public.calls from anon, authenticated;
grant select, insert, update on table public.calls to authenticated;

revoke all on function private.calls_before_write() from public, anon, authenticated;

notify pgrst, 'reload schema';
