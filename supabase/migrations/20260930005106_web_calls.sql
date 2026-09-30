-- The "Talk to Brio" button on the website starts Retell web calls through
-- the brio-web-call edge function, and every minute of a call costs money.
-- This keeps a record of the calls started so the function can refuse new
-- ones past a cap:
--   * one visitor (one connection): 3 calls an hour, 6 a day;
--   * the whole website: 30 calls a day.
-- Each call is also held to 5 minutes by the function itself.
--
-- Only the "agent" login the edge functions sign in with can start a call.
-- Visitors' IP addresses are never stored: only a salted hash, with the same
-- salt the pilot form uses (private.website_lead_settings). Rows are kept
-- 8 days, long enough for the daily cap and a look back at a busy week.

create table private.web_call_starts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  -- Retell's id for the call, once it was created.
  call_id text check (call_id ~ '^[A-Za-z0-9_-]{1,128}$')
);

comment on table private.web_call_starts is
  'Web calls started from the Talk to Brio button on the website, kept 8 days for the call caps (public.claim_web_call).';

create index web_call_starts_created_at_idx on private.web_call_starts (created_at);
create index web_call_starts_ip_hash_idx on private.web_call_starts (ip_hash, created_at);

alter table private.web_call_starts enable row level security;
revoke all on private.web_call_starts from public, anon, authenticated;

-- True when the request comes from the agent login the edge functions use.
create function private.is_web_call_agent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none') = 'authenticated'
    and exists (
      select 1 from public.restaurant_members m
      where m.user_id = (select auth.uid()) and m.role = 'agent'
    )
$$;

-- Asks for one web call for the visitor at p_ip. Returns {ok: true, claim}
-- or {ok: false, error: 'visitor_limit' | 'daily_limit'}.
create function public.claim_web_call(p_ip text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ip text;
  v_hour integer;
  v_day integer;
  v_site integer;
  v_claim bigint;
begin
  if not private.is_web_call_agent() then
    raise exception 'web_call_rule: only the agent account can start web calls'
      using errcode = 'insufficient_privilege';
  end if;

  select encode(extensions.digest(
      coalesce(nullif(btrim(left(p_ip, 100)), ''), 'unknown') || ':' || s.ip_salt,
      'sha256'), 'hex')
    into v_ip
    from private.website_lead_settings s
    where s.id;
  if v_ip is null then
    raise exception 'web_call_rule: the IP salt is missing' using errcode = 'no_data_found';
  end if;

  -- One claim at a time, so two calls starting together can't both slip under a cap.
  perform pg_advisory_xact_lock(hashtext('public.claim_web_call'));
  delete from private.web_call_starts where created_at < now() - interval '8 days';

  select count(*) filter (where created_at > now() - interval '1 hour'), count(*)
    into v_hour, v_day
    from private.web_call_starts
    where ip_hash = v_ip and created_at > now() - interval '1 day';
  if v_hour >= 3 or v_day >= 6 then
    return jsonb_build_object('ok', false, 'error', 'visitor_limit');
  end if;

  select count(*) into v_site
    from private.web_call_starts
    where created_at > now() - interval '1 day';
  if v_site >= 30 then
    return jsonb_build_object('ok', false, 'error', 'daily_limit');
  end if;

  insert into private.web_call_starts (ip_hash) values (v_ip) returning id into v_claim;
  return jsonb_build_object('ok', true, 'claim', v_claim);
end;
$$;

-- Records which Retell call a claim became (claims from the last 10 minutes only).
create function public.note_web_call(p_claim bigint, p_call_id text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_web_call_agent() then
    raise exception 'web_call_rule: only the agent account can start web calls'
      using errcode = 'insufficient_privilege';
  end if;
  update private.web_call_starts
    set call_id = p_call_id
    where id = p_claim and call_id is null and created_at > now() - interval '10 minutes';
end;
$$;

revoke all on function private.is_web_call_agent() from public, anon, authenticated;
revoke all on function public.claim_web_call(text) from public, anon, authenticated;
revoke all on function public.note_web_call(bigint, text) from public, anon, authenticated;
grant execute on function public.claim_web_call(text) to authenticated;
grant execute on function public.note_web_call(bigint, text) to authenticated;
