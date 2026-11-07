import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, LangSwitch, useI18n } from "./i18n";

function CurrentLanguage() {
  const { lang } = useI18n();
  return <output data-testid="current-language">{lang}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("language selection", () => {
  it("switches every context consumer to English and persists the selection", async () => {
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByTestId("current-language").textContent).toBe("en");
    expect(localStorage.getItem("aquibonela-lang")).toBe("en");
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
  });

  it("restores English after reopening and can return to Spanish", async () => {
    localStorage.setItem("aquibonela-lang", "en");
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    await waitFor(() => expect(screen.getByTestId("current-language").textContent).toBe("en"));
    fireEvent.click(screen.getByRole("button", { name: "es" }));
    expect(screen.getByTestId("current-language").textContent).toBe("es");
    expect(localStorage.getItem("aquibonela-lang")).toBe("es");
  });
});