import {
  IconCalendarOutline18 as DateIcon,
  IconAlbum2Outline18 as FileCountIcon,
  IconDropCapOutline18 as NameIcon,
  IconGlobe2Outline18 as SourceIcon,
  IconDocumentScanOutline18 as TypeIcon,
} from "@pond/icons/outline/18";
import { Switch, TrayCard } from "@pond/ui";
import { type ReactNode, useRef } from "react";
import { useView } from "@/hooks/use-view";
import type { DisplayPrefKey } from "@/stores/display-prefs";
import styles from "./styles.module.css";

const TOGGLES: Array<{ key: DisplayPrefKey; label: string; icon: ReactNode }> =
  [
    { key: "name", label: "Name", icon: <NameIcon /> },
    { key: "date", label: "Date", icon: <DateIcon /> },
    { key: "source", label: "Source", icon: <SourceIcon /> },
    { key: "type", label: "Format", icon: <TypeIcon /> },
    {
      key: "fileCount",
      label: "Count",
      icon: <FileCountIcon />,
    },
  ];

export function DisplaySection() {
  const { state, actions } = useView();
  const initialPrefs = useRef(state.displayPrefs);

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Display Details</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Choose which details show beneath each item.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        {TOGGLES.map(({ key, label, icon }) => (
          <label
            key={key}
            htmlFor={`display-pref-${key}`}
            className={styles.row}
          >
            <span className={styles["row-icon"]}>{icon}</span>
            <span className={styles["row-label"]}>{label}</span>
            <Switch.Root
              id={`display-pref-${key}`}
              style={{ scale: 1.2 }}
              checked={state.displayPrefs[key]}
              onCheckedChange={(checked) =>
                actions.setDisplayPref(key, checked)
              }
            />
          </label>
        ))}
      </div>
      <TrayCard.Footer>
        <TrayCard.Cancel
          onClick={() => {
            for (const { key } of TOGGLES) {
              actions.setDisplayPref(key, initialPrefs.current[key]);
            }
          }}
        />
        <TrayCard.Confirm />
      </TrayCard.Footer>
    </>
  );
}
