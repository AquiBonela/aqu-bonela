import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

// Router owns metadata; keep its original value so a language switch is reversible.
const originals = new WeakMap<Element, { source: string; rendered: string }>();

export function LocalizedHead() {
  const { tr } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    const translate = () => {
      document.head.querySelectorAll('title, meta[name="description"], meta[property="og:title"], meta[property="og:description"]').forEach((element) => {
        const title = element.tagName === "TITLE";
        const current = title ? element.textContent ?? "" : element.getAttribute("content") ?? "";
        const previous = originals.get(element);
        const source = previous?.rendered === current ? previous.source : current;
        let rendered = tr(source);
        if (rendered === source && source.endsWith(" — Aquí Bonela")) rendered = `${tr(source.slice(0, -15))} — Aquí Bonela`;
        originals.set(element, { source, rendered });
        if (current === rendered) return;
        if (title) element.textContent = rendered;
        else element.setAttribute("content", rendered);
      });
    };
    translate();
    const observer = new MutationObserver(translate);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    return () => observer.disconnect();
  }, [tr, pathname]);
  return null;
}