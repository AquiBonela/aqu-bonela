import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Download, PlusSquare, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { getMunicipality } from "@/config/municipality";
import { InstallContext } from "@/components/install-prompt-context";
import { canOfferInstall, INSTALL_DELAY_MS, INSTALL_STORAGE_KEY, installPlatform, isIosSafari, publicInstallPage } from "@/lib/install-prompt";

interface BrowserInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const { tr } = useI18n();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [safari, setSafari] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<BrowserInstallEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const offered = useRef(false);
  const enteredAt = useRef<number | null>(null);
  const publicPage = publicInstallPage(path);

  useEffect(() => {
    enteredAt.current = Date.now();
    setPlatform(installPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setSafari(isIosSafari(navigator.userAgent));
    const display = window.matchMedia("(display-mode: standalone)");
    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    const checkInstalled = () => {
      const running = display.matches || iosNavigator.standalone === true;
      setInstalled(running);
      if (running) setOpen(false);
    };
    const onPrompt = (event: Event) => {
      if (installPlatform(navigator.userAgent, navigator.maxTouchPoints) !== "android") return;
      event.preventDefault();
      setInstallEvent(event as BrowserInstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
      setInstallEvent(null);
    };
    checkInstalled();
    display.addEventListener("change", checkInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      display.removeEventListener("change", checkInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!publicPage) setOpen(false);
    if (!publicPage || offered.current) return;
    const offer = () => {
      if (offered.current) return;
      let dismissedAt: string | null = null;
      try { dismissedAt = localStorage.getItem(INSTALL_STORAGE_KEY); } catch { /* Storage is optional. */ }
      if (!canOfferInstall({ mobile: platform !== null, installed, supported: Boolean(installEvent) || (platform === "ios" && safari), dismissedAt, now: Date.now() })) return;
      if (enteredAt.current === null || Date.now() - enteredAt.current < INSTALL_DELAY_MS) return;
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"], [role="alertdialog"], #menu-principal')) return;
      offered.current = true;
      setOpen(true);
    };
    const interval = window.setInterval(offer, 1000);
    return () => window.clearInterval(interval);
  }, [publicPage, installed, platform, safari, installEvent]);

  const dismiss = () => {
    offered.current = true;
    try { localStorage.setItem(INSTALL_STORAGE_KEY, String(Date.now())); } catch { /* Still dismiss for this visit. */ }
    setOpen(false);
  };
  const install = async () => {
    if (!installEvent || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") {
        try { localStorage.setItem(INSTALL_STORAGE_KEY, String(Date.now())); } catch { /* Storage is optional. */ }
        setInstalled(true);
        setOpen(false);
      } else dismiss();
    } catch {
      setFailed(true);
    } finally { setBusy(false); }
  };

  return (
    <InstallContext.Provider value={{ available: platform !== null && !installed && publicPage, show: () => { offered.current = true; setFailed(false); setOpen(true); } }}>
      {children}
      <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) dismiss(); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-none shadow-none sm:rounded-none motion-reduce:animate-none">
          <img src={getMunicipality().assets.pwaIcons.icon192} alt="" width={64} height={64} className="h-16 w-16" />
          <DialogHeader>
            <DialogTitle className="pr-5 font-display text-xl leading-snug">{tr("Instalar {app}")}</DialogTitle>
            <DialogDescription>{tr("Añadir {app} a tu pantalla de inicio")}</DialogDescription>
          </DialogHeader>
          {!installEvent && (platform === "ios" && safari ? (
            <ol className="space-y-4 text-sm">
              <li className="flex items-center gap-3"><span className="text-muted-foreground">1.</span><Share className="h-5 w-5 shrink-0 text-primary" aria-hidden />{tr("Compartir")}</li>
              <li className="flex items-center gap-3"><span className="text-muted-foreground">2.</span><PlusSquare className="h-5 w-5 shrink-0 text-primary" aria-hidden />{tr("Añadir a la pantalla de inicio")}</li>
              <li className="flex items-center gap-3"><span className="text-muted-foreground">3.</span>{tr("Añadir")}</li>
            </ol>
          ) : <p className="text-sm leading-relaxed">{tr(platform === "ios" ? "Abre esta página en Safari para añadirla a tu pantalla de inicio." : "Abre el menú de tu navegador y selecciona «Instalar aplicación» o «Añadir a la pantalla de inicio».")}</p>)}
          {failed && <p role="alert" className="text-sm text-destructive">{tr("No se ha podido abrir la instalación. Puedes volver a intentarlo.")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={dismiss}>{tr("Ahora no")}</Button>
            {installEvent && <Button disabled={busy} onClick={() => void install()}><Download className="h-4 w-4" aria-hidden />{tr("Instalar")}</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </InstallContext.Provider>
  );
}