import { createFileRoute, Outlet } from "@tanstack/react-router";
import styles from "@/components/settings/layout.module.css";
import { SettingsSidebar } from "@/components/settings/sidebar";
import { Shell } from "@/components/shell";

function SettingsLayout() {
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
