// @vitest-environment jsdom

import { createCopyTranslator } from "@shared/localization";
import { afterEach, expect, it } from "vitest";
import { localizeSettingsNode } from "./localized-settings";

afterEach(() => {
  document.body.replaceChildren();
});

it("localizes registered Settings text and accessibility copy", () => {
  const button = document.createElement("button");
  button.textContent = "Settings";
  button.setAttribute("aria-label", "Settings");
  document.body.append(button);

  localizeSettingsNode(document.body, createCopyTranslator("ja"));

  expect(button.textContent).toBe("設定");
  expect(button.getAttribute("aria-label")).toBe("設定");
});
