import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { Button, Dialog } from "@pond/ui";
import { Suspense } from "react";
import { SettingsSectionView } from "@/components/settings-engine";
import { Settings as Sidebar } from "@/components/settings-sidebar";
import { SECTIONS } from "@/lib/settings-registry";
import {
  settings,
  useSettingsOpen,
  useSettingsSection,
} from "@/stores/settings-dialog";
import styles from "./styles.module.css";

const CONFIG_BY_PATH = new Map(
  SECTIONS.map((section) => [section.path, section.config]),
);

export function SettingsDialog() {
  const open = useSettingsOpen();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) settings.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open ? <SettingsDialogContent /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SettingsDialogContent() {
  const section = useSettingsSection();
  const config = CONFIG_BY_PATH.get(section);

  return (
    <Dialog.Popup className={`${styles.popup} ${styles.settings}`}>
      <Dialog.Title className={styles.srOnly}>Settings</Dialog.Title>

      <aside className={styles.aside}>
        <Sidebar />
      </aside>

      <div className={styles.content}>
        <Dialog.Close
          render={
            <Button
              icon
              size="sm"
              variant="ghost"
              aria-label="Close settings"
              className={styles.close}
            />
          }
        >
          <X />
        </Dialog.Close>

        {config ? (
          <Suspense fallback={null}>
            <SettingsSectionView config={config} />
          </Suspense>
        ) : null}
      </div>
    </Dialog.Popup>
  );
}
