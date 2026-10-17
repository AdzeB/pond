import type { ImportMediaKind, ListKind, Source } from "@pond/schema/db";
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  Reveal,
  Select,
  Settings,
  Switch,
} from "@pond/ui";
import {
  type ImportCollectionKind,
  importScopeOptions,
} from "@shared/import-scope";
import type { OkResult } from "@shared/query-contracts-shared";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  collectionNouns,
  formatSince,
  hasImportChoices,
  listKindLabel,
  localDay,
  mediaKindLabel,
  SINCE_PRESETS,
  saveImportScope,
} from "@/features/sources/lib/import-scope";
import { getSourceDef } from "@/features/sources/lib/registry";
import { connectFlow } from "@/features/sources/state/connect-flow";
import {
  draftImportScope,
  type ImportScopeFlow,
  useImportScopeFlow,
  useImportScopeFlowActions,
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
  const collections = options.collections ? (
    <CollectionRows
      accountId={accountId}
      source={source}
      kind={options.collections}
    />
  ) : null;
  const filters = options.mediaKinds.length > 0 || options.since;
  return (
    <div className={styles.choices}>
      {options.listKinds.length > 0 ? (
        <Settings.List>
          {options.listKinds.map((kind) => (
            <ListKindRows key={kind} source={source} kind={kind}>
              {kind === "saved" ? collections : null}
            </ListKindRows>
          ))}
        </Settings.List>
      ) : collections ? (
        <Settings.List>{collections}</Settings.List>
      ) : null}
      {filters ? (
        <div className={styles.section}>
          <h3 className={styles.heading}>Filters</h3>
          <Settings.List>
            {options.mediaKinds.length > 0 ? (
              <MediaKindsRow kinds={options.mediaKinds} />
            ) : null}
            {options.since ? <SinceRows /> : null}
          </Settings.List>
        </div>
      ) : null}
      {!hasImportChoices(source) ? (
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
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  const ready = draftImportScope(draft) !== null;
  return (
    <Dialog.Confirm
      disabled={!ready || draft.saving}
      onClick={() => void confirmImportScope(flow)}
    >
      {draft.starts ? "Start Import" : "Save"}
    </Dialog.Confirm>
  );
}

async function confirmImportScope(flow: ImportScopeFlow): Promise<void> {
  const draft = flow.snapshot();
  const scope = draftImportScope(draft);
  if (!draft.accountId || !draft.source || !scope || draft.saving) return;
  flow.setSaving(true);
  let result: OkResult;
  try {
    result = await saveImportScope({
      accountId: draft.accountId,
      source: draft.source,
      scope,
      start: draft.starts,
    });
  } catch {
    flow.fail("Pond couldn't save your choice. Try again.");
    return;
  }
  if (!result.ok) {
    flow.fail(result.error);
    return;
  }
  connectFlow.clear();
  sourceFlow.close();
}

function ListKindRows({
  source,
  kind,
  children,
}: {
  source: Source;
  kind: ListKind;
  children: ReactNode;
}) {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  const title = listKindLabel(source, kind);
  const included = draft.listKinds.includes(kind);
  return (
    <>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>{title}</Settings.ItemTitle>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Switch.Root
            aria-label={title}
            checked={included}
            disabled={draft.saving}
            onCheckedChange={(next) => flow.setListKind(kind, next)}
          />
        </Settings.ItemControl>
      </Settings.Item>
      {children ? (
        <Reveal visible={included}>
          <div className={styles.nested}>{children}</div>
        </Reveal>
      ) : null}
    </>
  );
}

function CollectionRows({
  accountId,
  source,
  kind,
}: {
  accountId: string;
  source: Source;
  kind: ImportCollectionKind;
}) {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  const nouns = collectionNouns(kind);
  const label = getSourceDef(source).label;
  const [requested, setRequested] = useState(false);
  const query = useQuery({
    queryKey: ["import-options", accountId],
    queryFn: () => window.pond.query("accounts.importOptions", { accountId }),
    staleTime: 60_000,
    enabled: requested,
  });
  const failed = query.data && !query.data.ok ? query.data.error : null;
  const available = query.data?.ok ? (query.data.collections ?? []) : [];
  const names = new Map(
    [...draft.collections, ...available].map((c) => [c.id, c.name]),
  );
  const details = new Map(
    available.flatMap((c) =>
      c.itemCount == null ? [] : [[c.id, formatNumber(c.itemCount)] as const],
    ),
  );
  const ids = Array.from(
    new Set([
      ...available.map((c) => c.id),
      ...draft.collections.map((c) => c.id),
    ]),
  );
  return (
    <>
      <Settings.Item className={styles.stacked}>
        <Settings.ItemDetails>
          <Settings.ItemTitle>{nouns.title}</Settings.ItemTitle>
          {failed ? (
            <Settings.ItemDescription role="alert" title={failed}>
              {failed}
            </Settings.ItemDescription>
          ) : null}
        </Settings.ItemDetails>
        {failed ? (
          <Button
            size="sm"
            variant="secondary"
            className={styles.retry}
            onClick={() => void query.refetch()}
          >
            Try Again
          </Button>
        ) : (
          <ChipsField
            label={nouns.title}
            placeholder={nouns.all}
            items={ids}
            value={draft.collections.map((c) => c.id)}
            labelOf={(id) => names.get(id) ?? id}
            detailOf={(id) => details.get(id)}
            empty={
              !requested || query.isPending
                ? `Loading ${nouns.many}`
                : available.length === 0
                  ? `No ${nouns.many} found`
                  : `No ${nouns.many} match`
            }
            disabled={draft.saving}
            onOpen={() => setRequested(true)}
            onValueChange={(next) =>
              flow.setCollections(
                next.map((id) => ({ id, name: names.get(id) ?? id })),
              )
            }
          />
        )}
      </Settings.Item>
      <Reveal visible={draft.collections.length > 0}>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Add to Folders</Settings.ItemTitle>
            <Settings.ItemDescription>
              Saves to {label} / {nouns.one} name.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Switch.Root
              aria-label="Add to Folders"
              checked={draft.addToFolders}
              disabled={draft.saving}
              onCheckedChange={(next) => flow.setAddToFolders(next)}
            />
          </Settings.ItemControl>
        </Settings.Item>
      </Reveal>
    </>
  );
}

function MediaKindsRow({ kinds }: { kinds: readonly ImportMediaKind[] }) {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  return (
    <Settings.Item className={styles.stacked}>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Kinds of Posts</Settings.ItemTitle>
      </Settings.ItemDetails>
      <ChipsField
        label="Kinds of Posts"
        placeholder="All Kinds"
        items={[...kinds]}
        value={[...draft.mediaKinds]}
        labelOf={(kind) => mediaKindLabel(kind)}
        empty="No kinds match"
        disabled={draft.saving}
        onValueChange={(next) =>
          flow.setMediaKinds(kinds.filter((kind) => next.includes(kind)))
        }
      />
    </Settings.Item>
  );
}

function ChipsField<Value extends string>({
  label,
  placeholder,
  items,
  value,
  labelOf,
  detailOf,
  empty,
  disabled,
  onOpen,
  onValueChange,
}: {
  label: string;
  placeholder: string;
  items: Value[];
  value: Value[];
  labelOf: (value: Value) => string;
  detailOf?: (value: Value) => string | undefined;
  empty: string;
  disabled: boolean;
  onOpen?: () => void;
  onValueChange: (value: Value[]) => void;
}) {
  return (
    <Combobox.Root
      multiple
      items={items}
      value={value}
      disabled={disabled}
      itemToStringLabel={labelOf}
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
      onValueChange={onValueChange}
    >
      <Combobox.InputGroup>
        <Combobox.Value>
          {(selected: Value[]) => (
            <Combobox.Chips>
              {selected.map((item) => (
                <Combobox.Chip key={item} aria-label={labelOf(item)}>
                  {labelOf(item)}
                  <Combobox.ChipRemove aria-label={`Remove ${labelOf(item)}`} />
                </Combobox.Chip>
              ))}
              <Combobox.ChipsInput
                aria-label={label}
                placeholder={selected.length > 0 ? "" : placeholder}
              />
            </Combobox.Chips>
          )}
        </Combobox.Value>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.Empty>{empty}</Combobox.Empty>
            <Combobox.List>
              {(item: Value) => (
                <Combobox.Item key={item} value={item}>
                  <Combobox.ItemLabel>
                    {labelOf(item)}
                    {detailOf?.(item) ? (
                      <Combobox.ItemMeta className={styles.detail}>
                        {detailOf(item)}
                      </Combobox.ItemMeta>
                    ) : null}
                  </Combobox.ItemLabel>
                  <Combobox.ItemEnd>
                    <Combobox.ItemIndicator />
                  </Combobox.ItemEnd>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function SinceRows() {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  const custom = draft.sincePreset === "custom";
  return (
    <>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Posted Since</Settings.ItemTitle>
          {draft.since && !custom ? (
            <Settings.ItemDescription>
              From {formatSince(draft.since)}
            </Settings.ItemDescription>
          ) : null}
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Select.Root
            value={draft.sincePreset}
            items={[...SINCE_PRESETS]}
            disabled={draft.saving}
            onValueChange={(next) => {
              if (next) flow.setSincePreset(next);
            }}
          >
            <Select.Trigger size="sm" aria-label="Posted Since">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner align="end">
                <Select.Popup>
                  <Select.Items items={[...SINCE_PRESETS]} />
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </Settings.ItemControl>
      </Settings.Item>
      <Reveal visible={custom}>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Date</Settings.ItemTitle>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <DatePicker
              aria-label="Date"
              value={draft.since}
              max={localDay(new Date())}
              disabled={draft.saving}
              onValueChange={(since) => flow.setSince(since)}
            />
          </Settings.ItemControl>
        </Settings.Item>
      </Reveal>
    </>
  );
}
