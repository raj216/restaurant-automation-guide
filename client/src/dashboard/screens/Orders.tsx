// Orders: every order that reached the restaurant, with tabs, search and a detail panel.

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useDashboard } from "../DashboardContext";
import { BASE } from "../Shell";
import { fetchPhoneDrafts } from "../lib/data";
import { customerLabel, formatMoney, formatPhone, orderCode, orderSummary } from "../lib/format";
import { rangeBounds, RANGES, type RangeId } from "../lib/insights";
import { inTab, ORDER_TABS, sortNewestFirst, type OrderTab } from "../lib/orders";
import { formatTime, dayLabel } from "../lib/time";
import type { Order } from "../lib/types";
import { AllergyBadge, Empty, Icon, OrderStatusPill, Pill, Skeletons } from "../ui";
import { OrderPanel } from "./OrderPanel";
import { PageHeader, SearchBox, useMedia, WIDE } from "./shared";

const PAGE = 50;

export default function Orders({ selectedId }: { selectedId: string | null }) {
  const d = useDashboard();
  const [, navigate] = useLocation();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const wide = useMedia(WIDE);
  const [tab, setTab] = useState<OrderTab>("needs_review");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeId | "all">("all");
  const [drafts, setDrafts] = useState(false);
  const [draftRows, setDraftRows] = useState<Order[]>([]);
  const [draftError, setDraftError] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const restaurantId = d.restaurant?.id;
  const reachedIds = useMemo(() => new Set(d.data.orders.map(o => o.id)), [d.data.orders]);

  useEffect(() => {
    if (!drafts || !restaurantId || !d.isOwner) return;
    let alive = true;
    setDraftError(false);
    void fetchPhoneDrafts(restaurantId, reachedIds)
      .then(rows => alive && setDraftRows(rows))
      .catch(() => alive && setDraftError(true));
    return () => {
      alive = false;
    };
    // The list only needs to be fetched when the filter is switched on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, restaurantId, d.isOwner]);

  useEffect(() => setShown(PAGE), [tab, query, range, drafts]);

  const withState = (o: Order): Order => ({ ...o, state: d.displayState(o) });
  const source = drafts ? draftRows : d.data.orders.map(withState);

  const counts = useMemo(() => {
    const out = {} as Record<OrderTab, number>;
    for (const t of ORDER_TABS) out[t.id] = d.data.orders.filter(o => inTab({ ...o, state: d.displayState(o) }, t.id)).length;
    return out;
  }, [d]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const bounds = range === "all" ? null : rangeBounds(range, d.now, tz);
    return sortNewestFirst(
      source.filter(o => {
        if (!drafts && !inTab(o, tab)) return false;
        if (bounds) {
          const t = new Date(o.created_at).getTime();
          if (t < bounds.start.getTime() || t >= bounds.end.getTime()) return false;
        }
        if (!q) return true;
        return (
          (o.customer_name ?? "").toLowerCase().includes(q) ||
          orderCode(o.id).toLowerCase().includes(q.replace(/^#/, "#")) ||
          orderCode(o.id).toLowerCase().includes(`#${q}`) ||
          (digits.length >= 3 && (o.customer_phone ?? "").replace(/\D/g, "").includes(digits))
        );
      }),
    );
  }, [source, tab, query, range, drafts, d.now, tz]);

  const close = () => navigate(`${BASE}/orders`);
  const selected = selectedId;

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Orders" />
      <div className="d-split" style={{ flex: 1 }}>
        <div className="d-list-col">
          <div className="d-row d-wrap">
            <div className="d-tabs" role="tablist" style={{ overflowX: "auto" }}>
              {ORDER_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={!drafts && tab === t.id}
                  className={`d-tab${!drafts && tab === t.id ? " d-on" : ""}`}
                  onClick={() => {
                    setDrafts(false);
                    setTab(t.id);
                  }}
                >
                  {t.label}
                  {t.id !== "all" && counts[t.id] > 0 ? <span className="d-n">{counts[t.id]}</span> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="d-row d-wrap">
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, phone or order code" />
            <select
              aria-label="Date"
              className="d-field-inline"
              value={range}
              onChange={e => setRange(e.target.value as RangeId | "all")}
              style={{ width: "auto" }}
            >
              <option value="all">All dates</option>
              {RANGES.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {d.isOwner ? (
              <button type="button" className={`d-fchip${drafts ? " d-on" : ""}`} aria-pressed={drafts} onClick={() => setDrafts(v => !v)}>
                <Icon name="clipboard" size="s" />
                Phone drafts
              </button>
            ) : null}
          </div>
          {drafts ? (
            <p className="d-small d-muted">
              These are Brio's own drafts: orders that were changed, never confirmed, or corrected during the call. They were never sent to the restaurant.
            </p>
          ) : null}
          {draftError ? <div className="d-error">Couldn't load phone drafts. Try again in a moment.</div> : null}

          {!d.loaded && !d.offline ? <Skeletons count={4} /> : null}
          {d.loaded && rows.length === 0 ? (
            <Empty title={query || range !== "all" ? "No orders match" : "No orders here"}>
              {query || range !== "all" ? "Try a different search or date." : "Orders will appear here when Brio takes them."}
            </Empty>
          ) : null}

          {rows.length > 0 ? (
            <div className="d-listscroll">
              <div className="d-list">
                <div className={`d-tr d-head d-orders-grid${wide && selected ? " d-compact" : ""}`} role="row">
                  <span>Order</span>
                  <span className="d-hide-sm d-hide-compact">Time</span>
                  <span>Guest</span>
                  <span className="d-hide-sm d-hide-compact">Items</span>
                  <span className="d-hide-sm d-hide-compact">Total</span>
                  <span className="d-hide-sm">Status</span>
                  <span className="d-hide-sm d-hide-compact">Pickup</span>
                </div>
                {rows.slice(0, shown).map(o => (
                  <Link
                    key={o.id}
                    href={`${BASE}/orders/${o.id}`}
                    className={`d-tr d-orders-grid d-rowlink${wide && selected ? " d-compact" : ""}${selected === o.id ? " d-sel" : ""}`}
                    aria-current={selected === o.id ? "true" : undefined}
                  >
                    <span className="d-code">{orderCode(o.id)}</span>
                    <span className="d-t2 d-hide-sm d-hide-compact">
                      {dayLabel(o.created_at, d.now, tz)}
                      <br />
                      {formatTime(o.created_at, tz)}
                    </span>
                    <span>
                      <span className="d-t1 d-ellip" style={{ display: "block" }}>
                        {customerLabel(o)}
                      </span>
                      <span className="d-t2 d-ellip" style={{ display: "block" }}>
                        {o.customer_phone ? formatPhone(o.customer_phone) : ""}
                      </span>
                    </span>
                    <span className="d-t2 d-ellip d-hide-sm d-hide-compact">
                      {o.allergy_note ? <AllergyBadge note={o.allergy_note} short /> : null} {orderSummary(o)}
                    </span>
                    <span className="d-t1 d-hide-sm d-hide-compact">{formatMoney(o.subtotal_cents, o.currency)}</span>
                    <span className="d-hide-sm">
                      <OrderStatusPill state={o.state} />
                    </span>
                    <span className="d-t2 d-hide-sm d-hide-compact">
                      {o.intake_mode === "after_hours_request" ? (
                        <Pill tone="purple" icon="moon">
                          After hours
                        </Pill>
                      ) : o.requested_pickup_time ? (
                        formatTime(o.requested_pickup_time, tz)
                      ) : (
                        "ASAP"
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {rows.length > shown ? (
            <button type="button" className="d-btn d-secondary" onClick={() => setShown(n => n + PAGE)} style={{ alignSelf: "center" }}>
              Show more ({rows.length - shown} left)
            </button>
          ) : null}
        </div>
        {wide && selected ? <OrderPanel key={selected} orderId={selected} onClose={close} /> : null}
      </div>
      {!wide && selected ? <OrderPanel key={selected} orderId={selected} onClose={close} sheet /> : null}
    </main>
  );
}
