import { IconImage, IconImageSparkle, IconTextToImage } from "@pond/icons";
import { Button, Input } from "@pond/ui";
import { useId, useRef, useState } from "react";
import {
  loadImage,
  mediaImageEmbedding,
  mediaModelVersion,
} from "@/features/enrichment";
import {
  setSemanticQuery,
  setVisualProbe,
  useSemanticQuery,
  useVisualProbe,
  type VisualProbe,
} from "@/features/library/state/view-store";
import { draggingSaveIds } from "@/features/saves";
import { pool } from "@/features/saves/pool";
import { openSettings } from "@/shared/lib/open-settings";
import { usePrefs } from "@/shared/state/prefs";
import { FilterChip, FilterPopup } from "../chip";
import { stopMenuKeys } from "../menu-keys";
import styles from "./styles.module.css";

export function SemanticChip() {
  const [ai] = usePrefs("ai");
  const query = useSemanticQuery();
  const enabled = ai.semanticSearch === true;
  const active = Boolean(query);
  const summary = query ?? "Semantic";
  return (
    <FilterChip
      icon={<IconTextToImage />}
      label={summary}
      active={active}
      ariaLabel={active ? `Semantic: ${query}` : "Semantic"}
      onClear={active ? () => setSemanticQuery(null) : undefined}
      clearLabel="Clear Semantic Filter"
    >
      <FilterPopup layout="content" aria-label="Semantic Filter">
        {enabled ? (
          <SemanticEditor />
        ) : (
          <IndexOff
            title="Semantic Search is off"
            hash="setting-processing-semanticSearch"
          />
        )}
      </FilterPopup>
    </FilterChip>
  );
}

function SemanticEditor() {
  const inputId = useId();
  const current = useSemanticQuery() ?? "";
  const [text, setText] = useState(current);
  return (
    <form
      className={styles.form}
      onKeyDown={stopMenuKeys}
      onSubmit={(event) => {
        event.preventDefault();
        setSemanticQuery(text.trim() || null);
      }}
    >
      <label className={styles.field} htmlFor={inputId}>
        <span>Description</span>
        <Input.Root size="sm">
          <Input.Textarea
            id={inputId}
            aria-label="Semantic query"
            value={text}
            onValueChange={setText}
            placeholder="For example, a black cat sitting by a window"
            rows={4}
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
    <FilterChip
      icon={<IconImageSparkle />}
      label={summary}
      active={active}
      ariaLabel={active ? `Visual Match: ${probe?.label}` : "Visual Match"}
      onClear={active ? () => setVisualProbe(null) : undefined}
      clearLabel="Clear Visual Match Filter"
    >
      <FilterPopup layout="content" aria-label="Visual Match Filter">
        {enabled ? (
          <VisualEditor probe={probe} />
        ) : (
          <IndexOff
            title="Visual Similarity is off"
            hash="setting-processing-enableClip"
          />
        )}
      </FilterPopup>
    </FilterChip>
  );
}

function VisualEditor({ probe }: { probe: VisualProbe | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <label
      className={styles.drop}
      htmlFor={inputId}
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
      <div className={styles.illustration} data-active={!!probe || undefined}>
        <IconImage />
      </div>
      <p className={styles.title}>
        {probe ? probe.label : "Drag or paste image"}
      </p>
      <p className={styles.hint}>Supports Pond or local images</p>
      <input
        id={inputId}
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
        onClick={(event) => {
          event.preventDefault();
          inputRef.current?.click();
        }}
      >
        {busy ? "Matching" : "Choose Image"}
      </Button>
      {error ? <p className={styles.hint}>{error}</p> : null}
    </label>
  );
}

function IndexOff({ title, hash }: { title: string; hash: string }) {
  return (
    <div className={styles.drop} data-unavailable>
      <p className={styles.hint}>{title}</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => openSettings("processing", hash)}
      >
        Open Processing Settings
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
    const vec = await mediaImageEmbedding(image);
    setVisualProbe({
      kind: "vector",
      model: mediaModelVersion(),
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
