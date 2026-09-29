import {
  NEXT_STEP,
  STATE_LABEL,
  STOP_REASONS,
  STOP_STEPS,
  analysisValue,
  callerName,
  callerPhone,
  clock,
  clockTime,
  dialable,
  formatPhone,
  lineText,
  money,
  orderNumber,
  type CallDetails,
  type CallKind,
  type CallRecord,
  type Entry,
  type InboxBackend,
  type Order,
  type OrderEvent,
  type OrderState,
} from "@/lib/inbox";
import {
  ArrowLeft,
  Ban,
  BellOff,
  CalendarCheck,
  Check,
  CircleCheck,
  MessageSquareText,
  Pause,
  Phone,
  Play,
  RotateCcw,
  ShieldBan,
  Timer,
} from "lucide-react";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

// One call in the Live Inbox, drawn like the dashboard on the website: the
// order ticket (items, call audio and summary, staff actions) or the
// reservation, guest alert, spam or plain call summary.

export interface TicketActions {
  move: (
    order: Order,
    to: OrderState,
    reason: string,
    done: string
  ) => Promise<void>;
  mark: (
    call: CallRecord,
    change: { handled?: boolean; note?: string },
    done?: string
  ) => Promise<void>;
}

interface TicketProps {
  entry: Entry;
  backend: InboxBackend;
  now: number;
  actions: TicketActions;
  onBack: () => void;
}

export function Ticket({ entry, backend, now, actions, onBack }: TicketProps) {
  return (
    <article className="ticket inbox-ticket" aria-label="Call details">
      <button type="button" className="inbox-back" onClick={onBack}>
        <ArrowLeft size={18} />
        All calls
      </button>
      {entry.order ? (
        <OrderTicket
          entry={entry}
          order={entry.order}
          backend={backend}
          now={now}
          actions={actions}
        />
      ) : entry.call ? (
        <CallTicket
          entry={entry}
          call={entry.call}
          backend={backend}
          now={now}
          actions={actions}
        />
      ) : null}
    </article>
  );
}

function TicketHead({
  title,
  meta,
  badge,
  kind,
}: {
  title: string;
  meta: string[];
  badge: string;
  kind: CallKind;
}) {
  return (
    <header className="ticket-head">
      <div>
        <h3>{title}</h3>
        <p className="meta">
          {meta.map((part, i) => (
            <Fragment key={part}>
              {i > 0 && <span className="sep"> • </span>}
              <span>{part}</span>
            </Fragment>
          ))}
        </p>
      </div>
      <span className={`kind k-${kind}`}>{badge}</span>
    </header>
  );
}

// Orders ------------------------------------------------------------------------

// The badge colour: green while the order is on track, red when it needs a
// person or was turned down, grey once it's over.
const STATE_KIND: Record<OrderState, CallKind> = {
  draft: "spam",
  validated: "spam",
  caller_confirmed: "order",
  pending_staff_review: "order",
  pos_entered: "reservation",
  pos_accepted: "reservation",
  fulfilled: "spam",
  cancelled: "spam",
  rejected: "alert",
  escalated: "alert",
};

const STATE_GUIDE: Record<OrderState, string> = {
  pending_staff_review:
    "Review details and punch directly into POS or kitchen ticket when line clears.",
  pos_entered:
    "It's in your POS. Mark it accepted once the kitchen has the ticket.",
  pos_accepted: "Mark it picked up when the guest collects it.",
  fulfilled: "Picked up. Nothing left to do.",
  escalated:
    "Brio couldn't finish this order on the call. Call the guest back to sort it out.",
  cancelled: "This order was stopped. The history below shows why.",
  rejected: "This order was stopped. The history below shows why.",
  caller_confirmed: "The caller confirmed it; Brio is handing it to your team.",
  validated:
    "The caller didn't confirm this order, so it never reached your team.",
  draft: "The caller didn't finish this order, so it never reached your team.",
};

