import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import {
  AudioLines,
  Ban,
  BarChart3,
  BellOff,
  CalendarCheck,
  Check,
  CircleCheck,
  Inbox,
  Lock,
  MessageSquareText,
  PhoneCall,
  Settings,
  ShieldBan,
  Timer,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ALERT_TICKET,
  DASHBOARD,
  ORDER_TICKET,
  RECORDING,
  RESERVATION_TICKET,
  RESTAURANT,
  SPAM_FACTS,
  SPAM_TICKET,
  type Kind,
} from "./content";
import { EASE, Reveal } from "./motion";
import { useToast } from "./Toasts";

function TicketHead({
  title,
  meta,
  badge,
  kind,
}: {
  title: string;
  meta: string[];
  badge: string;
  kind: Kind;
}) {
  return (
    <header className="ticket-head">
      <div>
        <h3>{title}</h3>
        <p className="meta">
          {meta.map(part => (
            <span key={part}>{part}</span>
          ))}
        </p>
      </div>
      <span className={`kind k-${kind}`}>{badge}</span>
    </header>
  );
}

const BARS = 46;
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The call recording's waveform. Its playhead sweeps while the ticket is on screen. */
function Recording({ playing }: { playing: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const levels = useMemo(
    () =>
      Array.from(
        { length: BARS },
        (_, i) =>
          0.22 + 0.78 * Math.abs(Math.sin(i * 1.71) * Math.cos(i * 0.43 + 0.6))
      ),
    []
  );
  const [at, setAt] = useState(reduce ? BARS : 0);
  const moving = playing && !reduce;

  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(
      () => setAt(value => (value >= BARS + 10 ? 0 : value + 1)),
      150
    );
    return () => window.clearInterval(timer);
  }, [moving]);

  const played = Math.min(at, BARS);
  return (
    <div className={`player${moving ? " is-playing" : ""}`} aria-hidden="true">
      <span className="player-ic">
        <AudioLines size={16} />
      </span>
      <span
        className="wave"
        style={{ "--n": `${BARS * 100}%` } as React.CSSProperties}
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
      <time>
        {clock(Math.round((played / BARS) * RECORDING.length))} /{" "}
        {clock(RECORDING.length)}
      </time>
    </div>
  );
}

function OrderTicket({ playing }: { playing: boolean }) {
  const toast = useToast();
  const [kitchen, text] = ORDER_TICKET.actions;
  return (
    <>
      <TicketHead
        title={ORDER_TICKET.title}
        meta={ORDER_TICKET.meta}
        badge={ORDER_TICKET.badge}
        kind="order"
      />
      <div className="ticket-grid">
        <div className="ticket-col">
          <div className="tbox">
            <h4>{ORDER_TICKET.itemsTitle}</h4>
            {ORDER_TICKET.items.map(item => (
              <div className="item" key={item.name}>
                <span>
                  {item.name} {item.note && <em>{item.note}</em>}
                </span>
                <b>{item.price}</b>
              </div>
            ))}
            <div className="item total">
              <span>{ORDER_TICKET.subtotal[0]}</span>
              <b>{ORDER_TICKET.subtotal[1]}</b>
            </div>
          </div>
          <div className="tbox">
            <h4>{ORDER_TICKET.transcriptTitle}</h4>
            <Recording playing={playing} />
            <blockquote className="quote">{ORDER_TICKET.transcript}</blockquote>
          </div>
        </div>
        <div className="tbox">
          <h4>{ORDER_TICKET.actionsTitle}</h4>
          <p className="actions-text">{ORDER_TICKET.actionsText}</p>
          <div className="stack">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => toast(kitchen.done)}
            >
              <Check size={16} strokeWidth={2.6} />
              {kitchen.label}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => toast(text.done)}
            >
              <MessageSquareText size={16} />
              {text.label}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ReservationTicket() {
  const toast = useToast();
  return (
    <>
      <TicketHead
        title={RESERVATION_TICKET.title}
        meta={RESERVATION_TICKET.meta}
        badge={RESERVATION_TICKET.badge}
        kind="reservation"
      />
      <div className="ticket-grid">
        <div className="ticket-col">
          <div className="tbox">
            <h4>{RESERVATION_TICKET.paramsTitle}</h4>
            {RESERVATION_TICKET.params.map(([label, value]) => (
              <div className="param" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="tbox">
            <h4>{RESERVATION_TICKET.noteTitle}</h4>
            <blockquote className="quote">{RESERVATION_TICKET.note}</blockquote>
          </div>
        </div>
        <div className="tbox">
          <h4>{RESERVATION_TICKET.actionsTitle}</h4>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => toast(RESERVATION_TICKET.action.done)}
          >
            <CalendarCheck size={16} />
            {RESERVATION_TICKET.action.label}
          </button>
        </div>
      </div>
    </>
  );
}

function AlertTicket() {
  const toast = useToast();
  const [reply, resolve] = ALERT_TICKET.actions;
  return (
    <>
      <TicketHead
        title={ALERT_TICKET.title}
        meta={ALERT_TICKET.meta}
        badge={ALERT_TICKET.badge}
        kind="alert"
      />
      <div className="tbox">
        <h4>{ALERT_TICKET.summaryTitle}</h4>
        <blockquote className="quote red">{ALERT_TICKET.summary}</blockquote>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => toast(reply.done)}
          >
            <MessageSquareText size={16} />
            {reply.label}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => toast(resolve.done)}
          >
            <CircleCheck size={16} />
            {resolve.label}
          </button>
        </div>
      </div>
    </>
  );
}

