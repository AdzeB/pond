import type { ImportScope } from "@pond/schema/db";
import { Dialog, Toggle, ToggleGroup } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SourceInspector } from "@/features/sources/components/inspector";
import {
  createImportScopeFlow,
  type ImportScopeAccount,
  ImportScopeFlowProvider,
} from "@/features/sources/state/import-scope-flow";
import "../styles.css";
import {
  IMPORT_OPTIONS,
  IMPORT_SCOPE_CASES,
  type ImportScopeCase,
} from "./fixtures";
import styles from "./styles.module.css";

const syncs = new Map<string, ImportScopeAccount["sync"]>(
  IMPORT_SCOPE_CASES.map((item) => [item.account.id, item.account.sync]),
);

function accountRow(item: ImportScopeCase) {
  return {
    id: item.account.id,
    source: item.account.source,
    handle: "raphaelsalaja",
    label: null,
    avatarUrl: null,
    addedAt: "2026-10-17T19:52:00.000Z",
    sync: {
      lastSyncedAt: null,
      lastError: null,
      knownCount: 0,
      ...syncs.get(item.account.id),
    },
    connected: true,
    syncing: false,
  };
}

/** Fixture answers stand in for main, so the gallery never reads or writes a library. */
async function query(
  name: string,
  input?: { accountId?: string; scope?: ImportScope },
) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const accountId = input?.accountId ?? "";
  if (name === "accounts.importOptions") {
    const options = IMPORT_OPTIONS.get(accountId);
    if (options === undefined) return { ok: true, collections: [] };
    return Array.isArray(options)
      ? { ok: true, collections: options }
      : { ok: false, error: options };
  }
  if (name === "accounts.setImportScope") {
    syncs.set(accountId, { importScope: input?.scope });
    return { ok: true };
  }
  if (name === "accounts.list") {
    return { accounts: IMPORT_SCOPE_CASES.map(accountRow) };
  }
  return { ok: true };
}

Object.defineProperty(window, "pond", {
  value: { query, syncRunNow: async () => ({ ok: true }) },
});

type Theme = "dark" | "light";

function paint(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

function Gallery() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark",
  );
  useLayoutEffect(() => paint(theme), [theme]);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Account Details</h1>
          <p className={styles.subtitle}>
            Every state of the Import section, with fixture Accounts. Choices
            here don't save anywhere.
          </p>
        </div>
        <ToggleGroup
          aria-label="Theme"
          value={[theme]}
          onValueChange={(next) => {
            const [value] = next;
            if (value === "dark" || value === "light") setTheme(value);
          }}
        >
          <Toggle size="sm" value="dark">
            Dark
          </Toggle>
          <Toggle size="sm" value="light">
            Light
          </Toggle>
        </ToggleGroup>
      </header>
      <div className={styles.grid}>
        {IMPORT_SCOPE_CASES.map((item) => (
          <ImportScopeCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}

function ImportScopeCard({ item }: { item: ImportScopeCase }) {
  const [flow] = useState(createImportScopeFlow);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <figure className={styles.card}>
      <figcaption className={styles.caption}>
        <span className={styles.name}>{item.title}</span>
        <span className={styles.note}>{item.note}</span>
      </figcaption>
      <div ref={setFrame} className={styles.frame}>
        {frame ? (
          <ImportScopeFlowProvider value={flow}>
            <Dialog.Root open modal={false}>
              <Dialog.Portal container={frame}>
                <Dialog.Popup
                  aria-label="Account Details"
                  className={styles.popup}
                  initialFocus={false}
                >
                  <SourceInspector
                    kind="account"
                    id={item.account.id}
                    page="import"
                  />
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </ImportScopeFlowProvider>
        ) : null}
      </div>
    </figure>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <Gallery />
    </QueryClientProvider>
  </React.StrictMode>,
);
