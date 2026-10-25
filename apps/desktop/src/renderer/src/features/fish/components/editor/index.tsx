import {
  Button,
  Chip,
  Dialog,
  Field,
  Input,
  Select,
  type SelectItemSpec,
  Tooltip,
} from "@pond/ui";
import { assistantCatalog } from "@shared/assistant";
import {
  FISH_COLORS,
  FISH_SPECIES,
  type Fish,
  type FishColor,
  type FishInterval,
  type FishModel,
  type FishRoutine,
  type FishSpecies,
} from "@shared/fish-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errorCopy } from "@/shared/lib/error-copy";
import { fish as fishStore } from "../../state/fish";
import { FishMark, fishColorCss, SPECIES_LABELS } from "../mark";
import styles from "./styles.module.css";

const COLOR_LABELS = {
  orange: "Orange",
  gold: "Gold",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
} satisfies Record<FishColor, string>;

type RoutineKind = FishRoutine["kind"];

const ROUTINE_ITEMS: { value: RoutineKind; label: string }[] = [
  { value: "off", label: "Only When You Ask" },
  { value: "newSaves", label: "When New Saves Arrive" },
  { value: "schedule", label: "On a Schedule" },
];

const INTERVAL_ITEMS: { value: FishInterval; label: string }[] = [
  { value: "hour", label: "Every Hour" },
  { value: "day", label: "Every Day" },
  { value: "week", label: "Every Week" },
];

const DEFAULT_MODEL = "default";

function modelKey(model: FishModel | null): string {
  return model ? `${model.provider}:${model.modelId}` : DEFAULT_MODEL;
}

function routineOf(
  kind: RoutineKind,
  every: FishInterval,
  task: string,
): FishRoutine {
  if (kind === "off") return { kind };
  if (kind === "newSaves") return { kind, task: task.trim() };
  return { kind, every, task: task.trim() };
}

function useModelChoices(current: FishModel | null) {
  const available = useQuery({
    queryKey: ["agent.listAvailableModels"],
    queryFn: () => window.pond.query("agent.listAvailableModels", {}),
    staleTime: 60_000,
  });
  const items: SelectItemSpec<string>[] = [
    { value: DEFAULT_MODEL, label: "Default Model" },
  ];
  const models = new Map<string, FishModel>();
  for (const provider of available.data?.providers ?? []) {
    if (!provider.ok || !provider.models.length) continue;
    items.push({
      type: "group",
      label: assistantCatalog(provider.provider)?.provider ?? provider.provider,
      items: provider.models.map((model) => {
        const value = modelKey({
          provider: provider.provider,
          modelId: model.id,
        });
        models.set(value, { provider: provider.provider, modelId: model.id });
        return { value, label: model.name || model.id };
      }),
    });
  }
  if (current && !models.has(modelKey(current))) {
    models.set(modelKey(current), current);
    items.push({ value: modelKey(current), label: current.modelId });
  }
  return { items, models };
}

export interface FishScopeOptions {
  folders: ReadonlyArray<{ id: string; name: string }>;
  tagNames: ReadonlyArray<string>;
}

