import { IconTrash2Outline18 as Trash2 } from "@pond/icons/outline/18";
import { Button, useToast } from "@pond/ui";
import { useCallback, useMemo, useState } from "react";
import {
  clusterSimilar,
  type DuplicateGroup,
  groupExactDuplicates,
} from "@/lib/duplicates";
import { computeAHash } from "@/lib/phash";
import { trashSave } from "@/lib/save-actions";
import { useSaves } from "@/pool/hooks";
import { pickPrimaryFile } from "@/pool/media";
import type { Save } from "@/pool/types";
import { buildPondUrl } from "@/pool/url";
import styles from "./styles.module.css";

export function DuplicatesView() {
  const saves = useSaves();
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(0);

  const imagesNeedingHash = useMemo(
    () =>
      saves.filter((s) => !s.deletedAt && !s.phash && s.mediaType === "image"),
    [saves],
  );

  const scan = useCallback(async () => {
    setScanning(true);
    setDone(0);
    for (const s of imagesNeedingHash) {
      const file = pickPrimaryFile(s);
      if (!file) {
        setDone((d) => d + 1);
        continue;
      }
      const hash = await computeAHash(buildPondUrl(s.id, file));
      if (hash) {
        await window.pond.query("saves.setPhash", { id: s.id, phash: hash });
      }
      setDone((d) => d + 1);
    }
    setScanning(false);
  }, [imagesNeedingHash]);

  const exact = useMemo(() => groupExactDuplicates(saves), [saves]);
  const similar = useMemo(() => clusterSimilar(saves), [saves]);
  const empty = exact.length === 0 && similar.length === 0;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Duplicates</h1>
        {imagesNeedingHash.length > 0 ? (
          <Button size="sm" onClick={() => void scan()} disabled={scanning}>
            {scanning
              ? `Scanning ${done}/${imagesNeedingHash.length}`
              : `Scan ${imagesNeedingHash.length} images for similar`}
          </Button>
        ) : null}
      </header>

      <Section title="Exact duplicates" groups={exact} />
      <Section title="Similar images" groups={similar} />

      {empty ? (
        <p className={styles.empty}>
          No duplicates found. Scan your images above to detect visually similar
          saves.
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  groups,
}: {
  title: string;
  groups: DuplicateGroup[];
}) {
  if (groups.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2
        className={styles["section-title"]}
      >{`${title} (${groups.length})`}</h2>
      {groups.map((g) => (
        <div key={g.key} className={styles.group}>
          {g.saves.map((s) => (
            <DuplicateItem key={s.id} save={s} />
          ))}
        </div>
      ))}
    </section>
  );
}

function DuplicateItem({ save }: { save: Save }) {
  const toast = useToast();
  const file = pickPrimaryFile(save);
  return (
    <figure className={styles.item}>
      <div className={styles["item-media"]}>
        {file ? (
          <img src={buildPondUrl(save.id, file)} alt={save.title ?? ""} />
        ) : null}
        <button
          type="button"
          className={styles["item-trash"]}
          aria-label="Move to trash"
          title="Move to trash"
          onClick={() => void trashSave(save, toast)}
        >
          <Trash2 width={14} height={14} />
        </button>
      </div>
      <figcaption className={styles["item-caption"]}>
        {save.title ?? save.url}
      </figcaption>
    </figure>
  );
}
