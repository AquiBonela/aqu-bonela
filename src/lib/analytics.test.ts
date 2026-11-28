import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyLink, installLinkTracking, trackingDeclined } from "./analytics";

const ORIGIN = "https://portal.example.org";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("clasificación de enlaces para la analítica", () => {
  it("distingue teléfono, WhatsApp, correo y externos sin guardar el número ni la dirección", () => {
    expect(classifyLink("tel:+34600000000", ORIGIN)).toEqual({ channel: "phone" });
    expect(classifyLink("https://wa.me/34600000000?text=hola", ORIGIN)).toEqual({
      channel: "whatsapp",
    });
    expect(classifyLink("mailto:persona@example.org", ORIGIN)).toEqual({ channel: "email" });
    expect(classifyLink("https://otra.example.net/ruta?x=1", ORIGIN)).toEqual({
      host: "otra.example.net",
    });
  });

  it("los enlaces internos y los no web no cuentan como externos", () => {
    expect(classifyLink("/directorio", ORIGIN)).toBeNull();
    expect(classifyLink(`${ORIGIN}/sobre`, ORIGIN)).toBeNull();
    expect(classifyLink("javascript:void(0)", ORIGIN)).toBeNull();
  });

  it("respeta «No rastrear» y el control global de privacidad", () => {
    expect(trackingDeclined({ doNotTrack: "1" })).toBe(true);
    expect(trackingDeclined({ globalPrivacyControl: true })).toBe(true);
    expect(trackingDeclined({ doNotTrack: null })).toBe(false);
  });
});

describe("listener delegado", () => {
  it("sin proveedor no escucha nada", () => {
    const spy = vi.spyOn(document, "addEventListener");
    installLinkTracking(undefined)();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("envía el tipo de contacto y la ficha, nunca el número", () => {
    const send = vi.fn();
    document.body.innerHTML =
      '<article data-analytics-listing="panaderia"><a href="tel:+34600000000">Llamar</a></article>';
    const stop = installLinkTracking(send);
    // El navegador de pruebas no sabe abrir tel:; la analítica nunca impide la navegación.
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("click", block);
    document
      .querySelector("a")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    document.removeEventListener("click", block);
    stop();
    expect(send).toHaveBeenCalledWith({
      kind: "contact_click",
      channel: "phone",
      path: "/",
      listing: "panaderia",
    });
    expect(JSON.stringify(send.mock.calls)).not.toContain("600000000");
  });
});
