import {
  IconEyeFill18 as DisplayIcon,
  IconGridFill18 as LayoutIcon,
  IconDescendingSortingFill18 as SortIcon,
  IconSizeFill18 as ZoomIcon,
} from "@pond/icons/fill/18";
import { Button, TrayCard } from "@pond/ui";
import type { ReactNode } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import { type SortKey, useView } from "@/hooks/use-view";
import type { LayoutValue } from "@/lib/ui/view-prefs";
import { nearestZoomIndex, ZOOM_STEPS } from "@/lib/ui/zoom";
import styles from "./styles.module.css";

type OptionsLeaf = "layout" | "zoom" | "sort" | "display";

const LAYOUT_LABELS: Record<LayoutValue, string> = {
  waterfall: "Waterfall",
  grid: "Grid",
  justified: "Justified",
};

const SORT_LABELS: Partial<Record<SortKey, string>> = {
  savedAt: "Date Saved",
  createdAt: "Date Added",
  publishedAt: "Date Published",
  title: "Title",
  type: "Type",
  creator: "Creator",
  source: "Source",
  tagName: "First Tag",
  tagCount: "Tag Count",
  duration: "Duration",
  width: "Width",
  height: "Height",
  dimensions: "Dimensions",
  aspectRatio: "Aspect Ratio",
  fileSize: "Size",
  fileCount: "Count",
};

function zoomLabel(zoom: number): string {
  return ZOOM_STEPS[nearestZoomIndex(zoom)]?.label ?? "Medium";
}

const ROWS: Array<{
  section: OptionsLeaf;
  label: string;
  icon: ReactNode;
  value: (state: ReturnType<typeof useView>["state"]) => string;
}> = [
  {
    section: "layout",
    label: "Layout",
    icon: <LayoutIcon />,
    value: (state) => LAYOUT_LABELS[state.layout],
  },
  {
    section: "zoom",
    label: "Zoom",
    icon: <ZoomIcon />,
    value: (state) => zoomLabel(state.zoom),
  },
  {
    section: "sort",
    label: "Sort",
    icon: <SortIcon />,
    value: (state) => SORT_LABELS[state.sort.key] ?? state.sort.key,
  },
  {
    section: "display",
    label: "Display",
    icon: <DisplayIcon />,
    value: (state) => {
      const on = Object.values(state.displayPrefs).filter(Boolean).length;
      return `${on} shown`;
    },
  },
];

export function OptionsSection() {
  const dock = useDock();
  const { state } = useView();

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Library Options</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Adjust how your library looks and orders.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        {ROWS.map((row) => (
          <Button
            key={row.section}
            variant="ghost"
            size="xl"
            width="full"
            className={styles.row}
            onClick={() => dock.openViewMenu(row.section)}
          >
            <span className={styles.icon}>{row.icon}</span>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.value}>{row.value(state)}</span>
          </Button>
        ))}
      </div>
    </>
  );
}
