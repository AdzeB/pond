import { Outlet } from "@tanstack/react-router";
import { SettingsSidebar } from "@/components/settings-sidebar";
import styles from "./styles.module.css";

export function Settings() {
  return (
    <div className={styles.page}>
      <SettingsSidebar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
