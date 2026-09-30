-- CoHost AI's 14-day pilot sign-up asks for just the restaurant and a cell
-- phone number, so the contact form's other answers become optional, and
-- each sign-up records which form sent it.

alter table private.website_leads
  alter column name drop not null,
  alter column email drop not null,
  alter column location drop not null,
  alter column pos drop not null,
  alter column need drop not null,
  alter column contact_preference drop not null,
  add column form text not null default 'review' check (form in ('review', 'pilot'));

comment on table private.website_leads is
  'Sign-ups sent from the forms on the CoHost AI website. Read them on the website at /admin.';
comment on column private.website_leads.form is
  'Which form sent it: pilot (the 14-day pilot sign-up) or review (the earlier contact form).';

-- Saves one sign-up. Returns {ok, id} or {ok: false, error, field?}.
-- Sending the same client_id again returns the saved sign-up instead of a
-- copy. form "pilot" needs the restaurant and a phone number; "review" (the
-- default, for the earlier contact form) needs its full set of answers.
create or replace function public.submit_website_lead(p_lead jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form text := coalesce(nullif(private.website_trim(p_lead ->> 'form'), ''), 'review');
  v_client_id uuid;
  v_name text := nullif(private.website_trim(p_lead ->> 'name'), '');
  v_restaurant text := private.website_trim(p_lead ->> 'restaurant');
  v_email text := nullif(private.website_trim(p_lead ->> 'email'), '');
  v_phone text := nullif(private.website_trim(p_lead ->> 'phone'), '');
  v_location text := nullif(private.website_trim(p_lead ->> 'location'), '');
  v_pos text := nullif(private.website_trim(p_lead ->> 'pos'), '');
  v_need text := nullif(private.website_trim(p_lead ->> 'need'), '');
  v_contact text := nullif(private.website_trim(p_lead ->> 'contact_preference'), '');
  v_trapped boolean;
  v_problem text;
  v_ip text;
  v_id uuid;
begin
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'form');
  end if;

  -- People never see the "website" box; bots fill it in. So do a few
  -- password managers, so a trapped sign-up is kept under Spam rather
  -- than dropped. Bots get a plain "ok" either way.
  v_trapped := coalesce(p_lead ->> 'website', '') <> '';

  if coalesce(p_lead ->> 'client_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    if v_trapped then return jsonb_build_object('ok', true); end if;
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', 'client_id');
  end if;
  v_client_id := (p_lead ->> 'client_id')::uuid;

  -- Already saved: a retry after a lost reply, or a second click.
  select id into v_id from private.website_leads where client_id = v_client_id;
  if found then
    if v_trapped then return jsonb_build_object('ok', true); end if;
    return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
  end if;

  if v_form = 'pilot' then
    -- The pilot form asks for nothing else.
    v_name := null;
    v_email := null;
    v_location := null;
    v_pos := null;
    v_need := null;
    v_contact := null;
    v_problem := case
      when char_length(v_restaurant) not between 1 and 160 then 'restaurant'
      when v_phone is null
        or char_length(v_phone) > 40
        or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 20 then 'phone'
    end;
  elsif v_form = 'review' then
    v_contact := coalesce(v_contact, 'Email me');
    v_problem := case
      when char_length(coalesce(v_name, '')) not between 1 and 120 then 'name'
      when char_length(v_restaurant) not between 1 and 160 then 'restaurant'
      when char_length(coalesce(v_email, '')) not between 3 and 254
        or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then 'email'
      when v_phone is not null and (
        char_length(v_phone) > 40
        or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 20) then 'phone'
      when char_length(coalesce(v_location, '')) not between 1 and 160 then 'location'
      when coalesce(v_pos, '') not in ('Toast', 'Square', 'SpotOn', 'Clover', 'Other / not sure') then 'pos'
      when char_length(coalesce(v_need, '')) not between 1 and 4000 then 'need'
      when v_contact not in ('Email me', 'Call me', 'Either is fine') then 'contact_preference'
    end;
  else
    v_problem := 'form';
  end if;

  if v_problem is not null then
    if v_trapped then return jsonb_build_object('ok', true); end if;
    return jsonb_build_object('ok', false, 'error', 'invalid', 'field', v_problem);
  end if;

  -- At most 5 sign-ups an hour from one connection, and 300 an hour in all.
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
    (client_id, form, name, restaurant, email, phone, location, pos, need, contact_preference, status, source, ip_hash)
  values
    (v_client_id, v_form, v_name, v_restaurant, v_email, v_phone, v_location, v_pos, v_need, v_contact,
     case when v_trapped then 'spam' else 'new' end,
     private.website_clean_source(p_lead -> 'source'), v_ip)
  on conflict (client_id) do nothing
  returning id into v_id;

  if v_trapped then
    return jsonb_build_object('ok', true);
  end if;
  if v_id is null then
    select id into v_id from private.website_leads where client_id = v_client_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

comment on function public.submit_website_lead(jsonb) is
  'Public by design: saves one sign-up from the website (the 14-day pilot form, or the earlier contact form).';

notify pgrst, 'reload schema';
