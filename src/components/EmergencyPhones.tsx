import { useState } from "react";
import { Phone, Siren } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EMERGENCY_GROUPS, MAIN_EMERGENCY } from "@/lib/emergency-phones";

export function EmergencyPhonesList() {
  return (
    <div className="space-y-5">
      <a
        href={`tel:${MAIN_EMERGENCY.tel}`}
        className="press-feedback flex items-center justify-between gap-4 bg-destructive p-5 text-destructive-foreground"
      >
        <span>
          <span className="block font-display text-xl font-extrabold">{MAIN_EMERGENCY.label}</span>
          <span className="mt-1 block text-sm opacity-95">{MAIN_EMERGENCY.note}</span>
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap font-display text-4xl font-extrabold">
          <Phone className="h-7 w-7" aria-hidden /> 112
        </span>
      </a>
      <p className="text-sm text-muted-foreground">Si no sabes qué servicio necesitas, llama al 112: ellos coordinan la ayuda.</p>
      {EMERGENCY_GROUPS.map((g) => (
        <div key={g.id}>
          <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">{g.title}</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {g.phones.map((p) => (
              <li key={p.tel}>
                <a href={`tel:${p.tel}`} className="press-feedback flex h-full items-start justify-between gap-3 border-2 border-destructive/20 bg-destructive/5 p-3 hover:bg-destructive/10">
                  <span>
                    <span className="block font-semibold">{p.label}</span>
                    {p.note && <span className="mt-0.5 block text-xs text-muted-foreground">{p.note}</span>}
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap font-display text-lg font-extrabold text-destructive">
                    <Phone className="h-4 w-4" aria-hidden /> {p.show ?? p.tel}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function EmergencyButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Emergencias y teléfonos de ayuda"
        className={`press-feedback inline-flex min-h-11 min-w-11 items-center justify-center gap-1 text-destructive hover:opacity-80 ${className}`}
      >
        <Siren className="h-5 w-5" aria-hidden />
        <span className="hidden text-xs font-bold uppercase sm:inline">SOS</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Siren className="h-6 w-6 text-destructive" aria-hidden /> Emergencias y ayuda
          </DialogTitle>
          <DialogDescription>Toca un número para llamar.</DialogDescription>
          <EmergencyPhonesList />
        </DialogContent>
      </Dialog>
    </>
  );
}
