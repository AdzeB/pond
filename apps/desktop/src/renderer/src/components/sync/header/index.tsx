import { Button, useToast } from "@pond/ui";
import { useEffect, useState } from "react";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";

export function Header() {
  const toast = useToast();
  const [, , syncReady] = usePrefs("sync");
  const anyRunning = useAnyRunning();

  async function onClick() {
    try {
      await window.pond.syncRunAll();
      toast.add({
        title: "Sync started",
        description: "Pond is checking every connected source.",
        type: "info",
      });
    } catch {
      toast.add({ title: "Couldn't start sync", type: "error" });
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>Sync</h1>
        <p className={styles.subtitle}>
          Pond keeps your library up to date with connected sources.
        </p>
      </div>
      <Button
        size="md"
        disabled={!syncReady || anyRunning}
        onClick={() => void onClick()}
      >
        {anyRunning ? "Syncing\u2026" : "Sync now"}
      </Button>
    </header>
  );
}

function useAnyRunning(): boolean {
  const [running, setRunning] = useState<Set<string>>(new Set());
  useEffect(() => {
    return window.pond.onSyncStatus((u) => {
      setRunning((prev) => {
        const next = new Set(prev);
        if (u.state === "running") next.add(u.source);
        else next.delete(u.source);
        return next;
      });
    });
  }, []);
  return running.size > 0;
}
