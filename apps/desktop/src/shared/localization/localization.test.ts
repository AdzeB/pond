import { DEFAULT_PREFS, PrefsSchema } from "@pond/schema";
import { describe, expect, it } from "vitest";
import {
  createCopyTranslator,
  createTranslator,
  LOCALE_LABELS,
  resolveLocale,
} from "./index";

describe("localization", () => {
  it("keeps every documented locale available", () => {
    expect(Object.keys(LOCALE_LABELS)).toEqual([
      "en",
      "es",
      "de",
      "ru",
      "zh-TW",
      "zh-CN",
      "ja",
      "ko",
    ]);
  });

  it("uses the selected catalog for shared actions", () => {
    expect(createTranslator("de")("common.save")).toBe("Sichern");
  });

  it("translates foundational main-process copy", () => {
    const translate = createTranslator("ja");
    expect(translate("main.openPond")).toBe("Pond を開く");
    expect(translate("main.settings")).toBe("設定");
    expect(translate("main.about", { appName: "Pond" })).toBe("Pond について");
  });

  it("localizes registered literal copy at production boundaries", () => {
    expect(createCopyTranslator("ja")("Settings")).toBe("設定");
    expect(createCopyTranslator("ja")("Not registered")).toBe("Not registered");
  });

  it("falls back to English for unsupported stored locales", () => {
    expect(resolveLocale("fr")).toBe("en");
    expect(PrefsSchema.parse({ localization: { locale: "fr" } })).toEqual(
      expect.objectContaining({
        localization: DEFAULT_PREFS.localization,
      }),
    );
  });
});
