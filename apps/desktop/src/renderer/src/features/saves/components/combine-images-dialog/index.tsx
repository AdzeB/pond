import { Button, Checkbox, Dialog, Input, Select } from "@pond/ui";
import {
  type CombineImagesOptions,
  CombineImagesOptionsSchema,
} from "@shared/combine-images-contracts";
import { useId, useState } from "react";
import {
  closeCombineImagesDialog,
  useCombineImagesDialog,
} from "@/features/saves/state/combine-images-dialog";
import { useRetainedDialogPayload } from "@/shared/hooks/use-retained-dialog-payload";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { notify } from "@/shared/lib/toast";
import styles from "./styles.module.css";

const DIRECTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
] as const;
const ORDERS = [
  { value: "selection", label: "Selection Order" },
  { value: "reverse", label: "Reverse Order" },
] as const;
const ALIGNMENTS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;
const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const;
const OUTPUTS = [
  { value: "create", label: "Create Save" },
  { value: "export", label: "Export File" },
] as const;

export function CombineImagesDialogHost() {
  const state = useCombineImagesDialog();
  const presentation = useRetainedDialogPayload(state);
  return presentation.payload ? (
    <CombineImagesDialog
      key={presentation.payload.id}
      open={presentation.open}
      ids={presentation.payload.ids}
      folderId={presentation.payload.folderId}
    />
  ) : null;
}

function CombineImagesDialog({
  open,
  ids,
  folderId,
}: {
  open: boolean;
  ids: string[];
  folderId: string | null;
}) {
  const id = useId();
  const scrollFade = useScrollFade<HTMLDivElement>();
  const [options, setOptions] = useState<CombineImagesOptions>(() =>
    CombineImagesOptionsSchema.parse({}),
  );
  const [busy, setBusy] = useState(false);
  const update = <Key extends keyof CombineImagesOptions>(
    key: Key,
    value: CombineImagesOptions[Key],
  ) => setOptions((current) => ({ ...current, [key]: value }));
  const numeric = (
    key: "width" | "height" | "spacing" | "margin" | "radius" | "quality",
    value: string,
  ) => {
    if ((key === "width" || key === "height") && value === "") {
      update(key, null);
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) update(key, parsed);
  };

  async function combine() {
    setBusy(true);
    try {
      const result = await window.pond.query("saves.combineImages", {
        ids,
        folderId,
        options,
      });
      if (!result.ok) {
        if (result.error !== "canceled")
          notify({
            id: "combine-images",
            title: result.error ?? "Couldn’t combine these images.",
          });
        return;
      }
      notify({
        id: "combine-images",
        title:
          options.output === "export"
            ? "Combined Image Exported"
            : "Combined Image Created",
        description:
          result.skipped && result.skipped > 0
            ? `${result.skipped} files were skipped.`
            : undefined,
      });
      closeCombineImagesDialog();
    } catch (error) {
      notify({
        id: "combine-images",
        title: "Couldn’t Combine Images",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open) closeCombineImagesDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Combine Images</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>
            Arrange and export {ids.length} selected images.
          </Dialog.Description>
          <div className={styles.scroll} {...scrollFade}>
            <div className={styles.fields}>
              <OptionSelect
                label="Direction"
                items={DIRECTIONS}
                value={options.direction}
                onChange={(value) => update("direction", value)}
              />
              <OptionSelect
                label="Order"
                items={ORDERS}
                value={options.order}
                onChange={(value) => update("order", value)}
              />
              <OptionSelect
                label="Alignment"
                items={ALIGNMENTS}
                value={options.alignment}
                onChange={(value) => update("alignment", value)}
              />
              <div className={styles.row}>
                <NumberField
                  id={`${id}-width`}
                  label="Width"
                  value={options.width}
                  onChange={(value) => numeric("width", value)}
                />
                <NumberField
                  id={`${id}-height`}
                  label="Height"
                  value={options.height}
                  onChange={(value) => numeric("height", value)}
                />
              </div>
              <div className={styles.row}>
                <NumberField
                  id={`${id}-spacing`}
                  label="Spacing"
                  value={options.spacing}
                  onChange={(value) => numeric("spacing", value)}
                />
                <NumberField
                  id={`${id}-margin`}
                  label="Margin"
                  value={options.margin}
                  onChange={(value) => numeric("margin", value)}
                />
                <NumberField
                  id={`${id}-radius`}
                  label="Corner Radius"
                  value={options.radius}
                  onChange={(value) => numeric("radius", value)}
                />
              </div>
              <div className={styles.row}>
                <label htmlFor={`${id}-background`}>
                  Background
                  <Input.Field
                    id={`${id}-background`}
                    type="color"
                    value={options.background}
                    onValueChange={(value) => update("background", value)}
                  />
                </label>
                <label htmlFor={`${id}-opacity`}>
                  Opacity
                  <Input.Field
                    id={`${id}-opacity`}
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={String(options.opacity)}
                    onValueChange={(value) => update("opacity", Number(value))}
                  />
                </label>
              </div>
              <OptionSelect
                label="Format"
                items={FORMATS}
                value={options.format}
                onChange={(value) => update("format", value)}
              />
              {options.format !== "png" ? (
                <div className={styles.row}>
                  <NumberField
                    id={`${id}-quality`}
                    label="Quality"
                    value={options.quality}
                    min={1}
                    max={100}
                    onChange={(value) => numeric("quality", value)}
                  />
                  {options.format === "webp" ? (
                    <CheckField
                      label="Lossless"
                      checked={options.lossless}
                      onChange={(value) => update("lossless", value)}
                    />
                  ) : null}
                </div>
              ) : null}
              <OptionSelect
                label="Output"
                items={OUTPUTS}
                value={options.output}
                onChange={(value) => update("output", value)}
              />
              <CheckField
                label="Move Originals to Trash"
                checked={options.deleteOriginals}
                onChange={(value) => update("deleteOriginals", value)}
              />
            </div>
          </div>
          <Dialog.Footer>
            <Button variant="secondary" onClick={closeCombineImagesDialog}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void combine()}>
              {options.output === "export" ? "Export" : "Combine"}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionSelect<const Value extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      items={[...items]}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <div className={styles.select}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={[...items]} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function NumberField({
  id,
  label,
  value,
  min = 0,
  max = 32_768,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id}>
      {label}
      <Input.Field
        id={id}
        type="number"
        min={min}
        max={max}
        value={value === null ? "" : String(value)}
        onValueChange={onChange}
      />
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={styles.check}>
      <Checkbox.Root
        aria-label={label}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
      {label}
    </div>
  );
}
