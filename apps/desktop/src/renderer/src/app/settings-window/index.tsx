import { Dialog, Tooltip } from "@pond/ui";
import type { SettingsWindowLocation } from "@shared/settings-window-contracts";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { enrichmentMonitor } from "@/features/enrichment/state/enrichment-monitor";
import { SettingsDetail } from "@/features/settings/components/detail";
import { SettingsSidebarView } from "@/features/settings/components/sidebar";
import { InterfaceZoom } from "@/features/settings/effects/interface-zoom";
import { LocalizedSettings } from "@/features/settings/effects/localized-settings";
import { ThemeApplier } from "@/features/settings/effects/theme-applier";
import { UiSounds } from "@/features/settings/effects/ui-sounds";
import { FramelessWindowChrome } from "@/shared/components/frameless-window-chrome";
import { ToastHost } from "@/shared/components/toast-host";
import {
  rememberSettingsSection,
  resolveSettingsLocation,
} from "@/shared/lib/open-settings";
import type { PondSettingsApi } from "../../../../preload/settings";
import styles from "./styles.module.css";

declare global {
  interface Window {
    pondSettings?: PondSettingsApi;
  }
}

export function SettingsWindow() {
  const [location, setLocation] = useState(() => resolveSettingsLocation());
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    const api = window.pondSettings;
    if (!api) return;
    let active = true;
    let navigated = false;
    const apply = (next: SettingsWindowLocation) => {
      if (!active) return;
      const section = next.section?.startsWith("models/")
        ? "agent-models"
        : next.section;
      const resolved = resolveSettingsLocation(section, next.hash);
      rememberSettingsSection(resolved.section);
      setLocation(resolved);
    };
    const stopStatus = api.onProcessingStatus((status) =>
      enrichmentMonitor.set({
        inflight: status.inflight,
        activeKeys: new Set(status.activeKeys),
        failedKeys: new Set(status.failedKeys),
      }),
    );
    const stop = api.onLocation((next) => {
      navigated = true;
      apply(next);
    });
    void api.ready().then((next) => {
      if (!navigated) apply(next);
    });
    return () => {
      active = false;
      stop();
      stopStatus();
    };
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <HotkeysProvider>
        <QueryClientProvider client={queryClient}>
          <Tooltip.Provider>
            <ThemeApplier />
            <InterfaceZoom />
            <LocalizedSettings />
            <UiSounds />
            <div className={styles.window}>
              <FramelessWindowChrome
                closeLabel="Close Settings"
                onClose={() => void window.pondSettings?.close()}
              />
              <aside className={styles.sidebar}>
                <SettingsSidebarView activeSection={location.section} />
              </aside>
              <main className={styles.content}>
                <SettingsDetail
                  section={location.section}
                  hash={location.hash}
                />
              </main>
            </div>
            <Dialog.Host />
            <ToastHost />
          </Tooltip.Provider>
        </QueryClientProvider>
      </HotkeysProvider>
    </MotionConfig>
  );
}
