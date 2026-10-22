-- The pilot form's "What should Brio take off your plate?" gains "Other",
-- with a short note in their own words, kept in need (up to 500 characters).

alter table private.website_leads
  drop constraint website_leads_wants_check,
  add constraint website_leads_wants_check check (
    wants <@ array['every_call', 'rush', 'after_hours', 'to_go', 'reservations', 'questions', 'spam', 'other']
  );

comment on column private.website_leads.wants is
  'Pilot sign-ups: what Brio should take off their plate. every_call (every call, all day), rush (calls during the rush), after_hours (late nights & holidays), to_go (to-go orders), reservations, questions (menu, hours & allergy questions), spam (scam & robocalls), other (their note is in need).';

-- Saves one sign-up. Returns {ok, id} or {ok: false, error, field?}.
-- Sending the same client_id again returns the saved sign-up instead of a
-- copy. form "pilot" needs the restaurant and a phone number (an email,
-- wants and, with "other", a note are checked when given); "custom" also
-- needs an email, the locations and the minutes; "review" (the default, for
-- the earlier contact form) needs its full set of answers.
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
  v_locations integer;
  v_minutes text := nullif(private.website_trim(p_lead ->> 'minutes'), '');
  v_wants text[];
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

  if v_form <> 'custom' then
    v_minutes := null;
  end if;

  if v_form = 'pilot' then
    -- The pilot form: the restaurant and a phone number, then an email and
    -- what Brio should take off their plate. The email is optional here so
    -- the form from before it was added keeps working; the website asks for it.
    -- With "other" picked, their own words go in need.
    v_name := null;
    v_location := null;
    v_pos := null;
    v_contact := null;
    if jsonb_typeof(p_lead -> 'wants') = 'array' then
      select array_agg(distinct w order by w) into v_wants
        from jsonb_array_elements_text(p_lead -> 'wants') w;
    end if;
    if not coalesce('other' = any(v_wants), false) then
      v_need := null;
    end if;
    v_problem := case
      when char_length(v_restaurant) not between 1 and 160 then 'restaurant'
      when v_phone is null
        or char_length(v_phone) > 40
        or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 20 then 'phone'
      when v_email is not null and (
        char_length(v_email) not between 3 and 254
        or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$') then 'email'
      when jsonb_typeof(p_lead -> 'wants') not in ('array', 'null') then 'wants'
      when v_wants is not null and not (v_wants <@ array[
        'every_call', 'rush', 'after_hours', 'to_go', 'reservations', 'questions', 'spam', 'other']) then 'wants'
      when char_length(coalesce(v_need, '')) > 500 then 'need'
    end;
  elsif v_form = 'custom' then
    -- The pricing section's "Build My Plan" box: the restaurant, a phone
    -- number, an email, how many locations, the minutes a month, and
    -- (optionally) what else Brio should handle, kept in need.
    v_name := null;
    v_location := null;
    v_pos := null;
    v_contact := null;
    if coalesce(p_lead ->> 'locations', '') ~ '^[0-9]{1,3}$' then
      v_locations := (p_lead ->> 'locations')::integer;
    end if;
    v_problem := case
      when char_length(v_restaurant) not between 1 and 160 then 'restaurant'
      when v_phone is null
        or char_length(v_phone) > 40
        or char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 20 then 'phone'
      when char_length(coalesce(v_email, '')) not between 3 and 254
        or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then 'email'
      when v_locations is null or v_locations not between 1 and 999 then 'locations'
      when coalesce(v_minutes, '') not in
        ('Up to 1,500', '1,500 to 3,000', '3,000 to 5,000', 'More than 5,000', 'Not sure yet') then 'minutes'
      when char_length(coalesce(v_need, '')) > 4000 then 'need'
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
    (client_id, form, name, restaurant, email, phone, location, pos, need, contact_preference,
     locations, minutes, wants, status, source, ip_hash)
  values
    (v_client_id, v_form, v_name, v_restaurant, v_email, v_phone, v_location, v_pos, v_need, v_contact,
     v_locations, v_minutes, v_wants,
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
  'Public by design: saves one sign-up from the website (the 7-day pilot form, the Build My Plan box, or the earlier contact form).';

notify pgrst, 'reload schema';
