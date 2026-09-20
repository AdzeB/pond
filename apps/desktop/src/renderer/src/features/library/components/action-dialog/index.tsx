import { Button, Dialog, Input, Select } from "@pond/ui";
import type {
  ActionDefinition,
  ActionPreview,
  ActionSaveState,
  ActionStep,
} from "@shared/action-contracts";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useId, useState } from "react";
import {
  actionDialogStore,
  closeActionDialog,
} from "@/features/library/state/action-dialog";
import { folders, useFolders } from "@/features/library/state/folders";
import { reloadSaves } from "@/features/saves/lib/ensure-saves";
import { parseTagBatch } from "@/features/tags/components/menu/lib";
import styles from "./styles.module.css";

export function ActionDialogHost() {
  const state = useSelector(actionDialogStore, (value) => value);
  const [last, setLast] = useState(state);
  if (state && state !== last) setLast(state);
  return last ? (
    <ActionDialog
      key={last.id}
      ids={last.ids}
      mode={last.mode}
      open={state !== null}
    />
  ) : null;
}

function newStep(kind: ActionStep["kind"]): ActionStep {
  const id = crypto.randomUUID();
  switch (kind) {
    case "add-folders":
    case "remove-folders":
      return { id, kind, folderIds: [] };
    case "rename":
      return { id, kind, pattern: "{title} {n}", start: 1, padding: 1 };
    case "rating":
      return { id, kind, rating: 5 };
    case "notes":
      return { id, kind, mode: "append", text: "" };
    case "add-tags":
    case "remove-tags":
      return { id, kind, tags: [] };
  }
}
const STEP_LABELS = {
  "add-folders": "Add to Folders",
  "remove-folders": "Remove from Folders",
  rename: "Rename",
  rating: "Set Rating",
  notes: "Update Notes",
  "add-tags": "Add Tags",
  "remove-tags": "Remove Tags",
} satisfies Record<ActionStep["kind"], string>;
const STEP_KINDS: ActionStep["kind"][] = [
  "add-folders",
  "remove-folders",
  "rename",
  "rating",
  "notes",
  "add-tags",
  "remove-tags",
];

