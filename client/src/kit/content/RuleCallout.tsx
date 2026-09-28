import type { ReactNode } from "react";
import { Reveal } from "../motion/Reveal";

export interface RuleCalloutProps {
  /** Small terracotta label, e.g. "THE SIMPLE RULE". */
  label: string;
  /** One sentence, set in the serif. */
  children: ReactNode;
}

/**
 * A full-width statement between two rules: a small terracotta label, then one sentence in the serif.
 *
 * For light sections. The top rule is dark, the bottom one light.
 */
export function RuleCallout({ label, children }: RuleCalloutProps) {
  return (
    <Reveal className="acceptance-rule" variant="wipe">
      <span>{label}</span>
      <Reveal as="strong" delay={0.45} distance={12}>
        {children}
      </Reveal>
    </Reveal>
  );
}
