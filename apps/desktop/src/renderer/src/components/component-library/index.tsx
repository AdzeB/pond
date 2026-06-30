import { useState } from "react";
import { DEMO_GROUPS, DEMOS } from "./lib/registry";
import styles from "./styles.module.css";

export function ComponentLibrary() {
  const [selectedId, setSelectedId] = useState(DEMOS[0]?.id ?? "");
  const active = DEMOS.find((demo) => demo.id === selectedId) ?? DEMOS[0];

  return (
    <div className={styles.page}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Components</span>
          <span className={styles.sidebarCount}>{DEMOS.length}</span>
        </div>
        <div className={styles.sidebarScroll}>
          {DEMO_GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  className={styles.navItem}
                  data-active={demo.id === active?.id || undefined}
                  onClick={() => setSelectedId(demo.id)}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <section className={styles.main}>
        {active ? (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>{active.label}</h1>
              <p className={styles.caption}>{active.caption}</p>
            </header>
            <div className={styles.stageScroll}>
              <div className={styles.stage}>{active.render()}</div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
