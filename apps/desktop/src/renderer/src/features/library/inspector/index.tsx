import { Shell } from "@pond/ui";
import { useParams } from "@tanstack/react-router";
import { useSave } from "@/core/data/hooks";
import { KebabMenu } from "@/features/library/menus/inspector-kebab";
import { useTrackVisit } from "@/features/library/stores/recents";
import { useInspector } from "@/features/library/stores/shell-state";
import { SavePreview } from "@/features/save/preview";
import styles from "./styles.module.css";

export function Inspector() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const save = useSave(id);
  const { open } = useInspector();

  useTrackVisit(id);

  return (
    <Shell.Aside side="right" open={open}>
      <aside id="inspector-pane" aria-label="Inspector" className={styles.pane}>
        <div className={styles.toolbar}>
          {save ? <KebabMenu save={save} /> : null}
        </div>
        <div className={styles.body}>
          {save ? (
            <SavePreview save={save} />
          ) : id ? (
            <p className={styles.empty}>Save not found.</p>
          ) : (
            <p className={styles.empty}>No save selected.</p>
          )}
        </div>
      </aside>
    </Shell.Aside>
  );
}
