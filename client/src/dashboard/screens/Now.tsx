// Today: the one live board. Orders move left to right through three lanes,
//   To check → In the kitchen → Picked up,
// with everyone to call back on the side, and one sentence from Brio on top saying what
// to do first. Each order lives here and nowhere else live; Orders is the history.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useDashboard } from "../DashboardContext";
import { BASE } from "../Shell";
import { computeInsights } from "../lib/insights";
import { needsReview, recentInProgress, sortOldestFirst } from "../lib/orders";
import { minutesSince } from "../lib/time";
import { brioLine } from "../lib/today";
import { ReviewCard } from "../parts";
import { Empty, Skeletons } from "../ui";
import { CallbackRow, useCallbacks } from "./Callbacks";

type Lane = "check" | "kitchen" | "callback";

export default function Now() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [lane, setLane] = useState<Lane>("check");

  const withState = (o: (typeof d.data.orders)[number]) => ({ ...o, state: d.displayState(o) });
  const check = useMemo(() => sortOldestFirst(d.data.orders.map(withState).filter(needsReview)), [d.data.orders, d.pending]); // eslint-disable-line react-hooks/exhaustive-deps
  const kitchen = useMemo(
    () => sortOldestFirst(d.data.orders.map(withState).filter(o => recentInProgress(o, d.now))),
    [d.data.orders, d.now, d.pending], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const pickedToday = useMemo(() => computeInsights(d.data, "today", d.now, tz), [d.data, d.now, tz]);
  const pickedUpCount = useMemo(
    () => d.data.orders.filter(o => d.displayState(o) === "fulfilled" && d.now.getTime() - new Date(o.updated_at).getTime() < 12 * 3600_000).length,
    [d],
  );
  const { items: callbacks, dismiss } = useCallbacks(true);
  const line = brioLine({ check, kitchenCount: kitchen.length, callbacks, minutesWaited: o => minutesSince(o.created_at, d.now) });

  if (!d.loaded && !d.offline) {
    return (
      <main className="d-content">
        <div className="d-today" style={{ width: "100%" }}>
          <Skeletons count={3} />
          <Skeletons count={3} />
        </div>
      </main>
    );
  }

  return (
    <main className="d-content d-col-flow">
      <div className="d-brio" role="status">
        <span className="d-brio-dot" aria-hidden="true">
          B
        </span>
        <span>
          <b>Brio:</b> {line}
        </span>
      </div>

      <div className="d-lane-tabs" role="tablist" aria-label="Lanes">
        <button type="button" role="tab" aria-selected={lane === "check"} className={lane === "check" ? "d-on" : ""} onClick={() => setLane("check")}>
          To check · {check.length}
        </button>
        <button type="button" role="tab" aria-selected={lane === "kitchen"} className={lane === "kitchen" ? "d-on" : ""} onClick={() => setLane("kitchen")}>
          Kitchen · {kitchen.length}
        </button>
        <button type="button" role="tab" aria-selected={lane === "callback"} className={lane === "callback" ? "d-on" : ""} onClick={() => setLane("callback")}>
          Call back · {callbacks.length}
        </button>
      </div>

      <div className="d-today" data-lane={lane}>
        <section className="d-lane d-lane-check" aria-label="To check">
          <h2 className="d-lane-h">
            To check <span className="d-lane-n d-n-amber">{check.length}</span>
            <span className="d-sp d-small d-muted">Oldest first</span>
          </h2>
          {check.length === 0 ? <Empty title="Nothing to check">New orders from Brio land here.</Empty> : null}
          {check.map(o => (
            <ReviewCard key={o.id} order={o} />
          ))}
        </section>

        <section className="d-lane d-lane-kitchen" aria-label="In the kitchen">
          <h2 className="d-lane-h">
            In the kitchen <span className="d-lane-n d-n-blue">{kitchen.length}</span>
          </h2>
          {kitchen.length === 0 ? <Empty title="Nothing in the kitchen" /> : null}
          {kitchen.map(o => (
            <ReviewCard key={o.id} order={o} inProgress />
          ))}
          <Link href={`${BASE}/orders`} className="d-picked">
            <span>Picked up today</span>
            <span>{pickedUpCount} ›</span>
          </Link>
        </section>

        <aside className="d-lane d-lane-callback" aria-label="Call back">
          <h2 className="d-lane-h">
            Call back <span className="d-lane-n d-n-purple">{callbacks.length}</span>
            <Link href={`${BASE}/callbacks`} className="d-sp d-small d-muted">
              See all
            </Link>
          </h2>
          {callbacks.length === 0 ? <Empty title="Nobody to call back" /> : null}
          <div className="d-cb-list">
            {callbacks.map(item => (
              <CallbackRow key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </div>
          <div className="d-stats">
            <div>
              <b>{pickedToday.callsAnswered}</b>
              <span>calls answered</span>
            </div>
            <div>
              <b>{pickedToday.ordersSent}</b>
              <span>orders</span>
            </div>
            <div>
              <b>{pickedToday.spamBlocked}</b>
              <span>spam blocked</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
