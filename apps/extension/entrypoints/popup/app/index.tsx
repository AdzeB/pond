import {
  IconArrowsExpandY,
  IconBookmark,
  IconCamera,
  IconCrop,
  IconGear3,
  IconImages,
} from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Empty } from "@pond/ui/empty";
import { Keyboard } from "@pond/ui/keyboard";
import { Loader } from "@pond/ui/loader";
import { Select } from "@pond/ui/select";
import { type ReactNode, useState } from "react";
import {
  type CaptureTool,
  sendMessage,
  type ToolResult,
} from "@/utils/messaging";
import { useLibrary } from "@/utils/use-library";
import { useSettings } from "@/utils/use-settings";
import { useActiveTab, useShortcuts } from "../hooks";
import styles from "./styles.module.css";

const COMMANDS: readonly {
  tool: CaptureTool;
  label: string;
  command: string;
  icon: ReactNode;
}[] = [
  {
    tool: "page",
    label: "Save Page",
    command: "save-page",
    icon: <IconBookmark size={16} />,
  },
  {
    tool: "images",
    label: "Save Images",
    command: "save-images",
    icon: <IconImages size={16} />,
  },
  {
    tool: "region",
    label: "Capture Region",
    command: "screenshot-region",
    icon: <IconCrop size={16} />,
  },
  {
    tool: "visible",
    label: "Capture Visible Area",
    command: "screenshot-visible",
    icon: <IconCamera size={16} />,
  },
  {
    tool: "full",
    label: "Capture Full Page",
    command: "screenshot-full",
    icon: <IconArrowsExpandY size={16} />,
  },
];

type DragMode = "on" | "site" | "off";

const DRAG_ITEMS: { value: DragMode; label: string }[] = [
  { value: "on", label: "On" },
  { value: "site", label: "Off for This Site" },
  { value: "off", label: "Off Everywhere" },
];

function hostOf(url: string | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function Shell({ name, children }: { name?: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img
          className={styles.mark}
          src="/icons/brand/icon.svg"
          alt=""
          width={18}
          height={18}
        />
        <span className={styles.name}>{name ?? "Pond"}</span>
      </header>
      {children}
    </div>
  );
}

function SettingsRow() {
  return (
    <Button
      variant="ghost"
      width="full"
      className={styles.row}
      onClick={() => void browser.runtime.openOptionsPage()}
    >
      <IconGear3 size={16} />
      <span className={styles.label}>Settings</span>
    </Button>
  );
}

function DragToSave({ host }: { host: string | null }) {
  const { settings, update } = useSettings();
  if (!settings) return null;
  const mode: DragMode = !settings.dragToSave
    ? "off"
    : host && settings.dragBlocked.includes(host)
      ? "site"
      : "on";
  const items = host
    ? DRAG_ITEMS
    : DRAG_ITEMS.filter((item) => item.value !== "site");

  const choose = (next: DragMode) =>
    update((current) => ({
      ...current,
      dragToSave: next !== "off",
      dragBlocked:
        next === "site" && host
          ? [...current.dragBlocked.filter((h) => h !== host), host]
          : current.dragBlocked.filter((h) => h !== host),
    }));

  return (
    <div className={styles.option}>
      <span className={styles.label}>Drag to Save</span>
      <Select.Root
        items={items}
        value={mode}
        onValueChange={(next) => {
          if (next) choose(next);
        }}
      >
        <Select.Trigger size="sm" aria-label="Drag to Save">
          <Select.Value />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.Items items={items} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function App() {
  const { result, refresh } = useLibrary();
  const tab = useActiveTab();
  const shortcuts = useShortcuts();
  const [error, setError] = useState<string | null>(null);

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
        <div className={styles.footer}>
          <SettingsRow />
        </div>
      </Shell>
    );
  }

  const host = hostOf(tab?.url);
  const tabId = host ? tab?.id : undefined;

  const run = async (tool: CaptureTool) => {
    if (tabId === undefined) return;
    const outcome = await sendMessage("runTool", { tabId, tool }).catch(
      (): ToolResult => ({
        ok: false,
        message: "Pond couldn't start this capture. Try again.",
      }),
    );
    if (outcome.ok) window.close();
    else setError(outcome.message);
  };

  return (
    <Shell name={result.library.name}>
      {tabId === undefined ? (
        <p className={styles.notice} role="status">
          Pond can't capture this page. Open a regular web page to save it.
        </p>
      ) : null}
      {error ? (
        <p className={styles.notice} role="alert">
          {error}
        </p>
      ) : null}
      <nav className={styles.list} aria-label="Capture">
        {COMMANDS.map(({ tool, label, command, icon }) => {
          const keys = shortcuts.get(command);
          return (
            <Button
              key={tool}
              variant="ghost"
              width="full"
              className={styles.row}
              disabled={tabId === undefined}
              onClick={() => void run(tool)}
            >
              {icon}
              <span className={styles.label}>{label}</span>
              {keys ? <Keyboard.Cluster keys={keys} density="inline" /> : null}
            </Button>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <DragToSave host={host} />
        <SettingsRow />
      </div>
    </Shell>
  );
}
