// Cards and dialogs shared by several screens.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useDashboard } from "./DashboardContext";
import { BASE } from "./Shell";
import { hrefTo } from "./base";
import { isStateConflict, setRequestStatus } from "./lib/data";
import { callerLabel, customerLabel, formatMoney, formatPhone, looksLikeCardNumber, orderCode, orderSummary, telHref } from "./lib/format";
import { MESSAGE_STATUS, REQUEST_STATUS, TOPIC_LABEL, topicOf } from "./lib/labels";
import { actionsFor, shouldPulse, waitTone, type OrderAction } from "./lib/orders";
import { CANCEL_FAILED_NOTE, canSendToPos, posJobFor, posStatusLine, sendResultMessage } from "./lib/pos";
import { countdown, dayAndTime, formatTime, longDay, minutesSince, relativeAndTime } from "./lib/time";
import type { GuestRequest, MessageTopic, Order, RequestStatus } from "./lib/types";
import { AllergyBadge, Button, Icon, OrderStatusPill, Pill, useDismiss, type IconKey } from "./ui";
import { kitchenStep, ticketLine, whyItWaits } from "./lib/today";
import { paymentLinkSent, paymentMarkPaid, reprintTicket } from "./lib/data";
import { payLine, payMessage, payStage, paymentFor, smsHref } from "./lib/payFirst";
import { showMessage } from "./Toasts";

export function PhoneLink({ number, label }: { number: string | null | undefined; label?: string }) {
  if (!number) return null;
  return (
    <a className="d-tel" href={telHref(number)}>
      <Icon name="phone" size="s" />
      {label ?? formatPhone(number)}
    </a>
  );
}

