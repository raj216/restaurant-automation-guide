export interface SelectFieldProps {
  /** Shown above the menu. Required fields get an asterisk after it. */
  label: string;
  name: string;
  options: string[];
  /** A disabled first entry shown until a choice is made, e.g. "Select your POS". */
  placeholder?: string;
  required?: boolean;
  /** Initially selected option. Default: the placeholder if there is one, else the first option. */
  defaultValue?: string;
}

/** A labelled drop-down menu, styled like Field. Use inside a FormCard. */
export function SelectField({
  label,
  name,
  options,
  placeholder,
  required,
  defaultValue,
}: SelectFieldProps) {
  return (
    <label>
      {label}
      {required && " *"}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? (placeholder ? "" : options[0])}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
