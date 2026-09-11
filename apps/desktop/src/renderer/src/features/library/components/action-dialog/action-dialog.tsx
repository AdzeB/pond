import { Button, Dialog, Input } from "@pond/ui";
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
import { refreshSaves } from "@/features/saves/lib/ensure-saves";
import styles from "./action-dialog.module.css";

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
      await refreshSaves(ids);
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
                <label>
                  Saved Action
                  <select
                    value={
                      saved.some((item) => item.id === definition.id)
                        ? definition.id
                        : ""
                    }
                    onChange={(event) => {
                      const found = saved.find(
                        (item) => item.id === event.target.value,
                      );
                      change(
                        found ?? {
                          id: crypto.randomUUID(),
                          name: "New Action",
                          steps: [newStep("add-tags")],
                        },
                      );
                    }}
                  >
                    <option value="">New Action</option>
                    {saved.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`${fieldId}-name`}>
                  Action Name
                  <Input.Field
                    id={`${fieldId}-name`}
                    value={definition.name}
                    onValueChange={(name) => change({ ...definition, name })}
                  />
                </label>
              </>
            ) : null}
            {definition.steps.map((step, index) => (
              <div className={styles.step} key={step.id}>
                <label>
                  {`Step ${index + 1}`}
                  <select
                    value={step.kind}
                    disabled={mode === "rename"}
                    onChange={(event) => {
                      const replacement = [
                        newStep("add-folders"),
                        newStep("remove-folders"),
                        newStep("add-tags"),
                        newStep("remove-tags"),
                        newStep("rating"),
                        newStep("rename"),
                        newStep("notes"),
                      ].find((item) => item.kind === event.target.value);
                      if (replacement) stepAt(index, replacement);
                    }}
                  >
                    {Object.entries(STEP_LABELS).map(([kind, label]) => (
                      <option key={kind} value={kind}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {step.kind === "add-folders" ||
                step.kind === "remove-folders" ? (
                  <label>
                    Folders
                    <select
                      multiple
                      value={step.folderIds}
                      onChange={(event) =>
                        stepAt(index, {
                          ...step,
                          folderIds: Array.from(
                            event.target.selectedOptions,
                            (option) => option.value,
                          ),
                        })
                      }
                    >
                      {folderRows.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {step.kind === "add-tags" || step.kind === "remove-tags" ? (
                  <label htmlFor={`${fieldId}-${step.id}-tags`}>
                    Tags
                    <Input.Field
                      id={`${fieldId}-${step.id}-tags`}
                      placeholder="Separate tags with commas"
                      value={step.tags.join(", ")}
                      onValueChange={(text) =>
                        stepAt(index, {
                          ...step,
                          tags: text.split(",").map((tag) => tag.trim()),
                        })
                      }
                    />
                  </label>
                ) : null}
                {step.kind === "rating" ? (
                  <label>
                    Rating
                    <select
                      value={step.rating}
                      onChange={(event) =>
                        stepAt(index, {
                          ...step,
                          rating: Number(event.target.value),
                        })
                      }
                    >
                      {[0, 1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value ? `${value} Stars` : "No Rating"}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {step.kind === "rename" ? (
                  <>
                    <label htmlFor={`${fieldId}-${step.id}-pattern`}>
                      Name Pattern
                      <Input.Field
                        id={`${fieldId}-${step.id}-pattern`}
                        value={step.pattern}
                        onValueChange={(pattern) =>
                          stepAt(index, { ...step, pattern })
                        }
                      />
                    </label>
                    <p>
                      Use {"{title}"} for the current name, {"{n}"} for a
                      number, and {"{id}"} for the save ID. Numbering follows
                      the selection order.
                    </p>
                    <div className={styles.numbers}>
                      <label>
                        Start
                        <input
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
                      </label>
                      <label>
                        Digits
                        <input
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
                      </label>
                    </div>
                  </>
                ) : null}
                {step.kind === "notes" ? (
                  <>
                    <label>
                      Mode
                      <select
                        value={step.mode}
                        onChange={(event) =>
                          stepAt(index, {
                            ...step,
                            mode:
                              event.target.value === "append"
                                ? "append"
                                : "replace",
                          })
                        }
                      >
                        <option value="append">Append</option>
                        <option value="replace">Replace</option>
                      </select>
                    </label>
                    <label>
                      Notes
                      <textarea
                        value={step.text}
                        onChange={(event) =>
                          stepAt(index, { ...step, text: event.target.value })
                        }
                      />
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
                  <Button onClick={() => void remove()}>Delete Action</Button>
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
