import {
  IconArchiveContent2Fill18,
  IconGlobeFill18,
  IconLayers2Fill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import { Tray } from "@pond/ui";
import type { ComponentType, SVGProps } from "react";
import styles from "./dock.module.css";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const NAV: { icon: Icon; label: string; active?: boolean }[] = [
  { icon: IconArchiveContent2Fill18, label: "Library", active: true },
  { icon: IconTrash2ContentFill18, label: "Trash" },
  { icon: IconGlobeFill18, label: "Sources" },
];

const ACTIONS: { icon: Icon; label: string }[] = [
  { icon: IconMagnifierOutline18, label: "Search" },
  { icon: IconLayers2Fill18, label: "Options" },
];

/** Resting library dock: destinations, then the page actions. */
export function DockNavRow() {
  return (
    <div className={styles.row}>
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Tray.Item
            key={item.label}
            render={<span />}
            data-status={item.active ? "active" : undefined}
            title={item.label}
          >
            {item.active ? <Tray.Indicator /> : null}
            <Icon />
          </Tray.Item>
        );
      })}
      <Tray.Separator />
      {ACTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <Tray.Item key={item.label} render={<span />} title={item.label}>
            <Icon />
          </Tray.Item>
        );
      })}
    </div>
  );
}

/** Static replica of the resting library dock. */
export function Dock() {
  return (
    <Tray.Pill aria-hidden>
      <div className={styles.viewport}>
        <DockNavRow />
      </div>
    </Tray.Pill>
  );
}
