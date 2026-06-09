import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
} from "@pond/icons/outline/18";
import { Button, Shell, Tooltip } from "@pond/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBootReady, useSave } from "@/core/data/hooks";
import { useNarrowedSaves } from "@/features/library/hooks/use-narrowed-saves";
import { SavePreview } from "@/features/save/preview";
import styles from "./standalone.save.$id.module.css";

function StandaloneSave() {
  const { id } = Route.useParams();
  const ready = useBootReady();
  const save = useSave(id);
  const navigate = useNavigate();

  // Live-synced ordered list published by the main library window, so j/k here
  // walks the exact filter/sort the grid is showing. Falls back to this
  // window's own default library order until the first publish arrives.
  const [publishedIds, setPublishedIds] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    void window.pond.getViewerContext().then((ctx) => {
      if (alive) setPublishedIds(ctx.ids);
    });
    const off = window.pond.onNavOrderChanged((next) => setPublishedIds(next));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const fallback = useNarrowedSaves("library", "");
  const ids = useMemo(
    () =>
      publishedIds && publishedIds.length > 0
        ? publishedIds
        : fallback.map((s) => s.id),
    [publishedIds, fallback],
  );

  const index = ids.indexOf(id);
  const prevId = index > 0 ? (ids[index - 1] ?? null) : null;
  const nextId =
    index >= 0 && index < ids.length - 1 ? (ids[index + 1] ?? null) : null;

  const go = useCallback(
    (target: string | null) => {
      if (!target) return;
      void navigate({ to: "/standalone/save/$id", params: { id: target } });
    },
    [navigate],
  );

  // Clicking another card in the grid navigates this single viewer window.
  useEffect(() => {
    const off = window.pond.onViewerNavigate(({ id: nextId }) => {
      void navigate({ to: "/standalone/save/$id", params: { id: nextId } });
    });
    return off;
  }, [navigate]);

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
        if (!nextId) return;
        e.preventDefault();
        go(nextId);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        if (!prevId) return;
        e.preventDefault();
        go(prevId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        window.close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, nextId, prevId]);

  const counter =
    index >= 0 ? `${index + 1} / ${ids.length}` : `- / ${ids.length}`;

  if (!save) {
    if (!ready) {
      return <Shell.Empty className={styles.empty}>Loading save…</Shell.Empty>;
    }
    return <Shell.Empty className={styles.empty}>Save not found.</Shell.Empty>;
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.header}>
        <Tooltip label="Previous (K)" side="bottom">
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Previous save"
            disabled={!prevId}
            onClick={() => go(prevId)}
          >
            <ChevronLeft />
          </Button>
        </Tooltip>
        <Tooltip label="Next (J)" side="bottom">
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="Next save"
            disabled={!nextId}
            onClick={() => go(nextId)}
          >
            <ChevronRight />
          </Button>
        </Tooltip>
        <span
          className={styles.counter}
          role="status"
          aria-label="Position in list"
        >
          {counter}
        </span>
      </div>
      <div className={styles.body}>
        <SavePreview save={save} className={styles.pane} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_standalone/standalone/save/$id")({
  component: StandaloneSave,
});
