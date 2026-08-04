import { RestrictToHorizontalAxis } from "@dnd-kit/abstract/modifiers";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { move } from "@dnd-kit/helpers";
import {
  DragDropProvider,
  type DragEndEvent,
  PointerSensor,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { IconGear3Fill18, IconPlusFill18 } from "@pond/icons/fill/18";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { Button, type MenuItemSpec } from "@pond/ui";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { ChromeHistoryNav } from "@/components/shell/chrome-toolbar";
import { useAccounts } from "@/hooks/use-accounts";
import { useSave } from "@/hooks/use-saves";
import { useWatches } from "@/hooks/use-watches";
import { pickAuthorAvatarUrl } from "@/lib/media/url";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import { initials } from "@/lib/util/initials";
import { settingsModal } from "@/stores/settings-modal";
import { useSyncByAccount } from "@/stores/sync-monitor";
import { type Tab, tabs, useActiveTabId, useTabs } from "@/stores/tabs";
import { ProgressPanel } from "./activity";
import { ErrorsPanel } from "./attention";
import { iconForTab } from "./icons";
import { computeLabel } from "./labels";
import type { Panel } from "./lib";
import { RecentPanel } from "./recent";
import styles from "./styles.module.css";
import { OngoingPanel } from "./sync";

/** Linear-style sibling slides; idle:false skips open/close layout motion. */
const SORT_TRANSITION = {
  duration: 120,
  easing: "linear",
  idle: false,
} as const;

interface TabBodyProps {
  tab: Tab;
  onClose: () => void;
}

const TabBody = memo(function TabBody({ tab, onClose }: TabBodyProps) {
  const saveId = saveIdFromPath(tab.path.split("?")[0] ?? tab.path);
  const save = useSave(saveId);
  const label = computeLabel(tab.path, save);
  const Icon = iconForTab(tab.path, save);
  const avatarUrl = save ? pickAuthorAvatarUrl(save) : null;
  const author = save?.author?.trim() ?? "";
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showAvatar = Boolean(save && (avatarUrl || author));
  const showImg = Boolean(avatarUrl && failedUrl !== avatarUrl);

  return (
    <>
      {showAvatar ? (
        <span
          aria-hidden
          className={styles["tab-avatar"]}
          style={
            showImg
              ? undefined
              : { background: pickAuthorColor(author || label) }
          }
        >
          {showImg && avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setFailedUrl(avatarUrl)}
            />
          ) : (
            initials(author || label)
          )}
        </span>
      ) : (
        <span aria-hidden className={styles["tab-icon"]}>
          <Icon />
        </span>
      )}
      <span className={styles["tab-label"]}>{label}</span>
      {!tab.pinned && (
        <Button
          icon
          size="xs"
          variant="ghost"
          className={styles["tab-close"]}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close tab"
        >
          <IconXmarkOutline12 />
        </Button>
      )}
    </>
  );
});

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function tabMenu(tab: Tab, onClose: () => void): MenuItemSpec[] {
  return [
    tab.pinned
      ? { label: "Unpin Tab", onClick: () => tabs.unpin(tab.id) }
      : { label: "Pin Tab", onClick: () => tabs.pin(tab.id) },
    { label: "Duplicate Tab", onClick: () => tabs.duplicate(tab.id) },
    { type: "separator" },
    ...(tab.pinned
      ? []
      : [{ label: "Close", onClick: onClose } satisfies MenuItemSpec]),
    { label: "Close Others", onClick: () => tabs.closeOthers(tab.id) },
    { label: "Close to the Right", onClick: () => tabs.closeToRight(tab.id) },
  ];
}

