import type {
  CaptureDraft,
  CaptureMetadata,
  CaptureReceipt,
} from "@pond/schema/capture";
import type { Folder } from "@pond/schema/db";
import { Button, Field, Input } from "@pond/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./collect-shell.module.css";

export function CollectShell() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [folderSearch, setFolderSearch] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [jobs, setJobs] = useState<CaptureReceipt[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [items, setItems] = useState<CaptureDraft["items"]>([]);
  const pending = useRef(false);
  const draftIdRef = useRef<string | null>(null);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void window.pond
      .query("folders.list", {})
      .then(setFolders)
      .catch((reason) => setError(String(reason)));
  }, []);
  const editDraft = useCallback(async (id: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const draft = await window.pond.query("captures.draft", { id });
      draftIdRef.current = id;
      setDraftId(id);
      setItems(draft.items);
      setTitle(draft.metadata.title ?? "");
      setNotes(draft.metadata.notes ?? "");
      setRating(draft.metadata.rating ?? 0);
      setTags(draft.metadata.tags.join(", "));
      setFolderIds(draft.metadata.folderIds);
      setError(null);
      setMessage(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void window.pond
        .query("captures.list", {})
        .then((rows) => {
          if (!alive) return;
          setJobs(rows);
          const newest = [...rows]
            .reverse()
            .find((job) => job.state === "draft");
          if (newest && !draftIdRef.current) void editDraft(newest.id);
        })
        .catch((reason) => {
          if (alive) setError(String(reason));
        });
    refresh();
    const interval = setInterval(refresh, 1500);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [editDraft]);
  const metadata = (): CaptureMetadata => ({
    title: title.trim() || undefined,
    notes: notes.trim() || undefined,
    rating,
    tags: tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    folderIds,
  });
  async function ingest(paths: string[]) {
    if (!paths.length || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("captures.accept", {
        draft: {
          id: crypto.randomUUID(),
          mode: "quick",
          metadata: metadata(),
          items: paths.map((path) => ({ kind: "file", path })),
        },
      });
      setMessage(
        `${paths.length} ${paths.length === 1 ? "file" : "files"} queued`,
      );
    } catch (reason) {
      setError(String(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (!draftId || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("captures.resume", {
        id: draftId,
        metadata: metadata(),
      });
      draftIdRef.current = null;
      setDraftId(null);
      setItems([]);
      setMessage("Capture queued");
    } catch (reason) {
      setError(String(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function cancelDraft() {
    if (!draftId || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await window.pond.query("captures.cancel", { id: draftId });
      draftIdRef.current = null;
      setDraftId(null);
      setItems([]);
      setMessage("Capture cancelled");
      setError(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function screenshot(
    query: "capture.display" | "capture.selectArea" | "capture.window",
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query(query, {});
      if (!result.ok && result.error !== "cancelled")
        setError("Couldn’t take the screenshot. Try again.");
    } catch (reason) {
      setError(String(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collection Window</h1>
      <p className={styles.copy}>
        {draftId
          ? `${items.length} ${items.length === 1 ? "image" : "images"}`
          : "Drop files or categorize captures from your browser."}
      </p>
      {draftId && items.length > 0 ? (
        <section
          className={styles.grid}
          {...scrollFade}
          aria-label="Page assets"
        >
          {items.map((item) => {
            const src =
              item.kind === "asset" || item.kind === "url"
                ? item.url
                : item.kind === "image"
                  ? item.dataUrl
                  : undefined;
            const key =
              item.kind === "asset" || item.kind === "url"
                ? item.url
                : item.kind === "image"
                  ? item.dataUrl
                  : item.kind === "file"
                    ? item.path
                    : item.text;
            return (
              <figure key={key} className={styles.asset}>
                {src ? <img src={src} alt="" /> : <span>{item.kind}</span>}
              </figure>
            );
          })}
        </section>
      ) : null}
      <div className={styles.fields}>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input.Root size="sm">
            <Input.Field
              value={title}
              onValueChange={setTitle}
              placeholder="Keep original names"
            />
          </Input.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Notes</Field.Label>
          <Input.Root size="sm">
            <Input.Field value={notes} onValueChange={setNotes} />
          </Input.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Tags</Field.Label>
          <Input.Root size="sm">
            <Input.Field
              value={tags}
              placeholder="design, reference"
              onValueChange={setTags}
            />
          </Input.Root>
        </Field.Root>
        <label>
          Rating{" "}
          <select
            aria-label="Rating"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          >
            {[0, 1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "Unrated" : `${value} stars`}
              </option>
            ))}
          </select>
        </label>
        <Field.Root>
          <Field.Label>Folders</Field.Label>
          <Input.Root size="sm">
            <Input.Field
              value={folderSearch}
              placeholder="Find a folder"
              onValueChange={setFolderSearch}
            />
          </Input.Root>
          <div
            style={{
              maxHeight: 120,
              overflow: "auto",
              display: "grid",
              gap: 6,
            }}
          >
            {folders
              .filter((folder) =>
                folder.name.toLowerCase().includes(folderSearch.toLowerCase()),
              )
              .map((folder) => (
                <label key={folder.id}>
                  <input
                    type="checkbox"
                    checked={folderIds.includes(folder.id)}
                    onChange={(event) =>
                      setFolderIds((ids) =>
                        event.target.checked
                          ? [...ids, folder.id]
                          : ids.filter((id) => id !== folder.id),
                      )
                    }
                  />{" "}
                  {folder.name}
                </label>
              ))}
          </div>
        </Field.Root>
      </div>
      {draftId ? (
        <div className={styles.actions}>
          <Button disabled={busy} onClick={() => void submit()}>
            Save capture
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void cancelDraft()}
          >
            Cancel capture
          </Button>
        </div>
      ) : (
        /* biome-ignore lint/a11y/noStaticElementInteractions: local file drop target */
        <div
          className={styles.drop}
          data-busy={busy || undefined}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void ingest(
              [...event.dataTransfer.files]
                .map((file) => window.pond.pathForFile(file))
                .filter(Boolean),
            );
          }}
        >
          {busy ? "Saving" : "Drop files"}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className={styles.actions}>
        {(
          [
            ["capture.display", "Screenshot Display"],
            ["capture.selectArea", "Screenshot Area"],
            ["capture.window", "Screenshot Window"],
          ] as const
        ).map(([query, label]) => (
          <Button
            key={query}
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void screenshot(query)}
          >
            {label}
          </Button>
        ))}
      </div>
      <section aria-label="Capture queue" style={{ display: "grid", gap: 8 }}>
        {jobs
          .filter((job) => job.state !== "cancelled")
          .slice(-10)
          .reverse()
          .map((job) => (
            <div
              key={job.id}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>
                {job.state === "draft"
                  ? `${job.total} items to categorize`
                  : `${job.completed}/${job.total} submitted`}
                {job.duplicateCount
                  ? ` · ${job.duplicateCount} already in library`
                  : ""}
              </span>
              {job.state === "draft" && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void editDraft(job.id)}
                >
                  Categorize
                </Button>
              )}
              {job.state === "failed" && (
                <>
                  <span role="alert">{job.error}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void window.pond
                        .query("captures.resume", { id: job.id })
                        .catch((reason) => setError(String(reason)))
                    }
                  >
                    Retry
                  </Button>
                </>
              )}
            </div>
          ))}
      </section>
    </div>
  );
}
