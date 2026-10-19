import { EXTENSION_STORE_URLS, type ExtensionStore } from "@pond/schema/native";
import { Button, Dialog } from "@pond/ui";
import styles from "./styles.module.css";

const STORES: {
  store: ExtensionStore;
  title: string;
  browsers: string;
  action: string;
}[] = [
  {
    store: "chrome",
    title: "Chrome Web Store",
    browsers: "Chrome, Arc, Brave, Edge, and other Chromium browsers",
    action: "Add to Chrome",
  },
  {
    store: "firefox",
    title: "Firefox Add-ons",
    browsers: "Firefox and Zen",
    action: "Add to Firefox",
  },
];

export function BrowserExtensionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const openStore = (url: string) => {
    void window.pond.openExternal(url);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <div className={styles.body}>
            <Dialog.Title className={styles.title}>
              Browser Extension
            </Dialog.Title>
            <Dialog.Description>
              Save pages, screenshots, images, and your bookmarks on supported
              sites into your library. Keep Pond open while you browse.
            </Dialog.Description>
            <ul className={styles.stores}>
              {STORES.map(({ store, title, browsers, action }) => {
                const url = EXTENSION_STORE_URLS[store];
                return (
                  <li key={store} className={styles.store}>
                    <div className={styles.details}>
                      <span className={styles.name}>{title}</span>
                      <span className={styles.meta}>
                        {url ? browsers : "Coming soon"}
                      </span>
                    </div>
                    <Button
                      variant={store === "chrome" ? "primary" : "secondary"}
                      disabled={!url}
                      onClick={() => url && openStore(url)}
                    >
                      {action}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
