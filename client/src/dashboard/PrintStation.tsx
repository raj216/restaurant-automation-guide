// The print station: a computer or tablet at the restaurant with the receipt printer
// attached. Switched on per device in Settings › Kitchen. While the dashboard is open it
// takes each waiting kitchen ticket (one at a time; two stations never take the same
// one), prints it, and reports back. For printing with no dialog, open the dashboard in
// Chrome started with --kiosk-printing (the setup guide says how).

import { useEffect, useRef, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { claimPrintJob, fetchOrder, finishPrintJob } from "./lib/data";
import { prefs } from "./lib/prefs";
import { kitchenTicket, testOrder, type KitchenTicket } from "./lib/ticket";

const POLL_MS = 5_000;

/** Prints one ticket: shows it in the print area, opens the print, then hides it again. */
export async function printTicket(ticket: KitchenTicket, show: (t: KitchenTicket | null) => void): Promise<void> {
  show(ticket);
  await new Promise(r => setTimeout(r, 60)); // let the ticket render first
  document.body.classList.add("d-print-ticket");
  try {
    window.print();
  } finally {
    document.body.classList.remove("d-print-ticket");
    show(null);
  }
}

let printTestFromSettings: (() => void) | null = null;
/** Settings' "Print a test ticket" button. */
export function printTestTicket(): boolean {
  if (!printTestFromSettings) return false;
  printTestFromSettings();
  return true;
}

export function PrintStation() {
  const d = useDashboard();
  const [ticket, setTicket] = useState<KitchenTicket | null>(null);
  const busy = useRef(false);
  const restaurant = d.restaurant;
  const on = Boolean(prefs.getPrintStation()) && d.data.pos?.kitchen_tickets === true;
  const tz = restaurant?.timezone ?? "America/New_York";

  useEffect(() => {
    printTestFromSettings = () => {
      if (!restaurant) return;
      void printTicket(kitchenTicket(testOrder(restaurant.id), { kind: "test", tz, now: new Date() }), setTicket);
    };
    return () => {
      printTestFromSettings = null;
    };
  }, [restaurant, tz]);

  useEffect(() => {
    const station = prefs.getPrintStation();
    if (!on || !restaurant || !station) return;
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const job = await claimPrintJob(restaurant.id, station);
        if (!job) return;
        try {
          const order = d.data.orders.find(o => o.id === job.order_id) ?? (await fetchOrder(restaurant.id, job.order_id));
          if (!order) throw new Error("order not visible");
          const payment = d.data.payments?.find(p => p.order_id === order.id);
          await printTicket(kitchenTicket(order, { kind: job.kind, tz, now: new Date(), payment }), setTicket);
          await finishPrintJob(job.id, true);
        } catch (err) {
          await finishPrintJob(job.id, false, err instanceof Error ? err.message : "printer error").catch(() => undefined);
        }
      } catch {
        /* offline: the ticket waits in the queue and prints when the connection is back */
      } finally {
        busy.current = false;
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => clearInterval(timer);
    // d.data.orders is read at print time; the loop itself only restarts when the station changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, restaurant?.id, tz]);

  return ticket ? <TicketPaper ticket={ticket} /> : null;
}

/** The ticket as it prints: 80 mm receipt, allergy in a black bar on top. */
export function TicketPaper({ ticket }: { ticket: KitchenTicket }) {
  return (
    <div className="d-kticket" aria-hidden="true">
      {ticket.banner ? <div className="d-kt-banner">{ticket.banner}</div> : null}
      <div className="d-kt-head">
        <b>{ticket.code}</b>
        <span>{ticket.time}</span>
      </div>
      <div className="d-kt-pickup">{ticket.pickup}</div>
      {ticket.allergy ? <div className="d-kt-allergy">{ticket.allergy}</div> : null}
      <div className="d-kt-rule" />
      {ticket.lines.map((line, i) => (
        <div className="d-kt-line" key={i}>
          <b>
            {line.quantity} {line.name}
          </b>
          {line.choices.map(c => (
            <div key={c} className="d-kt-choice">
              {c}
            </div>
          ))}
        </div>
      ))}
      <div className="d-kt-rule" />
      <div>
        {ticket.guest}
        {ticket.phone ? ` · ${ticket.phone}` : ""}
      </div>
      <div>{ticket.source}</div>
      <div className="d-kt-paid">{ticket.payment}</div>
    </div>
  );
}
