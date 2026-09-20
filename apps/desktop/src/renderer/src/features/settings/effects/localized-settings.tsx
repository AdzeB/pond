import { createCopyTranslator } from "@shared/localization";
import { useEffect } from "react";
import { usePrefs } from "@/features/settings/state/prefs";

const LOCALIZED_ATTRIBUTES = [
  "aria-label",
  "aria-placeholder",
  "alt",
  "placeholder",
  "title",
] as const;

export function localizeSettingsNode(
  root: Node,
  translate: (copy: string) => string,
) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  let node: Node | null = root;
  while (node) {
    if (node instanceof Text) {
      const copy = node.data.trim();
      if (copy) {
        const localized = translate(copy);
        if (localized !== copy) {
          node.data = node.data.replace(copy, localized);
        }
      }
    } else if (node instanceof Element) {
      for (const attribute of LOCALIZED_ATTRIBUTES) {
        const copy = node.getAttribute(attribute);
        if (!copy) continue;
        const localized = translate(copy);
        if (localized !== copy) node.setAttribute(attribute, localized);
      }
    }
    node = walker.nextNode();
  }
}

export function LocalizedSettings() {
  const [localization] = usePrefs("localization");

  useEffect(() => {
    const translate = createCopyTranslator(localization.locale);
    localizeSettingsNode(document.body, translate);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          localizeSettingsNode(mutation.target, translate);
          continue;
        }
        if (mutation.type === "characterData") {
          localizeSettingsNode(mutation.target, translate);
          continue;
        }
        for (const node of mutation.addedNodes)
          localizeSettingsNode(node, translate);
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...LOCALIZED_ATTRIBUTES],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [localization.locale]);

  return null;
}
