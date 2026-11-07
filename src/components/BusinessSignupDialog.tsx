import { Text, useI18n } from "@/lib/i18n";
import type { ReactElement } from "react";
import { X } from "lucide-react";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { SuggestionForm } from "@/components/SuggestionForm";

export function BusinessSignupDialog({ children, business = true, open, onOpenChange }: { children?: ReactElement; business?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { tr, locale } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay className="bg-foreground/50 motion-reduce:animate-none" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border bg-card p-5 text-card-foreground duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 motion-reduce:animate-none sm:p-6">
          <DialogTitle className="pr-12 font-display text-2xl font-extrabold leading-tight"><Text text={business ? "Tu negocio también forma parte de Bonela" : "¿Conoces algo que debería estar en Aquí Bonela?"} /></DialogTitle>
          <DialogDescription className="mt-3 text-base"><Text text={business ? "Una ficha gratuita, revisada contigo, para que vecinos y visitantes puedan encontrarte." : "Enviar información"} /></DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={tr("Cerrar formulario")} className="absolute right-3 top-3 h-11 w-11"><X aria-hidden /></Button>
          </DialogClose>
          <SuggestionForm business={business} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