export function FishEditor({
  fish,
  folders,
  tagNames,
  onClose,
}: FishScopeOptions & {
  fish: Fish;
  onClose: () => void;
}) {
  const [name, setName] = useState(fish.name);
  const [color, setColor] = useState<FishColor>(fish.color);
  const [species, setSpecies] = useState<FishSpecies>(fish.species);
  const [instructions, setInstructions] = useState(fish.instructions);
  const [folderIds, setFolderIds] = useState(fish.scope.folderIds);
  const [tags, setTags] = useState(fish.scope.tags);
  const [model, setModel] = useState(modelKey(fish.model));
  const [routineKind, setRoutineKind] = useState<RoutineKind>(
    fish.routine.kind,
  );
  const [every, setEvery] = useState<FishInterval>(
    fish.routine.kind === "schedule" ? fish.routine.every : "day",
  );
  const [task, setTask] = useState(
    fish.routine.kind === "off" ? "" : fish.routine.task,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modelChoices = useModelChoices(fish.model);
  const trimmedName = name.trim();
  const needsTask = routineKind !== "off" && !task.trim();

  const folderItems = folders.map((folder) => ({
    value: folder.id,
    label: folder.name,
  }));
  const tagItems = [...new Set([...tagNames, ...tags])].map((tag) => ({
    value: tag,
    label: tag,
  }));

  async function submit(): Promise<void> {
    if (!trimmedName || needsTask) return;
    setBusy(true);
    setError(null);
    try {
      await fishStore.update(fish.id, {
        name: trimmedName,
        color,
        species,
        instructions: instructions.trim(),
        scope: { folderIds, tags },
        model: modelChoices.models.get(model) ?? null,
        routine: routineOf(routineKind, every, task),
      });
      onClose();
    } catch (cause) {
      setError(errorCopy(cause, "Couldn't save this fish. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open, details) => {
        if (busy) details.cancel();
        else if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} aria-label="Edit Fish">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Dialog.Header data-empty />
            <Dialog.Content className={styles.content}>
              <div className={styles.hero}>
                <div className={styles.tile}>
                  <FishMark
                    color={color}
                    species={species}
                    mood="pleased"
                    size={56}
                    key={`${color}-${species}`}
                  />
                </div>
                <div className={styles.swatches}>
                  {FISH_COLORS.map((swatch) => (
                    <Tooltip key={swatch} label={COLOR_LABELS[swatch]}>
                      <Button
                        type="button"
                        icon
                        size="md"
                        variant="ghost"
                        aria-label={COLOR_LABELS[swatch]}
                        aria-pressed={color === swatch}
                        disabled={busy}
                        onClick={() => setColor(swatch)}
                      >
                        <Chip.Swatch
                          color={fishColorCss(swatch)}
                          selected={color === swatch}
                        />
                      </Button>
                    </Tooltip>
                  ))}
                </div>
                <div className={styles.swatches}>
                  {FISH_SPECIES.map((kind) => (
                    <Tooltip key={kind} label={SPECIES_LABELS[kind]}>
                      <Button
                        type="button"
                        icon
                        size="lg"
                        variant="ghost"
                        aria-label={SPECIES_LABELS[kind]}
                        aria-pressed={species === kind}
                        data-pressed={species === kind || undefined}
                        disabled={busy}
                        onClick={() => setSpecies(kind)}
                      >
                        <FishMark color={color} species={kind} size={22} />
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input.Root>
                  <Field.Control
                    render={<Input.Field />}
                    value={name}
                    onValueChange={setName}
                    maxLength={40}
                    disabled={busy}
                  />
                </Input.Root>
              </Field.Root>
              <Field.Root>
                <Field.Label>Instructions</Field.Label>
                <Input.Root>
                  <Field.Control
                    render={<Input.Textarea rows={4} />}
                    value={instructions}
                    onValueChange={setInstructions}
                    maxLength={8000}
                    placeholder="How it talks, what it cares about, and what it should never touch."
                    disabled={busy}
                  />
                </Input.Root>
              </Field.Root>
              <div className={styles.row}>
                <MultiSelect
                  label="Folders"
                  empty="Any Folder"
                  value={folderIds}
                  items={folderItems}
                  disabled={busy}
                  onChange={setFolderIds}
                />
                <MultiSelect
                  label="Tags"
                  empty="Any Tag"
                  value={tags}
                  items={tagItems}
                  disabled={busy}
                  onChange={setTags}
                />
              </div>
              <p className={styles.hint}>
                {folderIds.length || tags.length
                  ? "Searches and reads only Saves in these folders or with these tags."
                  : "Searches and reads your whole Library."}
              </p>
              <SingleSelect
                label="Model"
                value={model}
                items={modelChoices.items}
                disabled={busy}
                onChange={setModel}
              />
              <div className={styles.row}>
                <SingleSelect
                  label="Routine"
                  value={routineKind}
                  items={ROUTINE_ITEMS}
                  disabled={busy}
                  onChange={setRoutineKind}
                />
                {routineKind === "schedule" ? (
                  <SingleSelect
                    label="Repeat"
                    value={every}
                    items={INTERVAL_ITEMS}
                    disabled={busy}
                    onChange={setEvery}
                  />
                ) : null}
              </div>
              {routineKind === "off" ? null : (
                <Field.Root>
                  <Field.Label>Task</Field.Label>
                  <Input.Root>
                    <Field.Control
                      render={<Input.Textarea rows={3} />}
                      value={task}
                      onValueChange={setTask}
                      maxLength={4000}
                      placeholder={
                        routineKind === "newSaves"
                          ? "Tag new Saves and file them into the right folders."
                          : "Write a short digest of what I saved, grouped by theme."
                      }
                      disabled={busy}
                    />
                  </Input.Root>
                  <Field.Description>
                    Changes it proposes wait for your review.
                  </Field.Description>
                </Field.Root>
              )}
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Cancel disabled={busy} />
              <Dialog.Confirm
                type="submit"
                loading={busy}
                disabled={!trimmedName || needsTask}
              >
                Save
              </Dialog.Confirm>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function selectOptions<Value>(
  items: SelectItemSpec<Value>[],
): { value: Value; label: React.ReactNode }[] {
  return items.flatMap((item) => {
    if (item.type === "group") return selectOptions(item.items);
    if (item.type === "separator" || item.type === "custom") return [];
    return [{ value: item.value, label: item.label }];
  });
}

function SingleSelect<Value extends string>({
  label,
  value,
  items,
  disabled,
  onChange,
}: {
  label: string;
  value: Value;
  items: SelectItemSpec<Value>[];
  disabled: boolean;
  onChange: (value: Value) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={selectOptions(items)}
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

function MultiSelect({
  label,
  empty,
  value,
  items,
  disabled,
  onChange,
}: {
  label: string;
  empty: string;
  value: string[];
  items: { value: string; label: string }[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const labels = new Map(items.map((item) => [item.value, item.label]));
  return (
    <Select.Root
      multiple
      value={value}
      items={items}
      disabled={disabled || !items.length}
      onValueChange={(next) => onChange(next.slice(0, 200))}
    >
      <div className={styles.field}>
        <Select.Label>{label}</Select.Label>
        <Select.Trigger width="full">
          <Select.Value>
            {(selected: string[]) =>
              selected.length === 0
                ? empty
                : selected.length === 1
                  ? (labels.get(selected[0] ?? "") ?? selected[0])
                  : `${selected.length} ${label}`
            }
          </Select.Value>
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
