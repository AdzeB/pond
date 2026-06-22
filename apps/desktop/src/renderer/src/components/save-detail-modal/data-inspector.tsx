import type { ReactNode } from "react";
import { formatAbsolute, formatBytes } from "@/lib/format";
import type { Save, SaveFile } from "@/lib/types";
import {
  getClipEmbedding,
  useClipEmbeddingVersion,
} from "@/stores/clip-embedding-store";
import { getEmbedding, useEmbeddingVersion } from "@/stores/embedding-store";
import { CopyButton } from "./copy-button";
import styles from "./styles.module.css";

// A complete, read-only dump of every field the system has stored or computed
// for a save: core identity, content, media + files, on-device enrichment, the
// embedding vectors, the task queue, timestamps, and the full raw capture blob.
export function DataInspector({ save }: { save: Save }) {
  // Subscribe to the in-memory vector stores so the embedding rows refresh as
  // soon as the sweep lands a fresh vector for this save.
  useEmbeddingVersion();
  useClipEmbeddingVersion();
  const textEmbedding = getEmbedding(save.id);
  const clipEmbedding = getClipEmbedding(save.id);

  return (
    <div className={styles.data}>
      <Section title="Identity">
        <Row label="ID" value={save.id} mono copyable />
        <Row label="Source" value={save.source} />
        <Row label="Source ID" value={save.sourceId} mono copyable />
        <Row label="URL" value={save.url} mono copyable />
        <Row label="Status" value={save.status ?? null} />
      </Section>

      <Section title="Content">
        <Row label="Title" value={save.title} />
        <Row label="Description" value={save.description} block />
        <Row label="Author" value={save.author} />
        <Row label="Notes" value={save.notes} block />
        <Row label="Tags" chips={save.tags} />
      </Section>

      <Section title="Media">
        <Row label="Type" value={save.mediaType} />
        <Row label="Media URL" value={save.mediaUrl} mono copyable />
        <Row
          label="Dimensions"
          value={
            save.width && save.height ? `${save.width} × ${save.height}` : null
          }
        />
        <Row label="File size" value={formatNullableBytes(save.fileSize)} />
        <Row label="Perceptual hash" value={save.phash} mono copyable />
        <Row
          label="Cover index"
          value={save.coverIndex != null ? String(save.coverIndex) : null}
        />
        {(save.files ?? []).map((file, i) => (
          <FileBlock key={file.sha256 || `${file.path}-${i}`} file={file} />
        ))}
      </Section>

      <Section title="Enrichment">
        <Row
          label="Caption"
          value={save.caption}
          model={save.captionModel}
          block
        />
        <Row
          label="Extracted text"
          value={save.ocrText}
          model={save.ocrModel}
          block
        />
        <Row
          label="Transcript"
          value={save.transcript}
          model={save.transcriptModel}
          block
        />
        <Row
          label="Style"
          chips={save.aesthetic ?? undefined}
          model={save.aestheticModel}
        />
        <Row
          label="Suggested tags"
          chips={save.suggestedTags ?? undefined}
          model={save.suggestedTagsModel}
        />
        <Row label="Auto-title model" value={save.autoTitleModel} />
        <Row
          label="Sensitivity"
          value={save.sensitivity ?? null}
          model={save.sensitivityModel}
        />
        <ColorRow colors={save.dominantColors} />
      </Section>

      <Section title="Embeddings">
        <Row
          label="Text embedding"
          value={
            textEmbedding ? `${textEmbedding.vec.length} dimensions` : "None"
          }
          model={textEmbedding?.model ?? null}
        />
        <Row
          label="CLIP embedding"
          value={
            clipEmbedding ? `${clipEmbedding.vec.length} dimensions` : "None"
          }
          model={clipEmbedding?.model ?? save.clipModel ?? null}
        />
      </Section>

      <Section title="Timeline">
        <Row label="Saved" value={formatNullableTime(save.savedAt)} />
        <Row label="Created" value={formatNullableTime(save.createdAt)} />
        <Row
          label="Ingest started"
          value={formatNullableTime(save.ingestStartedAt)}
        />
        <Row
          label="Ingest completed"
          value={formatNullableTime(save.ingestCompletedAt)}
        />
        <Row label="Deleted" value={formatNullableTime(save.deletedAt)} />
      </Section>

      {(save.tasks ?? []).length > 0 ? (
        <Section title="Tasks">
          {(save.tasks ?? []).map((task) => (
            <div key={task.op} className={styles.dataTask}>
              <div className={styles.dataTaskHead}>
                <span className={styles.dataTaskOp}>{task.op}</span>
                <span className={styles.dataTaskStatus}>{task.status}</span>
              </div>
              <div className={styles.dataTaskMeta}>
                {`attempt ${task.attempts}/${task.maxAttempts}`}
                {task.nextRunAt
                  ? ` · next ${formatAbsolute(task.nextRunAt)}`
                  : ""}
              </div>
              {task.lastError ? (
                <p className={styles.dataTaskError}>{task.lastError}</p>
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}

      {save.rawJson ? (
        <Section title="Raw JSON">
          <JsonBlock value={save.rawJson} />
        </Section>
      ) : null}
    </div>
  );
}

function formatNullableBytes(bytes: number | null | undefined): string | null {
  if (bytes == null) return null;
  return formatBytes(bytes);
}

function formatNullableTime(value: number | null | undefined): string | null {
  if (value == null) return null;
  return formatAbsolute(value) || null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.dataSection}>
      <h4 className={styles.dataSectionTitle}>{title}</h4>
      <dl className={styles.dataRows}>{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  chips,
  model,
  mono,
  block,
  copyable,
}: {
  label: string;
  value?: string | null;
  chips?: ReadonlyArray<string>;
  model?: string | null;
  mono?: boolean;
  block?: boolean;
  copyable?: boolean;
}) {
  const hasChips = chips != null && chips.length > 0;
  const hasValue = value != null && value !== "";
  if (!hasChips && !hasValue) return null;

  return (
    <div
      className={styles.dataRow}
      data-block={block || hasChips ? "true" : undefined}
    >
      <dt className={styles.dataLabel}>{label}</dt>
      <dd className={styles.dataValueCell}>
        {hasChips ? (
          <div className={styles.dataChips}>
            {chips?.map((chip) => (
              <span key={chip} className={styles.dataChip}>
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <span
            className={styles.dataValue}
            data-mono={mono ? "true" : undefined}
          >
            {value}
            {copyable && hasValue ? (
              <CopyButton text={value as string} />
            ) : null}
          </span>
        )}
        {model ? <span className={styles.dataModel}>via {model}</span> : null}
      </dd>
    </div>
  );
}

function ColorRow({ colors }: { colors?: ReadonlyArray<string> }) {
  if (!colors || colors.length === 0) return null;
  return (
    <div className={styles.dataRow} data-block="true">
      <dt className={styles.dataLabel}>Dominant colors</dt>
      <dd className={styles.dataValueCell}>
        <div className={styles.dataSwatches}>
          {colors.map((color) => (
            <span key={color} className={styles.dataSwatch} title={color}>
              <span
                className={styles.dataSwatchDot}
                style={{ background: color }}
                aria-hidden
              />
              {color}
            </span>
          ))}
        </div>
      </dd>
    </div>
  );
}

function FileBlock({ file }: { file: SaveFile }) {
  return (
    <div className={styles.dataRow} data-block="true">
      <dt className={styles.dataLabel}>File · {file.kind}</dt>
      <dd className={styles.dataValueCell}>
        <span className={styles.dataValue} data-mono="true">
          {file.path}
          <CopyButton text={file.path} />
        </span>
        <span className={styles.dataModel}>
          {[
            file.mimeType,
            file.width && file.height ? `${file.width}×${file.height}` : null,
            formatBytes(file.size),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className={styles.dataModel} data-mono="true">
          {file.sha256}
        </span>
      </dd>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className={styles.dataJson}>
      <CopyButton text={text} floating />
      <pre className={styles.dataJsonPre}>{text}</pre>
    </div>
  );
}
