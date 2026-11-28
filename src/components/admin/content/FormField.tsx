import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/lib/i18n";

/** Campo de texto del panel con etiqueta, ayuda y error accesibles. */
export function FormField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  maxLength,
  multiline = false,
  type = "text",
  after,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  placeholder?: string | undefined;
  maxLength?: number | undefined;
  multiline?: boolean;
  type?: "text" | "email" | "url";
  after?: ReactNode;
}) {
  const describedBy = [hint && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ");
  const common = {
    id,
    value,
    placeholder,
    maxLength: maxLength ? maxLength + 20 : undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className: error ? "border-destructive" : undefined,
  };
  return (
    <div className="grid content-start gap-1 text-sm">
      <label htmlFor={id} className="font-medium">
        <Text text={label} />
      </label>
      {multiline ? (
        <Textarea rows={3} {...common} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input type={type} {...common} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          <Text text={hint} />
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          <Text text={error} />
        </p>
      )}
      {after}
    </div>
  );
}
