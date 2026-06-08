import { matches } from "@/sources/twitter/matches";
import { mountPondSidebarLink } from "@/sources/twitter/sidebar";
import { bridge } from "@/utils/bridge";
import { normalizeStoredSettings } from "@/utils/types";

export default defineContentScript({
  matches,
  runAt: "document_start",
  main() {
    bridge("twitter");
    chrome.storage.local.get("settings").then((stored) => {
      const settings = normalizeStoredSettings(stored.settings);
      if (settings.enabled.twitter) mountPondSidebarLink();
    });
  },
});
