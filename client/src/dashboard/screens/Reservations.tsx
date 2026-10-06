// Reservation requests. Brio never books a table: staff call the guest, then mark the request.

import { useMemo, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { longDay } from "../lib/time";
import type { GuestRequest } from "../lib/types";
import { Empty, SectionHeader, Skeletons } from "../ui";
import { ReservationCard } from "../parts";
import { PageHeader } from "./shared";

type Filter = "to_confirm" | "all";

export default function Reservations() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [filter, setFilter] = useState<Filter>("to_confirm");

  const all = useMemo(() => d.data.requests.filter(r => r.kind === "reservation"), [d.data.requests]);
  const pending = all.filter(r => r.status === "pending_staff_review");
  const list = filter === "to_confirm" ? pending : all;

  const groups = useMemo(() => {
    const sorted = [...list].sort(
      (a, b) => new Date(a.requested_time ?? a.created_at).getTime() - new Date(b.requested_time ?? b.created_at).getTime(),
    );
    const map = new Map<string, GuestRequest[]>();
    for (const r of sorted) {
      const key = r.requested_time ? longDay(r.requested_time, tz) : "No time given";
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [list, tz]);

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Reservation requests" />
      <p className="d-muted" style={{ marginTop: -8 }}>
        Brio doesn't book tables. Call the guest, then mark what happened.
      </p>
      <div className="d-tabs">
        <button type="button" className={`d-tab${filter === "to_confirm" ? " d-on" : ""}`} onClick={() => setFilter("to_confirm")}>
          To confirm {pending.length > 0 ? <span className="d-n">{pending.length}</span> : null}
        </button>
        <button type="button" className={`d-tab${filter === "all" ? " d-on" : ""}`} onClick={() => setFilter("all")}>
          All
        </button>
      </div>
      {!d.loaded && !d.offline ? <Skeletons count={3} /> : null}
      {d.loaded && groups.length === 0 ? (
        <Empty title={filter === "to_confirm" ? "No requests to confirm" : "No reservation requests yet"}>
          {d.restaurant?.takes_reservation_requests ? "New requests show up here the moment Brio takes them." : "Reservation requests are turned off in Settings."}
        </Empty>
      ) : null}
      <div className="d-stack" style={{ width: "100%", maxWidth: 760 }}>
        {groups.map(([day, items]) => (
          <section key={day} className="d-stack">
            <SectionHeader title={day} count={items.length} />
            {items.map(r => (
              <ReservationCard key={r.id} request={r} />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
