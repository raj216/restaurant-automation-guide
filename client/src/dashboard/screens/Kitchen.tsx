// The Kitchen screen: a tablet in the kitchen, for restaurants without a POS. Full screen,
// big text, a chime for each new order. The cook taps "Got it" (the order becomes "Kitchen
// has it" for the counter) and "Done" when it's made. A cancelled order turns red and says
// DO NOT MAKE until the cook taps OK. Signed in with a staff login.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useDashboard } from "../DashboardContext";
import { hrefTo, IN_DEMO } from "../base";
import { chime, unlockSound } from "../lib/alerts";
import { fetchKitchenBoard, isStateConflict, pingKitchenScreen, transitionOrder } from "../lib/data";
import { orderCode } from "../lib/format";
import { ageLabel, kitchenBoard, kitchenLine, newScreenId, type KitchenTicket } from "../lib/kitchen";
import { formatTime } from "../lib/time";
import type { Order, PosJob } from "../lib/types";

const POLL_MS = 5_000;
const PING_MS = 30_000;
const HIDDEN_KEY = "cohost.kitchen.hidden";
const SCREEN_KEY = "cohost.kitchen.screen";

function readHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function screenId(): string {
  try {
    const saved = localStorage.getItem(SCREEN_KEY);
    if (saved) return saved;
    const fresh = newScreenId();
    localStorage.setItem(SCREEN_KEY, fresh);
    return fresh;
  } catch {
    return newScreenId();
  }
}

