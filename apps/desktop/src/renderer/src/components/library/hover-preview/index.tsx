import { useEffect, useState } from "react";
import { CardThumb } from "@/components/save/card/media";
import { useSave } from "@/hooks/use-saves";
import { selection } from "@/stores/selection";
import styles from "./styles.module.css";

export function HoverPreview() {
  const [id, setId] = useState<string | null>(null);
  const save = useSave(id);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== "z" && event.key !== "Z") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      setId(selection.getAnchor());
    };
    const up = (event: KeyboardEvent) => {
      if (event.key !== "z" && event.key !== "Z") return;
      setId(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const blur = () => setId(null);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  if (!id || !save) return null;

  return (
    <div className={styles.root} role="dialog" aria-label="Hover Preview">
      <div className={styles.frame}>
        <CardThumb save={save} />
      </div>
    </div>
  );
}
