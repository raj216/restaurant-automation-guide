// Now: the live board. One glance tells the host what needs doing.

import { useMemo, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { callTime } from "../lib/labels";
import { isLowPriorityTopic, TOPIC_LABEL, TOPIC_ORDER, topicOf } from "../lib/labels";
import { computeInsights } from "../lib/insights";
import { needsReview, recentEscalated, sortNewestFirst, sortOldestFirst } from "../lib/orders";
import { prefs } from "../lib/prefs";
import { orderCode, telHref } from "../lib/format";
import { formatTime, relativeAndTime, relative } from "../lib/time";
import { Button, Empty, Icon, OrderStatusPill, SectionHeader, Skeletons } from "../ui";
import { Collapsible, escalatedCaller, MessageCard, ReservationCard, ReviewCard, TOPIC_ICON } from "../parts";
import type { GuestRequest, MessageTopic } from "../lib/types";

export default function Now() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [dismissed, setDismissed] = useState(() => prefs.getDismissed());

  const review = useMemo(() => sortOldestFirst(d.data.orders.filter(needsReview)), [d.data.orders]);
  const escalated = useMemo(
    () => sortNewestFirst(d.data.orders.filter(o => recentEscalated(o, d.now) && !dismissed.has(o.id))),
    [d.data.orders, d.now, dismissed],
  );
  const reservations = useMemo(
    () =>
      d.data.requests
        .filter(r => r.kind === "reservation" && r.status === "pending_staff_review")
        .sort((a, b) => new Date(a.requested_time ?? a.created_at).getTime() - new Date(b.requested_time ?? b.created_at).getTime()),
    [d.data.requests],
  );
  const messages = useMemo(() => d.data.requests.filter(r => r.kind === "callback" && r.status === "pending_staff_review"), [d.data.requests]);
  const byTopic = useMemo(() => {
    const groups = new Map<MessageTopic, GuestRequest[]>();
    for (const m of sortNewestFirst(messages)) {
      const t = topicOf(m);
      groups.set(t, [...(groups.get(t) ?? []), m]);
    }
    return TOPIC_ORDER.filter(t => groups.has(t)).map(t => ({ topic: t, items: groups.get(t)! }));
  }, [messages]);

  const today = useMemo(() => computeInsights(d.data, "today", d.now, tz), [d.data, d.now, tz]);
  const everythingClear = review.length + escalated.length + reservations.length + messages.length === 0;
  const lastCall = useMemo(() => [...d.data.calls].filter(c => c.call_type !== "web_call").sort((a, b) => new Date(callTime(b)).getTime() - new Date(callTime(a)).getTime())[0], [d.data.calls]);

  if (!d.loaded && !d.offline) {
    return (
      <main className="d-content">
        <div className="d-now-grid" style={{ width: "100%" }}>
          <Skeletons count={3} />
          <Skeletons count={3} />
        </div>
      </main>
    );
  }

  return (
    <main className="d-content">
      <div className="d-now-grid">
        <div className="d-col">
          <SectionHeader title="Orders waiting for review" count={review.length} />
          {review.length === 0 ? <Empty title="No orders waiting">Orders Brio takes will show up here the moment they come in.</Empty> : null}
          {review.map(o => (
            <ReviewCard key={o.id} order={o} />
          ))}

          {escalated.length > 0 ? (
            <>
              <SectionHeader title="Needs a person" count={escalated.length} />
              {escalated.map(o => {
                const who = escalatedCaller(o, d.data.calls);
                const number = o.customer_phone ?? d.data.calls.find(c => c.call_id === o.call_id)?.from_number ?? null;
                return (
                  <article className="d-card" key={o.id}>
                    <div className="d-row d-wrap">
                      <span className="d-code">{orderCode(o.id)}</span>
                      <OrderStatusPill state={o.state} />
                      <span className="d-sp d-small d-muted">{relativeAndTime(o.created_at, d.now, tz)}</span>
                    </div>
                    <h3 className="d-name d-s">{who}</h3>
                    <p className="d-small d-muted">Brio couldn't finish this call. The guest may be waiting for a call back.</p>
                    <div className="d-row d-wrap">
                      {number ? (
                        <a className="d-btn d-primary d-sm" href={telHref(number)}>
                          <Icon name="phone" />
                          Call back
                        </a>
                      ) : null}
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setDismissed(prefs.addDismissed(o.id))}
                      >
                        Dismiss
                      </Button>
                      <span className="d-sp d-small d-faint">Hides on this device only</span>
                    </div>
                  </article>
                );
              })}
            </>
          ) : null}
        </div>

        <div className="d-col">
          <SectionHeader title="Reservation requests" count={reservations.length} />
          {reservations.length === 0 ? <Empty title="No requests to confirm" /> : null}
          {reservations.map(r => (
            <ReservationCard key={r.id} request={r} />
          ))}

          <SectionHeader title="Messages to handle" count={messages.length} />
          {messages.length === 0 ? <Empty title="No messages" /> : null}
          {byTopic.map(({ topic, items }) =>
            isLowPriorityTopic(topic) ? (
              <Collapsible key={topic} title={TOPIC_LABEL[topic]} count={items.length} icon={TOPIC_ICON[topic]}>
                {items.map(m => (
                  <MessageCard key={m.id} request={m} compact />
                ))}
              </Collapsible>
            ) : (
              items.map(m => <MessageCard key={m.id} request={m} />)
            ),
          )}

          <SectionHeader title="Brio today" />
          <div className="d-card" style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div className="d-big">{today.callsAnswered}</div>
              <div className="d-small d-muted">calls answered</div>
            </div>
            <div>
              <div className="d-big">{today.ordersSent}</div>
              <div className="d-small d-muted">orders sent for review</div>
            </div>
            <div>
              <div className="d-big">{today.spamBlocked}</div>
              <div className="d-small d-muted">spam {today.spamBlocked === 1 ? "call" : "calls"} blocked</div>
            </div>
          </div>
        </div>
      </div>

      {everythingClear ? (
        <div className="d-empty d-card" style={{ width: "100%" }}>
          <h3>All caught up. Brio is answering calls.</h3>
          <p>{lastCall ? `Last call ${relative(callTime(lastCall), d.now)} · ${formatTime(callTime(lastCall), tz)}.` : "No calls yet."}</p>
        </div>
      ) : null}
    </main>
  );
}
