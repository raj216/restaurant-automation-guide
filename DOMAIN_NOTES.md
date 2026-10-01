# cohost.site: where we stopped

## Status (2026-09-30)
- Domain wanted: cohost.site (GoDaddy). NOT confirmed as owned: the email signup
  screen said "cohost.site is for sale" ($0.99 first year, then $54.99/yr).
- Cloudflare: cohost.site added, DNS shows 0 records. Nameservers NOT changed yet.
- Email: chose Microsoft 365 Email Essentials ($1.99/mo first year, renews
  ~$107.88/yr). Wanted address: contact@cohost.site. Not bought yet.
- Site is still old Kadmivo on main; new site only on PR #3 until "publish it".

## Next steps
1. GoDaddy > My Products > Domains: is cohost.site in the list?
   - Yes: own it. Find a way for the email signup to see it.
   - No: buy it (skip extras, watch the $54.99 renewal).
2. Buy the email, create contact@cohost.site, send a test.
3. Cloudflare: Import DNS Records; confirm the MX lines (email) appear.
4. GoDaddy: change nameservers to Cloudflare's two.
5. Cloudflare Worker `cohostai` > Domains & Routes > Custom Domain:
   cohost.site and www.cohost.site.
6. Supabase secret WEB_CALL_ORIGINS = https://cohost.site,https://www.cohost.site
7. Test site, /admin, Talk to Brio. Publish only when Raj says "publish it".
