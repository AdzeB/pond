import { IconMagnifierOutline18 as Magnifier } from "@pond/icons/outline/18";
import { SOURCES, type Source } from "@pond/schema/db";
import { TrayCard } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/components/library-dock/lib/context";
import { SourcePicker } from "@/components/source-picker";
import { useAccounts } from "@/hooks/use-accounts";
import { getSourceDef } from "@/lib/save/sources-registry";
import { connectFlow } from "@/stores/connect-flow";
import styles from "./styles.module.css";

/** `local` and `web` aren't sources you sign in to. */
const SYNCABLE: readonly Source[] = SOURCES.filter(
  (s) => s !== "local" && s !== "web",
);

/** Source picker in the dock tray; picking starts the browser sign-in and moves to the connect-wait card. */
export function ConnectSourceSection() {
  const dock = useDock();
  const { accounts } = useAccounts();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dock.isPreview) searchRef.current?.focus();
  }, [dock.isPreview]);

  const q = query.trim().toLowerCase();
  const matches = SYNCABLE.filter((source) => {
    if (!q) return true;
    const def = getSourceDef(source);
    return (
      def.label.toLowerCase().includes(q) ||
      source.includes(q) ||
      accounts.some(
        (a) =>
          a.source === source &&
          ((a.handle ?? "").toLowerCase().includes(q) ||
            (a.label ?? "").toLowerCase().includes(q)),
      )
    );
  });

  const pick = (source: Source) => {
    connectFlow.start(
      source,
      accounts.filter((a) => a.connected).map((a) => a.id),
    );
    dock.openViewMenu("connect-wait");
  };

  return (
    <>
      <TrayCard.Close />
      <TrayCard.Header position="center">
        <TrayCard.Title>Connect a Source</TrayCard.Title>
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.search}>
        <span className={styles["lead-icon"]}>
          <Magnifier width={18} height={18} />
        </span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search sources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            /** Esc clears the query first; only an empty field lets it bubble to the dock's close handler. */
            if (e.key === "Escape" && query) {
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
      </div>
      <SourcePicker sources={matches} onPick={pick} />
    </>
  );
}
