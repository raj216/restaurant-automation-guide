// Settings (owners only): pause Brio, hours, closed dates, last call, reservations, notes.

import { useEffect, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { validateClosedDates, validateTransferNumber, validateWindows } from "../lib/brioStatus";
import { PROVIDER_NAME, cleanError } from "../lib/pos";
import { screenOnline } from "../lib/kitchen";
import { Link } from "wouter";
import { hrefTo } from "../base";
import { relative } from "../lib/time";
import type { ClosedDate, DayKey, ShiftWindow } from "../lib/types";
import { Button, Icon, Pill, Toggle } from "../ui";
import { showMessage } from "../Toasts";
import { PageHeader } from "./shared";

const DAY_NAMES: Record<DayKey, string> = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
const ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function Settings() {
  const d = useDashboard();
  const r = d.restaurant;
  const [accepting, setAccepting] = useState(true);
  const [windows, setWindows] = useState<ShiftWindow[]>([]);
  const [closed, setClosed] = useState<ClosedDate[]>([]);
  const [lastCall, setLastCall] = useState(15);
  const [takesRes, setTakesRes] = useState(true);
  const [notes, setNotes] = useState("");
  const [transfer, setTransfer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = r?.id;
  useEffect(() => {
    if (!r) return;
    setAccepting(r.accepting_orders);
    setWindows(r.staffed_review_windows ?? []);
    setClosed(r.closed_dates ?? []);
    setLastCall(r.last_call_minutes);
    setTakesRes(r.takes_reservation_requests);
    setNotes(r.host_notes ?? "");
    setTransfer(r.transfer_phone_number ?? "");
    setError(null);
    // Reset the form only when a different restaurant is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!d.isOwner) {
    return (
      <main className="d-content d-col-flow">
        <PageHeader title="Settings" />
        <div className="d-card" style={{ maxWidth: 560 }}>
          <h3 className="d-name d-s">Only owners can change settings</h3>
          <p className="d-muted">Ask an owner of {r?.name ?? "this restaurant"} to make the change.</p>
        </div>
      </main>
    );
  }

  const save = async () => {
    const trimmed = transfer.trim();
    const problem =
      validateWindows(windows) ??
      validateClosedDates(closed) ??
      validateTransferNumber(trimmed) ??
      (!Number.isInteger(lastCall) || lastCall < 0 || lastCall > 240 ? "Last call is a number of minutes from 0 to 240." : null) ??
      (notes.length > 2000 ? "Notes can be up to 2000 characters." : null);
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    try {
      await d.saveSettings({
        accepting_orders: accepting,
        staffed_review_windows: windows,
        closed_dates: closed.map(c => ({ ...c, reason: c.reason.trim() })),
        last_call_minutes: lastCall,
        takes_reservation_requests: takesRes,
        host_notes: notes.trim() === "" ? null : notes,
        transfer_phone_number: trimmed === "" ? null : trimmed,
      });
      showMessage("Settings saved. Brio uses them on the next call.");
    } catch {
      setError("Couldn't save. Check your connection and try again. Only owners can change settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateWindow = (index: number, patch: Partial<ShiftWindow>) => setWindows(list => list.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Settings" />
      <div className="d-stack" style={{ width: "100%", maxWidth: 760 }}>
        <section className="d-set">
          <div className="d-row">
            <div>
              <h3>Brio is {accepting ? "answering calls" : "paused"}</h3>
              <p className="d-hint">
                Turn this off to pause Brio. Every call is then connected straight to your transfer number below, at any hour.
                {transfer.trim() === "" ? " No transfer number is set, so callers would only hear that nobody can take the call right now." : ""}
              </p>
            </div>
            <span className="d-sp">
              <Toggle on={accepting} green label="Brio is answering calls" onChange={setAccepting} />
            </span>
          </div>
        </section>

        <ConnectedPos />

        <section className="d-set">
          <h3>When staff are watching orders</h3>
          <p className="d-hint">Brio sends orders for review during these times. Outside them, orders are taken as requests for later. A shift past midnight belongs to the day it starts.</p>
          {ORDER.map(day => (
            <div className="d-daybox" key={day}>
              <b>{DAY_NAMES[day]}</b>
              <div className="d-stack" style={{ gap: 8 }}>
                {windows.map((w, index) =>
                  w.day === day ? (
                    <div className="d-shift" key={index}>
                      <input type="time" aria-label={`${DAY_NAMES[day]} opens`} value={w.start} onChange={e => updateWindow(index, { start: e.target.value })} />
                      <span className="d-muted">to</span>
                      <input type="time" aria-label={`${DAY_NAMES[day]} closes`} value={w.end} onChange={e => updateWindow(index, { end: e.target.value })} />
                      <Button kind="ghost" size="sm" aria-label={`Remove ${DAY_NAMES[day]} shift`} onClick={() => setWindows(list => list.filter((_, i) => i !== index))}>
                        <Icon name="x" />
                        <span className="d-hide-phone">Remove</span>
                      </Button>
                    </div>
                  ) : null,
                )}
                {!windows.some(w => w.day === day) ? <span className="d-muted">Closed</span> : null}
                <div>
                  <Button kind="secondary" size="sm" onClick={() => setWindows(list => [...list, { day, start: "11:00", end: "22:00" }])}>
                    <Icon name="plus" size="s" />
                    Add hours
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="d-set">
          <h3>Closed dates</h3>
          <p className="d-hint">Holidays or private events. Shifts that start on these days are removed.</p>
          {closed.map((c, index) => (
            <div className="d-shift d-wraps" key={index}>
              <input type="date" aria-label="Closed date" value={c.date} onChange={e => setClosed(list => list.map((x, i) => (i === index ? { ...x, date: e.target.value } : x)))} style={{ width: "auto" }} />
              <input type="text" aria-label="Reason" placeholder="Reason, for example Thanksgiving" maxLength={60} value={c.reason} onChange={e => setClosed(list => list.map((x, i) => (i === index ? { ...x, reason: e.target.value } : x)))} style={{ flex: 1, minWidth: 160 }} />
              <Button kind="ghost" size="sm" aria-label="Remove this closed date" onClick={() => setClosed(list => list.filter((_, i) => i !== index))}>
                <Icon name="x" />
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button kind="secondary" size="sm" onClick={() => setClosed(list => [...list, { date: "", reason: "" }])}>
              <Icon name="plus" size="s" />
              Add a closed date
            </Button>
          </div>
        </section>

        <section className="d-set">
          <h3>Last call</h3>
          <p className="d-hint">In the last minutes before the end of a shift, Brio takes requests only.</p>
          <div className="d-row">
            <input type="number" inputMode="numeric" min={0} max={240} aria-label="Last call minutes" value={lastCall} onChange={e => setLastCall(Number(e.target.value))} style={{ width: 110 }} />
            <span className="d-muted">minutes before closing</span>
          </div>
        </section>

        <section className="d-set">
          <div className="d-row">
            <div>
              <h3>Reservation requests</h3>
              <p className="d-hint">Brio takes a name, party size and time. Staff call back to confirm. Brio never books a table.</p>
            </div>
            <span className="d-sp">
              <Toggle on={takesRes} label="Take reservation requests" onChange={setTakesRes} />
            </span>
          </div>
        </section>

        <section className="d-set">
          <h3>Notes for Brio</h3>
          <p className="d-hint">Anything callers often ask: parking, dress code, specials. Don't put anything private here.</p>
          <textarea aria-label="Notes for Brio" maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="d-counter">{notes.length} / 2000</div>
        </section>

        <section className="d-set">
          <h3>Transfer number</h3>
          <p className="d-hint">
            When a caller needs a person, Brio can transfer to this number during your hours, and every call goes here while Brio is paused. Use a line that
            doesn't forward back to Brio. Leave blank for none.
          </p>
          <input type="tel" inputMode="tel" aria-label="Transfer number" placeholder="+16305551122" value={transfer} onChange={e => setTransfer(e.target.value)} />
        </section>

        {error ? <div className="d-error" role="alert">{error}</div> : null}
        <div className="d-row">
          <Button kind="primary" size="lg" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </main>
  );
}

/** The restaurant's POS link: which POS, whether it works, the menu sync, and auto-send (off). */
function ConnectedPos() {
  const d = useDashboard();
  const pos = d.data.pos;
  const [busy, setBusy] = useState<"check" | "sync" | null>(null);
  const run = async (action: "check" | "sync") => {
    setBusy(action);
    try {
      const reply = await d.posAction(action);
      if (action === "check") {
        showMessage(reply.body.status === "connected" ? "The POS connection works." : "The POS didn't answer. Orders stay in Needs review.", reply.body.status === "connected" ? "info" : "warn");
      } else {
        const changes = Array.isArray(reply.body.availability_changes) ? reply.body.availability_changes.length : 0;
        showMessage(reply.body.status === "synced" ? `Menu checked against the POS. ${changes} sold-out change${changes === 1 ? "" : "s"}.` : "Couldn't read the POS menu.", reply.body.status === "synced" ? "info" : "warn");
      }
    } finally {
      setBusy(null);
    }
  };

  if (pos?.provider === "kitchen_screen") {
    const screens = d.data.kitchenScreens ?? [];
    const on = screenOnline(screens, d.now);
    return (
      <section className="d-set">
        <div className="d-row d-wrap">
          <h3>Kitchen: Kitchen screen</h3>
          <span className="d-sp">
            <Pill tone={on ? "green" : "red"}>{on ? "A tablet is on" : "No tablet on"}</Pill>
          </span>
        </div>
        <p className="d-hint">
          Staff tap "Send to kitchen" on an order in Needs review; it appears on the kitchen tablet with a sound, and the cook taps "Got it". If no tablet is on,
          orders stay in Needs review and a red banner shows.
        </p>
        <p className="d-small d-muted">
          On the kitchen tablet, sign in with a staff login and open{" "}
          <Link href={hrefTo("/kitchen")}>
            <b>Kitchen screen</b>
          </Link>
          .
        </p>
        {screens.length > 0 ? (
          <ul className="d-small d-muted" style={{ margin: 0, paddingLeft: 18 }}>
            {screens.map(s => (
              <li key={s.screen_id}>
                {s.label ?? "Kitchen tablet"}: last seen {relative(s.last_seen_at, d.now)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="d-small d-muted">No tablet has opened the Kitchen screen yet.</p>
        )}
      </section>
    );
  }

  if (!pos) {
    return (
      <section className="d-set">
        <h3>Connected POS</h3>
        <p className="d-hint">No POS is connected. Staff enter each order in your POS and tap "Entered in POS". Ask CoHost to connect Toast or Clover.</p>
      </section>
    );
  }
  const issues = pos.menu_sync_issues ?? {};
  const prices = issues.price_mismatches ?? [];
  const missing = issues.missing_in_pos ?? [];
  const tone = pos.status === "connected" ? "green" : pos.status === "broken" ? "red" : "gray";
  const label = pos.status === "connected" ? "Connected" : pos.status === "broken" ? "Broken" : "Disconnected";
  return (
    <section className="d-set">
      <div className="d-row d-wrap">
        <h3>Connected POS: {PROVIDER_NAME[pos.provider]}</h3>
        <span className="d-sp">
          <Pill tone={tone}>{label}</Pill>
        </span>
      </div>
      <p className="d-hint">
        Staff tap "Send to kitchen" on an order in Needs review; the ticket prints in the kitchen with the caller's name, number and any allergy note. If the POS
        doesn't answer, the order stays in Needs review: enter it by hand.
      </p>
      {pos.status === "broken" && pos.last_error ? <div className="d-error" role="alert">{cleanError(pos.last_error)}</div> : null}
      <p className="d-small d-muted">
        {pos.last_checked_at ? `Last checked ${relative(pos.last_checked_at, d.now)}. ` : ""}
        {pos.menu_synced_at ? `Menu checked ${relative(pos.menu_synced_at, d.now)}.` : "Menu not checked against the POS yet."}
      </p>
      {prices.length > 0 ? (
        <p className="d-small">
          <b>Prices differ in the POS:</b> {prices.map(p => p.sku).join(", ")}. Orders with these items won't go to the POS until the menu is updated.
        </p>
      ) : null}
      {missing.length > 0 ? (
        <p className="d-small">
          <b>Not in the POS:</b> {missing.join(", ")}. Brio treats them as sold out.
        </p>
      ) : null}
      <div className="d-row d-wrap">
        <Button kind="secondary" size="sm" onClick={() => void run("check")} disabled={busy !== null}>
          {busy === "check" ? "Checking…" : "Check connection"}
        </Button>
        <Button kind="secondary" size="sm" onClick={() => void run("sync")} disabled={busy !== null}>
          {busy === "sync" ? "Checking menu…" : "Check menu against POS"}
        </Button>
      </div>
      <div className="d-row" style={{ marginTop: 12 }}>
        <div>
          <b>Auto-send simple orders: {pos.auto_send ? "On" : "Off"}</b>
          <p className="d-hint">
            When on, a simple order (no allergy note, during staffed hours, POS working) goes to the POS the moment the caller says yes, without a staff tap.
            Everything else still waits for "Send to kitchen". This changes a safety rule, so only CoHost can switch it on, after approval.
          </p>
        </div>
        <span className="d-sp">
          <Toggle on={pos.auto_send} label="Auto-send simple orders" onChange={() => undefined} disabled />
        </span>
      </div>
    </section>
  );
}
