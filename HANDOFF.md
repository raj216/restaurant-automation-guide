# CoHost AI website: handoff for a new chat

Paste this into the new chat, or tell it to read `HANDOFF.md` on branch
`claude/fervent-goldberg-1p85m5`.

## Who and what

- **Owner:** Raj (non-technical). Explain things simply.
- **Product:** CoHost AI (the company, CoHost AI, Inc.), powered by **Brio**,
  an AI phone agent for independent restaurants, starting in NYC. Brio answers
  calls, takes to-go orders and sends summaries to a manager dashboard and by
  SMS.
- **Offer:** a free 14-day pilot, with no contracts and no setup fees.

## Links

| What | Link |
|---|---|
| GitHub repo | https://github.com/raj216/restaurant-automation-guide |
| Pull request (draft, all work so far) | https://github.com/raj216/restaurant-automation-guide/pull/3 |
| Working branch | `claude/fervent-goldberg-1p85m5` |
| Preview site (latest version of the branch) | https://claude-fervent-goldberg-1p85m5-cohostai.joinexhiby.workers.dev |
| Live site (after "publish it") | https://cohostai.joinexhiby.workers.dev |
| Leads page | `/admin` on either site (passcode known to the owner; never commit it) |
| Cloudflare Worker | `cohostai`, account joinexhiby. Its check on the PR is "Workers Builds: cohostai" |
| Supabase project | `wikfhxcayrauimictlmk` (https://wikfhxcayrauimictlmk.supabase.co) |
| Retell agent for website calls | https://dashboard.retellai.com/org_3OgZsmP6yNEjyrn3/agents/agent_1868ad004e9872f920bdb76ead |
| Session this came from | https://claude.ai/code/session_0123uAebCAJs8W9sZ1afm6t6 |

## Rules the owner set (keep following them)

- **Nothing goes live until Raj says "publish it".** Then mark PR #3 ready and
  merge it.
- Push only to `claude/fervent-goldberg-1p85m5`. The PR stays a draft until then.
- Use the website copy word for word from Raj's Gemini draft (in
  `client/src/site/content.ts`).
- The Kadmivo name is removed everywhere; don't bring it back. Don't use Manus.
- Never commit `.project-config.json` (Manus secrets; the repo is public) or
  the Leads passcode.
- Never disable TLS verification.
- Don't put model names in commits or PRs.

## Tech

- **Stack:** Vite 7, React 19, TypeScript, Tailwind v4, framer-motion,
  three.js and wouter. The package manager is pnpm 10.4.1, on Node 22.
- **Commands:**
  - `pnpm check` (types)
  - `pnpm build`
  - `pnpm test:functions` (13 tests for the edge functions)
- **Code:**
  - Site copy: `client/src/site/content.ts`
  - Styles: `client/src/site/site.css` and `client/src/index.css` (tokens)
- **Hosting:** Cloudflare Workers Builds. Every push builds a preview.
- **Database and server:** Supabase, changed through the Supabase MCP tools.
  - The edge functions sign in as the "agent" account, never with service_role.
  - Supabase secrets: `RETELL_API_KEY`, `AGENT_EMAIL`, `AGENT_PASSWORD`,
    `PUBLIC_API_KEY` and `TEST_RESTAURANT_ID`.
- **Sandbox limits:** Claude's sandbox can't reach `*.workers.dev`,
  `supabase.co` or `api.retellai.com`, so it tests with stand-ins
  (Playwright on Chromium).

## What's built (all on PR #3)

1. **Home page:** the CoHost AI design in a dark theme with Brio's colour
   spectrum.
   - A hero with Brio on a 3D iPhone.
   - A live dashboard demo, "How it works", the POS roadmap, an FAQ and the
     pilot form.
   - Tuned for phones and speed: the page downloads 252 KB.
2. **Pilot sign-ups:** they're saved in Supabase and shown on the **Leads
   page** (`/admin`, behind a passcode), with Call and Text buttons and a CSV
   download.
