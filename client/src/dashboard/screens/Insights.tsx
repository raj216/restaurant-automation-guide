// Insights: real counts of what Brio did. Nothing is estimated.

import { useMemo, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { formatMoney } from "../lib/format";
import { computeInsights, RANGES, type RangeId } from "../lib/insights";
import { CALL_CATEGORY_LABEL } from "../lib/labels";
import { clock12, formatDuration } from "../lib/time";
import { Empty, Skeletons } from "../ui";
import { PageHeader } from "./shared";


export default function Insights() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [range, setRange] = useState<RangeId>("today");
  const ins = useMemo(() => computeInsights(d.data, range, d.now, tz), [d.data, range, d.now, tz]);
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
      {!d.loaded && !d.offline ? <Skeletons count={3} /> : null}
      {d.loaded ? (
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
