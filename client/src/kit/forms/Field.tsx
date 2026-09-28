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

/** A labelled text input on warm paper with a hairline border. Use inside a FormCard. */
export function Field({ label, name, type, placeholder, required, hint }: FieldProps) {
  return (
    <label>
      {label}
      {required && " *"}
      {hint && (
        <>
          {" "}
          <span>{hint}</span>
        </>
      )}
      <input name={name} type={type} placeholder={placeholder} required={required} />
    </label>
  );
}
