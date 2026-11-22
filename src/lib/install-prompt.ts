export const INSTALL_DELAY_MS = 12_000;
export const INSTALL_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
export const INSTALL_STORAGE_KEY = "aquibonela-install-dismissed";

export function installPlatform(userAgent: string, touchPoints = 0): "ios" | "android" | null {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  return /Android/i.test(userAgent) ? "android" : null;
}

export function isIosSafari(userAgent: string): boolean {
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent);
}

export function canOfferInstall(input: { mobile: boolean; installed: boolean; supported: boolean; dismissedAt: string | null; now: number }): boolean {
  const dismissed = Number(input.dismissedAt);
  return input.mobile && !input.installed && input.supported &&
    (!input.dismissedAt || !Number.isFinite(dismissed) || input.now - dismissed >= INSTALL_DISMISS_MS);
}

export function publicInstallPage(path: string): boolean {
  return !/^\/(admin|revision)(\/|$)/.test(path);
}