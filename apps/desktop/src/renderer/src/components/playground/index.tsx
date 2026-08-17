import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { PLAYGROUND_CATALOG } from "./catalog";
import { ElementCard } from "./element-card";
import styles from "./styles.module.css";

export function PlaygroundGrid() {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <AppShell.Content className={styles.page} {...scrollFade}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI elements</h1>
          <p className={styles.subtitle}>
            Live Pond UI surfaces. Edit CSS/TS under{" "}
            <code>packages/ui/src/ai</code>.
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        {PLAYGROUND_CATALOG.map((entry) => (
          <ElementCard key={entry.id} entry={entry} />
        ))}
      </div>
    </AppShell.Content>
  );
}

export function PlaygroundDetail({ id }: { id: string }) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  const canvasFade = useScrollFade<HTMLDivElement>();
  const entry = PLAYGROUND_CATALOG.find((item) => item.id === id);
  if (!entry) {
    return (
      <AppShell.Content className={styles.page} {...scrollFade}>
        <p className={styles.subtitle}>Unknown element.</p>
        <Link to="/playground" className={styles.back}>
          Back to grid
        </Link>
      </AppShell.Content>
    );
  }

  const Fixture = entry.Fixture;
  return (
    <AppShell.Content className={styles.page} {...scrollFade}>
      <header className={styles.header}>
        <div>
          <Link to="/playground" className={styles.back}>
            All elements
          </Link>
          <h1 className={styles.title}>{entry.name}</h1>
          <p className={styles.subtitle}>{entry.blurb}</p>
        </div>
      </header>
      <div className={styles.canvas} {...canvasFade}>
        <Fixture />
      </div>
    </AppShell.Content>
  );
}
