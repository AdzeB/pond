import { IconDownload, IconGear3, IconSliders } from "@pond/icons";
import type { Source } from "@pond/schema/db";
import { Dialog, Field, Input, type MenuItemSpec, Sidebar } from "@pond/ui";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { SourceDetailsKind, SourceDetailsPage } from "@/features/library";
import { HeroAvatar } from "@/features/sources/components/flow/detail/hero-avatar";
import {
  ImportScopeActions,
  ImportScopeError,
  ImportScopeFilters,
  ImportScopeLists,
  useImportScopeDraft,
} from "@/features/sources/components/flow/import-scope";
import { buildFolderMenu } from "@/features/sources/components/page/lib/folder-menu";
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
  buildSourceActionMenu,
  watchMenuTarget,
} from "@/features/sources/lib/source-menu";
import { sourceDetail } from "@/features/sources/state/source-detail";
import {
  type SyncSourceStatus,
  useSyncByAccount,
} from "@/features/sources/state/sync-monitor";
import { DetailsHero } from "@/shared/components/details-hero";
import { Section } from "@/shared/components/inspector-section";
import { PropertyList } from "@/shared/components/property-list";
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
  const menuItems = buildFolderMenu(
    { name, imported: imported.length, watching: status.enabled },
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
      menuItems={menuItems}
      properties={[
        { label: "Source", value: "Local" },
        { label: "Type", value: "Folder" },
        { label: "Location", value: status.path },
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
  const syncStatus = byAccount[account.id];
  const model = cardModel(syncStatus);
  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const target = accountMenuTarget(account, model);
  const menuItems = buildSourceActionMenu(target, {
    accounts,
    onChanged: changed,
    importItem: false,
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
      content: <ImportScopeLists accountId={account.id} />,
    });
  }
  if (hasImportFilters(account.source)) {
    pages.push({
      id: "filters",
      label: "Filters",
      icon: <IconSliders />,
      description: "Applies to every list Pond imports from this Account.",
      content: <ImportScopeFilters accountId={account.id} />,
    });
  }
  return (
    <>
      {imports ? <ImportScopeDraft account={account} /> : null}
      <SourceInspectorView
        key={account.id}
        status="ready"
        description={fetchedLabel(model)}
        handle={account.handle ? `@${account.handle}` : null}
        source={account.source}
        avatarUrl={account.avatarUrl}
        model={model}
        syncStatus={syncStatus}
        nickname={account.label ?? ""}
        menuItems={menuItems}
        pages={pages}
        initialPage={
          page ?? (account.sync.importPending ? "import" : "general")
        }
        leading={imports ? <ImportScopeError /> : undefined}
        actions={imports ? <ImportScopeActions /> : undefined}
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
  const syncStatus = byAccount[watch.id];
  const model = cardModel(syncStatus);
  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const menuItems = buildSourceActionMenu(watchMenuTarget(watch, model), {
    onChanged: changed,
  });
  return (
    <SourceInspectorView
      key={watch.id}
      status="ready"
      description={fetchedLabel(model)}
      handle={
        watch.kind === "playlist" || watch.kind === "list"
          ? watch.handle
          : `@${watch.handle}`
      }
      source={watch.source}
      avatarUrl={watch.avatarUrl}
      model={model}
      syncStatus={syncStatus}
      nickname={watch.label ?? ""}
      menuItems={menuItems}
      properties={watchProperties(watch, accounts)}
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
    { label: "Saved Items", value: formatNumber(watch.sync.knownCount) },
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
  model?: CardModel;
  syncStatus?: SyncSourceStatus;
  nickname?: string;
  menuItems?: MenuItemSpec[];
  properties?: SourceInspectorProperty[];
  /** Pages after General. */
  pages?: SourceInspectorPage[];
  initialPage?: SourceDetailsPage;
  /** Footer status beside the actions. */
  leading?: ReactNode;
  /** Footer buttons in place of Done. */
  actions?: ReactNode;
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
  model,
  syncStatus,
  nickname = "",
  menuItems = [],
  properties = [],
  pages = [],
  initialPage = "general",
  leading,
  actions,
  onNicknameSave,
}: SourceInspectorDetailsProps) {
  const general: SourceInspectorPage = {
    id: "general",
    label: "General",
    icon: <IconGear3 />,
    content: (
      <GeneralPage
        handle={handle}
        model={model}
        syncStatus={syncStatus}
        nickname={nickname}
        properties={properties}
        onNicknameSave={onNicknameSave}
      />
    ),
  };
  const all = [general, ...pages];
  const [pageId, setPageId] = useState(initialPage);
  const page = all.find((item) => item.id === pageId) ?? general;
  return (
    <>
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <DetailsHero.Root className={styles.identity}>
            <DetailsHero.Media>
              <HeroAvatar
                source={source}
                avatarUrl={avatarUrl}
                size={64}
                badge={false}
              />
              <DetailsHero.Actions
                items={menuItems}
                aria-label="Source Actions"
              />
            </DetailsHero.Media>
            <DetailsHero.Copy>
              <DetailsHero.Title>
                {title || handle || nickname || getSourceDef(source).label}
              </DetailsHero.Title>
              {description ? (
                <DetailsHero.Description>{description}</DetailsHero.Description>
              ) : null}
            </DetailsHero.Copy>
          </DetailsHero.Root>
          <Sidebar.Root width="full" role="navigation" aria-label="Pages">
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
          </Sidebar.Root>
        </aside>
        <Dialog.Content className={styles.main}>
          <header className={styles.header}>
            <h3 className={styles.title}>{page.label}</h3>
            {page.description ? (
              <p className={styles.description}>{page.description}</p>
            ) : null}
          </header>
          {page.content}
        </Dialog.Content>
      </div>
      <Dialog.Footer leading={leading}>
        {actions ?? <Dialog.Cancel>Done</Dialog.Cancel>}
      </Dialog.Footer>
    </>
  );
}

function GeneralPage({
  handle,
  model,
  syncStatus,
  nickname,
  properties,
  onNicknameSave,
}: Pick<
  SourceInspectorDetailsProps,
  "handle" | "model" | "syncStatus" | "onNicknameSave"
> & { nickname: string; properties: SourceInspectorProperty[] }) {
  const activity = model ? activityDetail(model, syncStatus) : null;
  return (
    <div className={styles.general}>
      {onNicknameSave ? (
        <NicknameField
          nickname={nickname}
          placeholder={handle ?? "Add a nickname"}
          onSave={onNicknameSave}
        />
      ) : null}
      {properties.length > 0 ? (
        <Section
          title="Properties"
          className={styles.section}
          collapsible={false}
        >
          <PropertyList.Root>
            {properties.map((property) => (
              <PropertyList.Row key={property.label}>
                <PropertyList.Label>{property.label}</PropertyList.Label>
                <PropertyList.Value>{property.value}</PropertyList.Value>
              </PropertyList.Row>
            ))}
          </PropertyList.Root>
        </Section>
      ) : null}
      {model && activity ? (
        <Section
          title="Activity"
          className={styles.section}
          collapsible={false}
        >
          <div className={styles.activity}>
            <p
              className={styles.detail}
              data-tone={
                model.tone === "err" || model.tone === "paused"
                  ? model.tone
                  : undefined
              }
            >
              {activity}
            </p>
            <SourceProgress progress={syncStatus?.progress} />
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function activityDetail(
  model: CardModel,
  syncStatus: SyncSourceStatus | undefined,
): string | null {
  if (syncStatus?.message) return syncStatus.message;
  if (model.tone === "err" && syncStatus?.lastError) {
    return syncStatus.lastError;
  }
  return null;
}

function SourceProgress({
  progress,
}: {
  progress: SyncSourceStatus["progress"] | undefined;
}) {
  if (!progress || progress.total <= 0) return null;
  const value = Math.min(
    100,
    Math.max(0, (progress.current / progress.total) * 100),
  );
  return (
    <div className={styles["progress-group"]}>
      <div className={styles.metrics}>
        <span>
          {formatNumber(progress.current)} of {formatNumber(progress.total)}{" "}
          saves
        </span>
        <span>{Math.round(value)}%</span>
      </div>
      <progress
        className={styles.progress}
        aria-label="Fetch progress"
        max={100}
        value={value}
      />
    </div>
  );
}

function NicknameField({
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
    <Field.Root className={styles.field} invalid={status === "error"}>
      <Field.Label>Nickname</Field.Label>
      <Input.Root>
        <Field.Control
          render={<Input.Field />}
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
      {status === "error" ? (
        <p className={styles["field-status"]} role="alert">
          Couldn't save. Focus the field and press Enter to try again.
        </p>
      ) : null}
    </Field.Root>
  );
}
