import { DEFAULT_PREFS } from "@pond/schema/db";
import { Select, Settings } from "@pond/ui";
import { appIconLabel } from "@shared/app-icons";
import { useEffect, useState } from "react";
import type { Binding } from "@/components/settings/engine";
import styles from "./app-icon.module.css";

interface AppIconOption {
  id: string;
  label: string;
  preview: string;
}

export function AppIconRow({ binding }: { binding: Binding }) {
  const stored =
    typeof binding.values.appIcon === "string"
      ? binding.values.appIcon
      : DEFAULT_PREFS.window.appIcon;
  const [icons, setIcons] = useState<AppIconOption[]>([]);
  const selected = icons.some((icon) => icon.id === stored)
    ? stored
    : DEFAULT_PREFS.window.appIcon;

  useEffect(() => {
    void window.pond
      .query("appIcons.list", {})
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setIcons(rows as AppIconOption[]);
      })
      .catch((err) => {
        console.error("[pond] appIcons.list failed", err);
      });
  }, []);

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Icon</Settings.ItemTitle>
        <Settings.ItemDescription>
          Shown in the Dock and on the taskbar.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Select.Root
          value={selected}
          onValueChange={(next) => {
            if (typeof next === "string") binding.patch({ appIcon: next });
          }}
        >
          <Select.Trigger>
            <Select.Value>
              {(v: string) => {
                const icon = icons.find((item) => item.id === v);
                return icon ? (
                  <IconOption preview={icon.preview} label={icon.label} />
                ) : (
                  appIconLabel(v)
                );
              }}
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6}>
              <Select.Popup>
                <Select.Items
                  items={icons.map((icon) => ({
                    value: icon.id,
                    label: (
                      <IconOption preview={icon.preview} label={icon.label} />
                    ),
                  }))}
                />
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Settings.ItemControl>
    </>
  );
}

function IconOption({ preview, label }: { preview: string; label: string }) {
  return (
    <span className={styles.option}>
      <img src={preview} alt="" draggable={false} />
      <span>{label}</span>
    </span>
  );
}
