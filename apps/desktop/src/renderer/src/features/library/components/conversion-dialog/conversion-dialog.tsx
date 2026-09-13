import { Button, Dialog, Input } from "@pond/ui";
import {
  type ConversionJob,
  type ConversionPreset,
  ConversionPresetSchema,
} from "@shared/conversion-contracts";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useId, useState } from "react";
import {
  closeConversionDialog,
  conversionDialogStore,
} from "@/features/library/state/conversion-dialog";
import styles from "./conversion-dialog.module.css";

export function ConversionDialogHost() {
  const state = useSelector(conversionDialogStore, (state) => state);
  const [last, setLast] = useState(state);
  if (state && state !== last) setLast(state);
  return last ? (
    <ConversionDialog
      key={last.id}
      ids={last.ids}
      fileIndex={last.fileIndex}
      open={state !== null}
    />
  ) : null;
}
function ConversionDialog({
  ids,
  fileIndex,
  open,
}: {
  ids: readonly string[];
  fileIndex: number;
  open: boolean;
}) {
  const fieldId = useId();
  const [preset, setPreset] = useState<ConversionPreset>(() =>
    ConversionPresetSchema.parse({
      id: crypto.randomUUID(),
      name: "Web Image",
      format: "webp",
    }),
  );
  const [presets, setPresets] = useState<ConversionPreset[]>([]);
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = job?.status === "running";
  useEffect(() => {
    void window.pond
      .query("conversion.presets", {})
      .then(setPresets)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load presets.",
        ),
      );
  }, []);
  useEffect(() => {
    if (job?.status !== "running") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!job) return;
      try {
        const next = await window.pond.query("conversion.status", {
          id: job.id,
        });
        if (!stopped && next) setJob(next);
      } catch (cause) {
        if (!stopped)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not check export progress.",
          );
      }
      if (!stopped) timer = setTimeout(() => void poll(), 500);
    }
    timer = setTimeout(() => void poll(), 200);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [job]);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      const result = await window.pond.query("conversion.start", {
        ids: [...ids],
        fileIndex,
        preset,
      });
      if (result) setJob(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not export converted files.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("conversion.savePreset", { preset });
      setPresets(await window.pond.query("conversion.presets", {}));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the preset.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!job) return;
    try {
      setJob(await window.pond.query("conversion.cancel", { id: job.id }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not cancel the export.",
      );
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) closeConversionDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Export Converted Files</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>{`Export copies from ${ids.length} ${ids.length === 1 ? "save" : "saves"}. Existing files keep their names and converted files receive a new name if needed.`}</Dialog.Description>
          <fieldset disabled={busy || running} className={styles.fields}>
            <label>
              Preset
              <select
                value={
                  presets.some((item) => item.id === preset.id) ? preset.id : ""
                }
                onChange={(event) => {
                  const selected = presets.find(
                    (item) => item.id === event.target.value,
                  );
                  setPreset(selected ?? { ...preset, id: crypto.randomUUID() });
                }}
              >
                <option value="">Custom</option>
                {presets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${fieldId}-name`}>
              Preset Name
              <Input.Field
                id={`${fieldId}-name`}
                value={preset.name}
                onValueChange={(name) => setPreset({ ...preset, name })}
              />
            </label>
            <label>
              Format
              <select
                value={preset.format}
                onChange={(event) => {
                  const format = (["jpeg", "png", "webp", "gif"] as const).find(
                    (value) => value === event.target.value,
                  );
                  if (format) setPreset({ ...preset, format });
                }}
              >
                {["webp", "jpeg", "png", "gif"].map((format) => (
                  <option key={format} value={format}>
                    {format === "gif" ? "Video to GIF" : format.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.row}>
              <label>
                Maximum Width
                <input
                  type="number"
                  min={1}
                  max={8192}
                  placeholder={preset.format === "gif" ? "640" : "Original"}
                  value={preset.width ?? ""}
                  onChange={(event) =>
                    setPreset({
                      ...preset,
                      width: event.target.value
                        ? event.target.valueAsNumber
                        : null,
                    })
                  }
                />
              </label>
              <label>
                Maximum Height
                <input
                  type="number"
                  min={1}
                  max={8192}
                  placeholder="Original"
                  value={preset.height ?? ""}
                  onChange={(event) =>
                    setPreset({
                      ...preset,
                      height: event.target.value
                        ? event.target.valueAsNumber
                        : null,
                    })
                  }
                />
              </label>
            </div>
            {preset.format === "gif" ? (
              <div className={styles.row}>
                <label>
                  Start (Seconds)
                  <input
                    type="number"
                    min={0}
                    max={86400}
                    value={preset.start}
                    onChange={(event) =>
                      setPreset({
                        ...preset,
                        start: event.target.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Duration (Seconds)
                  <input
                    type="number"
                    min={0.1}
                    max={60}
                    step={0.1}
                    value={preset.duration}
                    onChange={(event) =>
                      setPreset({
                        ...preset,
                        duration: event.target.valueAsNumber,
                      })
                    }
                  />
                </label>
                <label>
                  Frames per Second
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={preset.fps}
                    onChange={(event) =>
                      setPreset({ ...preset, fps: event.target.valueAsNumber })
                    }
                  />
                </label>
              </div>
            ) : (
              <label>
                Quality
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={preset.quality}
                  onChange={(event) =>
                    setPreset({
                      ...preset,
                      quality: event.target.valueAsNumber,
                    })
                  }
                />
                <output>{preset.quality}</output>
              </label>
            )}
            <Button onClick={() => void save()}>Save Preset</Button>
          </fieldset>
          {job ? (
            <div role="status">
              <p>
                {job.status === "running"
                  ? "Exporting"
                  : job.status === "complete"
                    ? "Export Complete"
                    : job.status === "cancelled"
                      ? "Export Cancelled"
                      : "Export Failed"}
                : {job.completed} of {job.total} files.
              </p>
              <progress value={job.completed} max={job.total} />
              <p>{job.directory}</p>
              {job.error && job.status === "failed" ? (
                <p role="alert">{job.error}</p>
              ) : null}
              {job.status !== "complete" && job.completed > 0 ? (
                <p>Completed files remain in the export folder.</p>
              ) : null}
            </div>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          <div className={styles.row}>
            <Button onClick={closeConversionDialog}>Close</Button>
            {running ? (
              <Button onClick={() => void cancel()}>Cancel Export</Button>
            ) : (
              <Button
                variant="primary"
                disabled={
                  busy || !ConversionPresetSchema.safeParse(preset).success
                }
                loading={busy}
                onClick={() => void start()}
              >
                {busy ? "Working" : "Choose Folder and Export"}
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