3. **Talk to Brio button (new, working):**
   - **On the page:**
     - A spectrum orb button sits in the corner.
     - Once a week per visitor, a "Brio is calling" pop-up appears, with
       Answer and Not now.
     - A call window has the orb, a timer, Mute and End Call. After the call,
       it shows "Start 14-Day Pilot".
   - **How the call works:** the browser uses Retell's web SDK 3.x, which only
     downloads when the call window opens. The Supabase function
     `brio-web-call` starts each call with Retell's v3 API, so the key stays on
     the server.
   - **Spending caps:**
     - 3 calls an hour and 6 a day per visitor.
     - 30 calls a day across the whole site.
     - Each call lasts at most 5 minutes and ends after 30 seconds of silence.
     - The caps live in migration `web_calls` (`claim_web_call`).
   - **The agent:** "Brio – Website" (`agent_1868ad004e9872f920bdb76ead`, set as
     `WEB_AGENT_ID`). It's a Conversation Flow agent with the voice Cimo.
   - **Its flow** has five steps: Welcome, Questions about CoHost AI, To-go
     order demo (Norma Trattoria), Start the pilot, and Goodbye. The flow was
     built through Retell's API and published.
   - **Changing what Brio says:** edit the agent in Retell, then press
     **Publish**.
   - **More detail:** `supabase/functions/brio-web-call/SETUP.md` (includes the
     prompt).
   - **The one-time setup link has been switched off.**
   - Raj tested a real call on the preview, and it works.
   - Website calls stay out of the restaurants' inbox (`retell-events` skips
     them).
4. **Brio's phone ordering system** (existing, built before this work):
   - The Supabase function `retell` handles the ordering tools.
   - The tables are `restaurants`, `restaurant_members`, `menu_items`,
     `orders` and `order_events`.
   - The database now holds **6 restaurants**: Demo Coffee House, Nittis
     Italian Restaurant & Bar, Mama Mia 44SW, Yummy Cheese Pasta, Norma
     Gastronomia Siciliana and Bocca di Bacco. They were added outside this
     chat.
5. **Live Inbox (half done, paused by Raj):** a staff page at `/inbox` showing
   real Brio orders and calls in the dashboard's ticket design.
   - Done:
     - the `calls` table;
     - the `retell-events` webhook function (saves call summaries);
     - the `call-details` function (recordings and transcripts);
     - `client/src/lib/inbox.ts`, `client/src/pages/InboxTicket.tsx` and
       `inboxDemo.ts`.
   - Not done:
     - `Inbox.tsx` with sign-in, list, filters and refresh;
     - `inbox.css`;
     - the `/inbox` route;
     - tests.

## Still to do / waiting on Raj

- [ ] Finish the Live Inbox page. Then:
  - create an owner login (in Supabase Auth, add a user, then a
    `restaurant_members` row with role owner);
  - set Retell's webhook URL to
    `https://wikfhxcayrauimictlmk.supabase.co/functions/v1/retell-events`.
- [ ] Add restaurant switching to the inbox, and save any more restaurant data
  Raj sends (restaurants plus menu_items).
- [ ] Decide whether the hidden "Dial Live Demo" button at the top of the page
  should open the Talk to Brio call. It's hidden because there's no real demo
  phone number.
- [ ] Brio's real demo phone number, if any (`DEMO_LINE` in `content.ts`).
- [ ] Buy a domain. When there is one, add it to the `WEB_CALL_ORIGINS`
  Supabase secret so the call button works there.
- [ ] Optional: let Brio save website callers as leads during the call.
- [ ] Optional: turn on leaked-password protection in Supabase Auth.
- [ ] When Raj says **"publish it"**: mark PR #3 ready and merge it.

## Automatic check-ins

A routine, "Re-check CoHost AI PR #3" (`trig_017r1xFeweGoFJfoMaQ8rp1J`),
re-checks the PR every few hours in the old chat. It stops by itself after 3
quiet checks. A new chat can ignore it or delete it.
