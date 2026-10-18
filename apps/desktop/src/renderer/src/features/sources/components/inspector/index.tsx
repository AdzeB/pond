import {
  IconArrowRotateClockwise,
  IconDownload,
  IconGear3,
  IconSliders,
} from "@pond/icons";
import type { Source } from "@pond/schema/db";
import { Button, Dialog, Input, Settings, Sidebar } from "@pond/ui";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { SourceDetailsKind, SourceDetailsPage } from "@/features/library";
import { HeroAvatar } from "@/features/sources/components/flow/detail/hero-avatar";
import {
  ImportScopeFilters,
  ImportScopeLists,
  ImportScopeStatus,
  useImportScopeDraft,
} from "@/features/sources/components/flow/import-scope";
import { buildFolderRows } from "@/features/sources/components/page/lib/folder-menu";
import {
  type CardModel,
  cardModel,
} from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import {
  useWatchedFolder,
  watchedFolderName,
} from "@/features/sources/hooks/use-watched-folder";
import {
  useWatches,
  type WatchRow,
  watchKindLabel,
} from "@/features/sources/hooks/use-watches";
import {
  hasImportChoices,
  hasImportFilters,
} from "@/features/sources/lib/import-scope";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  accountMenuTarget,
  buildSourceActionRows,
  type SourceActionRow,
  type SourceActionSections,
  watchMenuTarget,
} from "@/features/sources/lib/source-menu";
import { sourceDetail } from "@/features/sources/state/source-detail";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import { formatNumber, formatTimestampLine } from "@/shared/lib/format";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import styles from "./styles.module.css";

export function SourceInspector({
  kind,
  id,
  page,
}: {
  kind: SourceDetailsKind;
  id: string;
  page?: SourceDetailsPage;
}) {
  if (kind === "folder") return <FolderInspector />;
  return kind === "watch" ? (
    <WatchInspector id={id} />
  ) : (
    <AccountInspector id={id} page={page} />
  );
}

function fetchedLabel(model: CardModel): string {
  if (model.lastText === "now") return "Fetching now";
  if (model.lastText === "—") return "Not fetched yet";
  return `Last fetched ${model.lastText}`;
}

function FolderInspector() {
  const folder = useWatchedFolder();
  const client = useQueryClient();
  const status = folder.data;
  if (!status?.path) {
    return (
      <SourceInspectorView status={folder.isPending ? "loading" : "missing"} />
    );
  }
  const name = watchedFolderName(status.path);
  const imported = status.history.filter((item) => item.ok);
  const lastMs = imported[0]?.at ?? null;
  const actions = buildFolderRows(
    {
      name,
      path: status.path,
      imported: imported.length,
      watching: status.enabled,
    },
    () => void client.invalidateQueries({ queryKey: ["watched-folder"] }),
  );
  return (
    <SourceInspectorView
      key={status.path}
      status="ready"
      title={name}
      description={
        lastMs == null
          ? "Nothing imported yet"
          : `Last imported ${relativeTimeFromMs(lastMs)}`
      }
      source="local"
      actions={actions}
      properties={[
        { label: "Source", value: "Local" },
        { label: "Type", value: "Folder" },
        { label: "Imported Items", value: formatNumber(imported.length) },
        { label: "Mode", value: status.mode === "move" ? "Move" : "Copy" },
        { label: "Status", value: status.enabled ? "Watching" : "Paused" },
      ]}
    />
  );
}

function AccountInspector({
  id,
  page,
}: {
  id: string;
  page?: SourceDetailsPage;
}) {
  const { accounts, loading, refetch } = useAccounts();
  const account = accounts.find((row) => row.id === id);
  const byAccount = useSyncByAccount();
  if (!account) {
    return <SourceInspectorView status={loading ? "loading" : "missing"} />;
  }
  const model = cardModel(byAccount[account.id]);
  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const actions = buildSourceActionRows(accountMenuTarget(account, model), {
    accounts,
    onChanged: changed,
  });
  const imports =
    account.sync.importPending || hasImportChoices(account.source);
  const label = getSourceDef(account.source).label;
  const pages: SourceInspectorPage[] = [];
  if (imports) {
    pages.push({
      id: "import",
      label: "Import",
      icon: <IconDownload />,
      description: `Nothing else from ${label} reaches your library.`,
      content: (
        <>
          <ImportScopeStatus />
          <ImportScopeLists accountId={account.id} />
        </>
      ),
    });
  }
  if (hasImportFilters(account.source)) {
    pages.push({
      id: "filters",
      label: "Filters",
      icon: <IconSliders />,
      description: "Applies to every list Pond imports from this Account.",
      content: (
        <>
          <ImportScopeStatus />
          <ImportScopeFilters accountId={account.id} />
        </>
      ),
    });
  }
  pages.push(fetchPage(actions.fetch, model));
  return (
    <>
      {imports ? <ImportScopeDraft account={account} /> : null}
      <SourceInspectorView
        key={account.id}
        status="ready"
        handle={account.handle ? `@${account.handle}` : null}
        source={account.source}
        avatarUrl={account.avatarUrl}
        nickname={account.label ?? ""}
        actions={actions}
        pages={pages}
        initialPage={
          page ?? (account.sync.importPending ? "import" : "general")
        }
        onNicknameSave={async (value) => {
          await saveAccountNickname(account, value);
          changed();
        }}
      />
    </>
  );
}

