// Insights: real counts of what Brio did. Nothing is estimated.

import { useEffect, useMemo, useState } from "react";
import { IN_DEMO } from "../base";
import { useDashboard } from "../DashboardContext";
import { fetchInsightsData } from "../lib/data";
import { formatMoney } from "../lib/format";
import { computeInsights, rangeBounds, RANGES, type RangeId } from "../lib/insights";
import type { LiveData } from "../lib/types";
import { CALL_CATEGORY_LABEL } from "../lib/labels";
import { clock12, formatDuration } from "../lib/time";
import { Empty, Skeletons } from "../ui";
import { PageHeader } from "./shared";


export default function Insights() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [range, setRange] = useState<RangeId>("today");
  const restaurantId = d.restaurant?.id ?? "";
  const { start, end } = rangeBounds(range, d.now, tz);
  // The live board holds only the newest few hundred rows, so Insights loads the whole
  // period itself: again when the range or day changes, or when something new happens.
  const periodKey = `${restaurantId}|${start.toISOString()}|${end.toISOString()}`;
  const activity = [d.data.calls, d.data.orders, d.data.requests]
    .map(rows => `${rows.length}:${rows.map(r => ("state" in r ? r.state : "status" in r ? r.status : "")).join(",")}`)
    .join("|");
  const [full, setFull] = useState<{ key: string; data: LiveData } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (IN_DEMO || !restaurantId) return;
    let live = true;
    fetchInsightsData(restaurantId, start, end)
      .then(data => {
        if (!live) return;
        setFull({ key: periodKey, data });
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
    // start/end are derived from periodKey; activity re-runs it when new rows arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey, activity]);
  const ready = full?.key === periodKey ? full.data : null;
  // Demo, or the full load failed: count what the live board has (recent rows only).
  const source = IN_DEMO ? d.data : (ready ?? (failed ? d.data : null));
  const partial = !IN_DEMO && !ready && failed;
  const ins = useMemo(() => computeInsights(source ?? { orders: [], requests: [], calls: [] }, range, d.now, tz), [source, range, d.now, tz]);
  const peak = Math.max(1, ...ins.callsByHour);
  const hours = ins.callsByHour.map((count, hour) => ({ count, hour })).filter(h => h.hour >= 8 || h.count > 0);
  const maxCat = Math.max(1, ...ins.callsByCategory.map(c => c.count));
  const maxDay = Math.max(1, ...ins.ordersByDay.map(c => c.count));
  const currency = d.restaurant?.currency ?? "USD";

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Calls answered", value: String(ins.callsAnswered), sub: "Test calls from the website aren't counted" },
    { label: "Orders sent for review", value: String(ins.ordersSent) },
    { label: "Order value", value: formatMoney(ins.orderValueCents, currency), sub: "Before tax. Rejected and cancelled orders left out" },
    { label: "Reservation requests", value: String(ins.reservationRequests) },
    { label: "Messages", value: String(ins.messages) },
    { label: "Spam calls blocked", value: String(ins.spamBlocked) },
    { label: "Average call length", value: ins.averageCallSeconds == null ? "–" : formatDuration(ins.averageCallSeconds) },
  ];

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Insights" />
      <div className="d-tabs" style={{ overflowX: "auto" }}>
        {RANGES.map(r => (
          <button key={r.id} type="button" className={`d-tab${range === r.id ? " d-on" : ""}`} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {(!d.loaded && !d.offline) || (d.loaded && !source) ? <Skeletons count={3} /> : null}
      {partial ? (
        <p className="d-small d-muted" role="status">
          Couldn't load the whole period, so these numbers count recent activity only. They'll fill in when the connection is back.
        </p>
      ) : null}
      {d.loaded && source ? (
        <>
          <div className="d-stat-grid">
            {stats.map(s => (
              <div className="d-stat" key={s.label}>
                <span className="d-lbl">{s.label}</span>
                <span className="d-big">{s.value}</span>
                {s.sub ? <span className="d-sub">{s.sub}</span> : null}
              </div>
            ))}
          </div>

          <div className="d-chart-grid">
            <section className="d-card">
              <h3 className="d-h3">Calls by hour</h3>
              {ins.callsAnswered === 0 ? (
                <p className="d-small d-muted">No calls in this period.</p>
              ) : (
                <div className="d-bars" role="img" aria-label="Calls by hour of day">
                  {hours.map((h, n) => (
                    <div className={`d-bar${n % 2 ? " d-odd" : ""}`} key={h.hour}>
                      <b>{h.count || ""}</b>
                      <i style={{ height: `${Math.max(2, (h.count / peak) * 100)}%`, opacity: h.count ? 1 : 0.2 }} />
                      <span>{clock12(`${String(h.hour).padStart(2, "0")}:00`).replace(":00", "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="d-card">
              <h3 className="d-h3">What callers wanted</h3>
              {ins.callsByCategory.length === 0 ? <p className="d-small d-muted">No calls in this period.</p> : null}
              <div className="d-stack" style={{ gap: 8 }}>
                {ins.callsByCategory.map(c => (
                  <div className="d-hbar" key={c.category}>
                    <span>{CALL_CATEGORY_LABEL[c.category] ?? "Other"}</span>
                    <i style={{ width: `${(c.count / maxCat) * 100}%` }} />
                    <b>{c.count}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {range === "7d" || range === "30d" ? (
            <section className="d-card" style={{ width: "100%" }}>
              <h3 className="d-h3">Orders by day</h3>
              {ins.ordersByDay.length === 0 ? (
                <Empty title="No orders in this period" />
              ) : (
                <div className="d-bars" role="img" aria-label="Orders per day">
                  {ins.ordersByDay.map((day, n) => (
                    <div className={`d-bar${ins.ordersByDay.length > 12 && n % 3 ? " d-odd" : ""}`} key={day.key}>
                      <b>{day.count}</b>
                      <i style={{ height: `${Math.max(4, (day.count / maxDay) * 100)}%` }} />
                      <span>{day.key.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