function ActionDialog({
  ids,
  mode,
  open,
}: {
  ids: readonly string[];
  mode: "actions" | "rename";
  open: boolean;
}) {
  const fieldId = useId();
  const folderRows = useFolders();
  function valueLabel(
    state: ActionSaveState,
    field: keyof ActionSaveState,
  ): string {
    if (field === "folderIds")
      return (
        state.folderIds
          .map(
            (id) =>
              folderRows.find((folder) => folder.id === id)?.name ??
              "Missing Folder",
          )
          .join(", ") || "None"
      );
    if (field === "tags") return state.tags.join(", ") || "None";
    if (field === "rating")
      return state.rating ? String(state.rating) : "No Rating";
    return state[field] ?? "Empty";
  }
  const [definition, setDefinition] = useState<ActionDefinition>(() => ({
    id: crypto.randomUUID(),
    name: mode === "rename" ? "Rename Saves" : "New Action",
    steps: [newStep(mode === "rename" ? "rename" : "add-tags")],
  }));
  const [saved, setSaved] = useState<ActionDefinition[]>([]);
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void folders.refresh();
    void window.pond
      .query("actions.list", {})
      .then(setSaved)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load actions.",
        ),
      );
  }, []);
  function change(next: ActionDefinition) {
    setDefinition({
      ...next,
      steps: next.steps.map((step) => ({
        ...step,
        id: step.id ?? crypto.randomUUID(),
      })),
    });
    setPreview(null);
    setError(null);
    setMessage("");
  }
  function stepAt(index: number, step: ActionStep) {
    change({
      ...definition,
      steps: definition.steps.map((current, position) =>
        position === index ? step : current,
      ),
    });
  }
  async function inspect() {
    setBusy(true);
    setError(null);
    try {
      setPreview(
        await window.pond.query("actions.preview", {
          ids: [...ids],
          definition,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not preview the action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("actions.run", {
        ids: [...ids],
        definition,
        expectedToken: preview.token,
      });
      await reloadSaves(ids);
      await folders.refresh();
      closeActionDialog();
    } catch (cause) {
      setPreview(null);
      setError(
        cause instanceof Error ? cause.message : "Could not run the action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("actions.save", { definition });
      setSaved(await window.pond.query("actions.list", {}));
      window.dispatchEvent(new Event("pond:actions-changed"));
      setMessage("Action saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await window.pond.query("actions.delete", { id: definition.id });
      setSaved(await window.pond.query("actions.list", {}));
      window.dispatchEvent(new Event("pond:actions-changed"));
      change({ ...definition, id: crypto.randomUUID() });
      setMessage("Action deleted.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete the action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function duplicate() {
    setBusy(true);
    setError(null);
    try {
      const copy = await window.pond.query("actions.duplicate", {
        id: definition.id,
      });
      setSaved(await window.pond.query("actions.list", {}));
      window.dispatchEvent(new Event("pond:actions-changed"));
      change(copy);
      setMessage("Action duplicated.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not duplicate the action.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open && !busy) closeActionDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>
              {mode === "rename" ? "Rename Saves" : "Actions"}
            </Dialog.Title>
            <Dialog.Close disabled={busy} />
          </Dialog.Header>
          <Dialog.Description>{`Review changes to ${ids.length} ${ids.length === 1 ? "save" : "saves"} before applying them.`}</Dialog.Description>
          <fieldset disabled={busy} className={styles.editor}>
            {mode === "actions" ? (
              <>
                <SelectField
                  label="Saved Action"
                  value={
                    saved.some((item) => item.id === definition.id)
                      ? definition.id
                      : ""
                  }
                  items={[
                    { value: "", label: "New Action" },
                    ...saved.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                  onChange={(id) => {
                    const found = saved.find((item) => item.id === id);
                    change(
                      found ?? {
                        id: crypto.randomUUID(),
                        name: "New Action",
                        steps: [newStep("add-tags")],
                      },
                    );
                  }}
                />
                <label htmlFor={`${fieldId}-name`}>
                  Action Name
                  <Input.Root>
                    <Input.Field
                      id={`${fieldId}-name`}
                      value={definition.name}
                      onValueChange={(name) => change({ ...definition, name })}
                    />
                  </Input.Root>
                </label>
                <label htmlFor={`${fieldId}-shortcut`}>
                  Shortcut
                  <Input.Root>
                    <Input.Field
                      id={`${fieldId}-shortcut`}
                      placeholder="Mod+Shift+1"
                      value={definition.shortcut ?? ""}
                      onValueChange={(shortcut) =>
                        change({
                          ...definition,
                          shortcut: shortcut.trim() || null,
                        })
                      }
                    />
                  </Input.Root>
                </label>
              </>
            ) : null}
            {definition.steps.map((step, index) => (
              <div className={styles.step} key={step.id}>
                <SelectField
                  label={`Step ${index + 1}`}
                  value={step.kind}
                  disabled={mode === "rename"}
                  items={STEP_KINDS.map((kind) => ({
                    value: kind,
                    label: STEP_LABELS[kind],
                  }))}
                  onChange={(kind) => {
                    const replacement = [
                      newStep("add-folders"),
                      newStep("remove-folders"),
                      newStep("add-tags"),
                      newStep("remove-tags"),
                      newStep("rating"),
                      newStep("rename"),
                      newStep("notes"),
                    ].find((item) => item.kind === kind);
                    if (replacement) stepAt(index, replacement);
                  }}
                />
                {step.kind === "add-folders" ||
                step.kind === "remove-folders" ? (
                  <MultiSelectField
                    label="Folders"
                    value={step.folderIds}
                    items={folderRows.map((folder) => ({
                      value: folder.id,
                      label: folder.name,
                    }))}
                    onChange={(folderIds) =>
                      stepAt(index, { ...step, folderIds })
                    }
                  />
                ) : null}
                {step.kind === "add-tags" || step.kind === "remove-tags" ? (
                  <label htmlFor={`${fieldId}-${step.id}-tags`}>
                    Tags
                    <Input.Root>
                      <Input.Field
                        id={`${fieldId}-${step.id}-tags`}
                        placeholder="Separate tags with commas"
                        value={step.tags.join(", ")}
                        onValueChange={(text) =>
                          stepAt(index, {
                            ...step,
                            tags: parseTagBatch(text),
                          })
                        }
                      />
                    </Input.Root>
                  </label>
                ) : null}
                {step.kind === "rating" ? (
                  <SelectField
                    label="Rating"
                    value={String(step.rating)}
                    items={[0, 1, 2, 3, 4, 5].map((value) => ({
                      value: String(value),
                      label: value ? `${value} Stars` : "No Rating",
                    }))}
                    onChange={(rating) =>
                      stepAt(index, { ...step, rating: Number(rating) })
                    }
                  />
                ) : null}
                {step.kind === "rename" ? (
                  <>
                    <label htmlFor={`${fieldId}-${step.id}-pattern`}>
                      Name Pattern
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-${step.id}-pattern`}
                          value={step.pattern}
                          onValueChange={(pattern) =>
                            stepAt(index, { ...step, pattern })
                          }
                        />
                      </Input.Root>
                    </label>
                    <p>
                      Use {"{title}"}, {"{n}"}, {"{date}"}, {"{tags}"},{" "}
                      {"{original}"}, or {"{id}"}. Add digits inside a number
                      token, such as {"{n:3}"}.
                    </p>
                    <label htmlFor={`${fieldId}-${step.id}-find`}>
                      Find Pattern
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-${step.id}-find`}
                          value={step.replacement?.find ?? ""}
                          onValueChange={(find) =>
                            stepAt(index, {
                              ...step,
                              replacement: find
                                ? {
                                    find,
                                    replace: step.replacement?.replace ?? "",
                                    flags: step.replacement?.flags ?? "g",
                                  }
                                : null,
                            })
                          }
                        />
                      </Input.Root>
                    </label>
                    <label htmlFor={`${fieldId}-${step.id}-replace`}>
                      Replace With
                      <Input.Root>
                        <Input.Field
                          id={`${fieldId}-${step.id}-replace`}
                          value={step.replacement?.replace ?? ""}
                          disabled={!step.replacement}
                          onValueChange={(replace) =>
                            stepAt(index, {
                              ...step,
                              replacement: step.replacement
                                ? { ...step.replacement, replace }
                                : null,
                            })
                          }
                        />
                      </Input.Root>
                    </label>
                    <div className={styles.numbers}>
                      <label htmlFor={`${fieldId}-${step.id}-start`}>
                        Start
                        <Input.Root>
                          <Input.Field
                            id={`${fieldId}-${step.id}-start`}
                            type="number"
                            min={0}
                            value={step.start}
                            onChange={(event) =>
                              stepAt(index, {
                                ...step,
                                start: event.target.valueAsNumber,
                              })
                            }
                          />
                        </Input.Root>
                      </label>
                      <label htmlFor={`${fieldId}-${step.id}-padding`}>
                        Digits
                        <Input.Root>
                          <Input.Field
                            id={`${fieldId}-${step.id}-padding`}
                            type="number"
                            min={1}
                            max={12}
                            value={step.padding}
                            onChange={(event) =>
                              stepAt(index, {
                                ...step,
                                padding: event.target.valueAsNumber,
                              })
                            }
                          />
                        </Input.Root>
                      </label>
                    </div>
                  </>
                ) : null}
                {step.kind === "notes" ? (
                  <>
                    <SelectField
                      label="Mode"
                      value={step.mode}
                      items={[
                        { value: "append", label: "Append" },
                        { value: "replace", label: "Replace" },
                      ]}
                      onChange={(nextMode) =>
                        stepAt(index, { ...step, mode: nextMode })
                      }
                    />
                    <label htmlFor={`${fieldId}-${step.id}-notes`}>
                      Notes
                      <Input.Root>
                        <Input.Textarea
                          id={`${fieldId}-${step.id}-notes`}
                          value={step.text}
                          onValueChange={(text) =>
                            stepAt(index, { ...step, text })
                          }
                        />
                      </Input.Root>
                    </label>
                  </>
                ) : null}
                {mode === "actions" && definition.steps.length > 1 ? (
                  <Button
                    onClick={() =>
                      change({
                        ...definition,
                        steps: definition.steps.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    Remove Step
                  </Button>
                ) : null}
              </div>
            ))}
            {mode === "actions" ? (
              <div className={styles.footer}>
                <Button
                  disabled={definition.steps.length >= 50}
                  onClick={() =>
                    change({
                      ...definition,
                      steps: [...definition.steps, newStep("add-tags")],
                    })
                  }
                >
                  Add Step
                </Button>
                <Button onClick={() => void save()}>Save Action</Button>
                {saved.some((item) => item.id === definition.id) ? (
                  <>
                    <Button onClick={() => void duplicate()}>
                      Duplicate Action
                    </Button>
                    <Button onClick={() => void remove()}>Delete Action</Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </fieldset>
          {preview ? (
            <section aria-label="Preview" className={styles.preview}>
              <p>
                {preview.changes.length} saves will change. {preview.unchanged}{" "}
                unchanged.
              </p>
              {preview.changes.slice(0, 100).map((change) => (
                <div key={change.id}>
                  <strong>{change.before.title ?? "Untitled"}</strong>
                  {(["title", "tags", "rating", "notes", "folderIds"] as const)
                    .filter(
                      (key) =>
                        JSON.stringify(change.before[key]) !==
                        JSON.stringify(change.after[key]),
                    )
                    .map((key) => (
                      <p key={key}>
                        {
                          {
                            title: "Name",
                            tags: "Tags",
                            rating: "Rating",
                            notes: "Notes",
                            folderIds: "Folders",
                          }[key]
                        }
                        : {valueLabel(change.before, key)} →{" "}
                        {valueLabel(change.after, key)}
                      </p>
                    ))}
                </div>
              ))}
              {preview.changes.length > 100 ? (
                <p>Showing the first 100 changes.</p>
              ) : null}
            </section>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          {message ? <p role="status">{message}</p> : null}
          <div className={styles.footer}>
            <Button disabled={busy} onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void inspect()}>
              Preview
            </Button>
            <Button
              variant="primary"
              disabled={busy || !preview?.changes.length}
              loading={busy}
              onClick={() => void run()}
            >
              {busy ? "Working" : "Apply Changes"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  items,
  disabled,
  onChange,
}: {
  label: string;
  value: Value;
  items: { value: Value; label: string }[];
  disabled?: boolean;
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      disabled={disabled}
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

function MultiSelectField({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string[];
  items: { value: string; label: string }[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Select.Root multiple value={value} items={items} onValueChange={onChange}>
      <div className={styles.field}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger width="full">
          <Select.Value placeholder="Choose Folders" />
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
