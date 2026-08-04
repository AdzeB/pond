import {
  IconSparkle3Fill18 as Ask,
  IconCalendarFill18 as Calendar,
  IconCopyFill18 as Copy,
  IconEyeFill18 as DisplayIcon,
  IconGridFill18 as LayoutIcon,
  IconPencilFill18 as Pencil,
  IconPlusFill18 as Plus,
  IconDescendingSortingFill18 as SortIcon,
  IconRefreshFill18 as Sync,
  IconTrash2ContentFill18 as Trash,
  IconSizeFill18 as ZoomIcon,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 as Search } from "@pond/icons/outline/18";
import { Tooltip, Tray } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useDashboards } from "@/components/library/analytics/lib/dashboards";
import { newInsight } from "@/components/library/analytics/lib/insights";
import { useDock } from "@/components/library/dock/lib/context";
import type { DockTab } from "@/components/library/dock/lib/nav-tabs";
import type { ViewMenuSection } from "@/components/library/dock/lib/types";
import { useAskAvailable } from "@/hooks/use-ask-available";
import { dockMode } from "@/stores/dock-mode";
import { insightEditor } from "@/stores/insight-editor";
import { settingsModal } from "@/stores/settings-modal";

type TipHandle = ReturnType<typeof Tooltip.createHandle>;

const VIEW_MENUS: Array<{
  section: ViewMenuSection;
  label: string;
  icon: React.JSX.Element;
}> = [
  { section: "layout", label: "Layout", icon: <LayoutIcon /> },
  { section: "zoom", label: "Zoom", icon: <ZoomIcon /> },
  { section: "sort", label: "Sort", icon: <SortIcon /> },
  { section: "display", label: "Display", icon: <DisplayIcon /> },
];

function Action({
  tip,
  label,
  icon,
  onClick,
}: {
  tip: TipHandle;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip.Trigger
      handle={tip}
      payload={label}
      render={
        <Tray.Item aria-label={label} onClick={onClick}>
          {icon}
        </Tray.Item>
      }
    />
  );
}

function SourcesActions({ tip }: { tip: TipHandle }) {
  return (
    <>
      <Action
        tip={tip}
        label="New Source"
        icon={<Plus />}
        onClick={() => dockMode.open("source-new")}
      />
      <Action
        tip={tip}
        label="Sync All"
        icon={<Sync />}
        onClick={() => {
          void window.pond.syncRunAll();
        }}
      />
    </>
  );
}

function AnalyticsActions({
  tip,
  onDashboard,
  confirmDelete,
}: {
  tip: TipHandle;
  onDashboard: boolean;
  confirmDelete: () => void;
}) {
  const navigate = useNavigate();
  const { addDashboard } = useDashboards();

  if (onDashboard) {
    return (
      <>
        <Action
          tip={tip}
          label="Add Insight"
          icon={<Plus />}
          onClick={() => insightEditor.open(newInsight(), true)}
        />
        <Action
          tip={tip}
          label="Time Range"
          icon={<Calendar />}
          onClick={() => dockMode.open("analytics-range")}
        />
        <Action
          tip={tip}
          label="Rename Dashboard"
          icon={<Pencil />}
          onClick={() => dockMode.open("analytics-rename")}
        />
        <Action
          tip={tip}
          label="Duplicate Dashboard"
          icon={<Copy />}
          onClick={() => dockMode.open("analytics-duplicate")}
        />
        <Action
          tip={tip}
          label="Delete Dashboard"
          icon={<Trash />}
          onClick={confirmDelete}
        />
      </>
    );
  }

  return (
    <Action
      tip={tip}
      label="New Dashboard"
      icon={<Plus />}
      onClick={() => {
        const id = addDashboard();
        void navigate({
          to: "/analytics/$dashboardId",
          params: { dashboardId: id },
        });
      }}
    />
  );
}

function ViewMenuActions({ tip }: { tip: TipHandle }) {
  const dock = useDock();
  return (
    <>
      {VIEW_MENUS.map(({ section, label, icon }) => (
        <Tooltip.Trigger
          key={section}
          handle={tip}
          payload={label}
          render={
            <Tray.Item
              aria-label={label}
              onClick={() => dock.openViewMenu(section)}
            >
              {icon}
            </Tray.Item>
          }
        />
      ))}
    </>
  );
}

function LibraryActions({ tip }: { tip: TipHandle }) {
  const dock = useDock();
  const askAvailable = useAskAvailable();

  return (
    <>
      <ViewMenuActions tip={tip} />

      <Tooltip.Trigger
        handle={tip}
        payload="Search"
        render={
          <Tray.Item aria-label="Search" onClick={dock.openSearch}>
            <Search />
          </Tray.Item>
        }
      />

      {askAvailable ? (
        <Tooltip.Trigger
          handle={tip}
          payload="Ask AI"
          render={
            <Tray.Item aria-label="Ask AI" onClick={dock.openAsk}>
              <Ask />
            </Tray.Item>
          }
        />
      ) : (
        <Tooltip.Trigger
          handle={tip}
          payload="Open Settings → AI to connect a model"
          render={
            <Tray.Item
              aria-label="Open Settings, AI to connect a model"
              data-disabled="true"
              onClick={() => settingsModal.open("ai")}
            >
              <Ask />
            </Tray.Item>
          }
        />
      )}
    </>
  );
}

export function NavActions({
  actionSet,
  tip,
  onDashboard,
  confirmDelete,
}: {
  actionSet: DockTab;
  tip: TipHandle;
  onDashboard: boolean;
  confirmDelete: () => void;
}) {
  if (actionSet === "sources") return <SourcesActions tip={tip} />;
  if (actionSet === "analytics")
    return (
      <AnalyticsActions
        tip={tip}
        onDashboard={onDashboard}
        confirmDelete={confirmDelete}
      />
    );
  if (actionSet === "trash") return <ViewMenuActions tip={tip} />;
  return <LibraryActions tip={tip} />;
}
