import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";
import { cx } from "../utils";

export interface ArrowLinkProps {
  children: ReactNode;
  href: string;
  className?: string;
}

/**
 * An inline link with a trailing arrow, for dark sections.
 *
 * It takes the surrounding text color and warms to light terracotta on hover.
 */
export function ArrowLink({ children, href, className }: ArrowLinkProps) {
  return (
    <a className={cx("arrow-link", className)} href={href}>
      <span>{children}</span>
      <Icon name="arrow-right" size={17} strokeWidth={1.8} />
    </a>
  );
}
