import type { ReactNode } from "react";

export interface FormActionsProps {
  /** Optionally a SelectField, then the submit Button. */
  children: ReactNode;
}

/**
 * The last row of a FormCard: an optional field on the left, the submit Button on the right.
 *
 * Stacks on phones, with the button full width.
 */
export function FormActions({ children }: FormActionsProps) {
  return <div className="form-bottom">{children}</div>;
}
