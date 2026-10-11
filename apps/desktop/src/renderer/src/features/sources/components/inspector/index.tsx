import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import {
  IconXmarkOutline18 as Cross,
  IconDownloadOutline18,
} from "@pond/icons/outline/18";
import type { Source } from "@pond/schema/db";
import { Button, Input, Menu, type MenuItemSpec, Pane } from "@pond/ui";
import { useEffect, useId, useRef, useState } from "react";
import { downloadsFilters } from "@/features/downloads";
import {
  libraryChrome,
  useInspectorSourceId,
  useInspectorSourceKind,
} from "@/features/library";
import { HeroAvatar } from "@/features/sources/components/flow/detail/hero-avatar";
import {
  type CardModel,
  cardModel,
} from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  type AccountRow,
  useAccounts,
} from "@/features/sources/hooks/use-accounts";
import {
  useWatches,
  type WatchRow,
  watchKindLabel,
} from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  accountMenuTarget,
  buildSourceActionMenu,
  startSourceSignIn,
  watchMenuTarget,
} from "@/features/sources/lib/source-menu";
import { sourceDetail } from "@/features/sources/state/source-detail";
import {
  type SyncSourceStatus,
  useSyncByAccount,
} from "@/features/sources/state/sync-monitor";
import { Section } from "@/shared/components/inspector-section";
import { PropertyList } from "@/shared/components/property-list";
import { SpecMenu } from "@/shared/components/spec-context-menu";
import { formatNumber, formatTimestampLine } from "@/shared/lib/format";
import { openHarvester } from "@/shared/lib/open-harvester";
import styles from "./styles.module.css";

export function SourceInspector() {
  const id = useInspectorSourceId();
  const kind = useInspectorSourceKind();
  if (!id || !kind) return null;
  return kind === "watch" ? (
    <WatchInspector id={id} />
  ) : (
    <AccountInspector id={id} />
  );
}

function AccountInspector({ id }: { id: string }) {
  const { accounts, loading, refetch } = useAccounts();
  const account = accounts.find((row) => row.id === id);
  const byAccount = useSyncByAccount();
  if (!account) {
    return (
      <SourceInspectorView
        status={loading ? "loading" : "missing"}
        onClose={libraryChrome.closeRightPane}
      />
    );
  }
  const syncStatus = byAccount[account.id];
  const model = cardModel(syncStatus);
  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const menuItems = buildSourceActionMenu(accountMenuTarget(account, model), {
    accounts,
    onChanged: changed,
  });
  return (
    <SourceInspectorView
      key={account.id}
      status="ready"
      handle={account.handle ? `@${account.handle}` : null}
      source={account.source}
      avatarUrl={account.avatarUrl}
      model={model}
      syncStatus={syncStatus}
      nickname={account.label ?? ""}
      menuItems={menuItems}
      properties={[
        { label: "Source", value: getSourceDef(account.source).label },
        { label: "Type", value: "Account" },
        {
          label: "Saved Items",
          value: formatNumber(account.sync.knownCount),
        },
        { label: "Added", value: addedLabel(account.addedAt) },
      ]}
      onFetch={() => void window.pond.syncRunNow(account.id)}
      onCancel={() => void window.pond.syncCancel(account.id)}
      onSignIn={() => startSourceSignIn(account.source, accounts)}
      onOpenDownloads={() => openDownloads(account.source)}
      onClose={libraryChrome.closeRightPane}
      onNicknameSave={async (value) => {
        await saveAccountNickname(account, value);
        changed();
      }}
    />
  );
}

function WatchInspector({ id }: { id: string }) {
  const { watches, loading, refetch } = useWatches();
  const { accounts } = useAccounts();
  const watch = watches.find((row) => row.id === id);
  const byAccount = useSyncByAccount();
  if (!watch) {
    return (
      <SourceInspectorView
        status={loading ? "loading" : "missing"}
        onClose={libraryChrome.closeRightPane}
      />
    );
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
      onFetch={() => void window.pond.syncRunNow(watch.id)}
      onCancel={() => void window.pond.syncCancel(watch.id)}
      onSignIn={() => startSourceSignIn(watch.source, accounts)}
      onOpenDownloads={() => openDownloads(watch.source)}
      onClose={libraryChrome.closeRightPane}
      onNicknameSave={async (value) => {
        await saveWatchNickname(watch, value);
        changed();
      }}
    />
  );
}

interface SourceInspectorAction {
  label: string;
  onClick: () => void;
}

interface SourceInspectorProperty {
  label: string;
  value: string;
}

