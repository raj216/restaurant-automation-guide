import type { ReactNode } from "react";

export interface FormGridProps {
  /** Field, SelectField or TextAreaField elements. */
  children: ReactNode;
}

/** Lays fields out in two columns inside a FormCard; one column on phones. */
export function FormGrid({ children }: FormGridProps) {
  return <div className="form-grid">{children}</div>;
}
