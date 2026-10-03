import { Button, Checkbox, Dialog, Input, Select, Slider } from "@pond/ui";
import {
  type ConversionCapability,
  type ConversionFormat,
  type ConversionJob,
  type ConversionPreset,
  ConversionPresetSchema,
} from "@shared/conversion-contracts";
import { useEffect, useId, useState } from "react";
import {
  closeConversionDialog,
  type ExportMode,
} from "@/features/library/state/conversion-dialog";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import styles from "./styles.module.css";

const EXPORT_MODE_ITEMS: Array<{ value: ExportMode; label: string }> = [
  { value: "files", label: "Original Files" },
  { value: "converted", label: "Converted Files" },
  { value: "eagle-package", label: "Eagle Package" },
  { value: "pond-package", label: "Pond Package" },
  { value: "csv", label: "CSV Metadata" },
];

export function ConversionDialog({
  ids,
  fileIndex,
  initialMode,
  open,
}: {
  ids: readonly string[];
  fileIndex: number;
  initialMode: ExportMode;
  open: boolean;
}) {
  const fieldId = useId();
  const [mode, setMode] = useState<ExportMode>(initialMode);
  const [preset, setPreset] = useState<ConversionPreset>(() =>
    ConversionPresetSchema.parse({
      id: crypto.randomUUID(),
      name: "Web Image",
      format: "webp",
    }),
  );
  const [presets, setPresets] = useState<ConversionPreset[]>([]);
  const [capabilities, setCapabilities] = useState<ConversionCapability[]>([]);
  const [conversionOptionsLoaded, setConversionOptionsLoaded] = useState(false);
  const [job, setJob] = useState<ConversionJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = job?.status === "running";
  const converting = mode === "converted";
  const selectedCapability = capabilities.find(
    (capability) => capability.format === preset.format,
  );
  const timed = selectedCapability?.category !== "image";
  useEffect(() => {
    if (!converting || conversionOptionsLoaded) return;
    void Promise.all([
      window.pond.query("conversion.presets", {}),
      window.pond.query("conversion.capabilities", {}),
    ])
      .then(([storedPresets, supportedFormats]) => {
        setPresets(storedPresets);
        setCapabilities(supportedFormats);
        setConversionOptionsLoaded(true);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load presets.",
        ),
      );
  }, [converting, conversionOptionsLoaded]);
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
      if (mode === "converted") {
        const result = await window.pond.query("conversion.start", {
          ids: [...ids],
          fileIndex,
          preset,
        });
        if (result) setJob(result);
        return;
      }
      if (mode === "files") {
        const result = await exportSelectionFiles(ids);
        if (!result.ok) throw new Error(result.message);
        closeConversionDialog();
        return;
      }
      if (mode === "csv") {
        const result = await exportSelectionCsv(ids);
        if (!result.ok) throw new Error(result.message);
        closeConversionDialog();
        return;
      }
      if (mode === "eagle-package") {
        const result = await window.pond.query("saves.exportEaglePackage", {
          ids: [...ids],
        });
        if (!result.ok && result.error !== "canceled")
          throw new Error(result.error || "Could not export Eagle package.");
        closeConversionDialog();
        return;
      }
      const result = await window.pond.query("saves.exportPackage", {
        ids: [...ids],
      });
      if (!result.ok && result.error !== "canceled")
        throw new Error(result.error || "Could not export Pond package.");
      closeConversionDialog();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not export files.",
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
            <Dialog.Title>Export</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>{`Choose how to export ${ids.length} ${ids.length === 1 ? "save" : "saves"}, then select a destination.`}</Dialog.Description>
          <fieldset disabled={busy || running} className={styles.fields}>
            <SelectField
              label="Export Type"
              value={mode}
              items={EXPORT_MODE_ITEMS}
              onChange={(nextMode) => {
                setMode(nextMode);
                setJob(null);
                setError(null);
              }}
            />
            <p>{exportModeDescription(mode)}</p>
            {converting ? (
              <>
                <SelectField
                  label="Preset"
                  value={
                    presets.some((item) => item.id === preset.id)
                      ? preset.id
                      : ""
                  }
                  items={[
                    { value: "", label: "Custom" },
                    ...presets.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                  onChange={(id) => {
                    const selected = presets.find((item) => item.id === id);
                    setPreset(
                      selected ?? { ...preset, id: crypto.randomUUID() },
                    );
                  }}
                />
                <label htmlFor={`${fieldId}-name`}>
                  Preset Name
                  <Input.Root>
                    <Input.Field
                      id={`${fieldId}-name`}
                      value={preset.name}
                      onValueChange={(name) => setPreset({ ...preset, name })}
                    />
                  </Input.Root>
                </label>
                <SelectField
                  label="Format"
                  value={preset.format}
                  items={capabilities.map((capability) => ({
                    value: capability.format,
                    label: `${formatLabel(capability.format)}${
                      capability.available ? "" : " (Unavailable)"
                    }`,
                    disabled: !capability.available,
                  }))}
                  onChange={(format) => {
                    const capability = capabilities.find(
                      (value) => value.format === format,
                    );
                    if (capability)
                      setPreset({
                        ...preset,
                        format: capability.format,
                        lossless: capability.supportsLossless
                          ? preset.lossless
                          : false,
                      });
                  }}
                />
                <div className={styles.row}>
                  <label htmlFor={`${fieldId}-width`}>
                    Maximum Width
                    <Input.Root>
                      <Input.Field
                        id={`${fieldId}-width`}
                        type="number"
                        min={1}
                        max={8192}
                        placeholder={
                          preset.format === "gif" ? "640" : "Original"
                        }
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
                    </Input.Root>
                  </label>
                  <label htmlFor={`${fieldId}-height`}>
                    Maximum Height
                    <Input.Root>
                      <Input.Field
                        id={`${fieldId}-height`}
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
                    </Input.Root>
                  </label>
                </div>
                {timed ? (
                  <div className={styles.row}>
                    <label htmlFor={`${fieldId}-start`}>
                      Start (Seconds)
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-start`}
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
                      </Input.Root>
                    </label>
                    <label htmlFor={`${fieldId}-duration`}>
                      Duration (Seconds)
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-duration`}
                          type="number"
                          min={0.1}
                          max={3600}
                          step={0.1}
                          value={preset.duration}
                          onChange={(event) =>
                            setPreset({
                              ...preset,
                              duration: event.target.valueAsNumber,
                            })
                          }
                        />
                      </Input.Root>
                    </label>
                    <label htmlFor={`${fieldId}-fps`}>
                      Frames per Second
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-fps`}
                          type="number"
                          min={1}
                          max={120}
                          value={preset.fps}
                          onChange={(event) =>
                            setPreset({
                              ...preset,
                              fps: event.target.valueAsNumber,
                            })
                          }
                        />
                      </Input.Root>
                    </label>
                  </div>
                ) : null}
                <Slider.Root
                  className={styles.slider}
                  min={1}
                  max={100}
                  value={preset.quality}
                  disabled={busy || running}
                  onValueChange={(quality) =>
                    setPreset({
                      ...preset,
                      quality: Array.isArray(quality)
                        ? (quality[0] ?? preset.quality)
                        : quality,
                    })
                  }
                >
                  <Slider.Label>Quality</Slider.Label>
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Indicator />
                      <Slider.Thumb />
                    </Slider.Track>
                  </Slider.Control>
                  <Slider.Value />
                </Slider.Root>
                {selectedCapability?.supportsLossless ? (
                  <div className={styles.check}>
                    <Checkbox.Root
                      id={`${fieldId}-lossless`}
                      checked={preset.lossless}
                      disabled={busy || running}
                      onCheckedChange={(lossless) =>
                        setPreset({ ...preset, lossless })
                      }
                    >
                      <Checkbox.Indicator />
                    </Checkbox.Root>
                    <label htmlFor={`${fieldId}-lossless`}>Lossless</label>
                  </div>
                ) : null}
                <Button onClick={() => void save()}>Save Preset</Button>
              </>
            ) : null}
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
              <progress value={job.progress} max={1} />
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
                  busy ||
                  (converting &&
                    !ConversionPresetSchema.safeParse(preset).success)
                }
                loading={busy}
                onClick={() => void start()}
              >
                {busy ? "Working" : "Choose Location and Export"}
              </Button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatLabel(format: ConversionFormat): string {
  switch (format) {
    case "animated-webp":
      return "Animated WebP";
    case "apng":
      return "Animated PNG";
    case "jpeg":
      return "JPG";
    default:
      return format.toUpperCase();
  }
}

function exportModeDescription(mode: ExportMode): string {
  switch (mode) {
    case "files":
      return "Export the original files without changing their format.";
    case "converted":
      return "Create converted copies with your chosen format, dimensions, and quality.";
    case "eagle-package":
      return "Create an Eagle-compatible package for importing into another library.";
    case "pond-package":
      return "Create a Pond package that preserves save information and files.";
    case "csv":
      return "Export save metadata as a CSV spreadsheet.";
  }
}

function SelectField<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: {
    value: Value;
    label: string;
    disabled?: boolean;
  }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <div className={styles.field}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger width="full">
          <Select.Value />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
