import { createFileRoute } from "@tanstack/react-router";
import { MediaViewer } from "@/components/save/preview/media-viewer";
import { Shell } from "@/components/shell";
import { useBootReady, useSave } from "@/pool/hooks";
import styles from "./standalone.save.$id.module.css";

function StandaloneSave() {
  const { id } = Route.useParams();
  const ready = useBootReady();
  const save = useSave(id);

  if (!save) {
    if (!ready) {
      return <Shell.Empty className={styles.empty}>Loading save…</Shell.Empty>;
    }
    return <Shell.Empty className={styles.empty}>Save not found.</Shell.Empty>;
  }

  return (
    <div className={styles.viewer}>
      <MediaViewer save={save} />
    </div>
  );
}

export const Route = createFileRoute("/_standalone/standalone/save/$id")({
  component: StandaloneSave,
});
