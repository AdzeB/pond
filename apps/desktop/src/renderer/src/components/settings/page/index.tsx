import { Outlet } from "@tanstack/react-router";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import styles from "./styles.module.css";

export function SettingsPage() {
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <div className={styles.page} {...scrollFade}>
      <Outlet />
    </div>
  );
}
