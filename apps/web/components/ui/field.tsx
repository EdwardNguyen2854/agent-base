import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { cn } from "../../lib/utils";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
};

export function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[12px] font-semibold tracking-tight text-text"
      >
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass = cn(
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-text",
  "placeholder:text-muted/70 hover:border-text/20",
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
  "transition-colors duration-150",
);

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...rest} />
));
TextInput.displayName = "TextInput";

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...rest }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(inputClass, "resize-y leading-relaxed", className)}
    {...rest}
  />
));
TextArea.displayName = "TextArea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...rest }, ref) => (
  <select
    ref={ref}
    className={cn(
      inputClass,
      "appearance-none bg-[length:14px] bg-no-repeat bg-[position:calc(100%-14px)_center] pr-9",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23141413' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    }}
    {...rest}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id) => <TextInput id={id} {...rest} />}
    </FieldShell>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  ...rest
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id) => <TextArea id={id} {...rest} />}
    </FieldShell>
  );
}

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function SelectField({
  label,
  hint,
  error,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id) => (
        <Select id={id} {...rest}>
          {children}
        </Select>
      )}
    </FieldShell>
  );
}
