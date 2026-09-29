import {
  LEAD_STATUSES,
  clearSession,
  formLabel,
  leadsApi,
  leadsCsv,
  loadSession,
  saveSession,
  statusLabel,
  whenLong,
  whenShort,
  type Lead,
  type LeadStatus,
  type LeadsError,
} from "@/lib/leadsAdmin";
import { RpcError } from "@/lib/supabase";
import { LogoMark } from "@/site/Logo";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  LogOut,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import "@/site/site.css";
import "./admin.css";

// The Leads page, at /admin: every sign-up sent from the website's forms,
// behind a passcode. Not linked from the site and hidden from search engines.

const SIGNED_OUT = "Your session ended. Enter your passcode again.";

const ERRORS: Partial<Record<LeadsError, string>> = {
  wrong_passcode: "That passcode didn't match. Check it and try again.",
  locked: "Too many wrong tries. Wait 15 minutes, then try again.",
  not_set_up: "The Leads page has no passcode yet.",
  too_short: "Use at least 10 characters for the new passcode.",
};

function problemText(error: unknown) {
  if (error instanceof RpcError && error.kind === "server") {
    return "The database had a problem. Try again in a minute.";
  }
  return "Can't reach the database. Check your internet connection and try again.";
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => loadSession());
  const [notice, setNotice] = useState<string | null>(null);

  // Keep this page out of search results, and name the tab.
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    const title = document.title;
    return () => {
      robots.remove();
      document.title = title;
    };
  }, []);

  const signedOut = useCallback((message: string | null) => {
    clearSession();
    setToken(null);
    setNotice(message);
  }, []);

  return (
    <div className="admin">
      {token ? (
        <LeadsBoard token={token} onSignedOut={signedOut} />
      ) : (
        <SignIn
          notice={notice}
          onSignedIn={(next, expiresAt) => {
            saveSession(next, expiresAt);
            setNotice(null);
            setToken(next);
          }}
        />
      )}
    </div>
  );
}

// Sign in --------------------------------------------------------------------

