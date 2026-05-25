import { useParams } from "react-router-dom";
import { MediaViewer } from "@/components/save/preview/media-viewer";
import { Shell } from "@/components/shell";
import { useBootReady, useSave } from "@/pool/hooks";
import styles from "./styles.module.css";

export function StandaloneSavePage() {
  const { id } = useParams<{ id: string }>();
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