function OrderTicket({
  entry,
  order,
  backend,
  now,
  actions,
}: {
  entry: Entry;
  order: Order;
  backend: InboxBackend;
  now: number;
  actions: TicketActions;
}) {
  const tz = backend.restaurant.timezone;
  const meta = [
    `Caller: ${order.customer_name ?? "Not given"}`,
    formatPhone(order.customer_phone),
    order.requested_pickup_time
      ? `Pickup Estimated: ${clockTime(order.requested_pickup_time, tz, now)}`
      : "Pickup: As soon as it's ready",
  ].filter(Boolean);

  return (
    <>
      <TicketHead
        title={`To-Go Order Summary (${orderNumber(order)})`}
        meta={meta}
        badge={STATE_LABEL[order.state]}
        kind={STATE_KIND[order.state]}
      />
      {order.intake_mode === "after_hours_request" &&
        order.staff_review_deadline && (
          <p className="inbox-flag">
            After-hours request: confirm it by{" "}
            {clockTime(order.staff_review_deadline, tz, now)} or the guest
            shouldn't come in.
          </p>
        )}
      <div className="ticket-grid">
        <div className="ticket-col">
          <div className="tbox">
            <h4>Structured Items &amp; Modifiers</h4>
            {order.line_items.length ? (
              order.line_items.map((line, i) => {
                const { name, note } = lineText(line);
                return (
                  <div className="item" key={`${line.sku ?? line.name}-${i}`}>
                    <span>
                      {name} {note && <em>({note})</em>}
                    </span>
                    <b>{money(line.line_total_cents, order.currency)}</b>
                  </div>
                );
              })
            ) : (
              <p className="inbox-muted">
                No items were confirmed on this call.
              </p>
            )}
            {order.subtotal_cents !== null && (
              <div className="item total">
                <span>Subtotal Estimate</span>
                <b>{money(order.subtotal_cents, order.currency)}</b>
              </div>
            )}
            {order.payment_method && (
              <p className="inbox-muted inbox-pay">
                {order.payment_method === "payment_link"
                  ? "Pays by payment link"
                  : "Pays at pickup"}
              </p>
            )}
          </div>
          {entry.callId && <CallAudio entry={entry} backend={backend} />}
        </div>
        <div className="ticket-col">
          <OrderActions order={order} backend={backend} actions={actions} />
          <History order={order} backend={backend} now={now} />
        </div>
      </div>
    </>
  );
}

