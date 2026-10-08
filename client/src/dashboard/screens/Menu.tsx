// Menu: what Brio can offer. Staff can mark an item sold out; everything else is read-only.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { fetchMenu, setItemAvailable } from "../lib/data";
import { formatMoney } from "../lib/format";
import type { MenuItem } from "../lib/types";
import { Empty, Pill, Skeletons, Toggle } from "../ui";
import { showMessage } from "../Toasts";
import { PageHeader, SearchBox } from "./shared";

export default function Menu() {
  const d = useDashboard();
  const restaurant = d.restaurant;
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyOut, setOnlyOut] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!restaurant) return;
    try {
      setItems(await fetchMenu(restaurant.id, restaurant.current_menu_version));
      setError(false);
    } catch {
      setError(true);
    }
  }, [restaurant]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(i => (!q || i.name.toLowerCase().includes(q)) && (!onlyOut || !i.available));
  }, [items, query, onlyOut]);

  const toggle = async (item: MenuItem, available: boolean) => {
    if (!restaurant) return;
    setSaving(item.id);
    setItems(list => (list ?? []).map(i => (i.id === item.id ? { ...i, available } : i)));
    try {
      await setItemAvailable(restaurant.id, item.id, available);
      showMessage(`${item.name} marked ${available ? "available" : "sold out"}. Brio will know right away.`);
    } catch {
      setItems(list => (list ?? []).map(i => (i.id === item.id ? { ...i, available: !available } : i)));
      showMessage("Couldn't save. Check your connection and try again.", "warn");
    } finally {
      setSaving(null);
    }
  };

  const outCount = (items ?? []).filter(i => !i.available).length;

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Menu" />
      <p className="d-muted" style={{ marginTop: -8 }}>
        Turn an item off when you run out. Brio stops offering it. Prices and descriptions can't be changed here.
      </p>
      <div className="d-row d-wrap">
        <SearchBox value={query} onChange={setQuery} placeholder="Search the menu" />
        <button type="button" className={`d-fchip${onlyOut ? " d-on" : ""}`} aria-pressed={onlyOut} onClick={() => setOnlyOut(v => !v)}>
          Sold out only {outCount > 0 ? `(${outCount})` : ""}
        </button>
      </div>
      {error ? <div className="d-error">Couldn't load the menu. Try again in a moment.</div> : null}
      {!items && !error ? <Skeletons count={4} /> : null}
      {items && rows.length === 0 ? <Empty title="No items found" /> : null}
      <div className="d-list" style={{ width: "100%", maxWidth: 820, display: rows.length ? undefined : "none" }}>
        {rows.map(i => (
          <div className={`d-tr d-mrow${i.available ? "" : " d-out"}`} key={i.id}>
            <div className="d-mrow-main" style={{ minWidth: 0 }}>
              <div className="d-row d-wrap" style={{ gap: 8 }}>
                <span className="d-t1">{i.name}</span>
                {i.popular ? <Pill tone="accent">Popular</Pill> : null}
                {i.dietary_tags?.map(t => (
                  <Pill key={t} tone="gray">
                    {t}
                  </Pill>
                ))}
              </div>
              {i.description ? <div className="d-t2 d-ellip d-mrow-desc">{i.description}</div> : null}
            </div>
            <span className="d-t1 d-mrow-price">{formatMoney(i.price_cents, restaurant?.currency)}</span>
            <span className="d-row d-mrow-avail" style={{ gap: 8 }}>
              <span className="d-small d-muted d-mrow-state" style={{ minWidth: 64, textAlign: "right" }}>
                {i.available ? "Available" : "Sold out"}
              </span>
              <Toggle on={i.available} green label={`${i.name} available`} disabled={saving === i.id} onChange={next => void toggle(i, next)} />
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
