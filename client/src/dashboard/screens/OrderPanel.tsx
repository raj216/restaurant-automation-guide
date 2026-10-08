// One order in full: what Brio read back, what the caller was told, who did what, the
// call, and the buttons. A side panel on an iPad or laptop, a full screen on a phone.

import { useEffect, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { fetchCallDetail, fetchOrder, fetchOrderEvents } from "../lib/data";
import { customerLabel, formatMoney, formatPhone, itemName, orderCode, orderSummary } from "../lib/format";
import { sentimentLabel } from "../lib/labels";
import { actorLabel, readableReason, statusOf } from "../lib/orders";
import { dayAndTime, formatDuration, formatTime, relative } from "../lib/time";
import { parseTranscript } from "../lib/transcript";
import type { CallLog, Order, OrderEvent } from "../lib/types";
import { OrderActions, PhoneLink } from "../parts";
import { AllergyBadge, Icon, OrderStatusPill, Pill } from "../ui";

const TOLD_REVIEW = "I've sent your order to the restaurant for review — it is not accepted or in the kitchen yet.";
const TOLD_AFTER_HOURS =
  "Your request has been received, but the restaurant has not accepted it yet. You will receive confirmation after the restaurant opens. Please do not travel to the restaurant until you receive confirmation.";

export function OrderPanel({ orderId, onClose, sheet }: { orderId: string; onClose: () => void; sheet?: boolean }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const fromStore = d.data.orders.find(o => o.id === orderId) ?? null;
  const [fetched, setFetched] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [call, setCall] = useState<CallLog | null>(null);
  const [callChecked, setCallChecked] = useState(false);
  const [printing, setPrinting] = useState(false);
  const order = fromStore ?? fetched;
  const restaurantId = d.restaurant?.id;

  useEffect(() => {
    if (!restaurantId || fromStore) return;
    void fetchOrder(restaurantId, orderId).then(setFetched).catch(() => setFetched(null));
  }, [restaurantId, orderId, fromStore]);

  const updated = fromStore?.updated_at;
  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;
    void fetchOrderEvents(restaurantId, orderId)
      .then(e => alive && setEvents(e))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [restaurantId, orderId, updated]);

  const callId = order?.call_id ?? null;
  useEffect(() => {
    setCall(null);
    setCallChecked(false);
    if (!restaurantId || !callId) return;
    let alive = true;
    const load = () =>
      fetchCallDetail(restaurantId, callId)
        .then(c => {
          if (!alive) return;
          setCall(c);
          setCallChecked(true);
        })
        .catch(() => alive && setCallChecked(true));
    void load();
    // Call details arrive about a minute after the call ends.
    const timer = setInterval(() => {
      if (alive && !call) void load();
    }, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, callId]);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
    return () => clearTimeout(t);
  }, [printing]);

  if (!order) {
    return (
      <div className="d-panel">
        <div className="d-pb">
          <p className="d-muted">Looking for this order…</p>
        </div>
      </div>
    );
  }

  const state = d.displayState(order);
  const after = order.intake_mode === "after_hours_request";
  const reached = events.some(e => e.to_state === "pending_staff_review");
  const callAge = call ? 0 : (d.now.getTime() - new Date(order.created_at).getTime()) / 60000;
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const told = state === "pending_staff_review" || state === "escalated" ? (after ? TOLD_AFTER_HOURS : TOLD_REVIEW) : null;
  const transcript = parseTranscript(call?.transcript);

  const body = (
    <>
      <div className="d-ph">
        <div className="d-row d-wrap">
          <span className="d-code" style={{ fontSize: 18 }}>
            {orderCode(order.id)}
          </span>
          <OrderStatusPill state={state} />
          {after ? (
            <Pill tone="purple" icon="moon">
              After-hours request
            </Pill>
          ) : null}
          {!reached && events.length > 0 ? <Pill tone="gray">Phone draft</Pill> : null}
        </div>
        <h2 className="d-name">{customerLabel(order)}</h2>
        <div className="d-row d-wrap d-small d-muted">
          <PhoneLink number={order.customer_phone} />
          <span>
            Received {relative(order.created_at, d.now)} · {formatTime(order.created_at, tz)}
          </span>
        </div>
        <div className="d-small d-muted">
          Pickup:{" "}
          <b style={{ color: "var(--text)" }}>
            {order.requested_pickup_time ? dayAndTime(order.requested_pickup_time, d.now, tz) : "As soon as possible"}
          </b>
        </div>
      </div>

      <div className="d-pb">
        {order.allergy_note ? (
          <div className="d-allergy-banner" role="alert">
            <Icon name="alert" size="l" />
            <div>
              <b>Allergy</b>
              <strong>{order.allergy_note}</strong>
              <span>Brio asked the caller to mention it again at pickup.</span>
            </div>
          </div>
        ) : null}

        <section>
          <h3 className="d-h3">Items, as Brio read them back</h3>
          {items.length === 0 ? <p className="d-small d-muted">No items were saved with this order.</p> : null}
          {items.map((item, i) => (
            <div className="d-item" key={`${item.sku ?? item.name}-${i}`}>
              <span className="d-q">{item.quantity}×</span>
              <div>
                <div className="d-nm">{itemName(item)}</div>
                <div className="d-md">{formatMoney(item.unit_price_cents, order.currency)} each</div>
              </div>
              <span className="d-nm">{formatMoney(item.line_total_cents, order.currency)}</span>
            </div>
          ))}
          <div className="d-row" style={{ paddingTop: 8 }}>
            <span className="d-muted">Subtotal, before tax</span>
            <span className="d-sp d-big" style={{ fontSize: 24 }}>
              {formatMoney(order.subtotal_cents, order.currency)}
            </span>
          </div>
          <div className="d-row d-small d-muted" style={{ paddingTop: 4 }}>
            <span>Payment</span>
            <b className="d-sp" style={{ color: "var(--text)" }}>
              {order.payment_method === "payment_link" ? "Payment link" : "Pay at pickup"}
            </b>
          </div>
          <p className="d-small d-faint" style={{ marginTop: 8 }}>
            Items, prices, customer and allergy note can't be edited. They are a record of the call.
          </p>
        </section>

        {told ? (
          <section className="d-said">
            <b>What the caller was told</b>“{told}”
          </section>
        ) : null}

        {after && order.staff_review_deadline ? (
          <section className="d-small d-muted">
            Requested for <b style={{ color: "var(--text)" }}>{order.requested_pickup_time ? dayAndTime(order.requested_pickup_time, d.now, tz) : "later"}</b>. Review by{" "}
            <b style={{ color: "var(--text)" }}>{dayAndTime(order.staff_review_deadline, d.now, tz)}</b>.
          </section>
        ) : null}

        <section>
          <h3 className="d-h3">History</h3>
          <div className="d-tl">
            {events.length === 0 ? <span className="d-muted">Loading history…</span> : null}
            {events.map(e => (
              <div key={e.id}>
                <time>{formatTime(e.created_at, tz)}</time>
                <span>
                  <b>{actorLabel(e, d.user?.id)}</b> · {e.from_state ? statusOf(e.from_state).label : "Started"} → {statusOf(e.to_state).label}
                  <br />
                  <span className="d-muted">{readableReason(e.reason)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="d-row">
            <h3 className="d-h3">The call</h3>
            {call ? (
              <span className="d-sp d-small d-muted">
                {formatDuration(call.duration_seconds)} {sentimentLabel(call.sentiment) ? `· ${sentimentLabel(call.sentiment)}` : ""}
              </span>
            ) : null}
          </div>
          {!callId ? <p className="d-small d-muted">This order isn't linked to a call.</p> : null}
          {callId && !call && !callChecked ? <p className="d-small d-muted">Loading the call…</p> : null}
          {callId && !call && callChecked ? (
            <p className="d-small d-muted">{callAge < 5 ? "Call details will appear shortly." : "No call details were saved for this order."}</p>
          ) : null}
          {call ? (
            <div className="d-stack" style={{ gap: 8 }}>
              {call.summary ? <p className="d-small">{call.summary}</p> : null}
              {call.allergies ? <AllergyBadge note={call.allergies} /> : null}
              {transcript ? (
                <div className="d-chat">
                  {transcript.map((line, i) => (
                    <div key={i} className={`d-bub d-${line.speaker}`}>
                      <small>{line.speaker === "brio" ? "Brio" : "Caller"}</small>
                      {line.text}
                    </div>
                  ))}
                </div>
              ) : call.transcript ? (
                <p className="d-small" style={{ whiteSpace: "pre-wrap" }}>
                  {call.transcript}
                </p>
              ) : (
                <p className="d-small d-muted">No transcript was saved.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <div className="d-pf" style={{ flexWrap: "wrap" }}>
        <OrderActions order={order} big />
        <button type="button" className="d-btn d-ghost d-lg d-sp" aria-label="Print slip" onClick={() => setPrinting(true)}>
          <Icon name="printer" />
          <span className="d-hide-phone">Print slip</span>
        </button>
      </div>

      <div className="d-slip-print" aria-hidden="true">
          <h4>
            PENDING STAFF REVIEW — DO NOT PREPARE
          </h4>
          <div>
            <b>{orderCode(order.id)}</b> · {customerLabel(order)} {order.customer_phone ? `· ${formatPhone(order.customer_phone)}` : ""}
          </div>
          <div>{orderSummary(order)}</div>
          {order.allergy_note ? <div style={{ fontWeight: 800, fontSize: 20 }}>ALLERGY: {order.allergy_note}</div> : null}
          <div>Printed {formatTime(d.now, tz)}. This is not a kitchen ticket.</div>
        </div>
    </>
  );

  if (sheet) {
    return (
      <div className="d-sheet" role="dialog" aria-modal="true" aria-label={`Order ${orderCode(order.id)}`}>
        <div className="d-sheet-top">
          <button type="button" className="d-btn d-ghost d-sm" onClick={onClose}>
            <Icon name="chevronLeft" />
            Orders
          </button>
        </div>
        <div className="d-panel" style={{ width: "100%", maxHeight: "none", border: 0, borderRadius: 0, boxShadow: "none", position: "static" }}>
          {body}
        </div>
      </div>
    );
  }

  return (
    <aside className="d-panel" aria-label={`Order ${orderCode(order.id)}`}>
      <div className="d-row" style={{ padding: "8px 10px 0" }}>
        <button type="button" className="d-btn d-ghost d-sm d-sp" onClick={onClose} aria-label="Close order">
          <Icon name="x" />
          Close
        </button>
      </div>
      {body}
    </aside>
  );
}
