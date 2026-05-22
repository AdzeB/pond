import { useToast } from "@pond/ui";
import { useEffect } from "react";
import { toggleInspector } from "@/lib/use-inspector";
import { toggleSidebar } from "@/lib/use-sidebar";
import { usePrefs } from "@/pool/prefs";

export function MenuBridge() {
  const [, patchPreferences] = usePrefs("preferences");
  const toast = useToast();

  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      switch (id) {
        case "palette.open":
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              ctrlKey: true,
              bubbles: true,
            }),
          );
          return;

        case "view.sidebar.toggle":
          toggleSidebar();
          return;

        case "view.inspector.toggle":
          toggleInspector();
          return;

        case "theme.light":
          patchPreferences({ theme: "light" });
          return;

        case "theme.dark":
          patchPreferences({ theme: "dark" });
          return;

        case "theme.system":
          patchPreferences({ theme: "system" });
          return;

        case "refresh.all":
          void (async () => {
            const r = await window.pond.refreshBackfillStart({});
            if (r.ok) {
              toast.add({
                title: `Refreshing ${r.total} saves`,
                type: "success",
              });
            } else {
              toast.add({
                title: `Refresh: ${r.reason.replace("_", " ")}`,
                type: "error",
              });
            }
          })();
          return;
      }
    });
  }, [patchPreferences, toast]);

  return null;
}
