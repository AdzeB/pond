import {
  IconMediaPauseFill18 as Pause,
  IconMediaPlayFill18 as Play,
  IconPlusFill18 as Plus,
  IconRefreshFill18 as Sync,
} from "@pond/icons/fill/18";
import {
  IconBarsFilterOutline18 as FilterIcon,
  IconSlidersOutline18 as OptionsIcon,
  IconMagnifierOutline18 as Search,
} from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const dock = useDock();
  return (
    <>
      <Action
        label="Search"
        icon={<Search />}
        shortcut="dock.search"
        onClick={() => dock.openSearch()}
      />
      <Action
        label="Filter"
        icon={<FilterIcon />}
        onClick={() => dock.openViewMenu("sources-filter")}
      />
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

function DownloadsActions() {
  const qc = useQueryClient();
  const pipeline = useQuery({
    queryKey: ["pipeline.status"],
    queryFn: () =>
      window.pond.query("pipeline.status", {}) as Promise<{
        paused: boolean;
      }>,
  });
  const paused = pipeline.data?.paused === true;

  return (
    <>
      <Action
        label={paused ? "Resume" : "Pause"}
        icon={paused ? <Play /> : <Pause />}
        onClick={() => {
          void window.pond
            .pipelinePause(!paused)
            .then(() =>
              qc.invalidateQueries({ queryKey: ["pipeline.status"] }),
            );
        }}
      />
      <Action
        label="Retry Failed"
        icon={<Sync />}
        onClick={() => {
          void window.pond.query("saves.retryFailed", {});
        }}
      />
    </>
  );
}

export function NavActions({ actionSet }: { actionSet: DockTab }) {
  if (actionSet === "sources") return <SourcesActions />;
  if (actionSet === "downloads") return <DownloadsActions />;
  if (actionSet === "trash") return <ViewMenuActions />;
  return <LibraryActions />;
}
