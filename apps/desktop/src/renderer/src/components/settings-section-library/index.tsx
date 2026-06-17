import { Button } from "@pond/ui";
import { usePonds } from "@/hooks/use-ponds";
import { glyphKind, PondGlyph } from "@/lib/pond-icons";
import { prettyPath } from "@/lib/pretty-path";
import { pondCustomise } from "@/stores/pond-customise";
import styles from "./styles.module.css";

export function LibrarySection() {
  const { active } = usePonds();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Library</h1>
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          <span
            aria-hidden
            className={styles.avatar}
            data-emoji={
              active && glyphKind(active.avatar) === "emoji" ? true : undefined
            }
            data-icon={
              active && glyphKind(active.avatar) === "icon" ? true : undefined
            }
            style={active?.color ? { background: active.color } : undefined}
          >
            {active ? (
              <PondGlyph
                avatar={active.avatar}
                name={active.name}
                iconSize={22}
              />
            ) : (
              ""
            )}
          </span>
          <div className={styles.meta}>
            <span className={styles.name}>{active?.name ?? "Library"}</span>
            {active ? (
              <span className={styles.path}>{prettyPath(active.path)}</span>
            ) : null}
          </div>
          <Button
            variant="secondary"
            disabled={!active}
            onClick={() => pondCustomise.open(active?.path)}
          >
            Edit details
          </Button>
        </div>
      </div>
    </div>
  );
}