function sourcePrimaryAction({
  model,
  syncStatus,
  onFetch,
  onCancel,
  onSignIn,
}: {
  model: CardModel;
  syncStatus: SyncSourceStatus | undefined;
  onFetch?: () => void;
  onCancel?: () => void;
  onSignIn?: () => void;
}): SourceInspectorAction | undefined {
  if (model.tone === "run") {
    return onCancel ? { label: "Cancel Fetch", onClick: onCancel } : undefined;
  }
  if (syncStatus?.state === "auth_required" || !model.connected) {
    return onSignIn ? { label: "Sign In Again", onClick: onSignIn } : undefined;
  }
  return onFetch
    ? {
        label: model.tone === "err" ? "Retry Fetch" : "Fetch New Saves",
        onClick: onFetch,
      }
    : undefined;
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

function openDownloads(source: Source): void {
  downloadsFilters.setQ("");
  downloadsFilters.setStatuses(new Set());
  downloadsFilters.setSources(new Set([source]));
  libraryChrome.dismissInspector();
  openHarvester({ section: "downloads" });
}

interface SourceInspectorDetailsProps {
  handle?: string | null;
  source: Source;
  avatarUrl?: string | null;
  model?: CardModel;
  syncStatus?: SyncSourceStatus;
  nickname?: string;
  menuItems?: MenuItemSpec[];
  properties?: SourceInspectorProperty[];
  onFetch?: () => void;
  onCancel?: () => void;
  onSignIn?: () => void;
  onOpenDownloads?: () => void;
  onNicknameSave?: (value: string) => Promise<void>;
}

export type SourceInspectorViewProps = { onClose: () => void } & (
  | { status: "loading" }
  | { status: "missing" }
  | ({ status: "ready" } & SourceInspectorDetailsProps)
);

export function SourceInspectorView(props: SourceInspectorViewProps) {
  const menuItems = props.status === "ready" ? (props.menuItems ?? []) : [];
  return (
    <div className={styles.root}>
      <Pane.Header title="Details">
        {menuItems.length > 0 ? (
          <SpecMenu align="end" buildItems={() => menuItems}>
            <Menu.Trigger
              variant="ghost"
              size="sm"
              icon
              aria-label="Source Actions"
            >
              <Ellipsis />
            </Menu.Trigger>
          </SpecMenu>
        ) : null}
        <Button
          type="button"
          icon
          size="sm"
          variant="ghost"
          aria-label="Close Details"
          onClick={props.onClose}
        >
          <Cross />
        </Button>
      </Pane.Header>
      <Pane.Body className={styles.scroll}>
        {props.status === "loading" ? (
          <p className={styles.empty} role="status">
            Loading source details
          </p>
        ) : props.status === "missing" ? (
          <p className={styles.empty} role="status">
            This source is unavailable.
          </p>
        ) : (
          <SourceInspectorDetails {...props} />
        )}
      </Pane.Body>
    </div>
  );
}

function SourceInspectorDetails({
  handle,
  source,
  avatarUrl,
  model,
  syncStatus,
  nickname = "",
  properties = [],
  onFetch,
  onCancel,
  onSignIn,
  onOpenDownloads,
  onNicknameSave,
}: SourceInspectorDetailsProps) {
  const primaryAction = model
    ? sourcePrimaryAction({
        model,
        syncStatus,
        onFetch,
        onCancel,
        onSignIn,
      })
    : undefined;
  return (
    <>
      <div className={styles.identity}>
        <HeroAvatar
          source={source}
          avatarUrl={avatarUrl}
          size={40}
          badgeSize={16}
        />
        <div className={styles.copy}>
          {onNicknameSave ? (
            <IdentityName
              nickname={nickname}
              placeholder={handle ?? "None"}
              onSave={onNicknameSave}
            />
          ) : (
            <h2 className={styles.name}>{nickname || handle || "None"}</h2>
          )}
          {nickname && handle ? (
            <span className={styles.handle}>{handle}</span>
          ) : null}
        </div>
      </div>
      {onOpenDownloads ? (
        <Button
          size="xs"
          variant="secondary"
          className={styles["downloads-link"]}
          onClick={onOpenDownloads}
        >
          <IconDownloadOutline18 />
          View Downloads
        </Button>
      ) : null}
      {properties.length > 0 ? (
        <Section title="Properties">
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
      {model ? (
        <Section title="Activity">
          <div className={styles.activity}>
            <p
              className={styles.detail}
              data-tone={
                model.tone === "err" || model.tone === "paused"
                  ? model.tone
                  : undefined
              }
            >
              {activityDetail(model, syncStatus)}
            </p>
            <SourceProgress progress={syncStatus?.progress} />
            {primaryAction ? (
              <Button
                size="xs"
                variant="secondary"
                className={styles.primary}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ) : null}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function activityDetail(
  model: CardModel,
  syncStatus: SyncSourceStatus | undefined,
): string {
  if (syncStatus?.message) return syncStatus.message;
  if (model.tone === "err" && syncStatus?.lastError) {
    return syncStatus.lastError;
  }
  if (model.lastText !== "—") {
    return `Last fetched ${model.lastText}.`;
  }
  return "No fetch has completed yet.";
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

function IdentityName({
  nickname,
  placeholder,
  onSave,
}: {
  nickname: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}) {
  const id = useId();
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
    <>
      <Input.Root className={styles.name} size="lg" variant="borderless">
        <Input.Field
          id={id}
          className={styles["name-field"]}
          defaultValue={nickname}
          aria-label="Nickname"
          placeholder={placeholder}
          disabled={status === "saving"}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? `${id}-status` : undefined}
          onChange={() => setStatus("idle")}
          onBlur={(event) => void save(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </Input.Root>
      {status === "error" ? (
        <p id={`${id}-status`} className={styles["field-status"]} role="alert">
          Couldn't save. Focus the field and press Enter to try again.
        </p>
      ) : null}
    </>
  );
}
