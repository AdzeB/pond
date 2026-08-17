import {
  IconPlusFill18 as Plus,
  IconRefreshFill18 as Sync,
} from "@pond/icons/fill/18";
import {
  IconSlidersOutline18 as OptionsIcon,
  IconMagnifierOutline18 as Search,
} from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import type { ReactNode } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import type { DockTab } from "@/components/library/dock/lib/nav-tabs";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
import type { ShortcutId } from "@/lib/save/shortcuts";
import { dockMode } from "@/stores/dock-mode";

function Action({
  label,
  icon,
  onClick,
  shortcut,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  shortcut?: ShortcutId;
}) {
  return (
    <Tooltip
      label={label}
      shortcut={shortcut ? <ShortcutKeys id={shortcut} /> : undefined}
      side="top"
    >
      <Tray.Item aria-label={label} onClick={onClick}>
        {icon}
      </Tray.Item>
    </Tooltip>
  );
}

function SourcesActions() {
  return (
    <>
      <Action
        label="New Source"
        icon={<Plus />}
        shortcut="sources.new"
        onClick={() => dockMode.open("source-new")}
      />
      <Action
        label="Sync All"
        icon={<Sync />}
        shortcut="sources.sync-all"
        onClick={() => {
          void window.pond.syncRunAll();
        }}
      />
    </>
  );
}

function ViewMenuActions() {
  const dock = useDock();
  return (
    <Action
      label="Options"
      icon={<OptionsIcon />}
      shortcut="view.options"
      onClick={() => dock.openViewMenu("options")}
    />
  );
}

function LibraryActions() {
  const dock = useDock();

  return (
    <>
      <Action
        label="Search"
        icon={<Search />}
        shortcut="dock.search"
        onClick={() => dock.openSearch()}
      />
      <ViewMenuActions />
    </>
  );
}

export function NavActions({ actionSet }: { actionSet: DockTab }) {
  if (actionSet === "sources") return <SourcesActions />;
  if (actionSet === "trash") return <ViewMenuActions />;
  return <LibraryActions />;
}
