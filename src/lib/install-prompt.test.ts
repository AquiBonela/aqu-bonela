import { describe, expect, it } from "vitest";
import { canOfferInstall, INSTALL_DELAY_MS, INSTALL_DISMISS_MS, installPlatform, isIosSafari, publicInstallPage } from "./install-prompt";

describe("aviso de instalación", () => {
  const input = { mobile: true, installed: false, supported: true, dismissedAt: null, now: 100_000 };
  it("espera 12 segundos antes de ofrecer la instalación", () => expect(INSTALL_DELAY_MS).toBe(12_000));
  it("no insiste durante 30 días después de descartarlo", () => {
    expect(INSTALL_DISMISS_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(canOfferInstall({ ...input, dismissedAt: "100000", now: 100_000 + INSTALL_DISMISS_MS - 1 })).toBe(false);
    expect(canOfferInstall({ ...input, dismissedAt: "100000", now: 100_000 + INSTALL_DISMISS_MS })).toBe(true);
  });
  it("no ofrece instalar cuando se abre como aplicación", () => expect(canOfferInstall({ ...input, installed: true })).toBe(false));
  it("no ofrece el aviso automático en escritorio o navegadores no compatibles", () => {
    expect(canOfferInstall({ ...input, mobile: false })).toBe(false);
    expect(canOfferInstall({ ...input, supported: false })).toBe(false);
    expect(canOfferInstall(input)).toBe(true);
  });
  it("distingue Android, iPhone y Safari", () => {
    expect(installPlatform("Android Chrome")).toBe("android");
    expect(installPlatform("iPhone Safari")).toBe("ios");
    expect(installPlatform("Macintosh Safari", 5)).toBe("ios");
    expect(installPlatform("Windows Chrome")).toBe(null);
    expect(isIosSafari("iPhone Version/18 Safari")).toBe(true);
    expect(isIosSafari("iPhone CriOS/140 Safari")).toBe(false);
  });
  it("no interrumpe el panel ni las revisiones privadas", () => {
    expect(publicInstallPage("/admin/fichas")).toBe(false);
    expect(publicInstallPage("/revision/secreto")).toBe(false);
    expect(publicInstallPage("/directorio")).toBe(true);
  });
});