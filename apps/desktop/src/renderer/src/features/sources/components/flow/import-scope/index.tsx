import type { ImportCollection } from "@pond/schema/db";
import {
  Button,
  Checkbox,
  Dialog,
  Reveal,
  Toggle,
  ToggleGroup,
} from "@pond/ui";
import {
  type ImportCollectionKind,
  importScopeOptions,
} from "@shared/import-scope";
import type { OkResult } from "@shared/query-contracts-shared";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import {
  collectionNouns,
  listKindLabel,
  saveImportScope,
} from "@/features/sources/lib/import-scope";
import { getSourceDef } from "@/features/sources/lib/registry";
import { connectFlow } from "@/features/sources/state/connect-flow";
import {
  draftImportScope,
  type ImportScopeMode,
  importScopeFlow,
  useImportScopeFlow,
} from "@/features/sources/state/import-scope-flow";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { formatNumber } from "@/shared/lib/format";
import styles from "./styles.module.css";

export function ImportScopeSection() {
  const draft = useImportScopeFlow();
  if (!draft.source) return null;
  const label = getSourceDef(draft.source).label;
  return (
    <div className={styles.body}>
      <div className={styles.copy}>
        <h2 className={styles.title}>Choose What to Import</h2>
        <p className={styles.description}>
          {draft.starts
            ? `Pond waits for your choice before it syncs ${label}.`
            : "Changes apply from the next sync."}
        </p>
      </div>
      <ImportScopeChoices />
    </div>
  );
}

export function ImportScopeChoices() {
  const draft = useImportScopeFlow();
  const { accountId, source } = draft;
  if (!accountId || !source) return null;
  const options = importScopeOptions(source);
  const label = getSourceDef(source).label;
  return (
    <div className={styles.choices}>
      {options.listKinds.length > 0 ? (
        <fieldset className={styles.group} aria-label="Lists">
          {options.listKinds.map((kind) => (
            <ChoiceRow
              key={kind}
              label={listKindLabel(source, kind)}
              checked={draft.listKinds.includes(kind)}
              disabled={draft.saving}
              onCheckedChange={(included) =>
                importScopeFlow.setListKind(kind, included)
              }
            />
          ))}
        </fieldset>
      ) : null}
      {options.collections ? (
        <CollectionChoices
          accountId={accountId}
          kind={options.collections}
          mode={draft.mode}
          selected={draft.collections}
          disabled={draft.saving}
        />
      ) : null}
      {options.listKinds.length === 0 && !options.collections ? (
        <p className={styles.note}>
          Pond imports everything you've saved on {label}. Choosing specific
          lists isn't available for {label} yet.
        </p>
      ) : null}
      {draft.error ? (
        <p className={styles.error} role="alert">
          {draft.error}
        </p>
      ) : null}
    </div>
  );
}

export function ImportScopeConfirm() {
  const draft = useImportScopeFlow();
  const ready = draftImportScope(draft) !== null;
  return (
    <Dialog.Confirm
      disabled={!ready || draft.saving}
      onClick={() => void confirmImportScope()}
    >
      {draft.starts ? "Start Import" : "Save"}
    </Dialog.Confirm>
  );
}

async function confirmImportScope(): Promise<void> {
  const draft = importScopeFlow.snapshot();
  const scope = draftImportScope(draft);
  if (!draft.accountId || !draft.source || !scope || draft.saving) return;
  importScopeFlow.setSaving(true);
  let result: OkResult;
  try {
    result = await saveImportScope({
      accountId: draft.accountId,
      source: draft.source,
      scope,
      start: draft.starts,
    });
  } catch {
    importScopeFlow.fail("Pond couldn't save your choice. Try again.");
    return;
  }
  if (!result.ok) {
    importScopeFlow.fail(result.error);
    return;
  }
  connectFlow.clear();
  sourceFlow.close();
}

function CollectionChoices({
  accountId,
  kind,
  mode,
  selected,
  disabled,
}: {
  accountId: string;
  kind: ImportCollectionKind;
  mode: ImportScopeMode;
  selected: readonly ImportCollection[];
  disabled: boolean;
}) {
  const nouns = collectionNouns(kind);
  return (
    <div className={styles.group}>
      <ToggleGroup
        aria-label="What to import"
        value={[mode]}
        onValueChange={(value) => {
          const next = value[0];
          if (next === "all" || next === "collections") {
            importScopeFlow.setMode(next);
          }
        }}
      >
        <Toggle type="button" size="sm" value="all" disabled={disabled}>
          {nouns.all}
        </Toggle>
        <Toggle type="button" size="sm" value="collections" disabled={disabled}>
          {nouns.some}
        </Toggle>
      </ToggleGroup>
      <Reveal visible={mode === "collections"}>
        <CollectionList
          accountId={accountId}
          kind={kind}
          selected={selected}
          disabled={disabled}
        />
      </Reveal>
    </div>
  );
}

function CollectionList({
  accountId,
  kind,
  selected,
  disabled,
}: {
  accountId: string;
  kind: ImportCollectionKind;
  selected: readonly ImportCollection[];
  disabled: boolean;
}) {
  const nouns = collectionNouns(kind);
  const query = useQuery({
    queryKey: ["import-options", accountId],
    queryFn: () => window.pond.query("accounts.importOptions", { accountId }),
    staleTime: 60_000,
  });
  if (query.isPending) {
    return (
      <p className={styles.status} role="status">
        Loading {nouns.many}
      </p>
    );
  }
  const result = query.data;
  if (!result?.ok) {
    return (
      <div className={styles.status} role="alert">
        <span>
          {result?.error ?? `Pond couldn't load your ${nouns.many}. Try again.`}
        </span>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => void query.refetch()}
        >
          Try Again
        </Button>
      </div>
    );
  }
  const collections = result.collections ?? [];
  if (collections.length === 0) {
    return (
      <p className={styles.status} role="status">
        No {nouns.many} found
      </p>
    );
  }
  const chosen = new Set(selected.map((collection) => collection.id));
  return (
    <fieldset className={styles.list} aria-label={nouns.title}>
      {collections.map((collection) => (
        <ChoiceRow
          key={collection.id}
          label={collection.name}
          detail={
            collection.itemCount == null
              ? undefined
              : `${formatNumber(collection.itemCount)} ${
                  collection.itemCount === 1 ? nouns.item.one : nouns.item.many
                }`
          }
          checked={chosen.has(collection.id)}
          disabled={disabled}
          onCheckedChange={(included) =>
            importScopeFlow.setCollection(
              { id: collection.id, name: collection.name },
              included,
            )
          }
        />
      ))}
    </fieldset>
  );
}

function ChoiceRow({
  label,
  detail,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  detail?: string | undefined;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className={styles.row}>
      <Checkbox.Root
        id={id}
        size="sm"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      >
        <Checkbox.Indicator />
      </Checkbox.Root>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
    </div>
  );
}
