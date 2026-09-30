-- The keep-alive ping needs no table access, so it runs as the caller.
create or replace function public.leads_keepalive()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'at', now())
$$;

-- The other website functions are SECURITY DEFINER and callable without a
-- Supabase login on purpose: the contact form is public, and the Leads
-- page checks its own passcode session. Each one validates its input.
comment on function public.submit_website_lead(jsonb) is
  'Public by design: saves one request from the website contact form.';
comment on function public.leads_sign_in(text) is
  'Public by design: trades the Leads page passcode for a session token (8 wrong tries per 15 minutes per address).';
comment on function public.leads_sign_out(text) is 'Ends a Leads page session.';
comment on function public.leads_list(text) is 'Leads page: every request, newest first. Needs a session token.';
comment on function public.leads_update(text, uuid, text, text) is 'Leads page: sets status and/or notes. Needs a session token.';
comment on function public.leads_change_passcode(text, text, text) is 'Leads page: changes the passcode. Needs a session token and the current passcode.';
comment on function public.leads_keepalive() is 'Pinged a few times a day so the free plan does not pause the project.';

notify pgrst, 'reload schema';