function SignIn({
  notice,
  onSignedIn,
}: {
  notice: string | null;
  onSignedIn: (token: string, expiresAt: string) => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice);

  useEffect(() => {
    document.title = "Sign in · CoHost AI Leads";
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const code = passcode.trim();
    if (!code) {
      setError("Enter your passcode.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reply = await leadsApi.signIn(code);
      if (reply.ok) {
        onSignedIn(reply.token, reply.expires_at);
        return;
      }
      setError(ERRORS[reply.error] ?? "That didn't work. Try again.");
    } catch (failure) {
      setError(problemText(failure));
    }
    setBusy(false);
  }

  return (
    <main className="admin-signin">
      <form className="admin-signin-card" onSubmit={submit}>
        <LogoMark className="admin-logo" />
        <h1>Leads</h1>
        <p>
          Pilot sign-ups from your website. Enter your passcode to see them.
        </p>
        {/* Lets password managers save the passcode under a clear name. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value="CoHost AI Leads"
          readOnly
          hidden
        />
        <label className="admin-field">
          <span>Passcode</span>
          <span className="admin-input-wrap">
            <input
              type={show ? "text" : "password"}
              name="passcode"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={passcode}
              onChange={event => setPasscode(event.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="admin-icon-button admin-reveal"
              onClick={() => setShow(value => !value)}
              aria-label={show ? "Hide passcode" : "Show passcode"}
              aria-pressed={show}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn btn-primary admin-wide"
          type="submit"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
        <p className="admin-fineprint">
          You'll stay signed in on this device for 30 days.
        </p>
      </form>
    </main>
  );
}

// The board ------------------------------------------------------------------

type Filter = LeadStatus | "all";

const WIDE = "(min-width: 900px)";

function LeadsBoard({
  token,
  onSignedOut,
}: {
  token: string;
  onSignedOut: (message: string | null) => void;
}) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loadProblem, setLoadProblem] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPasscode, setChangingPasscode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const known = useRef<Set<string> | null>(null);

  const say = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setRefreshing(true);
      try {
        const reply = await leadsApi.list(token);
        if (!reply.ok) {
          if (reply.error === "signed_out") onSignedOut(SIGNED_OUT);
          else
            setLoadProblem(
              "The database had a problem. Try again in a minute."
            );
          return;
        }
        const arrived = known.current
          ? reply.leads.filter(lead => !known.current!.has(lead.id))
          : [];
        known.current = new Set(reply.leads.map(lead => lead.id));
        setLeads(reply.leads);
        setLoadProblem(null);
        setCheckedAt(Date.now());
        if (arrived.length === 1)
          say(`New sign-up from ${arrived[0].restaurant}`);
        else if (arrived.length > 1) say(`${arrived.length} new sign-ups`);
      } catch (failure) {
        setLoadProblem(problemText(failure));
      } finally {
        setRefreshing(false);
      }
    },
    [token, onSignedOut, say]
  );

  // Load now, then check for new requests every minute while the page is open.
  useEffect(() => {
    void load();
    const tick = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void load(true);
    }, 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(
      LEAD_STATUSES.map(s => [s.id, 0])
    ) as Record<LeadStatus, number>;
    for (const lead of leads ?? []) byStatus[lead.status] += 1;
    return { ...byStatus, all: (leads?.length ?? 0) - byStatus.spam };
  }, [leads]);

  useEffect(() => {
    document.title = counts.new
      ? `(${counts.new} new) Leads · CoHost AI`
      : "Leads · CoHost AI";
  }, [counts.new]);

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (leads ?? []).filter(lead => {
      if (filter === "all" ? lead.status === "spam" : lead.status !== filter)
        return false;
      if (!words.length) return true;
      const text = [
        lead.restaurant,
        lead.phone,
        lead.name,
        lead.email,
        lead.location,
        lead.pos,
        lead.need,
        lead.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return words.every(word => text.includes(word));
    });
  }, [leads, filter, query]);

  // On a wide screen the first request opens beside the list.
  useEffect(() => {
    if (!window.matchMedia(WIDE).matches) return;
    if (!visible.some(lead => lead.id === selectedId))
      setSelectedId(visible[0]?.id ?? null);
  }, [visible, selectedId]);

  const selected = leads?.find(lead => lead.id === selectedId) ?? null;

  const latest = useRef(leads);
  latest.current = leads;

  // Shows a change at once, saves it, and puts a status back if saving fails.
  const change = useCallback(
    async (
      id: string,
      update: { status?: LeadStatus; notes?: string }
    ): Promise<boolean> => {
      const previousStatus = latest.current?.find(
        lead => lead.id === id
      )?.status;
      setLeads(
        list =>
          list?.map(lead => (lead.id === id ? { ...lead, ...update } : lead)) ??
          list
      );
      try {
        const reply = await leadsApi.update(token, id, update);
        if (reply.ok) {
          setLeads(
            list =>
              list?.map(lead => (lead.id === id ? reply.lead : lead)) ?? list
          );
          return true;
        }
        if (reply.error === "signed_out") {
          onSignedOut(SIGNED_OUT);
          return false;
        }
        say(
          reply.error === "not_found"
            ? "That sign-up no longer exists."
            : "Couldn't save that change."
        );
      } catch (failure) {
        say(problemText(failure));
      }
      if (update.status && previousStatus) {
        setLeads(
          list =>
            list?.map(lead =>
              lead.id === id ? { ...lead, status: previousStatus } : lead
            ) ?? list
        );
      }
      return false;
    },
    [token, onSignedOut, say]
  );

  function download() {
    const blob = new Blob([leadsCsv(visible)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date();
    link.href = url;
    link.download = `cohost-leads-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function signOut() {
    setMenuOpen(false);
    try {
      await leadsApi.signOut(token);
    } catch {
      // Signed out on this device either way.
    }
    onSignedOut(null);
  }

  const newest = leads?.[0];

  return (
    <div className={selected ? "admin-board has-selection" : "admin-board"}>
      <header className="admin-bar">
        <div className="admin-bar-inner">
          <a className="admin-home" href="/" aria-label="CoHost AI website">
            <LogoMark className="admin-logo" />
            <span>CoHost AI</span>
          </a>
          <span className="admin-bar-title">Leads</span>
          <div className="admin-bar-actions">
            <button
              type="button"
              className="admin-icon-button"
              onClick={() => void load()}
              disabled={refreshing}
              aria-label="Check for new sign-ups"
              title="Check for new sign-ups"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "is-spinning" : undefined}
              />
            </button>
            <button
              type="button"
              className="admin-icon-button"
              onClick={download}
              disabled={!visible.length}
              aria-label="Download these sign-ups as a spreadsheet (CSV)"
              title="Download these sign-ups as a spreadsheet (CSV)"
            >
              <Download size={18} />
            </button>
            <Menu open={menuOpen} onOpenChange={setMenuOpen}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setChangingPasscode(true);
                }}
              >
                <KeyRound size={17} /> Change passcode
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void signOut()}
              >
                <LogOut size={17} /> Sign out
              </button>
            </Menu>
          </div>
        </div>
      </header>

      <div className="admin-body">
        <section className="admin-list-pane" aria-labelledby="admin-heading">
          <div className="admin-intro">
            <h1 id="admin-heading">Sign-ups from your website</h1>
            <p>
              {leads === null
                ? "Loading…"
                : leads.length === 0
                  ? "Nothing yet."
                  : `${counts.all} ${counts.all === 1 ? "sign-up" : "sign-ups"} · ${counts.new} new${newest ? ` · last one ${whenShort(newest.created_at, now)}` : ""}`}
              {checkedAt && (
                <span className="admin-checked">
                  {" "}
                  · checked {whenShort(new Date(checkedAt).toISOString(), now)}
                </span>
              )}
            </p>
          </div>

          <div
            className="admin-filters"
            role="toolbar"
            aria-label="Show sign-ups by status"
          >
            {(["all", ...LEAD_STATUSES.map(s => s.id)] as Filter[]).map(id => (
              <button
                key={id}
                type="button"
                className={filter === id ? "admin-chip is-on" : "admin-chip"}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {id !== "all" && (
                  <span
                    className={`admin-dot status-${id}`}
                    aria-hidden="true"
                  />
                )}
                {id === "all" ? "All" : statusLabel(id)}
                <span className="admin-chip-count">{counts[id]}</span>
              </button>
            ))}
          </div>

          <label className="admin-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search sign-ups</span>
            <input
              type="search"
              placeholder="Search sign-ups…"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>

          {loadProblem && (
            <div className="admin-banner" role="alert">
              <span>{loadProblem}</span>
              <button
                type="button"
                className="admin-text-button"
                onClick={() => void load()}
              >
                Try again
              </button>
            </div>
          )}

          {leads === null ? (
            !loadProblem && <ListSkeleton />
          ) : visible.length ? (
            <ul className="admin-list">
              {visible.map(lead => (
                <li key={lead.id}>
                  <button
                    type="button"
                    className={
                      lead.id === selectedId
                        ? "admin-row is-selected"
                        : "admin-row"
                    }
                    aria-current={lead.id === selectedId ? "true" : undefined}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <span className="admin-row-top">
                      <span className="admin-row-title">{lead.restaurant}</span>
                      <time
                        dateTime={lead.created_at}
                        title={whenLong(lead.created_at)}
                      >
                        {whenShort(lead.created_at, now)}
                      </time>
                    </span>
                    <span className="admin-row-meta">
                      {[lead.phone, lead.name, lead.location]
                        .filter(Boolean)
                        .join(" · ") || "No phone number"}
                    </span>
                    <span className="admin-row-tags">
                      <StatusTag status={lead.status} />
                      <span className={`admin-tag form-${lead.form}`}>
                        {formLabel(lead.form)}
                      </span>
                      {lead.pos && (
                        <span className="admin-tag">{lead.pos}</span>
                      )}
                      {lead.contact_preference && (
                        <span className="admin-tag">
                          {lead.contact_preference}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState filtered={Boolean(leads.length)} query={query.trim()} />
          )}
        </section>

        <section className="admin-detail-pane" aria-label="Sign-up details">
          {selected ? (
            <LeadDetail
              key={selected.id}
              lead={selected}
              onBack={() => setSelectedId(null)}
              onChange={change}
              say={say}
            />
          ) : (
            leads !== null &&
            leads.length > 0 && (
              <div className="admin-detail-empty">
                <Inbox size={28} aria-hidden="true" />
                <p>Choose a sign-up to see everything they sent.</p>
              </div>
            )
          )}
        </section>
      </div>

      {changingPasscode && (
        <ChangePasscode
          token={token}
          onClose={() => setChangingPasscode(false)}
          onSignedOut={() => onSignedOut(SIGNED_OUT)}
          onChanged={() => {
            setChangingPasscode(false);
            say("Passcode changed. Other devices were signed out.");
          }}
        />
      )}

      <div
        className={toast ? "admin-toast is-on" : "admin-toast"}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: LeadStatus }) {
  return (
    <span className={`admin-tag admin-status status-${status}`}>
      <span className={`admin-dot status-${status}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

function ListSkeleton() {
  return (
    <ul className="admin-list" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <li key={i}>
          <span className="admin-row admin-skeleton" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filtered, query }: { filtered: boolean; query: string }) {
  if (query) {
    return (
      <div className="admin-empty">
        <p>{`No sign-ups match "${query}".`}</p>
      </div>
    );
  }
  if (filtered) {
    return (
      <div className="admin-empty">
        <p>No sign-ups with this status.</p>
      </div>
    );
  }
  return (
    <div className="admin-empty">
      <span className="admin-empty-ring" aria-hidden="true" />
      <h2>No sign-ups yet</h2>
      <p>
        When a restaurant signs up for the pilot on your website, it shows up
        here within a minute.
      </p>
      <a
        className="admin-text-button"
        href="/#pilot"
        target="_blank"
        rel="noreferrer"
      >
        See the form <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

// One request --------------------------------------------------------------------

type NotesState = "saved" | "waiting" | "saving" | "failed";

function LeadDetail({
  lead,
  onBack,
  onChange,
  say,
}: {
  lead: Lead;
  onBack: () => void;
  onChange: (
    id: string,
    update: { status?: LeadStatus; notes?: string }
  ) => Promise<boolean>;
  say: (message: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes);
  const [notesState, setNotesState] = useState<NotesState>("saved");
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const alive = useRef(true);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const text = pending.current;
    if (text === null) return;
    pending.current = null;
    if (alive.current) setNotesState("saving");
    const ok = await onChange(lead.id, { notes: text });
    if (alive.current && pending.current === null)
      setNotesState(ok ? "saved" : "failed");
  }, [lead.id, onChange]);

  // Save typed notes when switching to another request or leaving the page.
  useEffect(() => {
    alive.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current !== null) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      alive.current = false;
      window.removeEventListener("beforeunload", beforeUnload);
      void flush();
    };
  }, [flush]);

  // On a phone the request opens over the list: start reading at its name.
  useEffect(() => {
    if (!window.matchMedia(WIDE).matches) heading.current?.focus();
  }, []);

  function typeNotes(text: string) {
    setNotes(text);
    pending.current = text;
    setNotesState("waiting");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 900);
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      say(`${what} copied`);
    } catch {
      say(`Couldn't copy the ${what.toLowerCase()}`);
    }
  }

  const firstName = lead.name?.split(/\s+/)[0] || "there";
  const replyLink = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(`Your CoHost AI pilot for ${lead.restaurant}`)}&body=${encodeURIComponent(`Hi ${firstName},\n\nThanks for signing ${lead.restaurant} up for the CoHost AI pilot. `)}`
    : null;
  const dial = lead.phone?.replace(/[^\d+]/g, "");
  const phoneLink = dial ? `tel:${dial}` : null;
  const textLink = dial ? `sms:${dial}` : null;

  return (
    <article className="admin-detail">
      <button type="button" className="admin-back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> All sign-ups
      </button>

      <header className="admin-detail-head">
        <h2 ref={heading} tabIndex={-1}>
          {lead.restaurant}
        </h2>
        <p>
          Received{" "}
          <time dateTime={lead.created_at}>{whenLong(lead.created_at)}</time>
        </p>
        <label className="admin-status-select">
          <span>Status</span>
          <select
            value={lead.status}
            onChange={event =>
              void onChange(lead.id, {
                status: event.target.value as LeadStatus,
              })
            }
          >
            {LEAD_STATUSES.map(status => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="admin-actions">
        {phoneLink && textLink && (
          <>
            <a className="btn btn-primary" href={phoneLink}>
              <Phone size={17} aria-hidden="true" /> Call
            </a>
            <a className="btn btn-ghost" href={textLink}>
              <MessageSquareText size={17} aria-hidden="true" /> Text
            </a>
          </>
        )}
        {replyLink && (
          <a
            className={phoneLink ? "btn btn-ghost" : "btn btn-primary"}
            href={replyLink}
          >
            <Mail size={17} aria-hidden="true" /> Reply by email
          </a>
        )}
      </div>

      <dl className="admin-facts">
        <Fact label="Phone">
          {lead.phone ? (
            <>
              <a href={phoneLink ?? undefined}>{lead.phone}</a>
              <CopyButton
                onClick={() => void copy(lead.phone ?? "", "Phone number")}
                what="phone number"
              />
            </>
          ) : (
            <span className="admin-muted">Not given</span>
          )}
        </Fact>
        <Fact label="Signed up with">
          {lead.form === "pilot" ? "The 14-day pilot form" : "The contact form"}
        </Fact>
        {lead.name && <Fact label="Name">{lead.name}</Fact>}
        {lead.email && (
          <Fact label="Email">
            <a href={`mailto:${lead.email}`}>{lead.email}</a>
            <CopyButton
              onClick={() => void copy(lead.email ?? "", "Email")}
              what="email"
            />
          </Fact>
        )}
        {lead.contact_preference && (
          <Fact label="Best way to respond">{lead.contact_preference}</Fact>
        )}
        {lead.location && (
          <Fact label="City / neighborhood">{lead.location}</Fact>
        )}
        {lead.pos && <Fact label="Current POS">{lead.pos}</Fact>}
      </dl>

      {lead.need && (
        <section className="admin-block">
          <h3>What happens when the phone gets busy?</h3>
          <blockquote className="admin-quote">{lead.need}</blockquote>
        </section>
      )}

      <section className="admin-block">
        <label className="admin-notes">
          <span className="admin-notes-head">
            <h3>Your notes</h3>
            <span
              className={`admin-save-state is-${notesState}`}
              aria-live="polite"
            >
              {notesState === "saved" ? (
                lead.notes || notes ? (
                  <>
                    <Check size={14} aria-hidden="true" /> Saved
                  </>
                ) : (
                  "Only you see these"
                )
              ) : null}
              {notesState === "waiting" && "Typing…"}
              {notesState === "saving" && "Saving…"}
              {notesState === "failed" && (
                <>
                  Couldn't save.{" "}
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() => {
                      pending.current = notes;
                      void flush();
                    }}
                  >
                    Try again
                  </button>
                </>
              )}
            </span>
          </span>
          <textarea
            value={notes}
            maxLength={8000}
            rows={4}
            placeholder="Calls, follow-ups, anything to remember…"
            onChange={event => typeNotes(event.target.value)}
            onBlur={() => void flush()}
          />
        </label>
      </section>

      <Source lead={lead} />
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="admin-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CopyButton({ onClick, what }: { onClick: () => void; what: string }) {
  return (
    <button
      type="button"
      className="admin-icon-button admin-copy"
      onClick={onClick}
      aria-label={`Copy ${what}`}
      title={`Copy ${what}`}
    >
      <Copy size={15} />
    </button>
  );
}

function describeDevice(agent = "") {
  const device = /iPhone/.test(agent)
    ? "iPhone"
    : /iPad/.test(agent)
      ? "iPad"
      : /Android/.test(agent)
        ? /Mobile/.test(agent)
          ? "Android phone"
          : "Android tablet"
        : /Macintosh/.test(agent)
          ? "Mac"
          : /Windows/.test(agent)
            ? "Windows computer"
            : /Linux/.test(agent)
              ? "Linux computer"
              : null;
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /(Chrome|CriOS)\//.test(agent)
        ? "Chrome"
        : /(Firefox|FxiOS)\//.test(agent)
          ? "Firefox"
          : /Safari\//.test(agent)
            ? "Safari"
            : null;
  return [device, browser].filter(Boolean).join(" · ") || null;
}

function Source({ lead }: { lead: Lead }) {
  const { source } = lead;
  let from = "Typed the address or used a bookmark";
  if (source.referrer) {
    try {
      from = new URL(source.referrer).hostname.replace(/^www\./, "");
    } catch {
      from = source.referrer;
    }
  }
  const campaign = [
    source.utm?.utm_source,
    source.utm?.utm_medium,
    source.utm?.utm_campaign,
  ]
    .filter(Boolean)
    .join(" · ");
  const device = describeDevice(source.user_agent);
  const minutes =
    source.seconds_to_send !== undefined
      ? Math.max(1, Math.round(source.seconds_to_send / 60))
      : null;
  return (
    <details className="admin-block admin-source">
      <summary>Where this sign-up came from</summary>
      <dl className="admin-facts">
        <Fact label="Came from">{from}</Fact>
        {campaign && <Fact label="Campaign">{campaign}</Fact>}
        {device && <Fact label="Device">{device}</Fact>}
        {source.timezone && <Fact label="Time zone">{source.timezone}</Fact>}
        {minutes !== null && (
          <Fact label="Time on the page">{`About ${minutes} min before sending`}</Fact>
        )}
        {source.page && (
          <Fact label="Page">
            <span className="admin-break">{source.page}</span>
          </Fact>
        )}
      </dl>
    </details>
  );
}

// The ⋯ menu ----------------------------------------------------------------

function Menu({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node))
        onOpenChange(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    box.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onOpenChange]);
  return (
    <div className="admin-menu" ref={box}>
      <button
        type="button"
        className="admin-icon-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More"
        title="More"
        onClick={() => onOpenChange(!open)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="admin-menu-list" role="menu">
          {children}
        </div>
      )}
    </div>
  );
}

// Change passcode ------------------------------------------------------------------

function ChangePasscode({
  token,
  onClose,
  onChanged,
  onSignedOut,
}: {
  token: string;
  onClose: () => void;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const box = dialog.current;
    box?.showModal();
    return () => box?.close();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const fresh = next.trim();
    if (fresh.length < 10) return setError(ERRORS.too_short ?? null);
    if (fresh !== again.trim())
      return setError("The two new passcodes don't match.");
    setBusy(true);
    setError(null);
    try {
      const reply = await leadsApi.changePasscode(token, current.trim(), fresh);
      if (reply.ok) return onChanged();
      if (reply.error === "signed_out") return onSignedOut();
      setError(
        reply.error === "wrong_passcode"
          ? "Your current passcode didn't match."
          : (ERRORS[reply.error] ?? "That didn't work. Try again.")
      );
    } catch (failure) {
      setError(problemText(failure));
    }
    setBusy(false);
  }

  return (
    <dialog
      ref={dialog}
      className="admin-dialog"
      onCancel={onClose}
      aria-labelledby="passcode-title"
    >
      <form onSubmit={submit}>
        <div className="admin-dialog-head">
          <h2 id="passcode-title">Change passcode</h2>
          <button
            type="button"
            className="admin-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p>
          Other devices will be signed out. Use at least 10 characters; a few
          words are easy to remember.
        </p>
        <input
          type="text"
          name="username"
          autoComplete="username"
          value="CoHost AI Leads"
          readOnly
          hidden
        />
        <label className="admin-field">
          <span>Current passcode</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span>New passcode</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={200}
            value={next}
            onChange={e => setNext(e.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span>New passcode again</span>
          <input
            type="password"
            autoComplete="new-password"
            maxLength={200}
            value={again}
            onChange={e => setAgain(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-dialog-actions">
          <button type="button" className="admin-text-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Change passcode"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
