import { Reveal } from "../motion/Reveal";
import { at } from "../utils";

export interface ControlPanelProps {
  /** Small warm label at the top, e.g. "HOW THE SAFE HANDOFF WORKS". */
  label: string;
  /** Beside the green status light, e.g. "Team review stays visible". */
  status: string;
  /** One line of explanation. */
  description: string;
  /** Label/value rows, each { label, value }, e.g. { label: "Menu", value: "Checked first" }. */
  rows: { label: string; value: string }[];
  /** Seconds to wait, once in view, before the panel rises. */
  delay?: number;
}

/** One label/value line in the panel. */
export type ControlRow = ControlPanelProps["rows"][number];

/**
 * A dark status panel: small label, a softly pulsing green status light, a line of text, and label/value rows.
 *
 * The rows uncover one by one.
 */
export function ControlPanel({ label, status, description, rows, delay = 0 }: ControlPanelProps) {
  return (
    <Reveal className="control-panel" delay={delay} distance={36}>
      <div className="control-panel-label">{label}</div>
      <div className="control-status">
        <span className="status-led" />
        <strong>{status}</strong>
      </div>
      <p>{description}</p>
      <div className="control-rows">
        {rows.map((row, i) => (
          <Reveal key={row.label} variant="wipe" delay={at(delay + 0.3 + 0.15 * i)}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </Reveal>
        ))}
      </div>
    </Reveal>
  );
}
