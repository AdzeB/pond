import { IconFileOutline18 } from "@pond/icons/outline/18";
import { Button, Checkbox, Dialog, Input } from "@pond/ui";
import { type AssistantSource, assistantSources } from "@shared/assistant";
import { motion, useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSave } from "@/features/saves/hooks/use-saves";
import { pickCardUnit } from "@/features/saves/lib/media/units";
import { thumbUrlFor } from "@/features/saves/lib/media/url";
import { openSave } from "@/features/saves/lib/save-nav";
import { gentleSpring } from "@/shared/lib/motion";
import styles from "./pane.module.css";
import { SaveAttachment } from "./save-attachment";
import { sourceDomain, useSourceCovers } from "./save-preview";

const AssistantSearchSchema = z.object({ saves: assistantSources });

function SaveMark({ id }: { id: string }) {
  const save = useSave(id);
  const [broken, setBroken] = useState<string | null>(null);
  const unit = save ? pickCardUnit(save) : null;
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
  useSourceCovers(saves.map((save) => save.id));
  const reduced = useReducedMotionConfig();
  if (!saves.length) return null;
  return (
    <motion.div
      layout
      initial={false}
      transition={reduced ? { duration: 0 } : gentleSpring}
    >
      <fieldset
        className={styles["attachment-list"]}
        aria-label={onRemove ? "Attached Saves" : "Sent Attachments"}
      >
        {saves.map((save) => (
          <SaveAttachment
            key={save.id}
            source={save}
            onOpen={onOpenSave}
            onRemove={onRemove}
          />
        ))}
      </fieldset>
    </motion.div>
  );
}

export function ContextPicker({
  open = true,
  inline = false,
  attached,
  onAdd,
  onClose,
}: {
  open?: boolean;
  inline?: boolean;
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
    if (!open) return;
    setSelected(new Map(attached.map((save) => [save.id, save])));
  }, [open, attached]);
  useEffect(() => {
    if (!open) return;
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
  }, [query, open]);
  const Body = inline ? "div" : Dialog.Content;
  const Description = inline ? "p" : Dialog.Description;
  const Footer = inline ? "div" : Dialog.Footer;
  const content = (
    <>
      <Body data-context-picker-body>
        <Description>
          Choose up to 24 Saves to include with your question.
        </Description>
        <Input.Root size="sm">
          <Input.Field
            aria-label="Search Saves"
            placeholder="Search saves..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Input.Root>
        <div
          className={styles["library-save-list"]}
          data-context-picker-list
          aria-busy={loading}
        >
          {loading ? (
            <p className={styles["library-empty"]} role="status">
              Searching your library
            </p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : rows.length ? (
            rows.map((save) => (
              <label
                className={styles["library-save"]}
                key={save.id}
                htmlFor={`context-${save.id}`}
              >
                <Checkbox.Root
                  id={`context-${save.id}`}
                  size="sm"
                  checked={selected.has(save.id)}
                  disabled={!selected.has(save.id) && selected.size >= 24}
                  onCheckedChange={() =>
                    setSelected((prev) => {
                      const next = new Map(prev);
                      if (next.has(save.id)) next.delete(save.id);
                      else next.set(save.id, save);
                      return next;
                    })
                  }
                >
                  <Checkbox.Indicator />
                </Checkbox.Root>
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
      </Body>
      <Footer data-context-picker-footer>
        <Button type="button" size="md" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="md"
          disabled={!selected.size}
          onClick={() => {
            onAdd([...selected.values()]);
            onClose();
          }}
        >
          Add {selected.size || ""} {selected.size === 1 ? "Save" : "Saves"}
        </Button>
      </Footer>
    </>
  );
  if (inline) return open ? content : null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles["library-dialog"]}>
          <Dialog.Header>
            <Dialog.Title>Add Context</Dialog.Title>

            <Dialog.Close />
          </Dialog.Header>
          {content}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
