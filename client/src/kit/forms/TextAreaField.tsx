export interface TextAreaFieldProps {
  /** Shown above the box. Required fields get an asterisk after it. */
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  /** Visible lines. Default 4. */
  rows?: number;
  /** Muted note after the label, e.g. "(optional)". */
  hint?: string;
}

/** A labelled multi-line text box, styled like Field. Use inside a FormCard. */
export function TextAreaField({
  label,
  name,
  placeholder,
  required,
  rows = 4,
  hint,
}: TextAreaFieldProps) {
  return (
    <label>
      <span className="field-label">
        {label}
        {required && " *"}
        {hint && <span className="field-hint"> {hint}</span>}
      </span>
      <textarea name={name} rows={rows} placeholder={placeholder} required={required} />
    </label>
  );
}
