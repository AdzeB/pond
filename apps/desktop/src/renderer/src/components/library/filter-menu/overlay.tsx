import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import {
  IconImageOutline18,
  IconWandSparkleOutline18,
} from "@pond/icons/outline/18";
import { Button, Input, Menu } from "@pond/ui";
import { useId, useRef, useState } from "react";
import { clipImageEmbedding, clipModelVersion } from "@/lib/enrichment/clip";
import { loadImage } from "@/lib/enrichment/image";
import { draggingSaveIds } from "@/lib/save/start-drag";
import { openSettings } from "@/lib/ui/open-settings";
import { libraryHeader } from "@/stores/library-header";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import {
  setSemanticQuery,
  setVisualProbe,
  useSemanticQuery,
  useVisualProbe,
  type VisualProbe,
} from "@/stores/view-store";
import styles from "./styles.module.css";

export function SemanticChip() {
  const [ai] = usePrefs("ai");
  const query = useSemanticQuery();
  const enabled = ai.semanticSearch === true;
  const active = Boolean(query);
  const summary = query ?? "Semantic";
  return (
    <div className={styles.category} data-active={active || undefined}>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) libraryHeader.closePopover();
        }}
      >
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles["category-trigger"]}
          aria-label={active ? `Semantic: ${query}` : "Semantic"}
          title={summary}
        >
          <span className={styles["category-icon"]} aria-hidden>
            <IconWandSparkleOutline18 />
          </span>
          <span className={styles["category-label"]}>{summary}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup className={styles.popup} aria-label="Semantic Filter">
              {enabled ? (
                <SemanticEditor />
              ) : (
                <IndexOff
                  title="Semantic Search is off"
                  hash="setting-search-semanticSearch"
                />
              )}
              {active ? (
                <>
                  <Menu.Separator />
                  <Menu.Item onClick={() => setSemanticQuery(null)}>
                    <Menu.ItemLabel>Clear Filter</Menu.ItemLabel>
                  </Menu.Item>
                </>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active ? (
        <Button
          icon
          size="xs"
          variant="ghost"
          className={styles["category-clear"]}
          aria-label="Clear Semantic Filter"
          onClick={() => setSemanticQuery(null)}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}

function SemanticEditor() {
  const inputId = useId();
  const current = useSemanticQuery() ?? "";
  const [text, setText] = useState(current);
  return (
    <form
      className={styles["content-form"]}
      onKeyDown={(event) => {
        if (event.key !== "Escape" && event.key !== "Tab")
          event.stopPropagation();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        setSemanticQuery(text.trim() || null);
      }}
    >
      <label className={styles["content-field"]} htmlFor={inputId}>
        <span>Describe what you want</span>
        <Input.Root size="sm">
          <Input.Field
            id={inputId}
            aria-label="Semantic query"
            value={text}
            onValueChange={setText}
            placeholder="Describe what you're looking for, e.g. 'black cat'"
          />
        </Input.Root>
      </label>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={!text.trim()}
      >
        Apply
      </Button>
    </form>
  );
}

export function VisualChip() {
  const [ai] = usePrefs("ai");
  const probe = useVisualProbe();
  const enabled = ai.enableClip === true;
  const active = Boolean(probe);
  const summary = probe?.label ?? "Visual Match";
  return (
    <div className={styles.category} data-active={active || undefined}>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) libraryHeader.closePopover();
        }}
      >
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles["category-trigger"]}
          aria-label={active ? `Visual Match: ${probe?.label}` : "Visual Match"}
          title={summary}
        >
          <span className={styles["category-icon"]} aria-hidden>
            <IconImageOutline18 />
          </span>
          <span className={styles["category-label"]}>{summary}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup
              className={styles.popup}
              aria-label="Visual Match Filter"
            >
              {enabled ? (
                <VisualEditor probe={probe} />
              ) : (
                <IndexOff
                  title="Visual Similarity is off"
                  hash="setting-search-enableClip"
                />
              )}
              {active ? (
                <>
                  <Menu.Separator />
                  <Menu.Item onClick={() => setVisualProbe(null)}>
                    <Menu.ItemLabel>Clear Filter</Menu.ItemLabel>
                  </Menu.Item>
                </>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active ? (
        <Button
          icon
          size="xs"
          variant="ghost"
          className={styles["category-clear"]}
          aria-label="Clear Visual Match Filter"
          onClick={() => setVisualProbe(null)}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}

function VisualEditor({ probe }: { probe: VisualProbe | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop and paste target; Choose Image is the control
    <div
      className={styles.drop}
      data-over={over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const dragged = draggingSaveIds()[0];
        if (dragged) {
          const save = pool.get(dragged);
          setVisualProbe({
            kind: "saveId",
            id: dragged,
            label: save?.title?.trim() || "Selected Save",
          });
          return;
        }
        const file = event.dataTransfer.files[0];
        if (file) void encodeFile(file, setBusy, setError);
      }}
      onPaste={(event) => {
        const file = [...event.clipboardData.items]
          .map((item) => item.getAsFile())
          .find((candidate) => candidate?.type.startsWith("image/"));
        if (file) void encodeFile(file, setBusy, setError);
      }}
    >
      <p className={styles.hint}>
        {probe ? probe.label : "Drag or paste image"}
      </p>
      <p className={styles.hint}>Supports Pond or local images</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void encodeFile(file, setBusy, setError);
          event.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Matching" : "Choose Image"}
      </Button>
      {error ? <p className={styles.hint}>{error}</p> : null}
    </div>
  );
}

function IndexOff({ title, hash }: { title: string; hash: string }) {
  return (
    <div className={styles.drop}>
      <p className={styles.hint}>{title}</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => openSettings("search", hash)}
      >
        Open Search Settings
      </Button>
    </div>
  );
}

async function encodeFile(
  file: File,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void,
): Promise<void> {
  setBusy(true);
  setError(null);
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const vec = await clipImageEmbedding(image);
    setVisualProbe({
      kind: "vector",
      model: clipModelVersion(),
      values: Array.from(vec),
      label: file.name || "Dropped image",
    });
  } catch {
    setError("Could not match this image.");
  } finally {
    URL.revokeObjectURL(url);
    setBusy(false);
  }
}