/** The dialog for Reject and Cancel: they can't be undone, so staff say why. */
export function ReasonDialog({
  order,
  action,
  onClose,
}: {
  order: Order;
  action: OrderAction;
  onClose: () => void;
}) {
  const d = useDashboard();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const verb = action.kind === "reject" ? "Reject" : "Cancel";

  useEffect(() => {
    field.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const text = reason.trim();
    if (text.length < 1) return setError("Add a short reason.");
    if (text.length > 200) return setError("Keep the reason under 200 characters.");
    if (looksLikeCardNumber(text)) return setError("Don't include long numbers. Take out anything that looks like a card number.");
    setBusy(true);
    setError(null);
    try {
      await d.moveOrderNow(order, action.to, text);
      showMessage(`${orderCode(order.id)} ${action.kind === "reject" ? "rejected" : "cancelled"}.`);
      onClose();
      // If it went to the POS, void the ticket there too, so the kitchen doesn't make it. Asked
      // whenever the restaurant has a POS (the list on screen may be a few seconds old).
      const job = posJobFor(order, d.data.posJobs);
      if (d.data.pos && job?.status !== "cancelled") {
        const voided = await d.voidInPos(order);
        if (!voided.ok) showMessage(`${orderCode(order.id)}: ${voided.body.note ?? CANCEL_FAILED_NOTE}`, "warn");
        else if (voided.body.pos === "cancelled") showMessage(`${orderCode(order.id)} was also cancelled in the POS.`);
      }
    } catch (e) {
      setBusy(false);
      if (isStateConflict(e)) {
        showMessage("Someone already updated this order. We refreshed it for you.", "warn");
        void d.refresh();
        onClose();
      } else {
        setError("Couldn't save. Check your connection and try again.");
      }
    }
  };

  return (
    <div className="d-overlay" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="d-dialog" role="dialog" aria-modal="true" aria-labelledby="reason-title">
        <h3 id="reason-title" style={{ fontSize: 20, fontWeight: 800 }}>
          {verb} order {orderCode(order.id)}?
        </h3>
        <p className="d-small d-muted">
          Call {customerLabel(order)}
          {order.customer_phone ? <> at <PhoneLink number={order.customer_phone} /></> : null} to tell them. This can't be undone.
        </p>
        <div>
          <label className="d-label" htmlFor="reason">
            Reason (required)
          </label>
          <textarea id="reason" ref={field} value={reason} maxLength={200} placeholder="For example: out of banana bread today" onChange={e => setReason(e.target.value)} />
          <div className={`d-counter${reason.length > 190 ? " d-over" : ""}`}>{reason.length} / 200</div>
        </div>
        {error ? <div className="d-error" role="alert">{error}</div> : null}
        <div className="d-row">
          <Button kind="secondary" grow onClick={onClose} disabled={busy}>
            Keep order
          </Button>
          <Button kind="solid-danger" grow onClick={submit} disabled={busy}>
            {busy ? "Saving…" : `${verb} order`}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Sends an order to the kitchen (POS or Kitchen screen) and says how it went. */
export function useSendToKitchen(order: Order) {
  const d = useDashboard();
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (busy) return; // a second tap while sending does nothing (and the server makes one ticket anyway)
    setBusy(true);
    try {
      const { text, tone } = sendResultMessage(await d.sendToPos(order));
      showMessage(`${orderCode(order.id)}: ${text}`, tone);
    } finally {
      setBusy(false);
    }
  };
  return { send, busy };
}

/** "Send to kitchen": one tap, no retyping. The order is "In the kitchen" only once the POS or kitchen screen has it. */
export function SendToPosButton({ order, size, spaced }: { order: Order; size?: "lg"; spaced?: boolean }) {
  const { send, busy } = useSendToKitchen(order);
  return (
    <Button kind="primary" size={size} grow className={spaced ? "d-sp" : ""} onClick={() => void send()} disabled={busy}>
      {busy ? "Sending…" : "Send to kitchen"}
    </Button>
  );
}

/** The order's kitchen status: sent, or didn't reach the kitchen (enter it by hand), and why. */
export function PosStatus({ order }: { order: Order }) {
  const d = useDashboard();
  const line = posStatusLine(posJobFor(order, d.data.posJobs), d.data.pos?.provider, d.displayState(order), d.now);
  if (!line) return null;
  return (
    <div className={`d-posline d-pos-${line.tone}`} role={line.tone === "red" ? "alert" : undefined}>
      <Icon name={line.tone === "red" ? "alert" : "clipboard"} size="s" />
      <span>
        <b>{line.text}</b>
        {line.detail ? <> · {line.detail}</> : null}
      </span>
    </div>
  );
}

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
}

/** The "⋯" button: the less common actions, out of the way but one tap from anywhere. */
export function MoreMenu({ items, size }: { items: MenuItem[]; size?: "lg" }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  if (items.length === 0) return null;
  return (
    <div className="d-more" ref={ref}>
      <button
        type="button"
        className={`d-btn d-secondary d-more-btn${size === "lg" ? " d-lg" : ""}`}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="5" cy="12" r="1.9" fill="currentColor" />
          <circle cx="12" cy="12" r="1.9" fill="currentColor" />
          <circle cx="19" cy="12" r="1.9" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div className="d-omenu" role="menu">
          {items.map(item =>
            item.href ? (
              <a key={item.label} role="menuitem" className={`d-menu-item${item.danger ? " d-danger" : ""}`} href={item.href} onClick={close}>
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`d-menu-item${item.danger ? " d-danger" : ""}`}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

const REJECT: OrderAction = { to: "rejected", label: "Can't make it (reject)", reason: null, kind: "reject" };
const CANCEL: OrderAction = { to: "cancelled", label: "Guest cancelled", reason: null, kind: "cancel" };

/**
 * One big button for the step the order is at, and everything else behind "⋯".
 *   To check        Send to kitchen (or Entered in POS without a kitchen link; Call guest for after-hours)
 *   In the kitchen  Picked up
 *   Call the guest  Call back
 */
export function OrderActions({ order, big, inPanel }: { order: Order; big?: boolean; inPanel?: boolean }) {
  const d = useDashboard();
  const [dialog, setDialog] = useState<OrderAction | null>(null);
  const kitchen = useSendToKitchen(order);
  const waiting = d.undo.pending(order.id);
  const size = big ? "lg" : undefined;
  if (waiting) {
    return <span className="d-small d-muted">Saving {waiting.label.toLowerCase()}… tap Undo below to stop it.</span>;
  }
  const posSend = canSendToPos(order.state, d.data.pos, posJobFor(order, d.data.posJobs));
  const after = order.intake_mode === "after_hours_request";
  const phone = order.customer_phone ? telHref(order.customer_phone) : null;
  const first = (order.customer_name ?? "the guest").split(" ")[0];
  const enterByHand = () => d.startStep(order, "pos_entered", "staff_entered_in_pos", "Entered in POS");
  const open: MenuItem[] = inPanel ? [] : [{ label: "Open details", href: hrefTo(`/orders/${order.id}`) }];
  const callItem: MenuItem[] = phone ? [{ label: `Call ${first}`, href: phone }] : [];

  let primary: ReactNode = null;
  let menu: MenuItem[] = [];
  const payment = paymentFor(order, d.data.payments);
  const stage = payStage(order, payment);
  const markPaid = (how: "link" | "in_person") =>
    void paymentMarkPaid(order.restaurant_id, order.id, how).then(
      () => {
        showMessage(`${orderCode(order.id)}: paid. Now send it to the kitchen.`);
        void d.refresh();
      },
      () => showMessage("Couldn't save. Check your connection and try again.", "warn"),
    );
  const link = d.data.payFirst?.link ?? null;
  const textHref = link && order.customer_phone ? smsHref(order.customer_phone, payMessage({ order, restaurantName: d.restaurant?.name ?? "the restaurant", link })) : null;
  const noteSent = () => void paymentLinkSent(order.restaurant_id, order.id).then(() => d.refresh(), () => undefined);

  if (order.state === "pending_staff_review" && (stage === "send_link" || stage === "waiting")) {
    // Pay first: 1 text the link, 2 mark paid, then (paid) the usual Send to kitchen.
    if (stage === "send_link" && textHref) {
      primary = (
        <a className={`d-btn d-primary d-grow${big ? " d-lg" : ""}`} href={textHref} onClick={noteSent}>
          <Icon name="message" />
          Text the pay link
        </a>
      );
    } else {
      primary = (
        <Button kind="primary" size={size} grow onClick={() => markPaid("link")}>
          Mark paid
        </Button>
      );
    }
    const sendAnyway: MenuItem = posSend
      ? { label: "Send to kitchen without payment", onSelect: () => void kitchen.send() }
      : { label: "Entered in POS without payment", onSelect: enterByHand };
    menu = [
      ...(stage === "waiting" && textHref ? [{ label: "Text the pay link again", href: textHref }] : []),
      ...(stage === "send_link" && textHref ? [{ label: "Mark paid", onSelect: () => markPaid("link") }] : []),
      { label: "Paid in person", onSelect: () => markPaid("in_person") },
      sendAnyway,
      ...callItem,
      ...open,
      { label: `${REJECT.label}…`, onSelect: () => setDialog(REJECT), danger: true },
      { label: `${CANCEL.label}…`, onSelect: () => setDialog(CANCEL), danger: true },
    ];
  } else if (order.state === "pending_staff_review") {
    const sendItem: MenuItem = posSend ? { label: "Send to kitchen", onSelect: () => void kitchen.send() } : { label: "Entered in POS", onSelect: enterByHand };
    if (after && phone) {
      primary = (
        <a className={`d-btn d-primary d-grow${big ? " d-lg" : ""}`} href={phone}>
          <Icon name="phone" />
          Call guest to confirm
        </a>
      );
      menu = [sendItem, ...(posSend ? [{ label: "Entered in POS by hand", onSelect: enterByHand }] : []), ...open];
    } else {
      primary = posSend ? (
        <SendToPosButton order={order} size={size} />
      ) : (
        <Button kind="primary" size={size} grow onClick={enterByHand}>
          Entered in POS
        </Button>
      );
      menu = [...(posSend ? [{ label: "Entered in POS by hand", onSelect: enterByHand }] : []), ...callItem, ...open];
    }
    menu = [...menu, { label: `${REJECT.label}…`, onSelect: () => setDialog(REJECT), danger: true }, { label: `${CANCEL.label}…`, onSelect: () => setDialog(CANCEL), danger: true }];
  } else if (order.state === "pos_entered" || order.state === "pos_accepted") {
    primary = (
      <Button kind="primary" size={size} grow onClick={() => d.startPickedUp(order)}>
        Picked up
      </Button>
    );
    const kitchenHasIt: MenuItem[] =
      order.state === "pos_entered" && d.data.pos?.provider !== "kitchen_screen"
        ? [{ label: "Kitchen has it", onSelect: () => d.startStep(order, "pos_accepted", "staff_accepted_in_pos", "Kitchen has it") }]
        : [];
    const reprint: MenuItem[] = d.data.pos?.kitchen_tickets
      ? [
          {
            label: "Print kitchen ticket again",
            onSelect: () =>
              void reprintTicket(order.restaurant_id, order.id).then(
                () => {
                  showMessage(`${orderCode(order.id)}: another copy is on its way to the printer (it says REPRINT).`);
                  void d.refresh();
                },
                () => showMessage("Couldn't ask the printer. Check your connection.", "warn"),
              ),
          },
        ]
      : [];
    menu = [
      ...kitchenHasIt,
      ...reprint,
      ...callItem,
      ...open,
      ...(order.state === "pos_entered" ? [{ label: `${REJECT.label}…`, onSelect: () => setDialog(REJECT), danger: true }] : []),
      { label: `${CANCEL.label}…`, onSelect: () => setDialog(CANCEL), danger: true },
    ];
  } else if (order.state === "escalated" && phone) {
    primary = (
      <a className={`d-btn d-primary d-grow${big ? " d-lg" : ""}`} href={phone}>
        <Icon name="phone" />
        Call back
      </a>
    );
    menu = open;
  } else {
    menu = open;
    if (inPanel) return null;
  }
  return (
    <div className="d-actions">
      {primary}
      <MoreMenu items={menu} size={size} />
      {dialog ? <ReasonDialog order={order} action={dialog} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

/** An order on the Today board: what it is, why it waits (To check), and one big button. */
export function ReviewCard({ order, inProgress = false }: { order: Order; inProgress?: boolean }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const state = d.displayState(order);
  const waited = minutesSince(order.created_at, d.now);
  const tone = inProgress ? "normal" : waitTone(waited);
  const after = order.intake_mode === "after_hours_request";
  const deadline = order.staff_review_deadline ? countdown(order.staff_review_deadline, d.now) : null;
  const pulse = state === "pending_staff_review" && !after && shouldPulse(waited);
  const step = kitchenStep(state);
  const pickup = after && order.requested_pickup_time
    ? dayAndTime(order.requested_pickup_time, d.now, tz)
    : order.requested_pickup_time
      ? formatTime(order.requested_pickup_time, tz)
      : "ASAP";

  return (
    <article className={`d-card d-ocard${tone !== "normal" ? " d-attn" : ""}${pulse ? " d-pulse" : ""}`}>
      <div className="d-row d-wrap">
        <Link href={`${BASE}/orders/${order.id}`} className="d-code">{orderCode(order.id)}</Link>
        {step ? <span className={`d-step${step === "Sent" ? "" : " d-step-has"}`}>{step}</span> : null}
        {posJobFor(order, d.data.posJobs)?.requested_by_kind === "pos_integration" ? <span className="d-step d-step-auto">Auto-sent</span> : null}
        {order.payment_method === "payment_link" ? (
          <span className={`d-step d-step-pay${payStage(order, paymentFor(order, d.data.payments)) === "paid" ? " d-paid" : ""}`}>
            {payStage(order, paymentFor(order, d.data.payments)) === "paid" ? "Paid" : "Pay first"}
          </span>
        ) : null}
        {after ? (
          <Pill tone="purple" icon="moon">
            Request for later
          </Pill>
        ) : null}
        <span className={`d-sp d-wait d-wait-${tone}`}>
          {inProgress ? formatTime(order.created_at, tz) : waited < 1 ? "Just now" : `Waiting ${waited} min`}
        </span>
      </div>
      <h3 className="d-name">
        <Link href={`${BASE}/orders/${order.id}`}>{customerLabel(order)}</Link>
      </h3>
      {order.allergy_note ? (
        <div>
          <AllergyBadge note={order.allergy_note} />
        </div>
      ) : null}
      <p className="d-sum">{orderSummary(order)}</p>
      <p className="d-small d-muted" style={{ margin: 0 }}>
        <b style={{ color: "var(--text)" }}>{formatMoney(order.subtotal_cents, order.currency)}</b> · Pickup {pickup}
        {after && order.staff_review_deadline && deadline ? (
          <span style={deadline.overdue ? { color: "var(--red-fg)", fontWeight: 700 } : undefined}> · confirm by {formatTime(order.staff_review_deadline, tz)}</span>
        ) : null}
      </p>
      <PosStatus order={order} />
      {(() => {
        const line = payLine(payStage(order, paymentFor(order, d.data.payments)), paymentFor(order, d.data.payments), iso => formatTime(iso, tz));
        return line ? <p className="d-small d-payline" style={{ margin: 0 }}>{line}</p> : null;
      })()}
      {(() => {
        const t = ticketLine(d.data.printJobs, order.id, iso => formatTime(iso, tz));
        return t ? <p className={`d-small ${t.bad ? "d-ticket-bad" : "d-muted"}`} style={{ margin: 0 }}>{t.text}</p> : null;
      })()}
      {state === "pending_staff_review" ? (
        <div className="d-why">
          <Icon name="info" size="s" />
          <span>
            <b>Why it waits for you:</b> {whyItWaits(order, { autoSend: d.data.pos?.auto_send === true })}
          </span>
        </div>
      ) : null}
      <OrderActions order={order} big={!inProgress && !after} />
    </article>
  );
}

/** A reservation request. Brio never books a table: staff call the guest, then mark it. */
export function ReservationCard({ request }: { request: GuestRequest }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [busy, setBusy] = useState<RequestStatus | null>(null);
  const style = REQUEST_STATUS[request.status];
  const pendingNow = request.status === "pending_staff_review";
  const set = useRequestStatus(request, setBusy);
  const buttons: { to: RequestStatus; label: string; kind: "primary" | "secondary" }[] = [
    { to: "confirmed", label: "Confirmed", kind: "primary" },
    { to: "declined", label: "Declined", kind: "secondary" },
    { to: "called_back", label: "Called back", kind: "secondary" },
    { to: "cancelled", label: "Cancelled", kind: "secondary" },
  ];
  return (
    <article className="d-card">
      <div className="d-row">
        <Pill tone={style.tone} icon={pendingNow ? "clock" : "check"}>
          {style.label}
        </Pill>
        <span className="d-sp d-small d-muted">Requested {relativeAndTime(request.created_at, d.now, tz)}</span>
      </div>
      <div className="d-row d-wrap">
        <h3 className="d-name">{request.customer_name}</h3>
        <span className="d-sp d-name d-s">
          {request.party_size ? `${request.party_size} ${request.party_size === 1 ? "person" : "people"}` : "Party size not given"}
          {request.requested_time ? <span className="d-hide-phone"> · {formatTime(request.requested_time, tz)}</span> : null}
        </span>
      </div>
      <div className="d-meta">
        {request.requested_time ? <b>{dayAndTime(request.requested_time, d.now, tz)}</b> : <span>No time given</span>}
        <PhoneLink number={request.customer_phone} />
      </div>
      {request.allergy_note ? (
        <div>
          <AllergyBadge note={request.allergy_note} />
        </div>
      ) : null}
      {request.note ? (
        <p className="d-sum">
          <b>Note:</b> {request.note}
        </p>
      ) : null}
      {pendingNow ? <p className="d-small d-faint">Call the guest to confirm, then mark it.</p> : null}
      <div className="d-row d-wrap">
        {buttons
          .filter(b => b.to !== request.status)
          .map(b => (
            <Button key={b.to} kind={pendingNow ? b.kind : "secondary"} size="sm" grow disabled={busy !== null} onClick={() => set(b.to)}>
              {busy === b.to ? "Saving…" : b.label}
            </Button>
          ))}
      </div>
    </article>
  );
}

/** Marks a request or message with a new status, with a clear message if it fails. */
export function useRequestStatus(request: GuestRequest, setBusy: (s: RequestStatus | null) => void) {
  const d = useDashboard();
  return async (to: RequestStatus) => {
    setBusy(to);
    try {
      await setRequestStatus(request.restaurant_id, request.id, to);
      await d.refresh();
    } catch {
      showMessage("Couldn't save. Check your connection and try again.", "warn");
    } finally {
      setBusy(null);
    }
  };
}

export const TOPIC_ICON: Record<MessageTopic, IconKey> = {
  general: "message",
  complaint: "flag",
  order_issue: "alert",
  catering: "users",
  lost_and_found: "search",
  delivery: "bag",
  job_inquiry: "briefcase",
  sales: "ban",
};

const TOPIC_TONE: Record<MessageTopic, "red" | "amber" | "blue" | "gray" | "purple"> = {
  general: "gray",
  complaint: "red",
  order_issue: "amber",
  catering: "purple",
  lost_and_found: "blue",
  delivery: "blue",
  job_inquiry: "gray",
  sales: "gray",
};

/** A message Brio passed on. */
export function MessageCard({ request, compact }: { request: GuestRequest; compact?: boolean }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [busy, setBusy] = useState<RequestStatus | null>(null);
  const set = useRequestStatus(request, setBusy);
  const topic = topicOf(request);
  const status = MESSAGE_STATUS[request.status];
  const pendingNow = request.status === "pending_staff_review";
  const actions: { to: RequestStatus; label: string; kind: "primary" | "secondary" }[] = [
    { to: "called_back", label: "Called back", kind: "primary" },
    { to: "confirmed", label: "Handled", kind: "secondary" },
    { to: "declined", label: "Not interested", kind: "secondary" },
    { to: "cancelled", label: "Cancel", kind: "secondary" },
  ];
  return (
    <article className="d-card">
      <div className="d-row d-wrap">
        <Pill tone={TOPIC_TONE[topic]} icon={TOPIC_ICON[topic]}>
          {TOPIC_LABEL[topic]}
        </Pill>
        {!pendingNow ? <Pill tone={status.tone}>{status.label}</Pill> : null}
        <span className="d-sp d-small d-muted">{relativeAndTime(request.created_at, d.now, tz)}</span>
      </div>
      <div className="d-row d-wrap">
        <h3 className="d-name d-s">{request.customer_name}</h3>
        <span className="d-sp">
          <PhoneLink number={request.customer_phone} />
        </span>
      </div>
      {request.note ? <p className="d-sum">“{request.note}”</p> : <p className="d-small d-muted">No message left.</p>}
      {request.call_id && !compact ? (
        <Link className="d-small d-muted" href={`${BASE}/calls/${request.call_id}`} style={{ textDecoration: "underline" }}>
          Open the call
        </Link>
      ) : null}
      {pendingNow ? (
        <div className="d-row d-wrap">
          {actions.slice(0, compact ? 2 : 4).map(a => (
            <Button key={a.to} kind={a.kind} size="sm" grow disabled={busy !== null} onClick={() => set(a.to)}>
              {busy === a.to ? "Saving…" : a.label}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function Collapsible({ title, count, icon, children, defaultOpen = false }: { title: string; count: number; icon: IconKey; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="d-list">
      <button type="button" className="d-tr" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{ gridTemplateColumns: "24px 1fr auto 20px", minHeight: 52, width: "100%" }}>
        <Icon name={icon} className="d-muted" />
        <span className="d-t1">{title}</span>
        <span className="d-small d-muted">
          {count} · lower priority
        </span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size="s" className="d-muted" />
      </button>
      {open ? <div className="d-stack" style={{ padding: 12 }}>{children}</div> : null}
    </div>
  );
}

export function dayHeading(value: string, tz: string): string {
  return longDay(value, tz);
}

/** Who called, for escalated orders with no name: the caller number from the call log. */
export function escalatedCaller(order: Order, calls: { call_id: string; from_number: string | null; caller_name: string | null }[]): string {
  const call = order.call_id ? calls.find(c => c.call_id === order.call_id) : undefined;
  return callerLabel(order.customer_name ?? call?.caller_name, order.customer_phone ?? call?.from_number);
}
