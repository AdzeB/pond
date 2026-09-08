import { IconSignatureFill18 as Signature } from "@pond/icons/fill/18";
import { Dialog } from "@pond/ui";
import { viewAccountItems } from "@/features/search/lib/open-search";
import { watchName } from "@/features/sources/components/page/lib/helpers";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import {
  useWatches,
  type WatchRow,
} from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  sourceDetail,
  useDetailWatchId,
} from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { useSyncByAccount } from "@/features/sources/state/sync-monitor";
import { formatNumber } from "@/shared/lib/format";
import styles from "../detail.module.css";
import { DetailOptions } from "../detail-options";
import { DetailOverview } from "../detail-overview";
import { ProfileField } from "../profile-field";

type WatchPage = "overview" | "profile" | "options";

export function WatchDetailSection() {
  return <WatchSection page="overview" />;
}
export function WatchProfileSection() {
  return <WatchSection page="profile" />;
}
export function WatchOptionsSection() {
  return <WatchSection page="options" />;
}

function WatchSection({ page }: { page: WatchPage }) {
  const { watches, refetch } = useWatches();
  const watchId = useDetailWatchId();
  const watch = watches.find((w) => w.id === watchId) ?? watches[0];

  if (!watch) return null;
  return (
    <WatchDetail
      key={watch.id}
      watch={watch}
      page={page}
      onChanged={() => {
        void refetch();
        sourceDetail.changed();
      }}
    />
  );
}

function WatchDetail({
  page,
  watch,
  onChanged,
}: {
  page: WatchPage;
  watch: WatchRow;
  onChanged: () => void;
}) {
  const byAccount = useSyncByAccount();
  const status = byAccount[watch.id];
  const model = cardModel(status);
  const { source } = watch;

  const count = watch.sync?.knownCount ?? 0;

  const saveNickname = async (value: string) => {
    const raw = value.trim();
    const next = raw.length > 0 ? raw : null;
    if (next === watch.label) return;
    await window.pond.query("watches.setLabel", {
      watchId: watch.id,
      label: next,
    });
    onChanged();
  };

  const viewItems = () => viewAccountItems(watch.id);

  if (page === "profile")
    return (
      <div className={styles.rows}>
        <ProfileField
          label="Nickname"
          value={watch.label ?? ""}
          placeholder="None"
          icon={<Signature size={18} />}
          onSave={saveNickname}
        />
      </div>
    );
  if (page === "options")
    return (
      <DetailOptions
        removeLabel="Stop Watching"
        description={`Pond stops checking ${watchName(watch)} for new posts. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`}
        onRemove={async () => {
          await window.pond.query("watches.remove", { watchId: watch.id });
          onChanged();
          sourceFlow.close();
        }}
      />
    );

  return (
    <DetailOverview
      onViewItems={viewItems}
      source={source}
      avatarUrl={watch.avatarUrl}
      name={watch.label ?? getSourceDef(source).label}
      handle={
        watch.kind === "playlist" || watch.kind === "list"
          ? watch.handle
          : `@${watch.handle}`
      }
      pages={{
        profile: "watch-profile",
        options: "watch-options",
      }}
      error={model.tone === "err" ? status?.lastError : null}
    >
      <Dialog.Confirm
        onClick={() => {
          if (model.tone === "run") {
            void window.pond.syncCancel(watch.id);
          } else {
            void window.pond.syncRunNow(watch.id);
            sourceFlow.close();
          }
        }}
      >
        {model.tone === "run" ? "Cancel Fetch" : "Fetch Updates"}
      </Dialog.Confirm>
    </DetailOverview>
  );
}