const TabItem = memo(function TabItem({
  tab,
  index,
  isActive,
}: {
  tab: Tab;
  index: number;
  isActive: boolean;
}) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const { ref: sortableRef, isDragging } = useSortable({
    id: tab.id,
    index,
    transition: SORT_TRANSITION,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      itemRef.current = node;
      sortableRef(node);
    },
    [sortableRef],
  );

  const handleClose = useCallback(() => tabs.close(tab.id), [tab.id]);

  /** Activate on click so a drag-to-reorder does not also switch tabs mid-gesture. */
  const onClick = useCallback(() => {
    if (!isActive) tabs.activate(tab.id);
  }, [isActive, tab.id]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (!isActive) tabs.activate(tab.id);
    },
    [isActive, tab.id],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        handleClose();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    if (!isActive) return;
    itemRef.current?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
    });
  }, [isActive]);

  const className = [
    styles.tab,
    isActive && styles["tab-active"],
    tab.pinned && styles["tab-pinned"],
    isDragging && styles["tab-lifted"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SpecContextMenu buildItems={() => tabMenu(tab, handleClose)}>
      <div
        ref={setRefs}
        className={className}
        role="tab"
        tabIndex={isActive ? 0 : -1}
        aria-selected={isActive}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
      >
        <TabBody tab={tab} onClose={handleClose} />
      </div>
    </SpecContextMenu>
  );
});

export function Toolbar() {
  const tabList = useTabs();
  const activeId = useActiveTabId();
  const groupRef = useRef<HTMLDivElement | null>(null);
  const { accounts } = useAccounts();
  const { watches } = useWatches();
  const byAccount = useSyncByAccount();
  const [open, setOpen] = useState<Panel | null>(null);

  const ids = useMemo(() => tabList.map((t) => t.id), [tabList]);

  const modifiers = useMemo(
    () => [
      RestrictToHorizontalAxis,
      RestrictToElement.configure({
        element: () => groupRef.current,
      }),
    ],
    [],
  );

  /** Persist order when the gesture ends; dnd-kit handles optimistic motion mid-drag. */
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled || !event.operation.source) return;
      const next = move(ids, event);
      if (next === ids) return;
      tabs.setOrder(next.map(String));
    },
    [ids],
  );

  /** Edge fades only when content is clipped on that side. */
  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const syncFade = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) {
        el.removeAttribute("data-fade");
        return;
      }
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft < max - 1;
      el.dataset.fade = left && right ? "both" : left ? "left" : "right";
    };
    const syncSoon = () => requestAnimationFrame(syncFade);
    syncSoon();
    el.addEventListener("scroll", syncFade, { passive: true });
    const ro = new ResizeObserver(syncSoon);
    ro.observe(el);
    const mo = new MutationObserver(syncSoon);
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", syncFade);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div className={styles.bar} role="tablist">
      <ChromeHistoryNav />
      <div className={styles.tabs}>
        <DragDropProvider
          modifiers={modifiers}
          sensors={(defaults) => [
            ...defaults.filter((sensor) => sensor !== PointerSensor),
            PointerSensor.configure({
              activationConstraints: [
                new PointerActivationConstraints.Distance({ value: 6 }),
              ],
            }),
          ]}
          onDragEnd={onDragEnd}
        >
          <div ref={groupRef} className={styles.group}>
            {tabList.map((tab, index) => (
              <TabItem
                key={tab.id}
                tab={tab}
                index={index}
                isActive={tab.id === activeId}
              />
            ))}
          </div>
        </DragDropProvider>
        <Button
          variant="ghost"
          size="sm"
          icon
          className={styles["new-tab"]}
          onClick={() => tabs.open("/")}
          aria-label="New tab"
        >
          <IconPlusFill18 />
        </Button>
      </div>

      <div className={styles.dragSpacer} aria-hidden />

      <div className={styles.actions}>
        <ProgressPanel open={open === "progress"} onOpenChange={setOpen} />
        <RecentPanel open={open === "recent"} onOpenChange={setOpen} />
        <ErrorsPanel
          open={open === "errors"}
          onOpenChange={setOpen}
          accounts={accounts}
          watches={watches}
          byAccount={byAccount}
        />
        <OngoingPanel
          open={open === "ongoing"}
          onOpenChange={setOpen}
          accounts={accounts}
          watches={watches}
          byAccount={byAccount}
        />
        <Button
          variant="ghost"
          size="sm"
          icon
          onClick={() => settingsModal.open()}
          aria-label="Settings"
        >
          <IconGear3Fill18 />
        </Button>
      </div>
    </div>
  );
}