function OrderActions({
  order,
  backend,
  actions,
}: {
  order: Order;
  backend: InboxBackend;
  actions: TicketActions;
}) {
  const next = NEXT_STEP[order.state];
  const stops = STOP_STEPS[order.state] ?? [];
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState<"rejected" | "cancelled" | null>(
    null
  );
  const [reason, setReason] = useState(STOP_REASONS[0]);
  const staff = backend.role !== "agent";
  const first = order.customer_name?.split(" ")[0];
  const text = `Hi${first ? ` ${first}` : ""}, this is ${backend.restaurant.name} about your to-go order ${orderNumber(order)}. `;

  useEffect(() => setStopping(null), [order.id, order.state]);

  async function run(to: OrderState, why: string, done: string) {
    setBusy(true);
    try {
      await actions.move(order, to, why, done);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tbox">
      <h4>Staff Actions</h4>
      <p className="actions-text">{STATE_GUIDE[order.state]}</p>
      <div className="stack">
        {next && (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!staff || busy}
            onClick={() => void run(next.to, next.reason, next.done)}
          >
            {busy && !stopping ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              <Check size={16} strokeWidth={2.6} />
            )}
            {next.label}
          </button>
        )}
        <ContactButtons
          phone={order.customer_phone}
          text={text}
          who="Customer"
        />
      </div>
      {staff && stops.length > 0 && !stopping && (
        <div className="inbox-stops">
          {stops.map(stop => (
            <button
              key={stop}
              type="button"
              className="inbox-link"
              onClick={() => setStopping(stop)}
            >
              {stop === "rejected" ? "Can't make it" : "Cancel order"}
            </button>
          ))}
        </div>
      )}
      {stopping && (
        <div
          className="inbox-stop"
          role="group"
          aria-label={
            stopping === "rejected" ? "Reject this order" : "Cancel this order"
          }
        >
          <p>
            {stopping === "rejected"
              ? "Why can't you make it?"
              : "Why is it cancelled?"}
          </p>
          <div className="inbox-reasons">
            {STOP_REASONS.map(option => (
              <label
                key={option}
                className={option === reason ? "is-on" : undefined}
              >
                <input
                  type="radio"
                  name={`reason-${order.id}`}
                  value={option}
                  checked={option === reason}
                  onChange={() => setReason(option)}
                />
                {option}
              </label>
            ))}
          </div>
          <p className="inbox-muted">
            Let the guest know too: text or call them above.
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn inbox-danger"
              disabled={busy}
              onClick={() =>
                void run(
                  stopping,
                  `staff_${stopping}: ${reason}`,
                  stopping === "rejected"
                    ? "Order rejected."
                    : "Order cancelled."
                )
              }
            >
              {busy ? (
                <span className="btn-spinner" aria-hidden="true" />
              ) : (
                <Ban size={16} />
              )}
              {stopping === "rejected" ? "Reject order" : "Cancel order"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStopping(null)}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {!staff && (
        <p className="inbox-muted inbox-agent-note">
          You're signed in with Brio's own account, which can't move orders.
          Sign in with a staff login to use these buttons.
        </p>
      )}
    </div>
  );
}

function ContactButtons({
  phone,
  text,
  who,
}: {
  phone: string | null;
  text: string;
  who: string;
}) {
  if (!phone) return null;
  const number = dialable(phone);
  return (
    <>
      <a
        className="btn btn-ghost btn-block"
        href={`sms:${number}?&body=${encodeURIComponent(text)}`}
      >
        <MessageSquareText size={16} />
        Text {who}
      </a>
      <a className="btn btn-ghost btn-block" href={`tel:${number}`}>
        <Phone size={16} />
        Call {who}
      </a>
    </>
  );
}

function eventText(event: OrderEvent): string {
  const why = event.reason.includes(":")
    ? event.reason.split(":").slice(1).join(":").trim()
    : "";
  const byStaff = event.actor_kind === "staff" || event.actor_kind === "admin";
  switch (event.to_state) {
    case "draft":
      return "Brio started the order";
    case "validated":
      return "Brio checked it against the menu";
    case "caller_confirmed":
      return "The caller said yes to the read-back";
    case "pending_staff_review":
      return "Sent to your team for review";
    case "pos_entered":
      return "Entered in the POS";
    case "pos_accepted":
      return "Accepted in the POS";
    case "fulfilled":
      return "Picked up";
    case "escalated":
      return "Brio handed the call to a person";
    case "rejected":
      return byStaff
        ? `Rejected${why ? `: ${why}` : ""}`
        : "Brio couldn't place this version";
    case "cancelled":
      if (byStaff) return `Cancelled${why ? `: ${why}` : ""}`;
      return event.reason === "replaced_by_confirmed_order_in_same_call"
        ? "Replaced by the version the caller confirmed"
        : "Cancelled on the call";
    default:
      return event.to_state;
  }
}

function History({
  order,
  backend,
  now,
}: {
  order: Order;
  backend: InboxBackend;
  now: number;
}) {
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  useEffect(() => {
    let live = true;
    setEvents(null);
    backend
      .events(order)
      .then(list => live && setEvents(list))
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [backend, order.id, order.state]);

  return (
    <div className="tbox">
      <h4>Order History</h4>
      {events === null ? (
        <p className="inbox-muted">Loading…</p>
      ) : events.length ? (
        <ol className="inbox-history">
          {events.map(event => (
            <li
              key={event.id}
              className={event.actor_kind === "agent" ? undefined : "by-staff"}
            >
              <time dateTime={event.created_at}>
                {clockTime(event.created_at, backend.restaurant.timezone, now)}
              </time>
              <span>{eventText(event)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="inbox-muted">No history to show.</p>
      )}
    </div>
  );
}

// The call's recording and summary ------------------------------------------------

const BARS = 46;

function Player({
  src,
  loading,
  duration,
}: {
  src: string | null;
  loading: boolean;
  duration: number | null;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(duration ?? 0);
  const levels = useMemo(
    () =>
      Array.from(
        { length: BARS },
        (_, i) =>
          0.22 + 0.78 * Math.abs(Math.sin(i * 1.71) * Math.cos(i * 0.43 + 0.6))
      ),
    []
  );

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setLength(duration ?? 0);
  }, [src, duration]);

  const played = length
    ? Math.min(BARS, Math.round((time / length) * BARS))
    : 0;
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  };
  const seek = (event: MouseEvent<HTMLSpanElement>) => {
    const element = audio.current;
    if (!element || !length) return;
    const box = event.currentTarget.getBoundingClientRect();
    element.currentTime =
      Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * length;
  };

  let label: string;
  if (src) label = `${clock(time)} / ${clock(length)}`;
  else if (loading) label = "Loading…";
  else label = duration ? `${clock(duration)} call` : "No recording";

  return (
    <div
      className={`player inbox-player${playing ? " is-playing" : ""}${src ? "" : " is-empty"}`}
    >
      <button
        type="button"
        className="player-ic"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Pause the recording" : "Play the recording"}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <span
        className="wave"
        style={{ "--n": `${BARS * 100}%` } as React.CSSProperties}
        onClick={seek}
        aria-hidden="true"
      >
        {levels.map((level, i) => (
          <i
            key={i}
            className={i < played ? "on" : undefined}
            style={
              {
                height: `${Math.round(level * 100)}%`,
                "--p": `${((i / (BARS - 1)) * 100).toFixed(1)}%`,
                animationDelay: `${-(i % 7) * 0.13}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <time>{label}</time>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={event => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds)) setLength(seconds);
          }}
        />
      )}
    </div>
  );
}

function CallAudio({
  entry,
  backend,
  title = "Call Audio & Transcript Summary",
}: {
  entry: Entry;
  backend: InboxBackend;
  title?: string;
}) {
  const [details, setDetails] = useState<CallDetails | null | undefined>(
    undefined
  );
  useEffect(() => {
    let live = true;
    setDetails(undefined);
    if (!entry.callId) {
      setDetails(null);
      return;
    }
    backend
      .details(entry.callId)
      .then(result => live && setDetails(result))
      .catch(() => live && setDetails(null));
    return () => {
      live = false;
    };
  }, [backend, entry.callId]);

  const summary = entry.call?.summary ?? details?.summary ?? null;
  const transcript = entry.call?.transcript ?? details?.transcript ?? null;
  const duration =
    details?.duration_seconds ?? entry.call?.duration_seconds ?? null;

  return (
    <div className="tbox">
      <h4>{title}</h4>
      <Player
        src={details?.recording_url ?? null}
        loading={details === undefined}
        duration={duration}
      />
      {summary ? (
        <blockquote className={`quote${entry.kind === "alert" ? " red" : ""}`}>
          “{summary}”
        </blockquote>
      ) : (
        <p className="inbox-muted">
          {details === undefined
            ? "Getting the call's summary…"
            : "No summary for this call yet."}
        </p>
      )}
      {transcript && (
        <details className="inbox-transcript">
          <summary>Read the full transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
    </div>
  );
}

// Calls without an order ----------------------------------------------------------

const CALL_TITLE: Record<CallKind, string> = {
  order: "To-Go Order Call",
  reservation: "Reservation Inquiry",
  alert: "Guest Assistance Flag",
  spam: "Spam Intercepted",
  question: "Guest Question",
  other: "Call Summary",
};

function CallTicket({
  entry,
  call,
  backend,
  now,
  actions,
}: {
  entry: Entry;
  call: CallRecord;
  backend: InboxBackend;
  now: number;
  actions: TicketActions;
}) {
  const tz = backend.restaurant.timezone;
  const name = callerName(entry);
  const phone = callerPhone(entry);
  const handled = Boolean(call.handled_at);

  if (entry.kind === "spam") {
    const seconds = call.duration_seconds;
    return (
      <>
        <TicketHead
          title={CALL_TITLE.spam}
          meta={["Automated Solicitor Dropped"]}
          badge="Blocked"
          kind="spam"
        />
        <div className="tbox spam-card">
          <span className="spam-shield">
            <ShieldBan size={22} />
          </span>
          <p>
            {call.summary ??
              "Brio identified an automated caller and ended the call. Your host desk phone never made a sound."}
          </p>
          <div className="spam-stats">
            {seconds !== null && (
              <span>
                <Timer size={13} />
                Ended in {Math.max(1, seconds)}s
              </span>
            )}
            <span>
              <BellOff size={13} />
              Zero floor ringing
            </span>
            {phone && (
              <span>
                <Ban size={13} />
                {formatPhone(phone)}
              </span>
            )}
          </div>
        </div>
      </>
    );
  }

  const when = analysisValue(
    call,
    "requested_time",
    "reservation_time",
    "date_time",
    "dined_at"
  );
  const meta = [
    `Caller: ${name ?? "Not given"}`,
    formatPhone(phone),
    entry.kind === "reservation" && when
      ? `Requested: ${when}`
      : entry.kind === "alert" && when
        ? `Dined at ${when}`
        : call.started_at
          ? `Called ${clockTime(call.started_at, tz, now)}`
          : "",
  ].filter(Boolean);

  const badge =
    entry.kind === "reservation"
      ? handled
        ? "Booked"
        : "Table Requested"
      : handled
        ? "Handled"
        : entry.kind === "alert"
          ? "Needs Attention"
          : "Needs a Look";

  const done =
    entry.kind === "reservation"
      ? "Marked as booked."
      : entry.kind === "alert"
        ? "Marked resolved."
        : "Marked handled.";
  const markLabel =
    entry.kind === "reservation"
      ? "Mark Booked"
      : entry.kind === "alert"
        ? "Mark Resolved"
        : "Mark Handled";
  const first = name?.split(" ")[0];
  const text = `Hi${first ? ` ${first}` : ""}, this is ${backend.restaurant.name} following up on your call. `;

  return (
    <>
      <TicketHead
        title={CALL_TITLE[entry.kind]}
        meta={meta}
        badge={badge}
        kind={handled ? "spam" : entry.kind}
      />
      <div className="ticket-grid">
        <div className="ticket-col">
          {entry.kind === "reservation" && <ReservationParams call={call} />}
          <CallAudio
            entry={entry}
            backend={backend}
            title={
              entry.kind === "alert"
                ? "Summary of Call"
                : entry.kind === "reservation"
                  ? "Brio Conversation Note"
                  : undefined
            }
          />
        </div>
        <div className="ticket-col">
          <div className="tbox">
            <h4>
              {entry.kind === "reservation" ? "Actions" : "Staff Actions"}
            </h4>
            <p className="actions-text">
              {handled
                ? "Done. Reopen it if it needs another look."
                : entry.kind === "reservation"
                  ? "Book the table in your reservation system, then mark it booked."
                  : "Follow up with the guest, then mark it done."}
            </p>
            <div className="stack">
              <MarkButton
                handled={handled}
                label={markLabel}
                onMark={value =>
                  actions.mark(
                    call,
                    { handled: value },
                    value ? done : "Reopened."
                  )
                }
              />
              <ContactButtons
                phone={phone}
                text={text}
                who={entry.kind === "reservation" ? "Guest" : "Back"}
              />
            </div>
          </div>
          <Notes call={call} actions={actions} />
        </div>
      </div>
    </>
  );
}

function ReservationParams({ call }: { call: CallRecord }) {
  const party = analysisValue(call, "party_size", "guests");
  const params: [string, string | null][] = [
    ["Party Size", party ? `${party} Guests` : null],
    [
      "Requested Time",
      analysisValue(call, "requested_time", "reservation_time", "date_time"),
    ],
    [
      "Seating Preference",
      analysisValue(call, "seating_preference", "seating"),
    ],
    ["Special Occasion", analysisValue(call, "occasion", "special_occasion")],
    ["Special Requests", analysisValue(call, "special_requests")],
  ];
  const shown = params.filter(([, value]) => value);
  return (
    <div className="tbox">
      <h4>Request Parameters</h4>
      {shown.length ? (
        shown.map(([label, value]) => (
          <div className="param" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))
      ) : (
        <p className="inbox-muted">
          Brio didn't note the details separately. The summary below has them.
        </p>
      )}
    </div>
  );
}

function MarkButton({
  handled,
  label,
  onMark,
}: {
  handled: boolean;
  label: string;
  onMark: (handled: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try {
      await onMark(!handled);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className={`btn btn-block ${handled ? "btn-ghost" : "btn-primary"}`}
      disabled={busy}
      onClick={() => void click()}
    >
      {busy ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : handled ? (
        <RotateCcw size={16} />
      ) : label === "Mark Booked" ? (
        <CalendarCheck size={16} />
      ) : (
        <CircleCheck size={16} />
      )}
      {handled ? "Reopen" : label}
    </button>
  );
}

function Notes({
  call,
  actions,
}: {
  call: CallRecord;
  actions: TicketActions;
}) {
  const [text, setText] = useState(call.staff_note);
  const saved = useRef(call.staff_note);
  useEffect(() => {
    setText(call.staff_note);
    saved.current = call.staff_note;
  }, [call.call_id, call.staff_note]);

  const save = () => {
    const note = text.trim();
    if (note === saved.current) return;
    saved.current = note;
    void actions.mark(call, { note }, "Note saved.");
  };

  return (
    <label className="tbox inbox-notes">
      <h4>Note for your team</h4>
      <textarea
        value={text}
        maxLength={4000}
        rows={3}
        placeholder="Called back, left a voicemail…"
        onChange={event => setText(event.target.value)}
        onBlur={save}
      />
    </label>
  );
}

export function EmptyTicket({ children }: { children: ReactNode }) {
  return <div className="inbox-empty-ticket">{children}</div>;
}
