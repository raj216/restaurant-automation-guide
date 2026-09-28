import type { MouseEvent, ReactNode } from "react";
import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import { cx } from "../utils";

export interface ButtonProps {
  children: ReactNode;
  /** Renders a link when set; otherwise a button element. */
  href?: string;
  /** The button's type when there is no href. Default "button". */
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Trailing icon, or null for none. Default "arrow-right". */
  icon?: IconName | null;
  disabled?: boolean;
  className?: string;
}

/**
 * The primary call to action: a glowing gold pill with a trailing arrow that nudges forward on hover.
 *
 * Use one per view; pair it with a TextLink for the secondary action.
 */
export function Button({
  children,
  href,
  type = "button",
  onClick,
  icon = "arrow-right",
  disabled,
  className,
}: ButtonProps) {
  const classes = cx("button button-primary", className);
  const content = (
    <>
      {children}
      {icon && <Icon name={icon} size={18} />}
    </>
  );
  if (href) {
    return (
      <a className={classes} href={href} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button className={classes} type={type} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
