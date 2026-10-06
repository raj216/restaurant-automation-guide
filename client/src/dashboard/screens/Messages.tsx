// Messages Brio took when a caller wanted something other than an order or a table.

import { useMemo, useState } from "react";
import { useDashboard } from "../DashboardContext";
import { TOPIC_LABEL, TOPIC_ORDER, topicOf } from "../lib/labels";
import { sortNewestFirst } from "../lib/orders";
import type { MessageTopic } from "../lib/types";
import { Empty, Skeletons } from "../ui";
import { MessageCard } from "../parts";
import { PageHeader } from "./shared";

export default function Messages() {
  const d = useDashboard();
  const [status, setStatus] = useState<"to_handle" | "all">("to_handle");
  const [topic, setTopic] = useState<MessageTopic | "all">("all");

  const all = useMemo(() => sortNewestFirst(d.data.requests.filter(r => r.kind === "callback")), [d.data.requests]);
  const pending = all.filter(r => r.status === "pending_staff_review");
  const rows = (status === "to_handle" ? pending : all).filter(r => topic === "all" || topicOf(r) === topic);

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Messages" />
      <div className="d-row d-wrap">
        <div className="d-tabs">
          <button type="button" className={`d-tab${status === "to_handle" ? " d-on" : ""}`} onClick={() => setStatus("to_handle")}>
            To handle {pending.length > 0 ? <span className="d-n">{pending.length}</span> : null}
          </button>
          <button type="button" className={`d-tab${status === "all" ? " d-on" : ""}`} onClick={() => setStatus("all")}>
            All
          </button>
        </div>
        <select aria-label="Topic" className="d-field-inline" value={topic} onChange={e => setTopic(e.target.value as MessageTopic | "all")} style={{ width: "auto" }}>
          <option value="all">All topics</option>
          {TOPIC_ORDER.map(t => (
            <option key={t} value={t}>
              {TOPIC_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      {!d.loaded && !d.offline ? <Skeletons count={3} /> : null}
      {d.loaded && rows.length === 0 ? <Empty title="No messages here" /> : null}
      <div className="d-stack" style={{ width: "100%", maxWidth: 760 }}>
        {rows.map(r => (
          <MessageCard key={r.id} request={r} />
        ))}
      </div>
    </main>
  );
}
