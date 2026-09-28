import type { ReactNode } from "react";
import type { EntranceProps } from "../motion/core";
import { Reveal } from "../motion/Reveal";
import { cx } from "../utils";

const variantClass = {
  body: undefined,
  lead: "large-copy",
  lede: "hero-lede",
  emphasis: "hero-emphasis",
};

export interface TextProps extends EntranceProps {
  /** body: regular paragraph. lead: large serif opener. lede: the hero introduction. emphasis: short bold line. Default body. */
  variant?: "body" | "lead" | "lede" | "emphasis";
  children: ReactNode;
  className?: string;
}

/** A paragraph in one of the kit's text styles. In motion it rises into place. */
export function Text({ variant = "body", children, className, ...entrance }: TextProps) {
  return (
    <Reveal as="p" className={cx(variantClass[variant], className)} {...entrance}>
      {children}
    </Reveal>
  );
}
