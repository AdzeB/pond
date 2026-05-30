import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import styles from "@/components/settings/layout.module.css";
import { SECTIONS } from "@/components/settings/registry";
import { SettingsSidebar } from "@/components/settings/sidebar";
import { Shell } from "@/components/shell";

function SettingsLayout() {
  // Warm every section chunk once Settings is open so switching pages
  // resolves from the module cache instead of a cold dynamic import.
  useEffect(() => {
    const warm = () => {
      for (const section of SECTIONS) void section.load();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Shell sidebar={<SettingsSidebar />}>
      <Shell.Main>
        <div className={styles.body}>
          <Outlet />
        </div>
      </Shell.Main>
    </Shell>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});
