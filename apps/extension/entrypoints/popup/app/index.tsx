import { IconGear3 } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Empty } from "@pond/ui/empty";
import { Loader } from "@pond/ui/loader";
import type { ReactNode } from "react";
import { sendMessage } from "@/utils/messaging";
import { useLibrary } from "@/utils/use-library";
import { useActiveTab } from "../hooks";
import { Recent } from "../recent";
import { SavePanel } from "../save-panel";
import { Tools } from "../tools";
import styles from "./styles.module.css";

function isWebUrl(url: string | undefined): boolean {
  return !!url && /^https?:\/\//i.test(url);
}

function Shell({ name, children }: { name?: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img
          className={styles.mark}
          src="/icons/brand/icon.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className={styles.name}>{name ?? "Pond"}</span>
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Settings"
          onClick={() => void browser.runtime.openOptionsPage()}
        >
          <IconGear3 size={16} />
        </Button>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

export function App() {
  const { result, refresh } = useLibrary();
  const tab = useActiveTab();

  if (!result || tab === undefined) {
    return (
      <Shell>
        <div className={styles.center}>
          <Loader.Root aria-label="Connecting to Pond">
            <Loader.Spinner />
          </Loader.Root>
        </div>
      </Shell>
    );
  }

  if (result.state === "offline") {
    return (
      <Shell>
        <Empty.Root className={styles.center}>
          <Empty.Title>Pond isn't running</Empty.Title>
          <Empty.Description>
            Open Pond on your computer to save from the browser.
          </Empty.Description>
          <Empty.Action className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => void sendMessage("openPond", undefined)}
            >
              Open Pond
            </Button>
            <Button variant="primary" onClick={() => void refresh()}>
              Try Again
            </Button>
          </Empty.Action>
        </Empty.Root>
      </Shell>
    );
  }

  const savable = tab && tab.id !== undefined && isWebUrl(tab.url) ? tab : null;

  return (
    <Shell name={result.library.name}>
      <SavePanel tab={savable} />
      <Tools tabId={savable?.id} />
      <Recent />
    </Shell>
  );
}
