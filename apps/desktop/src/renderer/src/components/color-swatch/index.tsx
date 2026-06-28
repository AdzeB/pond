import { Tooltip } from "@pond/ui";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

export function ColorSwatch({ color }: { color: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(color);
      pushToast(`Copied ${color}`, "success");
    } catch {
      // Clipboard can reject without focus; skip the toast.
    }
  };
  return (
    <Tooltip label={`Copy ${color}`} side="top">
      <button
        type="button"
        className={styles.colorSwatch}
        style={{ background: `${color}33`, color }}
        onClick={() => void copy()}
      >
        {color.toUpperCase()}
      </button>
    </Tooltip>
  );
}
