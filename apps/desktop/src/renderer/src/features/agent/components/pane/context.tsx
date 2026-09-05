import { IconFileOutline18, IconXmarkOutline18 } from "@pond/icons/outline/18";
import { Button, Dialog } from "@pond/ui";
import { type AssistantSource, assistantSources } from "@shared/assistant";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSave } from "@/features/saves/hooks/use-saves";
import { buildMediaUnits } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import { openSave } from "@/features/saves/lib/save-nav";
import styles from "./pane.module.css";
import { sourceDomain } from "./save-preview";

const AssistantSearchSchema = z.object({ saves: assistantSources });

function SaveMark({ id }: { id: string }) {
  const save = useSave(id);
  const [broken, setBroken] = useState<string | null>(null);
  const unit = save ? buildMediaUnits(save)[save.coverIndex ?? 0] : undefined;
  const candidate = unit?.isVideo ? unit.posterUrl : unit?.url;
  const src = candidate?.startsWith("pond://")
    ? thumbUrlFor(candidate, 80)
    : undefined;
  return (
    <span className={styles["save-cover"]} aria-hidden>
      {src && broken !== src ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(src)} />
      ) : (
        <IconFileOutline18 />
      )}
    </span>
  );
}

export function Attachments({
  saves,
  onRemove,
  onOpenSave = openSave,
}: {
  saves: AssistantSource[];
  onRemove?: (id: string) => void;
  onOpenSave?: (id: string) => void;
}) {
  if (!saves.length) return null;
  return (
    <fieldset
      className={styles["attachment-list"]}
      aria-label={onRemove ? "Attached Saves" : "Sent Attachments"}
    >
      {saves.map((save) => (
        <div className={styles["attachment-chip"]} key={save.id}>
          <button
            type="button"
            className={styles["attachment-open"]}
            onClick={() => onOpenSave(save.id)}
          >
            <SaveMark id={save.id} />
            <span>
              <strong>{save.title || "Untitled"}</strong>
              <small>{sourceDomain(save)}</small>
            </span>
          </button>
          {onRemove ? (
            <button
              type="button"
              className={styles["attachment-remove"]}
              aria-label={`Remove ${save.title || "Save"}`}
              onClick={() => onRemove(save.id)}
            >
              <IconXmarkOutline18 />
            </button>
          ) : null}
        </div>
      ))}
    </fieldset>
  );
}

export function ContextPicker({
  attached,
  onAdd,
  onClose,
}: {
  attached: AssistantSource[];
  onAdd: (saves: AssistantSource[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AssistantSource[]>([]);
  const [selected, setSelected] = useState(
    () => new Map(attached.map((save) => [save.id, save])),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void window.pond
        .query("agent.searchSaves", { query, limit: 50 })
        .then((result) => {
          if (current) {
            setRows(AssistantSearchSchema.parse(result).saves);
            setError(null);
          }
        })
        .catch(() => {
          if (current) setError("Could not search your library. Try again.");
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 160);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles["library-dialog"]}>
          <Dialog.Header>
            <Dialog.Title>Add Context</Dialog.Title>
            <Dialog.Description>
              Choose up to 24 Saves to include with your question.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Content>
            <input
              className={styles["library-search"]}
              aria-label="Search Saves"
              placeholder="Search saves..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={styles["library-save-list"]} aria-busy={loading}>
              {loading ? (
                <p className={styles["library-empty"]} role="status">
                  Searching your library
                </p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : rows.length ? (
                rows.map((save) => (
                  <label className={styles["library-save"]} key={save.id}>
                    <input
                      type="checkbox"
                      checked={selected.has(save.id)}
                      disabled={!selected.has(save.id) && selected.size >= 24}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Map(prev);
                          if (next.has(save.id)) next.delete(save.id);
                          else next.set(save.id, save);
                          return next;
                        })
                      }
                    />
                    <SaveMark id={save.id} />
                    <span>
                      <strong>{save.title || "Untitled"}</strong>
                      <small>{sourceDomain(save)}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p className={styles["library-empty"]}>
                  No Saves found. Try another search.
                </p>
              )}
            </div>
          </Dialog.Content>
          <Dialog.Footer>
            <Dialog.Close render={<Button size="md" variant="ghost" />}>
              Cancel
            </Dialog.Close>
            <Button
              size="md"
              disabled={!selected.size}
              onClick={() => {
                onAdd([...selected.values()]);
                onClose();
              }}
            >
              Add {selected.size || ""} {selected.size === 1 ? "Save" : "Saves"}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
