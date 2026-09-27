import { Button, Tooltip } from "@pond/ui";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import type { ScreenshotWindowApi } from "@shared/screenshot-window-contracts";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ScreenshotOrganizer } from "@/features/library/components/screenshot-organize";
import { InterfaceZoom } from "@/features/settings/effects/interface-zoom";
import { ThemeApplier } from "@/features/settings/effects/theme-applier";
import { FramelessWindowChrome } from "@/shared/components/frameless-window-chrome";
import "./boot-shell";
import "../styles.css";
import styles from "./screenshot-entry.module.css";

declare global {
  interface Window {
    pondScreenshot: ScreenshotWindowApi;
  }
}

function ScreenshotWindow() {
  const [draft, setDraft] = useState<ScreenshotDraft | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const unsubscribe = window.pondScreenshot.onInvalidated(setError);
    void window.pondScreenshot
      .draft()
      .then((value) => {
        if (value) setDraft(value);
        else
          setError(
            "This screenshot expired. Close this window and take it again.",
          );
      })
      .catch(() =>
        setError(
          "Couldn't load the screenshot. Close this window and take it again.",
        ),
      );
    return unsubscribe;
  }, []);
  return (
    <Tooltip.Provider>
      <ThemeApplier />
      <InterfaceZoom />
      <div className={styles.window}>
        <FramelessWindowChrome
          closeLabel="Close Save Screenshot"
          onClose={() => void window.pondScreenshot.close()}
        />
        {error ? (
          <div className={styles.message} role="alert">
            {error}
            <Button onClick={() => void window.pondScreenshot.close()}>
              Close
            </Button>
          </div>
        ) : draft ? (
          <ScreenshotOrganizer
            draft={draft}
            onClose={() => void window.pondScreenshot.close()}
          />
        ) : (
          <p className={styles.message} role="status">
            Loading screenshot
          </p>
        )}
      </div>
    </Tooltip.Provider>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Screenshot window root is missing.");
createRoot(root).render(<ScreenshotWindow />);
