// Cards and dialogs shared by several screens.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useDashboard } from "./DashboardContext";
import { BASE } from "./Shell";
import { isStateConflict, setRequestStatus } from "./lib/data";
import { callerLabel, customerLabel, formatMoney, formatPhone, looksLikeCardNumber, orderCode, orderSummary, telHref } from "./lib/format";
import { MESSAGE_STATUS, REQUEST_STATUS, TOPIC_LABEL, topicOf } from "./lib/labels";
import { actionsFor, shouldPulse, waitTone, type OrderAction } from "./lib/orders";
import { countdown, dayAndTime, formatTime, longDay, minutesSince, relativeAndTime } from "./lib/time";
import type { GuestRequest, MessageTopic, Order, RequestStatus } from "./lib/types";
import { AllergyBadge, Button, Icon, OrderStatusPill, Pill, type IconKey } from "./ui";
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
          <textarea id="reason" ref={field} value={reason} maxLength={200} placeholder="For example: out of the rigatoni tonight" onChange={e => setReason(e.target.value)} />
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

/** The buttons for an order, by state. Forward steps wait 5 seconds so staff can Undo. */
export function OrderActions({ order, big }: { order: Order; big?: boolean }) {
  const d = useDashboard();
  const [dialog, setDialog] = useState<OrderAction | null>(null);
  const waiting = d.undo.pending(order.id);
  const actions = actionsFor(order.state);
  if (actions.length === 0) return null;
  if (waiting) {
    return <span className="d-small d-muted">Saving {waiting.label.toLowerCase()}… tap Undo below to stop it.</span>;
  }
  return (
    <>
      {actions.map(a =>
        a.kind === "forward" ? (
          <Button key={a.to} kind="primary" size={big ? "lg" : undefined} onClick={() => d.startStep(order, a.to, a.reason ?? "staff_update", a.label)}>
            {a.label}
          </Button>
        ) : (
          <Button key={a.to} kind={a.kind === "reject" ? "danger" : "secondary"} size={big ? "lg" : undefined} onClick={() => setDialog(a)}>
            {a.label}
          </Button>
        ),
      )}
      {dialog ? <ReasonDialog order={order} action={dialog} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

/** An order waiting for review, as it appears on the live board. */
export function ReviewCard({ order }: { order: Order }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const state = d.displayState(order);
  const waited = minutesSince(order.created_at, d.now);
  const tone = waitTone(waited);
  const after = order.intake_mode === "after_hours_request";
  const deadline = order.staff_review_deadline ? countdown(order.staff_review_deadline, d.now) : null;
  const pulse = state === "pending_staff_review" && !after && shouldPulse(waited);
  const first = actionsFor(order.state).find(a => a.kind === "forward");
  const waiting = d.undo.pending(order.id);

  return (
    <article className={`d-card${tone !== "normal" ? " d-attn" : ""}${pulse ? " d-pulse" : ""}`}>
      <div className="d-row d-wrap">
        <Link href={`${BASE}/orders/${order.id}`} className="d-code">{orderCode(order.id)}</Link>
        <OrderStatusPill state={state} />
        {after ? (
          <Pill tone="purple" icon="moon">
            After-hours request
          </Pill>
        ) : null}
        <span className={`d-sp d-pill ${tone === "red" ? "d-p-red" : tone === "amber" ? "d-p-amber" : "d-p-gray"}`}>
          <Icon name="clock" />
          Waiting {waited < 1 ? "<1" : waited} min<span className="d-hide-phone"> · {formatTime(order.created_at, tz)}</span>
        </span>
      </div>
      <div className="d-row d-namerow">
        <h3 className="d-name">
          <Link href={`${BASE}/orders/${order.id}`}>{customerLabel(order)}</Link>
        </h3>
        {order.allergy_note ? (
          <span className="d-sp">
            <AllergyBadge note={order.allergy_note} />
          </span>
        ) : null}
      </div>
      <p className="d-sum">{orderSummary(order)}</p>
      <div className="d-meta">
        <span>
          <b>{formatMoney(order.subtotal_cents, order.currency)}</b> before tax
        </span>
        {after && order.requested_pickup_time ? (
          <span>
            Requested for <b>{dayAndTime(order.requested_pickup_time, d.now, tz)}</b>
          </span>
        ) : (
          <span>
            Pickup: <b>{order.requested_pickup_time ? formatTime(order.requested_pickup_time, tz) : "As soon as possible"}</b>
          </span>
        )}
        {after && order.staff_review_deadline && deadline ? (
          <span style={deadline.overdue ? { color: "var(--red-fg)", fontWeight: 700 } : undefined}>
            Review by <b style={{ color: "inherit" }}>{formatTime(order.staff_review_deadline, tz)}</b> · {deadline.text}
          </span>
        ) : null}
      </div>
      <div className="d-row d-wrap">
        {after && order.customer_phone ? (
          <a className="d-btn d-secondary" href={telHref(order.customer_phone)}>
            <Icon name="phone" />
            Call guest to confirm
          </a>
        ) : null}
        {first && !waiting ? (
          <Button kind="primary" size={after ? undefined : "lg"} className="d-sp" onClick={() => d.startStep(order, first.to, first.reason ?? "staff_update", first.label)}>
            {first.label}
          </Button>
        ) : waiting ? (
          <span className="d-sp d-small d-muted">Saving… Undo is at the bottom of the screen.</span>
        ) : null}
        <Link href={`${BASE}/orders/${order.id}`} className="d-btn d-ghost d-sm">
          Open
        </Link>
      </div>
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
