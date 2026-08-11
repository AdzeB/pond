import { IconXmarkOutline12 as Close } from "@pond/icons/outline/12";
import {
  IconClockRotateClockwiseOutline18 as History,
  IconPlusOutline18 as Plus,
} from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useMemo } from "react";
import { AskComposer } from "@/components/ask/bar";
import { useAskSubmit } from "@/components/ask/bar/lib/use-ask-submit";
import { type AskHistoryEntry, useAskHistory } from "@/stores/ask-history";
import { clearAsk, useAskTurns } from "@/stores/ask-store";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

/** Compact relative age matching Linear’s history rows: 10min, 9d, 6w, 4mo. */
function formatHistoryAge(at: number, now = Date.now()): string {
  if (!at) return "";
  const sec = Math.max(0, Math.floor((now - at) / 1000));
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d`;
  const week = Math.floor(day / 7);
  if (week < 8) return `${week}w`;
  const month = Math.floor(day / 30);
  return `${Math.max(1, month)}mo`;
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupHistory(entries: AskHistoryEntry[], now = Date.now()) {
  const todayStart = startOfLocalDay(now);
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const today: AskHistoryEntry[] = [];
  const week: AskHistoryEntry[] = [];
  const older: AskHistoryEntry[] = [];
  for (const entry of entries) {
    if (entry.at >= todayStart) today.push(entry);
    else if (entry.at >= weekStart) week.push(entry);
    else older.push(entry);
  }
  return [
    { label: "Today", items: today },
    { label: "Previous 7 days", items: week },
    { label: "Older", items: older },
  ].filter((group) => group.items.length > 0);
}

/** Dedicated chat rail with close + title left, new chat / history right. */
export function AskWindowRight() {
  const turns = useAskTurns();
  const recents = useAskHistory();
  const submit = useAskSubmit();
  const hasTurns = turns.length > 0;
  const title = hasTurns ? turns[0]?.question.trim() || "Chat" : "New chat";

  const groups = useMemo(() => groupHistory(recents), [recents]);

  const close = () => {
    dockMode.close();
  };

  const newChat = () => {
    clearAsk();
  };

  const replay = (question: string) => {
    clearAsk();
    submit(question, [], { refine: false });
  };

  return (
    <aside className={styles.panel} aria-label="Chat">
      <header className={styles.header}>
        <div className={styles["header-start"]}>
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Close chat"
            onClick={close}
          >
            <Close />
          </Button>
          <h2 className={styles.title}>{title}</h2>
        </div>
        <div className={styles["header-end"]}>
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="New chat"
            onClick={newChat}
          >
            <Plus />
          </Button>
          <Menu.Root>
            <Menu.Trigger
              icon
              size="xs"
              variant="ghost"
              aria-label="Chat history"
            >
              <History />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="end" side="bottom" sideOffset={4}>
                <Menu.Popup className={styles.menu}>
                  {groups.length === 0 ? (
                    <Menu.Group>
                      <Menu.GroupLabel>Chat history</Menu.GroupLabel>
                      <Menu.Item disabled>
                        <Menu.ItemLabel>No recent asks yet</Menu.ItemLabel>
                      </Menu.Item>
                    </Menu.Group>
                  ) : (
                    <>
                      <Menu.Group>
                        <Menu.GroupLabel>Chat history</Menu.GroupLabel>
                      </Menu.Group>
                      {groups.map((group) => (
                        <Menu.Group key={group.label}>
                          <Menu.GroupLabel>{group.label}</Menu.GroupLabel>
                          {group.items.map((entry) => (
                            <Menu.Item
                              key={`${entry.at}:${entry.text}`}
                              className={styles["history-item"]}
                              onClick={() => replay(entry.text)}
                            >
                              <Menu.ItemLabel>{entry.text}</Menu.ItemLabel>
                              <Menu.SecondaryLabel>
                                {formatHistoryAge(entry.at) || "—"}
                              </Menu.SecondaryLabel>
                            </Menu.Item>
                          ))}
                        </Menu.Group>
                      ))}
                    </>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </header>

      <AskComposer autoFocus onCollapse={close} />
    </aside>
  );
}
