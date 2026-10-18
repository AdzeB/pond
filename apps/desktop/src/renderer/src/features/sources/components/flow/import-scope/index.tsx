import type { ImportMediaKind, ListKind, Source } from "@pond/schema/db";
import {
  Button,
  Combobox,
  DatePicker,
  Select,
  Settings,
  Switch,
  Tooltip,
} from "@pond/ui";
import {
  type ImportCollectionKind,
  importScopeOptions,
} from "@shared/import-scope";
import type { OkResult } from "@shared/query-contracts-shared";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import {
  collectionNouns,
  listKindLabel,
  localDay,
  mediaKindLabel,
  SINCE_PRESETS,
  saveImportScope,
} from "@/features/sources/lib/import-scope";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  draftChanged,
  draftFiles,
  draftImportScope,
  type ImportScopeAccount,
  type ImportScopeFlow,
  useImportScopeFlow,
  useImportScopeFlowActions,
} from "@/features/sources/state/import-scope-flow";
import { formatNumber } from "@/shared/lib/format";
import styles from "./styles.module.css";

/** Loads the Account's saved choices into the draft and saves each change, like Settings. */
export function useImportScopeDraft(account: ImportScopeAccount): void {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  const key = JSON.stringify({
    id: account.id,
    source: account.source,
    sync: {
      importScope: account.sync.importScope,
      importPending: account.sync.importPending,
      syncLikes: account.sync.syncLikes,
    },
  } satisfies ImportScopeAccount);
  useEffect(() => () => flow.clear(), [flow]);
  useEffect(() => {
    flow.open(JSON.parse(key));
  }, [flow, key]);
  const unsaved =
    draft.accountId === account.id &&
    !draft.starts &&
    !draft.saving &&
    !draft.error &&
    draftChanged(draft) &&
    draftImportScope(draft) !== null;
  useEffect(() => {
    if (unsaved) void confirmImportScope(flow);
  }, [flow, unsaved]);
}

export function ImportScopeLists({ accountId }: { accountId: string }) {
  const draft = useImportScopeFlow();
  const { source } = draft;
  if (draft.accountId !== accountId || !source) return null;
  const options = importScopeOptions(source);
  const label = getSourceDef(source).label;
  const collections = options.collections ? (
    <CollectionRows
      accountId={accountId}
      source={source}
      kind={options.collections}
    />
  ) : null;
  if (options.listKinds.length > 0) {
    return (
      <Settings.List className={styles.choices}>
        {options.listKinds.map((kind) => (
          <ListKindRows key={kind} source={source} kind={kind}>
            {kind === "saved" ? collections : null}
          </ListKindRows>
        ))}
      </Settings.List>
    );
  }
  if (collections) {
    return (
      <Settings.List className={styles.choices}>{collections}</Settings.List>
    );
  }
  return (
    <p className={styles.note}>
      Pond imports everything you've saved on {label}. Choosing specific lists
      isn't available for {label} yet.
    </p>
  );
}

export function ImportScopeFilters({ accountId }: { accountId: string }) {
  const draft = useImportScopeFlow();
  const { source } = draft;
  if (draft.accountId !== accountId || !source) return null;
  const options = importScopeOptions(source);
  return (
    <Settings.List className={styles.choices}>
      {options.mediaKinds.length > 0 ? (
        <MediaKindsRow kinds={options.mediaKinds} />
      ) : null}
      {options.since ? <SinceRows /> : null}
    </Settings.List>
  );
}

