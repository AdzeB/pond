import { typeLabelForPath } from "@shared/file-format";
import { useState } from "react";
import {
  deriveTypeLabel,
  type MediaUnit,
  pickCardUnit,
  pickPrimaryFile,
} from "@/features/saves/lib/media/units";
import { previewThumbUrlFor } from "@/features/saves/lib/media/url";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

function inspectorFormat(save: Save): string {
  const file = pickPrimaryFile(save);
  return (
    (file ? typeLabelForPath(file.path) : null) ??
    deriveTypeLabel(file, save) ??
    "File"
  );
}

function previewUrl(unit: MediaUnit | null): string | null {
  if (!unit) return null;
  if (unit.isVideo) return unit.posterUrl ?? null;
  return unit.requiresGeneratedPreview
    ? previewThumbUrlFor(unit.url, 560)
    : unit.url;
}

function entries(saves: readonly Save[]) {
  const next = saves.map((save) => ({
    save,
    url: previewUrl(pickCardUnit(save)),
  }));
  const withImages = next.filter((entry) => entry.url !== null);
  return (withImages.length > 0 ? withImages : next).slice(0, 4);
}

function Preview({ save, url }: { save: Save; url: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <figure className={styles.preview}>
      {url && failed !== url ? (
        <img
          src={url}
          alt={save.title || "Save preview"}
          draggable={false}
          onError={() => setFailed(url)}
        />
      ) : (
        <span className={styles.placeholder}>{save.title || "No preview"}</span>
      )}
      <figcaption>{inspectorFormat(save)}</figcaption>
    </figure>
  );
}

export function SavePreviews({ saves }: { saves: readonly Save[] }) {
  const previews = entries(saves);
  if (previews.length === 0) return null;
  return (
    <div className={styles.list} data-multiple={saves.length > 1 || undefined}>
      {previews.map(({ save, url }) => (
        <Preview key={save.id} save={save} url={url} />
      ))}
    </div>
  );
}
