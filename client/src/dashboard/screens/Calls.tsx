// Calls: everything Brio answered, with the summary and transcript.

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useDashboard } from "../DashboardContext";
import { BASE } from "../Shell";
import { fetchCallDetail } from "../lib/data";
import { callerLabel, formatPhone } from "../lib/format";
import { CALL_CATEGORY_LABEL, callTime, isTestCall, sentimentLabel } from "../lib/labels";
import { dayAndTime, formatDuration, formatTime, dayLabel } from "../lib/time";
import { parseTranscript } from "../lib/transcript";
import type { CallLog } from "../lib/types";
import { AllergyBadge, Empty, Icon, Pill, Skeletons } from "../ui";
import { PhoneLink } from "../parts";
import { PageHeader, SearchBox, useMedia, WIDE } from "./shared";

export default function Calls({ selectedId }: { selectedId: string | null }) {
  const d = useDashboard();
  const [, navigate] = useLocation();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const wide = useMedia(WIDE);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [tests, setTests] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return d.data.calls
      .filter(c => (tests ? true : !isTestCall(c)))
      .filter(c => !followUp || c.needs_follow_up)
      .filter(
        c =>
          !q ||
          (c.caller_name ?? "").toLowerCase().includes(q) ||
          (c.summary ?? "").toLowerCase().includes(q) ||
          (digits.length >= 3 && (c.from_number ?? "").replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => new Date(callTime(b)).getTime() - new Date(callTime(a)).getTime());
  }, [d.data.calls, query, followUp, tests]);

  const close = () => navigate(`${BASE}/calls`);

  return (
    <main className="d-content d-col-flow">
      <PageHeader title="Calls" />
      <div className="d-split" style={{ flex: 1 }}>
        <div className="d-list-col">
          <div className="d-row d-wrap">
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, number or summary" />
            <button type="button" className={`d-fchip${followUp ? " d-on" : ""}`} aria-pressed={followUp} onClick={() => setFollowUp(v => !v)}>
              <Icon name="flag" size="s" />
              Needs follow-up
            </button>
            <button type="button" className={`d-fchip${tests ? " d-on" : ""}`} aria-pressed={tests} onClick={() => setTests(v => !v)}>
              <Icon name="flask" size="s" />
              Show test calls
            </button>
          </div>
          {!d.loaded && !d.offline ? <Skeletons count={4} /> : null}
          {d.loaded && rows.length === 0 ? <Empty title="No calls to show" /> : null}
          {rows.length > 0 ? (
            <div className="d-list">
              {rows.map(c => (
                <Link
                  key={c.id}
                  href={`${BASE}/calls/${c.call_id}`}
                  className={`d-tr d-calls-grid d-rowlink${selectedId === c.call_id ? " d-sel" : ""}`}
                >
                  <span className="d-t2">
                    {dayLabel(callTime(c), d.now, tz)}
                    <br />
                    {formatTime(callTime(c), tz)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="d-t1 d-ellip" style={{ display: "block" }}>
                      {callerLabel(c.caller_name, c.from_number)}
                    </span>
                    <span className="d-t2 d-ellip" style={{ display: "block" }}>
                      {c.summary ?? "No summary yet"}
                    </span>
                  </span>
                  <span className="d-row" style={{ gap: 6 }}>
                    {isTestCall(c) ? <Pill tone="gray" icon="flask">Test</Pill> : null}
                    {c.needs_follow_up ? <Pill tone="amber" icon="flag">Follow up</Pill> : null}
                    <Pill tone={c.category === "spam" ? "gray" : "accent"}>{CALL_CATEGORY_LABEL[c.category] ?? "Other"}</Pill>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {wide && selectedId ? <CallPanel key={selectedId} callId={selectedId} onClose={close} /> : null}
      </div>
      {!wide && selectedId ? <CallPanel key={selectedId} callId={selectedId} onClose={close} sheet /> : null}
    </main>
  );
}

function CallPanel({ callId, onClose, sheet }: { callId: string; onClose: () => void; sheet?: boolean }) {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const [call, setCall] = useState<CallLog | null>(null);
  const [state, setState] = useState<"loading" | "missing">("loading");
  const restaurantId = d.restaurant?.id;

  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;
    fetchCallDetail(restaurantId, callId)
      .then(c => {
        if (!alive) return;
        setCall(c);
        if (!c) setState("missing");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [restaurantId, callId]);

  const transcript = parseTranscript(call?.transcript);
  const body = !call ? (
    <div className="d-pb">
      <p className="d-muted">{state === "loading" ? "Loading the call…" : "This call isn't available."}</p>
    </div>
  ) : (
    <>
      <div className="d-ph">
        <div className="d-row d-wrap">
          <Pill tone="accent">{CALL_CATEGORY_LABEL[call.category] ?? "Other"}</Pill>
          {isTestCall(call) ? <Pill tone="gray" icon="flask">Test call</Pill> : null}
          {call.needs_follow_up ? <Pill tone="amber" icon="flag">Needs follow-up</Pill> : null}
        </div>
        <h2 className="d-name">{callerLabel(call.caller_name, call.from_number)}</h2>
        <div className="d-row d-wrap d-small d-muted">
          <PhoneLink number={call.from_number} label={call.from_number ? formatPhone(call.from_number) : undefined} />
          <span>{dayAndTime(callTime(call), d.now, tz)}</span>
          <span>
            {formatDuration(call.duration_seconds)}
            {sentimentLabel(call.sentiment) ? ` · ${sentimentLabel(call.sentiment)}` : ""}
          </span>
        </div>
      </div>
      <div className="d-pb">
        {call.allergies ? <AllergyBadge note={call.allergies} /> : null}
        <section>
          <h3 className="d-h3">Summary</h3>
          <p className="d-small">{call.summary ?? "No summary was saved."}</p>
        </section>
        <section>
          <h3 className="d-h3">Transcript</h3>
          {transcript ? (
            <div className="d-chat">
              {transcript.map((line, i) => (
                <div key={i} className={`d-bub d-${line.speaker}`}>
                  <small>{line.speaker === "brio" ? "Brio" : "Caller"}</small>
                  {line.text}
                </div>
              ))}
            </div>
          ) : call.transcript ? (
            <p className="d-small" style={{ whiteSpace: "pre-wrap" }}>{call.transcript}</p>
          ) : (
            <p className="d-small d-muted">No transcript was saved.</p>
          )}
        </section>
      </div>
    </>
  );

  if (sheet) {
    return (
      <div className="d-sheet" role="dialog" aria-modal="true" aria-label="Call">
        <div className="d-sheet-top">
          <button type="button" className="d-btn d-ghost d-sm" onClick={onClose}>
            <Icon name="chevronLeft" />
            Calls
          </button>
        </div>
        <div className="d-panel" style={{ width: "100%", maxHeight: "none", border: 0, borderRadius: 0, boxShadow: "none", position: "static" }}>
          {body}
        </div>
      </div>
    );
  }
  return (
    <aside className="d-panel" aria-label="Call">
      <div className="d-row" style={{ padding: "8px 10px 0" }}>
        <button type="button" className="d-btn d-ghost d-sm d-sp" onClick={onClose} aria-label="Close call">
          <Icon name="x" />
          Close
        </button>
      </div>
      {body}
    </aside>
  );
}
