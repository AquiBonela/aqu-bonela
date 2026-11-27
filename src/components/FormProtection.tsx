import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFormProtection } from "@/lib/forms.functions";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Turnstile widget + server-issued session + honeypot state for public forms. */
export function useFormProtection(action: string) {
  const fetchConfig = useServerFn(getFormProtection);
  const [session, setSession] = useState("");
  const [token, setToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!container) return;
    let cancelled = false;
    (async () => {
      const cfg = await fetchConfig();
      if (cancelled) return;
      setSession(cfg.session);
      if (!cfg.siteKey) return;
      await loadTurnstile();
      if (cancelled || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container, {
        sitekey: cfg.siteKey,
        action,
        appearance: "interaction-only",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action, fetchConfig, container]);

  const reset = () => {
    setToken("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  };

  const fields = (
    <>
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>
      <div ref={setContainer} />
    </>
  );

  return {
    fields,
    ready: Boolean(session && token),
    payload: { session, turnstileToken: token, website: honeypot },
    reset,
  };
}
