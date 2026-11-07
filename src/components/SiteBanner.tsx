import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { directoryQuery } from "@/lib/directory";
import { useI18n } from "@/lib/i18n";

/** Franja de aviso global (texto editable desde ajustes del panel). */
export function SiteBanner() {
  const { tr } = useI18n();
  const { data } = useQuery(directoryQuery);
  if (!data?.banner) return null;
  return (
    <div role="status" className="relative z-20 flex items-center justify-center gap-2 bg-terracotta px-4 py-2.5 text-center text-sm font-semibold text-terracotta-foreground">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <span>{tr(data.banner)}</span>
    </div>
  );
}
