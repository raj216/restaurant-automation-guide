import type { MouseEvent, ReactNode } from "react";
import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import { useFormSending } from "../forms/FormCard";
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
 * Use one per view; pair it with a TextLink for the secondary action. As
 * a FormCard's submit button it shows "Sending…" while the form sends.
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
  const sending = useFormSending() && type === "submit" && !href;
  const classes = cx("button button-primary", sending && "is-sending", className);
  const content = sending ? (
    <>
      <span className="button-spinner" aria-hidden="true" />
      Sending…
    </>
  ) : (
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
    <button className={classes} type={type} onClick={onClick} disabled={disabled || sending}>
      {content}
    </button>
  );
}