const SPAM_ICONS = [Timer, BellOff, Ban];

function SpamTicket() {
  return (
    <>
      <TicketHead
        title={SPAM_TICKET.title}
        meta={SPAM_TICKET.meta}
        badge={SPAM_TICKET.badge}
        kind="spam"
      />
      <div className="tbox spam-card">
        <span className="spam-shield">
          <ShieldBan size={22} />
        </span>
        <p>{SPAM_TICKET.text}</p>
        <div className="spam-stats">
          {SPAM_FACTS.map((fact, i) => {
            const Icon = SPAM_ICONS[i];
            return (
              <span key={fact}>
                <Icon size={13} />
                {fact}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * A working copy of the manager's live inbox: pick a call on the left to see
 * the ticket Brio wrote for it. The staff buttons show what would happen.
 */
export function Dashboard() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const dash = useRef<HTMLDivElement>(null);
  const seen = useInView(dash, { once: true, margin: "0px 0px -15% 0px" });
  const onScreen = useInView(dash);

  const choose = (index: number) => {
    const count = DASHBOARD.feed.length;
    const next = (index + count) % count;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => choose(selected + 1),
      ArrowRight: () => choose(selected + 1),
      ArrowUp: () => choose(selected - 1),
      ArrowLeft: () => choose(selected - 1),
      Home: () => choose(0),
      End: () => choose(DASHBOARD.feed.length - 1),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const tickets = [
    <OrderTicket key="order" playing={onScreen} />,
    <ReservationTicket key="reservation" />,
    <AlertTicket key="alert" />,
    <SpamTicket key="spam" />,
  ];

  return (
    <section
      className="section"
      id="dashboard"
      aria-labelledby="dashboard-title"
    >
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="eyebrow">
            <span>{DASHBOARD.eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="h2" id="dashboard-title" delay={0.05} blur>
            {DASHBOARD.titleStart}
            <span className="hl">{DASHBOARD.titleHighlight}</span>
          </Reveal>
          <Reveal as="p" className="lede" delay={0.1}>
            {DASHBOARD.text}
          </Reveal>
        </header>

        <Reveal className="dash-wrap" y={48}>
          <div ref={dash} className={`dash${seen ? " is-in" : ""}`}>
            <div className="dash-top">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="dash-title">
                <Lock size={12} />
                {DASHBOARD.windowTitle}
              </span>
              <span className="dash-online">
                <span className="live-dot" />
                {DASHBOARD.online}
              </span>
            </div>
            <div className="dash-body">
              <div className="rail" aria-hidden="true">
                <span className="on">
                  <Inbox size={18} />
                </span>
                <span>
                  <PhoneCall size={18} />
                </span>
                <span>
                  <CalendarCheck size={18} />
                </span>
                <span>
                  <BarChart3 size={18} />
                </span>
                <span>
                  <Settings size={18} />
                </span>
                <span className="me" title={RESTAURANT}>
                  {RESTAURANT.split(" ")
                    .map(word => word[0])
                    .join("")}
                </span>
              </div>
              <div className="feed">
                <p className="feed-head">
                  <span className="live-dot" />
                  {DASHBOARD.live}
                  <span className="count">{DASHBOARD.feed.length}</span>
                </p>
                <div
                  className="feed-list"
                  role="tablist"
                  aria-label="Calls Brio handled"
                  onKeyDown={onKey}
                >
                  {DASHBOARD.feed.map((call, i) => (
                    <button
                      key={call.caller}
                      ref={el => {
                        tabs.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`call-tab-${i}`}
                      aria-controls="call-panel"
                      aria-selected={i === selected}
                      tabIndex={i === selected ? 0 : -1}
                      className={`feed-card k-${call.kind}`}
                      style={{ "--i": i } as React.CSSProperties}
                      onClick={() => setSelected(i)}
                    >
                      <span className="row">
                        <span className="caller">{call.caller}</span>
                        <span className={`kind k-${call.kind}`}>
                          {call.badge}
                        </span>
                      </span>
                      <span
                        className={`sum${call.kind === "spam" ? " muted" : ""}`}
                      >
                        {call.summary}
                      </span>
                      <span className="st">{call.status}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`detail k-${DASHBOARD.feed[selected].kind}`}
                role="tabpanel"
                id="call-panel"
                aria-labelledby={`call-tab-${selected}`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <m.article
                    key={selected}
                    className="ticket"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    {tickets[selected]}
                  </m.article>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
