-- Requests from the contact form on the Kadmivo website, and the
-- passcode-protected Leads page (/admin) that reads them.
--
-- Everything lives in the private schema, which the Data API doesn't
-- expose. The website reaches it only through the public functions at
-- the bottom of this file.

create table private.website_leads (
  id uuid primary key default gen_random_uuid(),
  -- Made by the browser for each filled-in form, so a retry or a double
  -- click can't save the same request twice.
  client_id uuid not null unique,
  created_at timestamptz not null default now(),
  name text not null,
  restaurant text not null,
  email text not null,
  phone text,
  location text not null,
  pos text not null,
  need text not null,
  contact_preference text not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'booked', 'trial', 'customer', 'not_a_fit', 'spam')),
  notes text not null default '' check (char_length(notes) <= 8000),
  updated_at timestamptz not null default now(),
  -- Page, referrer, campaign tags and browser details at the time of sending.
  source jsonb not null default '{}'::jsonb,
  -- Salted hash of the sender's IP address, used only for rate limiting.
  ip_hash text not null
);

comment on table private.website_leads is
  'Requests sent from the contact form on the Kadmivo website. Read them on the website at /admin.';

create index website_leads_created_at_idx on private.website_leads (created_at desc);
create index website_leads_ip_hash_idx on private.website_leads (ip_hash, created_at desc);

-- One row: the Leads page passcode (bcrypt) and the salt for IP hashes.
create table private.website_lead_settings (
  id boolean primary key default true check (id),
  passcode_hash text,
  ip_salt text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  updated_at timestamptz not null default now()
);

insert into private.website_lead_settings default values;

-- Signed-in browsers. Only a SHA-256 of each token is kept.
create table private.website_lead_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

-- Passcode attempts, for locking out guessing.
create table private.website_lead_sign_ins (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  succeeded boolean not null,
  at timestamptz not null default now()
);

create index website_lead_sign_ins_ip_hash_idx on private.website_lead_sign_ins (ip_hash, at desc);

alter table private.website_leads enable row level security;
alter table private.website_lead_settings enable row level security;
alter table private.website_lead_sessions enable row level security;
alter table private.website_lead_sign_ins enable row level security;

revoke all on table
  private.website_leads,
  private.website_lead_settings,
  private.website_lead_sessions,
  private.website_lead_sign_ins
from public, anon, authenticated;

-- Helpers -----------------------------------------------------------------

