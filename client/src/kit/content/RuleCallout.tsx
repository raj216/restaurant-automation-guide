import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";
import { Reveal } from "../motion/Reveal";

export interface RuleCalloutProps {
  /** Small gold label after a lock, e.g. "THE SIMPLE RULE". */
  label: string;
  /** One sentence, set large. Wrap a phrase in <em> to set it in gold. */
  children: ReactNode;
}

/**
 * A glowing banner for the one rule that matters: a small gold label with a lock, then one large sentence.
 *
 * It rises in, then the sentence follows.
 */
export function RuleCallout({ label, children }: RuleCalloutProps) {
  return (
    <Reveal className="rule-callout" distance={30}>
      <span className="rule-label">
        <Icon name="lock" size={22} /> {label}
      </span>
      <Reveal as="strong" className="rule-statement" delay={0.3} distance={12}>
        {children}
      </Reveal>
    </Reveal>
  );
}
