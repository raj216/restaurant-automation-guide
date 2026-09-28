import type { ReactNode } from "react";
import type { EntranceProps } from "../motion/core";
import { Reveal } from "../motion/Reveal";

export interface ActionRowProps extends EntranceProps {
  /** Usually a Button followed by a TextLink. */
  children: ReactNode;
}

/** A row of calls to action with generous space around it. Stacks on phones. */
export function ActionRow({ children, ...entrance }: ActionRowProps) {
  return (
    <Reveal className="hero-actions" {...entrance}>
      {children}
    </Reveal>
  );
}
