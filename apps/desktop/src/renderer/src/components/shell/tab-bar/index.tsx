import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { IconGear3Outline18, IconPlusOutline18 } from "@pond/icons/outline/18";

import { Button, type MenuItemSpec } from "@pond/ui";
import { Reorder } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { ChromeHistoryNav } from "@/components/shell/chrome-toolbar";
import { StatusBar } from "@/components/shell/status-bar";
import { useSave } from "@/hooks/use-saves";
import { pickAuthorAvatarUrl } from "@/lib/media/url";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import { initials } from "@/lib/util/initials";
import { settingsModal } from "@/stores/settings-modal";
import { type Tab, tabs, useActiveTabId, useTabs } from "@/stores/tabs";
import { iconForTab } from "./icons";
import { computeLabel } from "./labels";
import styles from "./styles.module.css";

const REORDER_SPRING = { type: "spring", stiffness: 600, damping: 40 } as const;
const TAB_LIFTED = styles["tab-lifted"] ?? "";

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
  isActive,
}: {
  tab: Tab;
  isActive: boolean;
}) {
  const itemRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => tabs.close(tab.id), [tab.id]);

  /** Activate on click so a drag-to-reorder does not also switch tabs mid-gesture. */
  const onClick = useCallback(() => {
    if (!isActive) tabs.activate(tab.id);
  }, [isActive, tab.id]);

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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SpecContextMenu buildItems={() => tabMenu(tab, handleClose)}>
      <Reorder.Item
        ref={itemRef}
        value={tab.id}
        as="div"
        className={className}
        role="tab"
        tabIndex={isActive ? 0 : -1}
        aria-selected={isActive}
        transition={REORDER_SPRING}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onDragStart={() => {
          itemRef.current?.classList.add(TAB_LIFTED);
        }}
        onDragEnd={() => {
          itemRef.current?.classList.remove(TAB_LIFTED);
        }}
      >
        <TabBody tab={tab} onClose={handleClose} />
      </Reorder.Item>
    </SpecContextMenu>
  );
});

export function TabBar() {
  const tabList = useTabs();
  const activeId = useActiveTabId();
  const groupRef = useRef<HTMLDivElement | null>(null);

  const ids = useMemo(() => tabList.map((t) => t.id), [tabList]);

  const onReorder = useCallback((next: string[]) => {
    tabs.setOrder(next);
  }, []);

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
      <Reorder.Group
        ref={groupRef}
        as="div"
        axis="x"
        className={styles.group}
        values={ids}
        onReorder={onReorder}
      >
        {tabList.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={tab.id === activeId} />
        ))}
      </Reorder.Group>

      <div className={styles.actions}>
        <StatusBar />
        <Button
          variant="ghost"
          size="sm"
          icon
          onClick={() => tabs.open("/")}
          aria-label="New tab"
        >
          <IconPlusOutline18 />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          onClick={() => settingsModal.open()}
          aria-label="Settings"
        >
          <IconGear3Outline18 />
        </Button>
      </div>
    </div>
  );
}
