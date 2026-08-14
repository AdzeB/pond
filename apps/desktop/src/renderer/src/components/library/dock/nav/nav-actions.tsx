import {
  IconLayers2Fill18 as OptionsIcon,
  IconPlusFill18 as Plus,
  IconRefreshFill18 as Sync,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
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
  tip,
  shortcut,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tip: ReturnType<typeof Tooltip.createHandle<ReactNode>>;
  shortcut?: ShortcutId;
}) {
  return (
    <Tooltip.Trigger
      handle={tip}
      payload={
        shortcut ? Tooltip.Label(label, <ShortcutKeys id={shortcut} />) : label
      }
      render={
        <Tray.Item aria-label={label} onClick={onClick}>
          {icon}
        </Tray.Item>
      }
    />
  );
}

function SourcesActions({
  tip,
}: {
  tip: ReturnType<typeof Tooltip.createHandle<ReactNode>>;
}) {
  return (
    <>
      <Action
        label="New Source"
        icon={<Plus />}
        tip={tip}
        shortcut="sources.new"
        onClick={() => dockMode.open("source-new")}
      />
      <Action
        label="Sync All"
        icon={<Sync />}
        tip={tip}
        shortcut="sources.sync-all"
        onClick={() => {
          void window.pond.syncRunAll();
        }}
      />
    </>
  );
}

function ViewMenuActions({
  tip,
}: {
  tip: ReturnType<typeof Tooltip.createHandle<ReactNode>>;
}) {
  const dock = useDock();
  return (
    <Action
      label="Options"
      icon={<OptionsIcon />}
      tip={tip}
      shortcut="view.options"
      onClick={() => dock.openViewMenu("options")}
    />
  );
}

function LibraryActions({
  tip,
}: {
  tip: ReturnType<typeof Tooltip.createHandle<ReactNode>>;
}) {
  const dock = useDock();

  return (
    <>
      <Action
        label="Search"
        icon={<Search />}
        tip={tip}
        shortcut="dock.search"
        onClick={dock.openSearch}
      />
      <ViewMenuActions tip={tip} />
    </>
  );
}

export function NavActions({
  actionSet,
  tip,
}: {
  actionSet: DockTab;
  tip: ReturnType<typeof Tooltip.createHandle<ReactNode>>;
}) {
  if (actionSet === "sources") return <SourcesActions tip={tip} />;
  if (actionSet === "trash") return <ViewMenuActions tip={tip} />;
  return <LibraryActions tip={tip} />;
}
