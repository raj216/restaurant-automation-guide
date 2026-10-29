// Call back: everyone the restaurant needs to phone, in one list. Messages Brio took,
// table requests (Brio never books a table) and calls Brio couldn't finish. One Call
// button each, and one "Done" menu for what happened.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useDashboard } from "../DashboardContext";
import { BASE } from "../Shell";
import { telHref } from "../lib/format";
import { prefs } from "../lib/prefs";
import { dayAndTime, relativeAndTime } from "../lib/time";
import { callbackItems, partyLine, type CallbackItem } from "../lib/today";
import type { RequestStatus } from "../lib/types";
import { setRequestStatus } from "../lib/data";
import { MoreMenu, type MenuItem } from "../parts";
import { showMessage } from "../Toasts";
import { AllergyBadge, Empty, Icon, Pill } from "../ui";
import { PageHeader } from "./shared";

const MESSAGE_DONE: { to: RequestStatus; label: string }[] = [
  { to: "called_back", label: "Called back" },
  { to: "confirmed", label: "Handled" },
  { to: "declined", label: "Not interested" },
  { to: "cancelled", label: "Cancel" },
];
const TABLE_DONE: { to: RequestStatus; label: string }[] = [
  { to: "confirmed", label: "Table confirmed" },
  { to: "declined", label: "Declined" },
  { to: "called_back", label: "Called back" },
  { to: "cancelled", label: "Cancelled" },
];

/** The list's items, worked out the same way on Today and on the Call back page. */
export function useCallbacks(pendingOnly: boolean) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [dismissed, setDismissed] = useState(() => prefs.getDismissed());
  const items = useMemo(
    () =>
      callbackItems(d.data.requests, d.data.orders, d.data.calls, {
        pendingOnly,
        dismissed,
        now: d.now,
        partyText: r => partyLine(r.party_size, r.requested_time ? dayAndTime(r.requested_time, d.now, tz) : null),
      }),
    [d.data, d.now, tz, pendingOnly, dismissed],
  );
  return { items, dismiss: (orderId: string) => setDismissed(prefs.addDismissed(orderId)) };
}

export function CallbackRow({ item, onDismiss }: { item: CallbackItem; onDismiss: (orderId: string) => void }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [busy, setBusy] = useState(false);
  const mark = async (to: RequestStatus) => {
    const request = item.request;
    if (!request) return;
    setBusy(true);
    try {
      await setRequestStatus(request.restaurant_id, request.id, to);
      await d.refresh();
    } catch {
      showMessage("Couldn't save. Check your connection and try again.", "warn");
    } finally {
      setBusy(false);
    }
  };
  const done: MenuItem[] = item.request
    ? (item.kind === "reservation" ? TABLE_DONE : MESSAGE_DONE)
        .filter(a => a.to !== item.request!.status)
        .map(a => ({ label: a.label, onSelect: () => void mark(a.to) }))
    : item.order
      ? [{ label: "Done: hide it", onSelect: () => onDismiss(item.order!.id) }]
      : [];
  const callId = item.request?.call_id ?? item.order?.call_id;
  if (callId) done.push({ label: "Open the call", href: `${BASE}/calls/${callId}` });
  return (
    <article className="d-cb">
      <div className="d-row d-wrap">
        <Pill tone={item.tone}>{item.tag}</Pill>
        {!item.pending ? <Pill tone="gray">Done</Pill> : null}
        <span className="d-sp d-small d-muted">{relativeAndTime(item.at, d.now, tz)}</span>
      </div>
      <b className="d-cb-who">{item.who}</b>
      <p className="d-sum" style={{ margin: 0 }}>
        {item.what}
      </p>
      {item.request?.allergy_note ? (
        <div>
          <AllergyBadge note={item.request.allergy_note} />
        </div>
      ) : null}
      {item.pending ? (
        <div className="d-actions">
          {item.phone ? (
            <a className="d-btn d-dark-btn d-grow" href={telHref(item.phone)}>
              <Icon name="phone" />
              Call
            </a>
          ) : (
            <span className="d-small d-muted d-grow">No number left</span>
          )}
          {busy ? <span className="d-small d-muted">Saving…</span> : <MoreMenu items={done} />}
        </div>
      ) : null}
    </article>
  );
}

export default function Callbacks() {
  const [all, setAll] = useState(false);
  const { items, dismiss } = useCallbacks(!all);
  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Call back" />
      <p className="d-muted" style={{ margin: 0 }}>
        Everyone to phone back: messages, table requests (Brio never books a table) and calls Brio couldn't finish.
      </p>
      <div className="d-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!all} className={`d-tab${!all ? " d-on" : ""}`} onClick={() => setAll(false)}>
          To call
        </button>
        <button type="button" role="tab" aria-selected={all} className={`d-tab${all ? " d-on" : ""}`} onClick={() => setAll(true)}>
          All
        </button>
      </div>
      {items.length === 0 ? (
        <Empty title={all ? "Nothing here yet" : "Nobody to call back"}>Messages and table requests Brio takes show up here.</Empty>
      ) : (
        <div className="d-cb-list" style={{ maxWidth: 760 }}>
          {items.map(item => (
            <CallbackRow key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}
      <Link href={`${BASE}/calls`} className="d-small d-muted" style={{ textDecoration: "underline" }}>
        See every call
      </Link>
    </main>
  );
}
