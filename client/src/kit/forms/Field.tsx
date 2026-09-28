export interface FieldProps {
  /** Shown above the input. Required fields get an asterisk after it. */
  label: string;
  name: string;
  /** Default "text". */
  type?: "text" | "email" | "tel" | "url" | "number" | "date" | "time";
  placeholder?: string;
  required?: boolean;
  /** Muted note after the label, e.g. "(optional)". */
  hint?: string;
}

/** A labelled text input: night-blue field, soft rounded corners, gold focus ring. Use inside a FormCard. */
export function Field({ label, name, type, placeholder, required, hint }: FieldProps) {
  return (
    <label>
      <span className="field-label">
        {label}
        {required && " *"}
        {hint && <span className="field-hint"> {hint}</span>}
      </span>
      <input name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  );
}
