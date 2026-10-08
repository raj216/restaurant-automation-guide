// Settings (owners only): pause Brio, hours, closed dates, last call, reservations, notes.

import { useEffect, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { validateClosedDates, validateTransferNumber, validateWindows } from "../lib/brioStatus";
import type { ClosedDate, DayKey, ShiftWindow } from "../lib/types";
import { Button, Icon, Toggle } from "../ui";
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
              <p className="d-hint">Turn this off to pause Brio. Callers will be told the restaurant can't take calls right now.</p>
            </div>
            <span className="d-sp">
              <Toggle on={accepting} green label="Brio is answering calls" onChange={setAccepting} />
            </span>
          </div>
        </section>

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
          <p className="d-hint">When a caller needs a person, Brio can transfer to this number. Leave blank for none.</p>
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
