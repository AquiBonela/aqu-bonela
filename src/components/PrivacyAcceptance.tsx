import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useI18n } from "@/lib/i18n";

export function PrivacyAcceptance({ accepted, onChange }: { accepted: boolean; onChange: (accepted: boolean) => void }) {
  const id = useId();
  const { tr } = useI18n();
  return (
    <div className="flex items-start gap-3 text-sm text-foreground">
      <input id={id} type="checkbox" required checked={accepted} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
      <label htmlFor={id}>
        {tr("He leído y acepto la política de privacidad")}{" "}
        (<Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline">{tr("Política de privacidad")}</Link>)
      </label>
    </div>
  );
}