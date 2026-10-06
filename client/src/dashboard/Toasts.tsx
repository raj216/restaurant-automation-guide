// Toasts: the 5-second Undo for forward steps, plus short messages.

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { Icon } from "./ui";

interface Message {
  id: number;
  text: string;
  tone: "info" | "warn";
}

let nextId = 1;
const listeners = new Set<(m: Message) => void>();

/** Shows a short message at the bottom of the screen. */
export function showMessage(text: string, tone: Message["tone"] = "info"): void {
  const message = { id: nextId++, text, tone };
  for (const l of listeners) l(message);
}

export function ToastHost() {
  const d = useDashboard();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const add = (m: Message) => {
      setMessages(list => [...list, m]);
      setTimeout(() => setMessages(list => list.filter(x => x.id !== m.id)), 5000);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  // What happened to steps that were waiting.
  useEffect(() => {
    return d.undo.subscribe(event => {
      if (event.type === "undone") showMessage(`Undone. ${event.step.code} stays as it was.`);
      if (event.type === "conflict") showMessage("Someone already updated this order. We refreshed it for you.", "warn");
      if (event.type === "failed") showMessage("Couldn't save. Check your connection and try again.", "warn");
    });
  }, [d.undo]);

  return (
    <div className="d-toasts" aria-live="polite">
      {d.pending.map(step => (
        <div className="d-toast" key={`${step.orderId}:${step.expiresAt}`} role="status">
          <Icon name="check" />
          <span style={{ flex: 1 }}>
            Marked {step.code} as {step.label}
          </span>
          <button type="button" className="d-btn d-sm" onClick={() => d.undo.undo(step.orderId)}>
            Undo
          </button>
          <span className="d-bar" />
        </div>
      ))}
      {messages.map(m => (
        <div className={`d-toast${m.tone === "warn" ? " d-warn" : ""}`} key={m.id} role="status">
          <Icon name={m.tone === "warn" ? "alert" : "info"} />
          <span style={{ flex: 1 }}>{m.text}</span>
        </div>
      ))}
    </div>
  );
}
