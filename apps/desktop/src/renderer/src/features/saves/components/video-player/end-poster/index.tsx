import { useVideo } from "@pond/ui";
import styles from "./styles.module.css";

export function EndPoster({ src }: { src?: string }) {
  const { state } = useVideo();
  if (!src || !state.ended) return null;
  return (
    <img src={src} alt="" className={styles["end-poster"]} draggable={false} />
  );
}
