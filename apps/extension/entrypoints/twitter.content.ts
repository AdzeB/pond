import { matches } from "@/sources/twitter/matches";
import { mountPondSidebarLink } from "@/sources/twitter/sidebar";
import { bridge } from "@/utils/bridge";
import { getSettings } from "@/utils/settings";

export default defineContentScript({
  matches,
  runAt: "document_start",
  main() {
    void bridge("twitter");
    void getSettings().then((settings) => {
      if (settings.enabled.twitter) mountPondSidebarLink();
    });
  },
});