/** Lives beside the pages so switching between Import and Filters keeps the draft. */
function ImportScopeDraft({ account }: { account: AccountRow }) {
  useImportScopeDraft(account);
  return null;
}

function WatchInspector({ id }: { id: string }) {
  const { watches, loading, refetch } = useWatches();
  const { accounts } = useAccounts();
  const watch = watches.find((row) => row.id === id);
  const byAccount = useSyncByAccount();
  if (!watch) {
    return <SourceInspectorView status={loading ? "loading" : "missing"} />;
  }
  const model = cardModel(byAccount[watch.id]);
  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const actions = buildSourceActionRows(watchMenuTarget(watch, model), {
    onChanged: changed,
  });
  return (
    <SourceInspectorView
      key={watch.id}
      status="ready"
      handle={
        watch.kind === "playlist" || watch.kind === "list"
          ? watch.handle
          : `@${watch.handle}`
      }
      source={watch.source}
      avatarUrl={watch.avatarUrl}
      nickname={watch.label ?? ""}
      actions={actions}
      properties={watchProperties(watch, accounts)}
      pages={[fetchPage(actions.fetch, model)]}
      onNicknameSave={async (value) => {
        await saveWatchNickname(watch, value);
        changed();
      }}
    />
  );
}

interface SourceInspectorProperty {
  label: string;
  value: string;
}

function addedLabel(value: string): string {
  return formatTimestampLine(value) || "—";
}

function accountLabel(account: AccountRow): string {
  if (account.label) return account.label;
  if (account.handle) return `@${account.handle}`;
  return getSourceDef(account.source).label;
}

function watchProperties(
  watch: WatchRow,
  accounts: readonly AccountRow[],
): SourceInspectorProperty[] {
  const kind = watchKindLabel(watch.kind);
  const properties: SourceInspectorProperty[] = [
    { label: "Source", value: getSourceDef(watch.source).label },
    { label: "Type", value: kind.charAt(0).toUpperCase() + kind.slice(1) },
    { label: "Added", value: addedLabel(watch.addedAt) },
  ];
  const via = accounts.find((account) => account.id === watch.via);
  if (via) {
    properties.push({ label: "Connected Via", value: accountLabel(via) });
  }
  return properties;
}

async function saveAccountNickname(
  account: AccountRow,
  value: string,
): Promise<void> {
  const next = value.trim() || null;
  if (next === account.label) return;
  await window.pond.query("accounts.setLabel", {
    accountId: account.id,
    label: next,
  });
}

async function saveWatchNickname(
  watch: WatchRow,
  value: string,
): Promise<void> {
  const next = value.trim() || null;
  if (next === watch.label) return;
  await window.pond.query("watches.setLabel", {
    watchId: watch.id,
    label: next,
  });
}

interface SourceInspectorPage {
  id: SourceDetailsPage;
  label: string;
  icon: ReactNode;
  description?: string;
  content: ReactNode;
}

interface SourceInspectorDetailsProps {
  title?: string;
  description?: string;
  handle?: string | null;
  source: Source;
  avatarUrl?: string | null;
  nickname?: string;
  actions?: SourceActionSections;
  properties?: SourceInspectorProperty[];
  /** Pages after General. */
  pages?: SourceInspectorPage[];
  initialPage?: SourceDetailsPage;
  onNicknameSave?: (value: string) => Promise<void>;
}

export type SourceInspectorViewProps =
  | { status: "loading" }
  | { status: "missing" }
  | ({ status: "ready" } & SourceInspectorDetailsProps);

export function SourceInspectorView(props: SourceInspectorViewProps) {
  if (props.status === "ready") return <SourceInspectorDetails {...props} />;
  return (
    <>
      <Dialog.Content className={styles.unavailable}>
        <p className={styles.empty} role="status">
          {props.status === "loading"
            ? "Loading source details"
            : "This source is unavailable."}
        </p>
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.Cancel>Done</Dialog.Cancel>
      </Dialog.Footer>
    </>
  );
}

