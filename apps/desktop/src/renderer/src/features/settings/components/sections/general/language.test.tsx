import { DEFAULT_PREFS } from "@pond/schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { LanguageRow } from "./language";

it("renders the saved locale with translated settings copy", async () => {
  vi.stubGlobal("pond", {
    async query(name: string) {
      if (name === "settings.getPrefs") {
        return {
          ...DEFAULT_PREFS,
          localization: { locale: "ja" },
        };
      }
      throw new Error(`Unexpected query: ${name}`);
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  try {
    await act(async () => root.render(<LanguageRow />));
    expect(host.textContent).toContain("言語");
    expect(host.textContent).toContain("日本語");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
