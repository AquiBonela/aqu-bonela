import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function BackToTop() {
  const { tr } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  if (!show) return null;
  return (
    <Button variant="ghost" size="icon" type="button" aria-label={tr("Volver arriba")}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
      className="back-to-top fixed bottom-5 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-card text-primary">
      <ArrowUp className="h-6 w-6" aria-hidden />
    </Button>
  );
}