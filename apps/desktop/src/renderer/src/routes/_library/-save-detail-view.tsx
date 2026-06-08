import { Shell } from "@pond/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSave } from "@/core/data/hooks";
import { pickPrimaryUnit } from "@/core/data/media";
import { pool } from "@/core/data/pool";
import { useResolvedTheme } from "@/core/data/theme";
import { useSaveList } from "@/features/library/hooks/use-save-list";
import { useTrackVisit } from "@/features/library/stores/recents";
import { SaveDetail } from "@/features/save/detail";
import styles from "./detail.$id.module.css";

export function SaveDetailView() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const save = useSave(id);
  const navigate = useNavigate();

  useTrackVisit(id);

  const list = useSaveList({ activeId: id ?? null });
  const theme = useResolvedTheme();

  useEffect(() => {
    const targets: string[] = [];
    for (const adjacent of [list.nextId, list.prevId]) {
      if (!adjacent) continue;
      const candidate = pool.get(adjacent);
      if (!candidate) continue;
      const unit = pickPrimaryUnit(candidate, { theme });
      if (!unit || unit.isVideo) continue;
      targets.push(unit.url);
    }
    if (targets.length === 0) return;
    const imgs = targets.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return img;
    });
    return () => {
      for (const img of imgs) img.src = "";
    };
  }, [list.nextId, list.prevId, theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isInput) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        if (!list.nextId) return;
        e.preventDefault();
        list.goNext();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        if (!list.prevId) return;
        e.preventDefault();
        list.goPrev();
      } else if (e.key === "Escape") {
        void navigate({ to: list.parentTo });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    list.goNext,
    list.goPrev,
    list.nextId,
    list.prevId,
    list.parentTo,
    navigate,
  ]);

  if (!save) {
    return (
      <Shell.Main>
        <Shell.Empty>
          {id ? "Save not found." : "Select a save to inspect."}
        </Shell.Empty>
      </Shell.Main>
    );
  }

  return (
    <Shell.Main className={styles["main-immersive"]}>
      <Shell.Header>
        <SaveDetail.Header save={save} list={list} />
      </Shell.Header>
      <SaveDetail.Content save={save} />
    </Shell.Main>
  );
}
