import type { Source, SourceVisibility } from "@pond/schema/db";
import { Sidebar } from "@pond/ui";
import React from "react";
import { formatNumber } from "@/core/lib/format";
import { CustomizeSourcesDialog } from "@/features/sources/customize-sources";
import { SourceContextMenu } from "@/features/sources/menus/source-context";
import { SourcesGroupMenu } from "@/features/sources/menus/sources-group";
import { getSourceDef } from "@/features/sources/registry";
import { useSidebarSources } from "@/features/sources/use-sidebar-sources";

const ICON_SIZE = 18;

function SourceIcon({ source }: { source: Source }) {
  const Icon = getSourceDef(source).icon;
  return <Icon width={ICON_SIZE} height={ICON_SIZE} />;
}

function SourceItem({
  source,
  count,
  visibility,
  onVisibilityChange,
  onCustomize,
}: {
  source: Source;
  count: number;
  visibility: SourceVisibility;
  onVisibilityChange: (next: SourceVisibility) => void;
  onCustomize: () => void;
}) {
  const def = getSourceDef(source);
  const empty = count === 0;

  return (
    <SourceContextMenu
      visibility={visibility}
      onVisibilityChange={onVisibilityChange}
      onCustomize={onCustomize}
    >
      <Sidebar.Anchor
        to="/source/$source"
        params={{ source }}
        data-empty={empty || undefined}
        aria-disabled={empty || undefined}
      >
        <Sidebar.Icon source>
          <SourceIcon source={source} />
        </Sidebar.Icon>
        {def.label}
        {count > 0 ? (
          <Sidebar.Count>{formatNumber(count)}</Sidebar.Count>
        ) : null}
      </Sidebar.Anchor>
    </SourceContextMenu>
  );
}

export function SidebarSources() {
  const { entries, pinnedSources, counts, setVisibility, reorderSources } =
    useSidebarSources();
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const visibilityBySource = React.useMemo(
    () => new Map(entries.map((entry) => [entry.source, entry.visibility])),
    [entries],
  );

  const openCustomize = React.useCallback(() => {
    setCustomizeOpen(true);
  }, []);

  return (
    <React.Fragment>
      <Sidebar.CollapsibleGroup>
        <SourcesGroupMenu onCustomize={openCustomize}>
          <Sidebar.CollapsibleGroupLabel>Sources</Sidebar.CollapsibleGroupLabel>
        </SourcesGroupMenu>
        <Sidebar.CollapsibleGroupContent>
          {pinnedSources.map((source) => (
            <SourceItem
              key={source}
              source={source}
              count={counts.get(source) ?? 0}
              visibility={visibilityBySource.get(source) ?? "always"}
              onVisibilityChange={(next) => setVisibility(source, next)}
              onCustomize={openCustomize}
            />
          ))}
        </Sidebar.CollapsibleGroupContent>
      </Sidebar.CollapsibleGroup>

      <CustomizeSourcesDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        entries={entries}
        onReorder={reorderSources}
        onVisibilityChange={setVisibility}
      />
    </React.Fragment>
  );
}