/** Start Import for a new Account, and any reason the choice can't be saved. */
export function ImportScopeStatus() {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  if (!draft.source) return null;
  const ready = draftImportScope(draft) !== null;
  const problem =
    draft.error ??
    (ready ? null : "Turn on at least one list to import from this Account.");
  const alert = problem ? (
    <p className={styles.error} role="alert">
      {problem}
    </p>
  ) : null;
  if (!draft.starts) return alert;
  return (
    <div className={styles.status}>
      <Settings.List>
        <Settings.Item>
          <Settings.ItemDetails>
            <Settings.ItemTitle>Not imported yet</Settings.ItemTitle>
            <Settings.ItemDescription>
              Nothing syncs until you start.
            </Settings.ItemDescription>
          </Settings.ItemDetails>
          <Settings.ItemControl>
            <Button
              size="sm"
              variant="primary"
              disabled={!ready || draft.saving}
              onClick={() => void confirmImportScope(flow)}
            >
              Start Import
            </Button>
          </Settings.ItemControl>
        </Settings.Item>
      </Settings.List>
      {alert}
    </div>
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
  flow.markSaved(scope);
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
  return (
    <>
      <Settings.Item>
        <Settings.ItemDetails>
          <Settings.ItemTitle>{title}</Settings.ItemTitle>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Switch.Root
            aria-label={title}
            checked={draft.listKinds.includes(kind)}
            onCheckedChange={(next) => flow.setListKind(kind, next)}
          />
        </Settings.ItemControl>
      </Settings.Item>
      {children ? <div className={styles.nested}>{children}</div> : null}
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
  const options = importScopeOptions(source);
  const savedOff =
    options.listKinds.length > 0 && !draft.listKinds.includes("saved");
  const nonePicked = draft.collections.length === 0;
  const filingOff = savedOff || (nonePicked && !options.fileEveryCollection);
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
      <Settings.Item disabled={savedOff}>
        <Settings.ItemDetails>
          <Settings.ItemTitle>{nouns.title}</Settings.ItemTitle>
          {failed ? (
            <Settings.ItemDescription role="alert" title={failed}>
              {failed}
            </Settings.ItemDescription>
          ) : null}
        </Settings.ItemDetails>
        <Settings.ItemControl>
          {failed ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={savedOff}
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
              disabled={savedOff}
              onOpen={() => setRequested(true)}
              onValueChange={(next) =>
                flow.setCollections(
                  next.map((id) => ({ id, name: names.get(id) ?? id })),
                )
              }
            />
          )}
        </Settings.ItemControl>
      </Settings.Item>
      <Settings.Item disabled={filingOff}>
        <Settings.ItemDetails>
          <Settings.ItemTitle className={styles.titled}>
            Add to Folders
            <Tooltip.Info
              label={
                nonePicked && !options.fileEveryCollection
                  ? `Pick a ${nouns.one} to put its saves in a matching Folder.`
                  : `Files each save in a Folder that mirrors your ${label} ${nouns.one}s. Pond creates any Folder that's missing.`
              }
              aria-label="About Add to Folders"
            />
          </Settings.ItemTitle>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Switch.Root
            aria-label="Add to Folders"
            checked={!filingOff && draftFiles(draft)}
            disabled={filingOff}
            onCheckedChange={(next) => flow.setAddToFolders(next)}
          />
        </Settings.ItemControl>
      </Settings.Item>
    </>
  );
}

function MediaKindsRow({ kinds }: { kinds: readonly ImportMediaKind[] }) {
  const flow = useImportScopeFlowActions();
  const draft = useImportScopeFlow();
  return (
    <Settings.Item>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Post Types</Settings.ItemTitle>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <ChipsField
          label="Post Types"
          placeholder="All Types"
          items={[...kinds]}
          value={[...draft.mediaKinds]}
          labelOf={(kind) => mediaKindLabel(kind)}
          empty="No types match"
          onValueChange={(next) =>
            flow.setMediaKinds(kinds.filter((kind) => next.includes(kind)))
          }
        />
      </Settings.ItemControl>
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
  disabled?: boolean;
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
      <Combobox.InputGroup className={styles.chips}>
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
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <Select.Root
            value={draft.sincePreset}
            items={[...SINCE_PRESETS]}
            onValueChange={(next) => {
              if (next) flow.setSincePreset(next);
            }}
          >
            <Select.Trigger
              size="sm"
              aria-label="Posted Since"
              className={styles.control}
            >
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
      <Settings.Item disabled={!custom}>
        <Settings.ItemDetails>
          <Settings.ItemTitle>Date</Settings.ItemTitle>
        </Settings.ItemDetails>
        <Settings.ItemControl>
          <DatePicker
            aria-label="Date"
            className={styles.date}
            value={draft.since}
            max={localDay(new Date())}
            disabled={!custom}
            onValueChange={(since) => flow.setSince(since)}
          />
        </Settings.ItemControl>
      </Settings.Item>
    </>
  );
}
