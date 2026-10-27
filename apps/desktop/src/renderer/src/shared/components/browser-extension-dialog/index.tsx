import { CHROME_WEB_STORE_URL, FIREFOX_ADDONS_URL } from "@pond/schema/native";
import { Button, Dialog } from "@pond/ui";
import type { SafariExtensionStatus } from "@shared/safari-extension-contracts";
import { useCallback, useEffect, useState } from "react";
import { IS_MAC } from "@/shared/lib/platform";
import styles from "./styles.module.css";

const STORES = [
  {
    name: "Chrome Web Store",
    browsers: "Chrome, Arc, Brave, and Edge",
    action: "Add to Chrome",
    url: CHROME_WEB_STORE_URL,
  },
  {
    name: "Firefox Add-ons",
    browsers: "Firefox and Zen",
    action: "Add to Firefox",
    url: FIREFOX_ADDONS_URL,
  },
];

/**
 * Safari has no store page: the extension ships inside Pond.app, so there is nothing to
 * download and no link to follow. Whether it runs is decided by a switch in Safari's own
 * settings, which is why this row reports state instead of offering an install.
 */
function safariDetail(status: SafariExtensionStatus | null): string {
  switch (status?.state) {
    case "enabled":
      return "On, in Safari 18 or later";
    case "disabled":
      return "Installed, but switched off in Safari";
    case "not_registered":
      return "Open Safari once to finish setting it up";
    case "not_bundled":
      return "Not included in this build";
    default:
      return "Safari 18 or later, on macOS";
  }
}

const SAFARI_STEPS = [
  "Open Safari, then Settings and Extensions.",
  "Turn on Pond.",
  "Allow it for the sites you save from, or choose Always Allow on Every Website.",
];

export function BrowserExtensionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [safari, setSafari] = useState<SafariExtensionStatus | null>(null);

  const refreshSafari = useCallback(() => {
    if (!IS_MAC) return;
    void window.pond
      .query("extension.safariStatus", {})
      .then(setSafari)
      .catch(() => setSafari(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    setSafari(null);
    refreshSafari();
    /** Enabling happens in Safari; re-read on return so the row updates without a reopen. */
    window.addEventListener("focus", refreshSafari);
    return () => window.removeEventListener("focus", refreshSafari);
  }, [open, refreshSafari]);

  async function openStore(url: string): Promise<void> {
    setError(null);
    const result = await window.pond.openExternal(url);
    if (!result.ok) {
      setError("Pond couldn't open the store page. Try again.");
    }
  }

  async function openSafari(): Promise<void> {
    setError(null);
    const result = await window.pond.query("extension.openSafari", {});
    if (!result.ok) setError(result.error);
  }

  const safariState = safari?.state ?? null;
  const safariOff =
    safariState === "disabled" || safariState === "not_registered";
  const showSafariSteps = safariOff;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => !next && setError(null)}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <div className={styles.body}>
            <Dialog.Title className={styles.title}>
              Browser Extension
            </Dialog.Title>
            <Dialog.Description>
              Save pages and images from your browser into your library.
            </Dialog.Description>
            {error ? <p className={styles.error}>{error}</p> : null}
            <ul className={styles.stores}>
              {STORES.map((store) => (
                <li key={store.name} className={styles.store}>
                  <div className={styles.text}>
                    <span className={styles.name}>{store.name}</span>
                    <span className={styles.browsers}>{store.browsers}</span>
                  </div>
                  <Button onClick={() => void openStore(store.url)}>
                    {store.action}
                  </Button>
                </li>
              ))}
              {IS_MAC ? (
                <li className={styles.store}>
                  <div className={styles.text}>
                    <span className={styles.name}>
                      Safari
                      {safariState === "enabled" ? (
                        <span className={styles.badge}>Enabled</span>
                      ) : null}
                    </span>
                    <span className={styles.browsers}>
                      {safariDetail(safari)}
                    </span>
                  </div>
                  {safariState === "enabled" ||
                  safariState === "not_bundled" ? null : (
                    <Button onClick={() => void openSafari()}>
                      Open Safari
                    </Button>
                  )}
                </li>
              ) : null}
            </ul>
            {showSafariSteps ? (
              <ol className={styles.steps}>
                {SAFARI_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
