import type { ScreenshotMode } from "@shared/screenshot-capture";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import { notify } from "@/shared/lib/toast";

let capturing = false;

export async function captureScreenshot(
  mode: ScreenshotMode = "area",
): Promise<void> {
  if (capturing) return;
  capturing = true;
  try {
    const result = await window.pond.query("screenshots.capture", { mode });
    if (result.kind === "draft")
      newMenuDialog.open({ kind: "screenshot-organize", draft: result.draft });
    if (result.kind === "unsupported")
      newMenuDialog.open({ kind: "screenshot" });
  } catch (error) {
    notify({
      id: "screenshot-capture",
      title: "Couldn't capture the screenshot",
      description: error instanceof Error ? error.message : "Try again.",
    });
  } finally {
    capturing = false;
  }
}

export async function launchScreenshotTool(
  openPondCapture: () => void = () => void captureScreenshot(),
): Promise<void> {
  try {
    const result = await window.pond.query("screenshots.launch", {});
    if (result.openPondCapture) openPondCapture();
    if (result.fallback)
      notify({
        id: "screenshot-tool",
        title: "Screenshot Tool Unavailable",
        description: "Pond opened the available fallback.",
      });
  } catch {
    notify({
      id: "screenshot-tool",
      title: "Couldn’t Open Screenshot Tool",
      description: "Choose another screenshot tool in Settings.",
    });
  }
}