export default function Kitchen() {
  const d = useDashboard();
  const restaurant = d.restaurant;
  const tz = restaurant?.timezone ?? "America/New_York";
  const [orders, setOrders] = useState<Order[]>([]);
  const [jobs, setJobs] = useState<PosJob[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(readHidden);
  const [online, setOnline] = useState(true);
  const [started, setStarted] = useState(IN_DEMO);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const seen = useRef<Set<string> | null>(null);
  const id = useMemo(screenId, []);

  const load = useCallback(async () => {
    if (!restaurant) return;
    try {
      const next = await fetchKitchenBoard(restaurant.id);
      setOrders(next.orders);
      setJobs(next.jobs);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [restaurant]);

  // Poll the board, check in as a kitchen tablet, tick the clock.
  useEffect(() => {
    if (!restaurant) return;
    const ping = () => pingKitchenScreen(restaurant.id, id, "Kitchen tablet").then(() => setOnline(true), () => setOnline(false));
    void load();
    void ping();
    const poll = setInterval(() => void load(), POLL_MS);
    const pinger = setInterval(() => void ping(), PING_MS);
    const tick = setInterval(() => setNow(new Date()), 15_000);
    return () => {
      clearInterval(poll);
      clearInterval(pinger);
      clearInterval(tick);
    };
  }, [restaurant, id, load]);

  const board = useMemo(() => kitchenBoard(orders, jobs, now, hidden), [orders, jobs, now, hidden]);

  // A chime for each new order and each cancellation (not for what was already there).
  useEffect(() => {
    const ids = [...board.fresh, ...board.cancelled].map(t => `${t.kind}:${t.order.id}`);
    if (seen.current && ids.some(x => !seen.current!.has(x))) chime();
    seen.current = new Set(ids);
  }, [board]);

  // Keep the tablet's screen awake while the board is open (where the browser allows it).
  useEffect(() => {
    if (!started) return;
    let lock: { release(): Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request(kind: "screen"): Promise<{ release(): Promise<void> }> } };
    void nav.wakeLock?.request("screen").then(l => (lock = l), () => undefined);
    return () => void lock?.release();
  }, [started]);

  const hide = (orderId: string) =>
    setHidden(prev => {
      const next = new Set(prev).add(orderId);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next].slice(-500)));
      } catch {
        /* this tablet forgets; the order is still correct everywhere else */
      }
      return next;
    });

  const gotIt = async (order: Order) => {
    setBusy(order.id);
    try {
      await transitionOrder({ restaurantId: order.restaurant_id, orderId: order.id, from: "pos_entered", to: "pos_accepted", reason: "kitchen_got_it" });
    } catch (error) {
      if (!isStateConflict(error)) setOnline(false);
    } finally {
      setBusy(null);
      void load();
    }
  };

  if (!restaurant) return <main className="d-kds" aria-busy="true" />;

  return (
    <main className="d-kds">
      <header className="d-kds-top">
        <b>Kitchen</b>
        <span className="d-kds-muted">{restaurant.name}</span>
        <span className="d-kds-status">
          <span className={`d-kds-dot${online ? "" : " d-off"}`} aria-hidden="true" />
          {online ? "Online" : "Offline: new orders can't reach this screen"}
        </span>
        <span className="d-kds-clock">{formatTime(now, tz)}</span>
        <Link href={hrefTo("")} className="d-kds-exit">
          Dashboard
        </Link>
      </header>

      <div className="d-kds-cols">
        <section aria-label="New orders">
          <h2>New · {board.fresh.length + board.cancelled.length}</h2>
          {board.cancelled.map(t => (
            <Ticket key={`x-${t.order.id}`} ticket={t} tz={tz}>
              <button type="button" className="d-kds-btn d-kds-ok" onClick={() => hide(t.order.id)}>
                OK
              </button>
            </Ticket>
          ))}
          {board.fresh.map(t => (
            <Ticket key={t.order.id} ticket={t} tz={tz}>
              <button type="button" className="d-kds-btn d-kds-go" disabled={busy === t.order.id} onClick={() => void gotIt(t.order)}>
                {busy === t.order.id ? "Saving…" : "Got it"}
              </button>
            </Ticket>
          ))}
          {board.fresh.length + board.cancelled.length === 0 ? <p className="d-kds-empty">No new orders.</p> : null}
        </section>
        <section aria-label="Orders the kitchen has">
          <h2>Kitchen has it · {board.cooking.length}</h2>
          {board.cooking.map(t => (
            <Ticket key={t.order.id} ticket={t} tz={tz}>
              <button type="button" className="d-kds-btn" onClick={() => hide(t.order.id)}>
                Done
              </button>
            </Ticket>
          ))}
          {board.cooking.length === 0 ? <p className="d-kds-empty">Nothing in progress.</p> : null}
        </section>
      </div>

      {!started ? (
        <div className="d-kds-start">
          <button
            type="button"
            className="d-kds-btn d-kds-go"
            onClick={() => {
              unlockSound();
              setStarted(true);
            }}
          >
            Start the kitchen screen
          </button>
          <p>Tap once so this tablet can play a sound for new orders and stay awake.</p>
        </div>
      ) : null}
    </main>
  );
}

function Ticket({ ticket, tz, children }: { ticket: KitchenTicket; tz: string; children: React.ReactNode }) {
  const { order, kind } = ticket;
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  return (
    <article className={`d-kds-ticket d-kds-${kind}${ticket.late ? " d-kds-late" : ""}`}>
      <div className="d-kds-head">
        <span className="d-kds-code">{orderCode(order.id)}</span>
        <b>{order.customer_name ?? "Caller"}</b>
        <span className="d-kds-age">{ageLabel(ticket.minutes)}</span>
      </div>
      {kind === "cancelled" ? <div className="d-kds-cancel">CANCELLED: DO NOT MAKE</div> : null}
      {order.allergy_note ? <div className="d-kds-allergy">ALLERGY: {order.allergy_note}</div> : null}
      <ul className="d-kds-items">
        {items.map((item, i) => {
          const line = kitchenLine(item);
          return (
            <li key={i}>
              <b>{line.quantity}×</b> {line.name} {line.choices ? <span className="d-kds-muted">{line.choices}</span> : null}
            </li>
          );
        })}
      </ul>
      <div className="d-kds-foot">
        <span className="d-kds-muted">Pickup {order.requested_pickup_time ? formatTime(order.requested_pickup_time, tz) : "ASAP"}</span>
        {children}
      </div>
    </article>
  );
}
