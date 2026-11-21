import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, LangSwitch, useI18n, LANGS, LANGUAGE_OPTIONS } from "./i18n";

function CurrentLanguage() {
  const { lang } = useI18n();
  return <output data-testid="current-language">{lang}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("language selection", () => {
  it("switches every context consumer to English and persists the selection", async () => {
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    fireEvent.keyDown(screen.getByRole("button", { name: /Español/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "English" }));
    expect(screen.getByTestId("current-language").textContent).toBe("en");
    expect(localStorage.getItem("aquibonela-lang")).toBe("en");
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
  });

  it("restores English after reopening and can return to Spanish", async () => {
    localStorage.setItem("aquibonela-lang", "en");
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    await waitFor(() => expect(screen.getByTestId("current-language").textContent).toBe("en"));
    fireEvent.keyDown(screen.getByRole("button", { name: /English/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Español" }));
    expect(screen.getByTestId("current-language").textContent).toBe("es");
    expect(localStorage.getItem("aquibonela-lang")).toBe("es");
  });
  it("offers the six agreed languages", () => {
    expect(LANGS).toEqual(["es", "en", "de", "nl", "fr", "uk"]);
  });
  it.each(["de", "nl", "fr", "uk"] as const)("selects and restores %s independently", async (language) => {
    const first = render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    fireEvent.keyDown(screen.getByRole("button", { name: /Español/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: LANGUAGE_OPTIONS[language].name }));
    expect(screen.getByTestId("current-language").textContent).toBe(language);
    expect(localStorage.getItem("aquibonela-lang")).toBe(language);
    first.unmount();
    render(<I18nProvider><CurrentLanguage /></I18nProvider>);
    await waitFor(() => expect(screen.getByTestId("current-language").textContent).toBe(language));
    expect(document.documentElement.lang).toBe(language);
  });
});