-- Trims every kind of whitespace, not just spaces.
create function private.website_trim(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(coalesce(p, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g')
$$;

-- Salted SHA-256 of the caller's IP address, which Supabase passes in
-- cf-connecting-ip. The address itself is never stored.
create function private.website_ip_hash()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.digest(
    coalesce(
      nullif(h.headers ->> 'cf-connecting-ip', ''),
      nullif(btrim(split_part(h.headers ->> 'x-forwarded-for', ',', 1)), ''),
      'unknown'
    ) || ':' || s.ip_salt,
    'sha256'), 'hex')
  from private.website_lead_settings s,
    lateral (
      select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json as headers
    ) h
  where s.id
$$;

-- Keeps only the known source fields, each cut to a sane length.
create function private.website_clean_source(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p) = 'object' then jsonb_strip_nulls(jsonb_build_object(
    'page', left(p ->> 'page', 500),
    'referrer', left(p ->> 'referrer', 500),
    'utm', (
      select jsonb_object_agg(e.key, left(e.value, 200))
      from jsonb_each_text(case when jsonb_typeof(p -> 'utm') = 'object' then p -> 'utm' else '{}'::jsonb end) e
      where e.key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content')
    ),
    'user_agent', left(p ->> 'user_agent', 400),
    'language', left(p ->> 'language', 35),
    'timezone', left(p ->> 'timezone', 64),
    'screen', left(p ->> 'screen', 20),
    'seconds_to_send', case when (p ->> 'seconds_to_send') ~ '^[0-9]{1,6}$' then (p ->> 'seconds_to_send')::int end
  )) else '{}'::jsonb end
$$;

-- True when the token belongs to a signed-in browser; also marks it used.
create function private.website_session_ok(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  update private.website_lead_sessions
     set last_seen_at = now()
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and expires_at > now();
  return found;
end;
$$;

-- True when this IP address has guessed wrong 8 times in 15 minutes.
create function private.website_locked_out(p_ip_hash text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 8
  from private.website_lead_sign_ins
  where ip_hash = p_ip_hash and not succeeded and at > now() - interval '15 minutes'
$$;

-- The contact form ------------------------------------------------------------

-- Saves one request from the contact form. Returns {ok, id} or
-- {ok: false, error, field?}. Sending the same client_id again returns
-- the saved request instead of a copy.
create function public.submit_website_lead(p_lead jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_name text := private.website_trim(p_lead ->> 'name');
  v_restaurant text := private.website_trim(p_lead ->> 'restaurant');
  v_email text := private.website_trim(p_lead ->> 'email');
  v_phone text := nullif(private.website_trim(p_lead ->> 'phone'), '');
  v_location text := private.website_trim(p_lead ->> 'location');
  v_pos text := private.website_trim(p_lead ->> 'pos');
  v_need text := private.website_trim(p_lead ->> 'need');
  v_contact text := coalesce(nullif(private.website_trim(p_lead ->> 'contact_preference'), ''), 'Email me');
  v_ip text;
  v_id uuid;
begin
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'form');
  end if;

  -- People never see the "website" box; only bots fill it in.
  if coalesce(p_lead ->> 'website', '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if coalesce(p_lead ->> 'client_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'client_id');
  end if;
  v_client_id := (p_lead ->> 'client_id')::uuid;

  -- Already saved: a retry after a lost reply, or a second click.
  select id into v_id from private.website_leads where client_id = v_client_id;
  if found then
    return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
  end if;

  if char_length(v_name) not between 1 and 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'name');
  end if;
  if char_length(v_restaurant) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'restaurant');
  end if;
  if char_length(v_email) not between 3 and 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'email');
  end if;
  if v_phone is not null and (
       char_length(v_phone) > 40
       or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 20) then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'phone');
  end if;
  if char_length(v_location) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'location');
  end if;
  if v_pos not in ('Toast', 'Square', 'SpotOn', 'Clover', 'Other / not sure') then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'pos');
  end if;
  if char_length(v_need) not between 1 and 4000 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'need');
  end if;
  if v_contact not in ('Email me', 'Call me', 'Either is fine') then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'contact_preference');
  end if;

  -- At most 5 requests an hour from one connection, and 300 an hour in all.
  v_ip := private.website_ip_hash();
  if (select count(*) from private.website_leads
       where ip_hash = v_ip and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if (select count(*) from private.website_leads
       where created_at > now() - interval '1 hour') >= 300 then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;

  insert into private.website_leads
    (client_id, name, restaurant, email, phone, location, pos, need, contact_preference, source, ip_hash)
  values
    (v_client_id, v_name, v_restaurant, v_email, v_phone, v_location, v_pos, v_need, v_contact,
     private.website_clean_source(p_lead -> 'source'), v_ip)
  on conflict (client_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from private.website_leads where client_id = v_client_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- The Leads page ------------------------------------------------------------

-- Trades the passcode for a 30-day session token. Returns {ok, token,
-- expires_at} or {ok: false, error: wrong_passcode | locked | not_set_up}.
create function public.leads_sign_in(p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := private.website_ip_hash();
  v_hash text;
  v_token text;
  v_expires timestamptz := now() + interval '30 days';
begin
  if private.website_locked_out(v_ip) then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;

  select passcode_hash into v_hash from private.website_lead_settings where id;
  if v_hash is null then
    return jsonb_build_object('ok', false, 'error', 'not_set_up');
  end if;

  if p_passcode is null or char_length(p_passcode) > 200
     or extensions.crypt(p_passcode, v_hash) <> v_hash then
    insert into private.website_lead_sign_ins (ip_hash, succeeded) values (v_ip, false);
    return jsonb_build_object('ok', false, 'error', 'wrong_passcode');
  end if;

  delete from private.website_lead_sign_ins where at < now() - interval '1 day';
  delete from private.website_lead_sessions where expires_at < now();
  insert into private.website_lead_sign_ins (ip_hash, succeeded) values (v_ip, true);

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.website_lead_sessions (token_hash, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires);

  return jsonb_build_object('ok', true, 'token', v_token, 'expires_at', v_expires);
end;
$$;

create function public.leads_sign_out(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.website_lead_sessions
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end;
$$;

-- Every request, newest first.
create function public.leads_list(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.website_session_ok(p_token) then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;
  return jsonb_build_object(
    'ok', true,
    'now', now(),
    'leads', coalesce((
      select jsonb_agg(to_jsonb(l) - 'ip_hash' - 'client_id' order by l.created_at desc)
      from (select * from private.website_leads order by created_at desc limit 5000) l
    ), '[]'::jsonb)
  );
end;
$$;

-- Changes a request's status and/or notes (null leaves a value as it is).
create function public.leads_update(p_token text, p_id uuid, p_status text default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.website_leads;
begin
  if not private.website_session_ok(p_token) then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;
  if p_status is not null
     and p_status not in ('new', 'contacted', 'booked', 'trial', 'customer', 'not_a_fit', 'spam') then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'status');
  end if;
  if p_notes is not null and char_length(p_notes) > 8000 then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'notes');
  end if;

  update private.website_leads
     set status = coalesce(p_status, status),
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where id = p_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'lead', to_jsonb(v_row) - 'ip_hash' - 'client_id');
end;
$$;

-- Needs the current passcode. Signs every other browser out.
create function public.leads_change_passcode(p_token text, p_current text, p_new text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := private.website_ip_hash();
  v_hash text;
begin
  if not private.website_session_ok(p_token) then
    return jsonb_build_object('ok', false, 'error', 'signed_out');
  end if;
  if private.website_locked_out(v_ip) then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;

  select passcode_hash into v_hash from private.website_lead_settings where id;
  if p_current is null or char_length(p_current) > 200
     or extensions.crypt(p_current, v_hash) <> v_hash then
    insert into private.website_lead_sign_ins (ip_hash, succeeded) values (v_ip, false);
    return jsonb_build_object('ok', false, 'error', 'wrong_passcode');
  end if;
  if p_new is null or char_length(p_new) not between 10 and 200 then
    return jsonb_build_object('ok', false, 'error', 'too_short');
  end if;

  update private.website_lead_settings
     set passcode_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)),
         updated_at = now()
   where id;
  delete from private.website_lead_sessions
   where token_hash <> encode(extensions.digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end;
$$;

-- A tiny query that a scheduled job runs a few times a day, so the
-- free plan never pauses the project for being idle.
create function public.leads_keepalive()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'at', now())
  from private.website_lead_settings
  where id
$$;

-- Who may call what ------------------------------------------------------------

revoke all on function
  private.website_trim(text),
  private.website_ip_hash(),
  private.website_clean_source(jsonb),
  private.website_session_ok(text),
  private.website_locked_out(text)
from public, anon, authenticated;

revoke all on function
  public.submit_website_lead(jsonb),
  public.leads_sign_in(text),
  public.leads_sign_out(text),
  public.leads_list(text),
  public.leads_update(text, uuid, text, text),
  public.leads_change_passcode(text, text, text),
  public.leads_keepalive()
from public, anon, authenticated;

grant execute on function
  public.submit_website_lead(jsonb),
  public.leads_sign_in(text),
  public.leads_sign_out(text),
  public.leads_list(text),
  public.leads_update(text, uuid, text, text),
  public.leads_change_passcode(text, text, text),
  public.leads_keepalive()
to anon, authenticated;

notify pgrst, 'reload schema';
