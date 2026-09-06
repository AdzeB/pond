import { IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui/button";
import { Dialog } from "@pond/ui/dialog";
import { useState } from "react";
import { changes, saves } from "./fixtures";

export function sampleSave(id: number, applied: number[]) {
  const save = {
    ...saves[id],
    title: String(saves[id].title),
    tags: String(saves[id].tags),
    folder: String(saves[id].folder),
  };
  if (applied.includes(id)) {
    const change = changes[id];
    save[change.field] = change.after;
  }
  return save;
}

export function SaveCover({ id }: { id: number }) {
  return (
    <span className="save-cover" data-cover={id} aria-hidden="true">
      <span>{["Aa", "Quiet", "•••"][id]}</span>
      <i />
      <i />
    </span>
  );
}

export function Attachments({
  ids,
  applied,
  onOpen,
  onRemove,
}: {
  ids: number[];
  applied: number[];
  onOpen: (id: number) => void;
  onRemove?: (id: number) => void;
}) {
  return (
    <fieldset
      className="attachment-list"
      aria-label={onRemove ? "Attached Saves" : "Sent attachments"}
    >
      {ids.map((id) => (
        <div className="attachment-chip" key={id}>
          <button
            type="button"
            className="attachment-open"
            onClick={() => onOpen(id)}
          >
            <SaveCover id={id} />
            <span>
              <strong>{sampleSave(id, applied).title}</strong>
              <small>
                {saves[id].kind} · {saves[id].domain}
              </small>
            </span>
          </button>
          {onRemove ? (
            <button
              type="button"
              className="attachment-remove"
              aria-label={`Remove ${saves[id].title}`}
              onClick={() => onRemove(id)}
            >
              <IconXmarkOutline18 />
            </button>
          ) : null}
        </div>
      ))}
    </fieldset>
  );
}

export function SourceCards({
  ids,
  applied,
  onOpen,
  onLibrary,
}: {
  ids: number[];
  applied: number[];
  onOpen: (id: number) => void;
  onLibrary: (ids: number[]) => void;
}) {
  return (
    <div className="source-cards">
      {ids.map((id) => (
        <article className="source-card" key={id}>
          <button
            type="button"
            className="source-card-heading"
            onClick={() => onOpen(id)}
          >
            <SaveCover id={id} />
            <span>
              <strong>{sampleSave(id, applied).title}</strong>
              <small>
                {saves[id].domain} · {saves[id].kind}
              </small>
            </span>
          </button>
          <p>{saves[id].excerpt}</p>
          <div className="source-card-actions">
            <button type="button" onClick={() => onOpen(id)}>
              Open Save
            </button>
            <button type="button" onClick={() => onLibrary([id])}>
              Show in Library
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SaveDialog({
  id,
  applied,
  onClose,
  onLibrary,
}: {
  id: number | null;
  applied: number[];
  onClose: () => void;
  onLibrary: (ids: number[]) => void;
}) {
  const save = sampleSave(id ?? 0, applied);
  return (
    <Dialog.Root
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="source-dialog">
          <Dialog.Header>
            <span className="source-eyebrow">SAMPLE SAVE</span>
            <Dialog.Title>{save.title}</Dialog.Title>

          <Dialog.Close /></Dialog.Header>
          <Dialog.Content><Dialog.Description>
              {save.domain} · {save.kind}
            </Dialog.Description>
            <SaveCover id={id ?? 0} />
            <p>{save.excerpt}</p>
            <dl className="save-metadata">
              <div>
                <dt>Tags</dt>
                <dd>{save.tags}</dd>
              </div>
              <div>
                <dt>Folder</dt>
                <dd>{save.folder}</dd>
              </div>
            </dl>
            <p className="sample-disclaimer">
              Illustrative content, not a quotation. Changes exist only in this
              preview.
            </p>
          </Dialog.Content>
          <Dialog.Footer>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onLibrary([id ?? 0])}
            >
              Show in Library
            </Button>
            <Dialog.Close render={<Button size="sm" variant="secondary" />}>
              Close Preview
            </Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function LibraryDialog({
  kind,
  highlight,
  attached,
  applied,
  onClose,
  onAttach,
}: {
  kind: "picker" | "library";
  highlight: number[];
  attached: number[];
  applied: number[];
  onClose: () => void;
  onAttach: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState(
    kind === "picker" ? attached : highlight,
  );
  const [query, setQuery] = useState("");
  const visible = saves
    .map((_, id) => id)
    .filter((id) =>
      sampleSave(id, applied).title.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="library-dialog">
          <Dialog.Header>
            <span className="source-eyebrow">SAMPLE LIBRARY</span>
            <Dialog.Title>
              {kind === "picker" ? "Add context" : "Your saves"}
            </Dialog.Title>

          <Dialog.Close /></Dialog.Header>
          <Dialog.Content><Dialog.Description>
              {kind === "picker"
                ? "Choose the Saves to include with your question."
                : "Inspect the sample library, including any edits you applied."}
            </Dialog.Description>
            <input
              className="library-search"
              aria-label="Search sample Saves"
              placeholder="Search saves..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="library-save-list">
              {visible.map((id) => {
                const save = sampleSave(id, applied);
                return (
                  <label
                    className="library-save"
                    data-highlighted={highlight.includes(id) || undefined}
                    key={id}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(id)
                            ? current.filter((item) => item !== id)
                            : [...current, id],
                        )
                      }
                    />
                    <SaveCover id={id} />
                    <span>
                      <strong>{save.title}</strong>
                      <small>
                        {save.kind} · {save.folder}
                      </small>
                      <small>{save.tags}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            {visible.length === 0 ? (
              <p className="library-empty">
                No sample Saves match your search.
              </p>
            ) : null}
          </Dialog.Content>
          <Dialog.Footer>
            <Dialog.Close render={<Button size="sm" variant="ghost" />}>
              Cancel
            </Dialog.Close>
            <Button
              size="sm"
              variant="secondary"
              disabled={!selected.length}
              onClick={() => onAttach(selected)}
            >
              Attach {selected.length || ""}{" "}
              {selected.length === 1 ? "Save" : "Saves"}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
