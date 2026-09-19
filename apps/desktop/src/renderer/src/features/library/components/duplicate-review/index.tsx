import { Button, Dialog } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  closeDuplicateReview,
  duplicateReview,
} from "@/features/library/state/duplicate-review";
import { CardThumb } from "@/features/saves/components/card/media";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves, reloadSaves } from "@/features/saves/lib/ensure-saves";
import { notify } from "@/shared/lib/toast";
import styles from "./styles.module.css";

type Group = { kind: "exact" | "similar"; ids: string[] };
export function DuplicateReviewHost() {
  const request = useSelector(duplicateReview, (value) => value);
  return request ? (
    <DuplicateReview
      key={request.id}
      saveId={request.saveId}
      ids={request.ids}
    />
  ) : null;
}
export function DuplicateReview({
  saveId,
  ids,
}: {
  saveId: string | null;
  ids?: string[] | null;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [kind, setKind] = useState<Group["kind"]>("exact");
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState({ indexed: 0, total: 0 });
  useEffect(() => {
    let active = true;
    void window.pond
      .query("saves.findDuplicates", {})
      .then((result) => {
        if (!active) return;
        const nextGroups = ids
          ? result.groups.filter((group) =>
              group.ids.some((id) => ids.includes(id)),
            )
          : result.groups;
        setGroups(nextGroups);
        setCoverage({ indexed: result.visualIndexed, total: result.total });
        const match = saveId
          ? nextGroups.find((group) => group.ids.includes(saveId))
          : undefined;
        if (match) {
          setKind(match.kind);
          setIndex(
            nextGroups
              .filter((group) => group.kind === match.kind)
              .indexOf(match),
          );
        }
        setLoading(false);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Couldn’t find duplicates.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [ids, saveId]);
  const filtered = groups.filter((group) => group.kind === kind);
  const group = filtered[Math.min(index, Math.max(0, filtered.length - 1))];
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !merging) closeDuplicateReview();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Review Duplicates</Dialog.Title>
            <Dialog.Close disabled={merging} />
          </Dialog.Header>
          <div className={styles.body}>
            <div className={styles.tabs}>
              {(["exact", "similar"] as const).map((value) => (
                <Button
                  key={value}
                  variant="secondary"
                  aria-pressed={kind === value}
                  disabled={merging}
                  onClick={() => {
                    setKind(value);
                    setIndex(0);
                  }}
                >
                  {value === "exact" ? "Exact Matches" : "Similar Images"} (
                  {groups.filter((group) => group.kind === value).length})
                </Button>
              ))}
            </div>
            <p className={styles.description}>
              {kind === "exact"
                ? "These saves contain the same original files."
                : "These images may look alike. Compare them before merging."}
            </p>
            {kind === "similar" ? (
              <p className={styles.description}>
                Visual comparison covers {coverage.indexed.toLocaleString()} of{" "}
                {coverage.total.toLocaleString()} saves.
              </p>
            ) : null}
            {error ? <p role="alert">{error}</p> : null}
            {loading ? (
              <p role="status">Finding duplicates…</p>
            ) : group ? (
              <>
                <div className={styles.navigation}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={merging || index === 0}
                    onClick={() => setIndex((value) => value - 1)}
                  >
                    Previous Group
                  </Button>
                  <span>
                    {Math.min(index + 1, filtered.length)} / {filtered.length}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={merging || index >= filtered.length - 1}
                    onClick={() => setIndex((value) => value + 1)}
                  >
                    Next Group
                  </Button>
                </div>
                <GroupReview
                  key={group.ids.join(":")}
                  group={group}
                  preferredId={saveId ?? group.ids[0] ?? ""}
                  onBusyChange={setMerging}
                  onMerged={(keepId, selected) =>
                    setGroups((items) =>
                      items
                        .map((item) => ({
                          ...item,
                          ids: item.ids.filter(
                            (id) => id === keepId || !selected.includes(id),
                          ),
                        }))
                        .filter((item) => item.ids.length > 1),
                    )
                  }
                />
              </>
            ) : (
              <p>
                No {kind === "exact" ? "exact matches" : "similar images"}{" "}
                found.
              </p>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function GroupReview({
  group,
  preferredId,
  onMerged,
  onBusyChange,
}: {
  group: Group;
  preferredId: string;
  onMerged: (keepId: string, ids: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [keepId, setKeepId] = useState(
    group.ids.includes(preferredId) ? preferredId : (group.ids[0] ?? ""),
  );
  const [included, setIncluded] = useState(() => new Set(group.ids));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: group.ids.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 140,
    overscan: 2,
  });
  const visible = virtual.getVirtualItems();
  const first = visible[0]?.index ?? 0;
  const last = visible.at(-1)?.index ?? 0;
  useEffect(() => {
    void ensureSaves(group.ids.slice(first, last + 1)).catch(() =>
      setError("Couldn’t load previews. Reopen this review to retry."),
    );
  }, [group.ids, first, last]);
  const selected = useMemo(
    () => group.ids.filter((id) => included.has(id)),
    [group.ids, included],
  );
  const merge = async () => {
    if (pending.current || selected.length < 2) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const result = await window.pond.query("saves.mergeDuplicates", {
        keepId,
        ids: selected,
      });
      if (!result.ok)
        throw Error(result.error ?? "Couldn’t merge these saves.");
      await reloadSaves(selected);
      notify({
        id: "duplicate-merge",
        title: "Duplicates merged",
        description:
          "The other saves are in Trash. Use Undo to restore the merge.",
      });
      onMerged(keepId, selected);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn’t merge these saves.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <>
      <div className={styles.list} ref={scroll}>
        <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {visible.map((row) => {
            const id = group.ids[row.index];
            return id ? (
              <Candidate
                key={id}
                id={id}
                keep={id === keepId}
                included={included.has(id)}
                disabled={busy}
                top={row.start}
                onKeep={() => {
                  setKeepId(id);
                  setIncluded((current) => new Set([...current, id]));
                }}
                onInclude={(checked) =>
                  setIncluded((current) => {
                    const next = new Set(current);
                    if (checked) next.add(id);
                    else next.delete(id);
                    return next;
                  })
                }
              />
            ) : null;
          })}
        </div>
      </div>
      <p className={styles.description}>
        Keep the selected save. Files, tags, folders, notes, and comments are
        preserved when the other selected saves move to Trash.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.footer}>
        <span>{Math.max(0, selected.length - 1)} saves to merge</span>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={closeDuplicateReview}
        >
          Cancel
        </Button>
        <Button
          disabled={busy || selected.length < 2}
          loading={busy}
          onClick={() => void merge()}
        >
          Merge Selected
        </Button>
      </div>
    </>
  );
}
function Candidate({
  id,
  keep,
  included,
  disabled,
  top,
  onKeep,
  onInclude,
}: {
  id: string;
  keep: boolean;
  included: boolean;
  disabled: boolean;
  top: number;
  onKeep: () => void;
  onInclude: (checked: boolean) => void;
}) {
  const save = useSave(id);
  return (
    <div
      className={styles.candidate}
      style={{ transform: `translateY(${top}px)` }}
    >
      <div className={styles.thumb}>
        {save ? <CardThumb save={save} /> : null}
      </div>
      <div className={styles.metadata}>
        <strong>{save?.title || "Untitled"}</strong>
        <span>
          {save?.files.length ?? 0} files ·{" "}
          {save?.width && save.height
            ? `${save.width} × ${save.height} · `
            : ""}
          {save?.source}
        </span>
        <span>
          {save?.tags.length ?? 0} tags · {save?.comments?.length ?? 0} comments
          · {save?.videoNotes?.length ?? 0} video notes
        </span>
        {save?.notes ? <span>{save.notes}</span> : null}
      </div>
      <div className={styles.choices}>
        <label>
          <input
            type="radio"
            name="duplicate-keeper"
            checked={keep}
            disabled={disabled}
            onChange={onKeep}
          />{" "}
          Keep
        </label>
        <label>
          <input
            type="checkbox"
            checked={included}
            disabled={disabled || keep}
            onChange={(event) => onInclude(event.target.checked)}
          />{" "}
          Include
        </label>
      </div>
    </div>
  );
}