function SourceInspectorDetails({
  title,
  handle,
  description,
  source,
  avatarUrl,
  nickname = "",
  actions,
  properties = [],
  pages = [],
  initialPage = "general",
  onNicknameSave,
}: SourceInspectorDetailsProps) {
  const general: SourceInspectorPage = {
    id: "general",
    label: "General",
    icon: <IconGear3 />,
    description,
    content: (
      <GeneralPage
        handle={handle}
        nickname={nickname}
        properties={properties}
        actions={actions}
        onNicknameSave={onNicknameSave}
      />
    ),
  };
  const all = [general, ...pages];
  const [pageId, setPageId] = useState(initialPage);
  const page = all.find((item) => item.id === pageId) ?? general;
  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <header className={styles.identity}>
          <HeroAvatar
            source={source}
            avatarUrl={avatarUrl}
            size={24}
            badge={false}
          />
          <h2 className={styles.name}>
            {title || handle || nickname || getSourceDef(source).label}
          </h2>
        </header>
        <Sidebar.Root
          className={styles.nav}
          width="full"
          role="navigation"
          aria-label="Pages"
        >
          <Sidebar.Scroll>
            <Sidebar.Group>
              {all.map((item) => {
                const active = item.id === page.id;
                return (
                  <Sidebar.Item
                    key={item.id}
                    data-status={active ? "active" : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setPageId(item.id)}
                  >
                    <Sidebar.Icon>{item.icon}</Sidebar.Icon>
                    <Sidebar.ItemLabel>{item.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                );
              })}
            </Sidebar.Group>
          </Sidebar.Scroll>
        </Sidebar.Root>
      </aside>
      <Dialog.Content className={styles.panel}>
        <Settings.Page className={styles.page}>
          <Settings.Header>
            <Settings.HeaderText>
              <Settings.Title>{page.label}</Settings.Title>
              {page.description ? (
                <Settings.Description>{page.description}</Settings.Description>
              ) : null}
            </Settings.HeaderText>
          </Settings.Header>
          {page.content}
        </Settings.Page>
      </Dialog.Content>
    </div>
  );
}

function ActionRows({ rows }: { rows: SourceActionRow[] }) {
  return (
    <Settings.List>
      {rows.map((row) => (
        <Settings.Item key={row.id} disabled={row.disabled}>
          <Settings.ItemDetails>
            <Settings.ItemTitle>{row.title}</Settings.ItemTitle>
            {row.description ? (
              <Settings.ItemDescription>
                {row.description}
              </Settings.ItemDescription>
            ) : null}
          </Settings.ItemDetails>
          <Settings.ItemControl className={styles.control}>
            {row.value ? (
              <span className={styles.value}>{row.value}</span>
            ) : null}
            {row.actions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? "secondary"}
                disabled={row.disabled}
                aria-label={action.name}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </Settings.ItemControl>
        </Settings.Item>
      ))}
    </Settings.List>
  );
}

function fetchPage(
  rows: SourceActionRow[],
  model: CardModel,
): SourceInspectorPage {
  return {
    id: "fetch",
    label: "Fetching",
    icon: <IconArrowRotateClockwise />,
    description: fetchedLabel(model),
    content: <ActionRows rows={rows} />,
  };
}

function GeneralPage({
  handle,
  nickname,
  properties,
  actions,
  onNicknameSave,
}: Pick<
  SourceInspectorDetailsProps,
  "handle" | "actions" | "onNicknameSave"
> & {
  nickname: string;
  properties: SourceInspectorProperty[];
}) {
  return (
    <>
      {onNicknameSave ? (
        <Settings.List>
          <NicknameItem
            nickname={nickname}
            placeholder={handle ?? "Add a nickname"}
            onSave={onNicknameSave}
          />
        </Settings.List>
      ) : null}
      {actions && actions.profile.length > 0 ? (
        <Settings.Section>
          <Settings.SectionTitle>{actions.kind}</Settings.SectionTitle>
          <ActionRows rows={actions.profile} />
        </Settings.Section>
      ) : null}
      {properties.length > 0 ? (
        <Settings.Section>
          <Settings.SectionTitle>Properties</Settings.SectionTitle>
          <ActionRows
            rows={properties.map((property) => ({
              id: property.label,
              title: property.label,
              value: property.value,
              actions: [],
            }))}
          />
        </Settings.Section>
      ) : null}
      {actions && actions.connection.length > 0 ? (
        <Settings.Section>
          <Settings.SectionTitle>Connection</Settings.SectionTitle>
          <ActionRows rows={actions.connection} />
        </Settings.Section>
      ) : null}
    </>
  );
}

function NicknameItem({
  nickname,
  placeholder,
  onSave,
}: {
  nickname: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}) {
  const savedValue = useRef(nickname);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  useEffect(() => {
    savedValue.current = nickname;
  }, [nickname]);
  const save = async (next: string) => {
    if (next === savedValue.current) return;
    setStatus("saving");
    try {
      await onSave(next);
      savedValue.current = next;
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };
  return (
    <Settings.Item>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Nickname</Settings.ItemTitle>
        {status === "error" ? (
          <span className={styles["field-status"]} role="alert">
            Couldn't save. Focus the field and press Enter to try again.
          </span>
        ) : (
          <Settings.ItemDescription>
            Shown instead of the handle across Pond.
          </Settings.ItemDescription>
        )}
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Input.Root className={styles.nickname}>
          <Input.Field
            aria-label="Nickname"
            aria-invalid={status === "error" || undefined}
            defaultValue={nickname}
            placeholder={placeholder}
            maxLength={255}
            disabled={status === "saving"}
            onChange={() => setStatus("idle")}
            onBlur={(event) => void save(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </Input.Root>
      </Settings.ItemControl>
    </Settings.Item>
  );
}
