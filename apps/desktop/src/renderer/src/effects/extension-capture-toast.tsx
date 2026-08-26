import { useEffect } from "react";
import type { SyncActionEvent } from "@/lib/save/reconcile";
import { notify } from "@/lib/ui/toast";

const EXTENSION_CAPTURE_RE =
  /^(twitter|instagram|pinterest|arena|cosmos|tiktok|youtube|reddit|threads):/;

export function ExtensionCaptureToast() {
  useEffect(() => {
    return window.pond.onSyncAction((raw) => {
      const event = raw as SyncActionEvent;
      if (event.modelName !== "save" || event.action !== "I") return;
      if (!EXTENSION_CAPTURE_RE.test(event.actorReason ?? "")) return;
      notify({
        id: "extension-capture",
        title: "Saved to Pond",
      });
    });
  }, []);

  return null;
}
