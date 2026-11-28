import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** Botones para subir y bajar un elemento de una lista (accesibles con teclado y lector). */
export function OrderControls({
  index,
  count,
  label,
  onMove,
  disabled = false,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (delta: -1 | 1) => void;
  disabled?: boolean;
}) {
  const { tr } = useI18n();
  return (
    <span className="inline-flex shrink-0 gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={disabled || index === 0}
        aria-label={tr("Subir {item}", { item: label })}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={disabled || index === count - 1}
        aria-label={tr("Bajar {item}", { item: label })}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="h-4 w-4" aria-hidden />
      </Button>
    </span>
  );
}
