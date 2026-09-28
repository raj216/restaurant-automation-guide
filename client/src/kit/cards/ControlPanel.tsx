import { Reveal } from "../motion/Reveal";
import { at, cx } from "../utils";

export interface ControlPanelProps {
  /** Small label at the top, e.g. "HOW THE SAFE HANDOFF WORKS". */
  label: string;
  /** In the green status chip, e.g. "Team review stays visible". */
  status: string;
  /** One line of explanation under the rows. */
  description: string;
  /** Label/value rows, each { label, value, state }; state done (green dot), current (gold, pulsing) or pending (hollow). */
  rows: { label: string; value: string; state?: "done" | "current" | "pending" }[];
  /** Seconds to wait, once in view, before the panel rises. */
  delay?: number;
}

/** One label/value line in the panel. */
export type ControlRow = ControlPanelProps["rows"][number];

/**
 * A status panel: small label and a green status chip, then label/value rows, each led by a status dot, and a note.
 *
 * The current row glows gold. The rows uncover one by one.
 */
export function ControlPanel({ label, status, description, rows, delay = 0 }: ControlPanelProps) {
  return (
    <Reveal className="control-panel" delay={delay} distance={36}>
      <div className="control-panel-head">
        <span className="panel-label">{label}</span>
        <span className="status-chip">
          <span className="status-led" aria-hidden="true" />
          {status}
        </span>
      </div>
      <div className="control-rows">
        {rows.map((row, i) => (
          <Reveal
            key={row.label}
            className={cx("control-row", row.state === "done" && "is-done", row.state === "current" && "is-current")}
            variant="wipe"
            delay={at(delay + 0.3 + 0.15 * i)}
          >
            <span className="row-dot" aria-hidden="true" />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </Reveal>
        ))}
      </div>
      <p className="panel-note">{description}</p>
    </Reveal>
  );
}
