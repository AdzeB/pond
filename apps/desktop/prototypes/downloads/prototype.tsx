import {
  IconMediaPauseFill18 as Pause,
  IconMediaPlayFill18 as Play,
} from "@pond/icons/fill/18";
import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
  IconOrbitSparkleOutline18 as Assistant,
  IconCheckOutline18 as Check,
  IconChevronDownOutline18 as ChevronDown,
  IconChevronRightOutline18 as ChevronRight,
  IconXmarkOutline18 as Close,
  IconDownloadOutline18 as Download,
  IconSlidersOutline18 as Filter,
  IconBarsFilterOutline18 as FilterToggle,
  IconFolderOutline18 as Folder,
  IconListFavsOutline18 as Library,
  IconRefreshOutline18 as Retry,
  IconMagnifierOutline18 as Search,
  IconGridLayoutColsOutline18 as Sidebar,
  IconTrash2Outline18 as Trash,
  IconTriangleWarningOutline18 as Warning,
} from "@pond/icons/outline/18";
import { Logo } from "@pond/ui/logo";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  isActive,
  makeSaves,
  type SampleSave,
  type Scenario,
  type Source,
  sourceNames,
  sources,
  statusText,
  type Variant,
  variants,
} from "./fixtures";

type Actions = {
  inspect: (save: SampleSave) => void;
  retry: (ids: number[]) => void;
  cancel: (id: number) => void;
  togglePause: (id: number) => void;
};

type ViewProps = {
  saves: SampleSave[];
  paused: boolean;
  actions: Actions;
};

function SourceIcon({ source }: { source: Source }) {
  return (
    <img
      className="source-icon"
      src={`/logos/${source}.png`}
      alt={sourceNames[source]}
    />
  );
}

function Thumb({ save, large = false }: { save: SampleSave; large?: boolean }) {
  return (
    <span className={`thumbnail ${large ? "large" : ""}`}>
      <img src={`/library/${save.id}.jpg`} alt="" />
      {large && (
        <span className="thumb-source">
          <SourceIcon source={save.source} />
        </span>
      )}
    </span>
  );
}

function StateIcon({ save, paused }: { save: SampleSave; paused: boolean }) {
  if (save.state === "complete") return <Check />;
  if (save.state === "failed") return <Warning />;
  if (paused || save.held) return <Pause />;
  return <span className={`state-dot ${save.state}`} aria-hidden="true" />;
}

function Progress({ save, paused }: { save: SampleSave; paused: boolean }) {
  return (
    <progress
      className={paused || save.held ? "paused" : ""}
      value={save.received}
      max={save.total}
      aria-label={`Download progress for ${save.title}`}
    />
  );
}

function SaveRow({
  save,
  paused,
  actions,
  compact = false,
}: { save: SampleSave; compact?: boolean } & Omit<ViewProps, "saves">) {
  return (
    <div
      className={`save-row ${compact ? "compact" : ""}`}
      data-state={save.state}
    >
      <button
        type="button"
        className="row-open"
        onClick={() => actions.inspect(save)}
        aria-label={`Inspect ${save.title}`}
      >
        <Thumb save={save} />
        <span className="row-copy">
          <strong>{save.title}</strong>
          <span className="row-subtitle">
            <SourceIcon source={save.source} />
            <span>{sourceNames[save.source]}</span>
            <span className="separator">·</span>
            <span>{save.kind}</span>
          </span>
        </span>
      </button>
      <div className={`row-state ${save.state}`}>
        <span className="status-label">
          <StateIcon save={save} paused={paused} />
          <span>{statusText(save, paused)}</span>
        </span>
        {save.state === "downloading" && (
          <div className="row-progress">
            <Progress save={save} paused={paused} />
            <span>
              {save.received} / {save.total} MB
            </span>
          </div>
        )}
      </div>
      <div className="row-action">
        {save.state === "failed" ? (
          <button
            className="button small"
            type="button"
            onClick={() => actions.retry([save.id])}
            aria-label={`Retry ${save.title}`}
          >
            <Retry />
            Retry
          </button>
        ) : isActive(save) ? (
          <button
            className="icon-button quiet"
            type="button"
            onClick={() => actions.cancel(save.id)}
            aria-label={`Cancel ${save.title}`}
            title="Cancel Download"
          >
            <Close />
          </button>
        ) : (
          <button
            className="icon-button quiet"
            type="button"
            onClick={() => actions.inspect(save)}
            aria-label={`View ${save.title}`}
          >
            <ChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}

function Group({
  title,
  count,
  children,
  warning = false,
  trailing,
}: {
  title: string;
  count: number;
  children: ReactNode;
  warning?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <section className={`download-group ${warning ? "attention-group" : ""}`}>
      <div className="group-heading">
        <h2>
          {warning && <Warning />}
          {title}
          <span className="count">{count}</span>
        </h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Empty({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Download />
      </span>
      <h2>{filtered ? "No downloads found" : "Nothing downloading"}</h2>
      <p>
        {filtered
          ? "Try another search or source."
          : "New saves appear here while Pond downloads them."}
      </p>
      <span>
        {filtered
          ? "Clear the search or select All Sources."
          : "Your library is up to date."}
      </span>
    </div>
  );
}

export function VariantA({ saves, paused, actions }: ViewProps) {
  const [showCompleted, setShowCompleted] = useState(true);
  const active = saves.filter(isActive);
  const failed = saves.filter((s) => s.state === "failed");
  const complete = saves.filter((s) => s.state === "complete");
  return (
    <div className="list-view">
      {active.length > 0 && (
        <Group
          title="In Progress"
          count={active.length}
          trailing={
            <span className="group-note">
              {paused
                ? "Downloads paused"
                : "Downloads continue in the background"}
            </span>
          }
        >
          {active.map((save) => (
            <SaveRow
              key={save.id}
              save={save}
              paused={paused}
              actions={actions}
            />
          ))}
        </Group>
      )}
      {failed.length > 0 && (
        <Group
          title="Needs Attention"
          count={failed.length}
          warning
          trailing={
            <button
              type="button"
              className="text-button"
              onClick={() => actions.retry(failed.map((s) => s.id))}
            >
              Retry All
            </button>
          }
        >
          {failed.map((save) => (
            <SaveRow
              key={save.id}
              save={save}
              paused={paused}
              actions={actions}
            />
          ))}
        </Group>
      )}
      {complete.length > 0 && (
        <section className="download-group completed-group">
          <button
            type="button"
            className="group-heading collapse-heading"
            onClick={() => setShowCompleted(!showCompleted)}
            aria-expanded={showCompleted}
          >
            <span>
              <ChevronDown className={showCompleted ? "" : "closed"} />
              <strong>Recently Completed</strong>
              <span className="count">{complete.length}</span>
            </span>
            <span className="group-note">Today</span>
          </button>
          {showCompleted &&
            complete.map((save) => (
              <SaveRow
                key={save.id}
                save={save}
                paused={paused}
                actions={actions}
              />
            ))}
        </section>
      )}
    </div>
  );
}

export function VariantB({ saves, paused, actions }: ViewProps) {
  const available = sources.filter((source) =>
    saves.some((s) => s.source === source),
  );
  const [selectedSource, setSelectedSource] = useState<Source>("arena");
  const [tab, setTab] = useState("all");
  const source = available.includes(selectedSource)
    ? selectedSource
    : available[0];
  const sourceSaves = saves.filter((s) => s.source === source);
  const failed = sourceSaves.filter((s) => s.state === "failed");
  const done = sourceSaves.filter((s) => s.state === "complete").length;
  const filtered = sourceSaves.filter(
    (save) =>
      tab === "all" ||
      (tab === "active" && isActive(save)) ||
      save.state === tab,
  );
  return (
    <div className="sources-view">
      <nav className="source-nav" aria-label="Download Sources">
        <div className="eyebrow">
          Sources<span>{available.length}</span>
        </div>
        {available.map((s) => {
          const rows = saves.filter((save) => save.source === s);
          const attention = rows.filter(
            (save) => save.state === "failed",
          ).length;
          return (
            <button
              type="button"
              key={s}
              aria-current={source === s ? "true" : undefined}
              onClick={() => {
                setSelectedSource(s);
                setTab("all");
              }}
            >
              <SourceIcon source={s} />
              <span>
                <strong>{sourceNames[s]}</strong>
                <small>
                  {rows.filter(isActive).length} in progress
                  {attention > 0 ? ` · ${attention} failed` : ""}
                </small>
              </span>
              <span className="source-count">{rows.length}</span>
            </button>
          );
        })}
        <div className="source-footnote">
          Downloads stay grouped as new saves arrive.
        </div>
      </nav>
      <div className="source-workspace">
        <div className="source-title">
          <span className="source-avatar">
            <SourceIcon source={source} />
          </span>
          <div>
            <h2>{sourceNames[source]}</h2>
            <p>{sourceSaves.length} saves in this download history</p>
          </div>
          {failed.length > 0 && (
            <button
              className="button"
              type="button"
              onClick={() => actions.retry(failed.map((s) => s.id))}
            >
              <Retry />
              Retry Failed
            </button>
          )}
        </div>
        <div className="source-summary">
          <div>
            <strong>
              {done} of {sourceSaves.length} saved
            </strong>
            <span>
              {paused
                ? "Downloads paused"
                : `${sourceSaves.filter(isActive).length} still in progress`}
            </span>
          </div>
          <div
            className="batch-track"
            role="progressbar"
            aria-label={`${done} of ${sourceSaves.length} saved`}
            aria-valuemin={0}
            aria-valuemax={sourceSaves.length}
            aria-valuenow={done}
          >
            {sourceSaves.map((s) => (
              <span
                key={s.id}
                data-state={s.state}
                title={`${s.title}: ${s.state}`}
              />
            ))}
          </div>
        </div>
        <div className="source-tabs">
          {[
            ["all", "All Saves"],
            ["active", "In Progress"],
            ["failed", "Needs Attention"],
            ["complete", "Completed"],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {filtered.length > 0 ? (
          <div className="source-rows">
            {filtered.map((save) => (
              <SaveRow
                key={save.id}
                save={save}
                paused={paused}
                actions={actions}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="source-empty">
            <Check />
            <h3>
              {tab === "failed"
                ? "Nothing needs attention"
                : "No downloads in this view"}
            </h3>
            <button
              type="button"
              className="text-button"
              onClick={() => setTab("all")}
            >
              Show All Saves
            </button>
          </div>
        )}
        <div className="source-footer">
          <Check />
          <span>
            {done} {done === 1 ? "save" : "saves"} available offline
          </span>
          <span>Sample history · Aug 31, 2026</span>
        </div>
      </div>
    </div>
  );
}

export function VariantC({ saves, paused, actions }: ViewProps) {
  const running = saves.filter(
    (s) => s.state === "downloading" || s.state === "processing",
  );
  const waiting = saves.filter((s) => s.state === "waiting");
  const failed = saves.filter((s) => s.state === "failed");
  const complete = saves.filter((s) => s.state === "complete");
  const [focusId, setFocusId] = useState<number | null>(null);
  const featured = running.find((save) => save.id === focusId) ?? running[0];
  return (
    <div className="focus-view">
      <div className="focus-primary">
        <div className="group-heading">
          <h2>
            {paused
              ? "Downloads Paused"
              : waiting.length && !running.length
                ? "Ready to Download"
                : running.some((save) => save.state === "processing")
                  ? "In Progress"
                  : "Downloading Now"}
            <span className="count">{running.length}</span>
          </h2>
          <span className="group-note">
            {featured
              ? `${running.indexOf(featured) + 1} of ${running.length}`
              : ""}
          </span>
        </div>
        {featured ? (
          <section className="featured-save">
            <button
              className="featured-image"
              type="button"
              aria-label={`Inspect ${featured.title}`}
              onClick={() => actions.inspect(featured)}
            >
              <Thumb save={featured} large />
            </button>
            <div className="featured-copy">
              <span className="eyebrow">
                {sourceNames[featured.source]}
                <span>·</span>
                {featured.kind}
              </span>
              <h2>{featured.title}</h2>
              <p>
                <StateIcon save={featured} paused={paused} />
                {statusText(featured, paused)}
              </p>
              {featured.state === "downloading" && (
                <>
                  <Progress save={featured} paused={paused} />
                  <div className="transfer-caption">
                    <span>
                      {featured.received} MB of {featured.total} MB
                    </span>
                    <span>
                      {Math.round((featured.received / featured.total) * 100)}%
                    </span>
                  </div>
                </>
              )}
              <button
                type="button"
                className="text-button"
                onClick={() => actions.inspect(featured)}
              >
                View Details
                <ChevronRight />
              </button>
            </div>
          </section>
        ) : (
          <div className="focus-settled">
            {waiting.length ? <Download /> : <Check />}
            <h2>
              {waiting.length
                ? "Ready to download"
                : failed.length
                  ? "Other downloads are finished"
                  : "Everything is saved"}
            </h2>
            <p>
              {waiting.length
                ? "Waiting saves start when downloads continue."
                : failed.length
                  ? "Review the saves that need attention."
                  : "Your saves are available in your library."}
            </p>
          </div>
        )}
        {running.length > 1 && (
          <div className="also-running">
            <span>Also in progress</span>
            {running
              .filter((s) => s.id !== featured?.id)
              .map((save) => (
                <button
                  type="button"
                  onClick={() => setFocusId(save.id)}
                  key={save.id}
                >
                  <SourceIcon source={save.source} />
                  <strong>{save.title}</strong>
                  <ChevronRight />
                </button>
              ))}
          </div>
        )}
        {waiting.length > 0 && (
          <Group title="Up Next" count={waiting.length}>
            {waiting.map((save, i) => (
              <div className="waiting-row" key={save.id}>
                <span className="queue-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button type="button" onClick={() => actions.inspect(save)}>
                  <Thumb save={save} />
                  <span>
                    <strong>{save.title}</strong>
                    <small>
                      {sourceNames[save.source]} · {save.kind}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button quiet"
                  onClick={() => actions.cancel(save.id)}
                  aria-label={`Cancel ${save.title}`}
                >
                  <Close />
                </button>
              </div>
            ))}
          </Group>
        )}
        {complete.length > 0 && (
          <Group title="Saved to Your Library" count={complete.length}>
            <div className="completed-strip">
              {complete.map((save) => (
                <button
                  type="button"
                  key={save.id}
                  onClick={() => actions.inspect(save)}
                  aria-label={`View ${save.title}`}
                >
                  <Thumb save={save} />
                  <span>
                    <strong>{save.title}</strong>
                    <small>
                      <Check />
                      Saved
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </Group>
        )}
      </div>
      <aside className="focus-attention">
        <div className="group-heading">
          <h2>
            Needs Attention<span className="count">{failed.length}</span>
          </h2>
        </div>
        {failed.length ? (
          <>
            <p className="attention-intro">
              {running.length || waiting.length
                ? "These saves need another try. Your other downloads continue."
                : "These saves couldn't finish. Retry them when you're ready."}
            </p>
            {failed.map((save) => (
              <div className="issue" key={save.id}>
                <div className="issue-title">
                  <SourceIcon source={save.source} />
                  <span>{sourceNames[save.source]}</span>
                </div>
                <button
                  type="button"
                  className="issue-link"
                  onClick={() => actions.inspect(save)}
                >
                  {save.title}
                </button>
                <p>{save.error}</p>
                <button
                  type="button"
                  className="button small"
                  onClick={() => actions.retry([save.id])}
                  aria-label={`Retry ${save.title}`}
                >
                  <Retry />
                  Retry Download
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              onClick={() => actions.retry(failed.map((s) => s.id))}
            >
              Retry All {failed.length} Saves
              <ArrowRight />
            </button>
          </>
        ) : (
          <div className="attention-clear">
            <Check />
            <strong>No problems to resolve</strong>
            <p>Any downloads that need a retry appear here.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function TransferRow({
  save,
  paused,
  actions,
}: { save: SampleSave } & Omit<ViewProps, "saves">) {
  const working = save.state === "downloading" || save.state === "processing";
  return (
    <div className="transfer-row" data-state={save.state}>
      <button
        className="transfer-open"
        type="button"
        onClick={() => actions.inspect(save)}
        aria-label={`Inspect ${save.title}`}
      >
        <Thumb save={save} />
        <span className="transfer-copy">
          <strong>{save.title}</strong>
          <span className="transfer-status">
            {save.state === "failed" || save.state === "complete" ? (
              <StateIcon save={save} paused={paused} />
            ) : (
              <SourceIcon source={save.source} />
            )}
            <span>
              {save.state === "complete"
                ? `${sourceNames[save.source]} · Saved to your library`
                : statusText(save, paused)}
            </span>
          </span>
          {working && (
            <span
              className={`transfer-track ${paused || save.held ? "paused" : ""}`}
              aria-hidden="true"
            >
              <span />
            </span>
          )}
        </span>
      </button>
      {save.state === "failed" ? (
        <button
          className="button small"
          type="button"
          onClick={() => actions.retry([save.id])}
          aria-label={`Retry ${save.title}`}
        >
          <Retry />
          Retry
        </button>
      ) : isActive(save) ? (
        <button
          className="icon-button quiet"
          type="button"
          onClick={() => actions.cancel(save.id)}
          aria-label={`Cancel ${save.title}`}
        >
          <Close />
        </button>
      ) : (
        <button
          className="icon-button quiet"
          type="button"
          onClick={() => actions.inspect(save)}
          aria-label={`View ${save.title}`}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}

function VariantD({ saves, paused, actions }: ViewProps) {
  const [view, setView] = useState<"current" | "history">("current");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const current = saves.filter((save) => save.state !== "complete");
  const history = saves.filter((save) => save.state === "complete");
  const failures = current.filter((save) => save.state === "failed");
  const shown = (view === "history" ? history : current).filter(
    (save) => !attentionOnly || view === "history" || save.state === "failed",
  );
  const groups = [
    ...new Set(shown.map((save) => save.batch ?? `single-${save.id}`)),
  ];
  const batchNames = {
    videos: "Saved videos",
    references: "Design references",
  };

  return (
    <div className="transfers-view">
      <div className="transfer-toolbar">
        <div className="transfer-tabs">
          <button
            type="button"
            aria-pressed={view === "current"}
            onClick={() => setView("current")}
          >
            Current <span>{current.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={view === "history"}
            onClick={() => setView("history")}
          >
            History <span>{history.length}</span>
          </button>
        </div>
        {view === "current" && failures.length > 0 && (
          <button
            type="button"
            className="text-button transfer-retry-all"
            onClick={() => actions.retry(failures.map((save) => save.id))}
          >
            <Retry />
            Retry Failed
          </button>
        )}
      </div>
      {view === "current" && (failures.length > 0 || attentionOnly) && (
        <div className="transfer-attention">
          <Warning />
          <span>
            {failures.length
              ? `${failures.length} ${failures.length === 1 ? "save needs" : "saves need"} another try`
              : "Nothing needs attention"}
          </span>
          <button
            type="button"
            className="text-button"
            aria-pressed={attentionOnly}
            onClick={() => {
              if (!attentionOnly) setCollapsed([]);
              setAttentionOnly(!attentionOnly);
            }}
          >
            {attentionOnly ? "Show All" : "Review"}
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="transfer-empty">
          <span>
            <Check />
          </span>
          <h3>
            {view === "history"
              ? "No completed saves yet"
              : attentionOnly
                ? "Nothing needs attention"
                : "Everything is saved"}
          </h3>
          <p>
            {view === "history"
              ? "Completed downloads will appear here."
              : attentionOnly
                ? "Retried saves are back in the queue."
                : "Your downloads are available in your library."}
          </p>
          {view === "current" && (
            <button
              type="button"
              className="button small"
              onClick={() =>
                attentionOnly ? setAttentionOnly(false) : setView("history")
              }
            >
              {attentionOnly ? "Show All" : `View History (${history.length})`}
            </button>
          )}
        </div>
      ) : view === "history" ? (
        <div className="transfer-history">
          <div className="transfer-history-heading">
            <span>Today</span>
            <span>Aug 31, 2026</span>
          </div>
          {shown.map((save) => (
            <TransferRow
              key={save.id}
              save={save}
              paused={paused}
              actions={actions}
            />
          ))}
        </div>
      ) : (
        <div className="transfer-groups">
          {groups.map((group) => {
            const items = shown.filter(
              (save) => (save.batch ?? `single-${save.id}`) === group,
            );
            const batch = items[0].batch;
            if (!batch)
              return (
                <TransferRow
                  key={group}
                  save={items[0]}
                  paused={paused}
                  actions={actions}
                />
              );
            const members = saves.filter((save) => save.batch === batch);
            const done = members.filter(
              (save) => save.state === "complete",
            ).length;
            const failed = members.filter(
              (save) => save.state === "failed",
            ).length;
            const closed = collapsed.includes(group);
            return (
              <section className="transfer-batch" key={group}>
                <button
                  type="button"
                  className="transfer-batch-heading"
                  aria-expanded={!closed}
                  aria-controls={`batch-${batch}`}
                  aria-label={`${batchNames[batch]}, ${done} of ${members.length} saved${failed ? `, ${failed} ${failed === 1 ? "needs" : "need"} attention` : ""}`}
                  onClick={() =>
                    setCollapsed(
                      closed
                        ? collapsed.filter((key) => key !== group)
                        : [...collapsed, group],
                    )
                  }
                >
                  <ChevronDown className={closed ? "closed" : ""} />
                  <span className="transfer-batch-icon">
                    <SourceIcon source={items[0].source} />
                  </span>
                  <span className="transfer-batch-copy">
                    <strong>{batchNames[batch]}</strong>
                    <small>
                      {sourceNames[items[0].source]} · {members.length} saves
                    </small>
                  </span>
                  <span className="transfer-batch-summary">
                    <span>
                      {done} of {members.length} saved
                    </span>
                    {failed > 0 && (
                      <span className="transfer-batch-warning">
                        <Warning />
                        {failed}
                      </span>
                    )}
                  </span>
                </button>
                <div
                  id={`batch-${batch}`}
                  className="transfer-batch-items"
                  hidden={closed}
                >
                  {items.map((save) => (
                    <TransferRow
                      key={save.id}
                      save={save}
                      paused={paused}
                      actions={actions}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <div className="transfer-footnote">
        <span>On this Mac</span>
        <span>
          Downloading <ChevronRight /> Processing <ChevronRight /> Saved
        </span>
      </div>
    </div>
  );
}

type QuietStatus = "current" | "attention" | "saved";

export function VariantE({
  saves,
  paused,
  actions,
  view,
  setView,
}: ViewProps & { view: QuietStatus; setView: (view: QuietStatus) => void }) {
  const current = saves.filter((save) => save.state !== "complete");
  const failures = saves.filter((save) => save.state === "failed");
  const completed = saves.filter((save) => save.state === "complete");
  const visible =
    view === "saved" ? completed : view === "attention" ? failures : current;

  return (
    <div className="quiet-view">
      <div className="quiet-queue">
        {visible.map((save) => {
          const stopped = paused || !!save.held;
          const moving =
            (save.state === "downloading" || save.state === "processing") &&
            !stopped;
          return (
            <div
              className="quiet-row"
              key={save.id}
              data-state={save.state}
              data-moving={moving}
              data-paused={isActive(save) && stopped}
            >
              <div className="quiet-rail">
                {isActive(save) ? (
                  <button
                    type="button"
                    disabled={paused}
                    aria-label={`${save.held || paused ? "Resume" : "Pause"} ${save.title}`}
                    title={
                      paused
                        ? "Resume all downloads first"
                        : save.held
                          ? "Resume Download"
                          : "Pause Download"
                    }
                    onClick={() => actions.togglePause(save.id)}
                  >
                    {save.held || paused ? <Play /> : <Pause />}
                  </button>
                ) : (
                  <span className="quiet-rail-state">
                    <StateIcon save={save} paused={false} />
                  </span>
                )}
                {isActive(save) && (
                  <span className="quiet-pixels" aria-hidden="true">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pixel) => (
                      <i key={pixel} />
                    ))}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="quiet-open"
                aria-label={`Inspect ${save.title}`}
                onClick={() => actions.inspect(save)}
              >
                <Thumb save={save} />
                <span className="quiet-copy">
                  <strong>{save.title}</strong>
                  <span className="quiet-meta">
                    <SourceIcon source={save.source} />
                    <span>{sourceNames[save.source]}</span>
                    <span className="quiet-meta-divider">·</span>
                    <span className="quiet-stage">
                      {save.state === "complete"
                        ? "Saved to your library"
                        : save.state === "failed"
                          ? "Needs another try"
                          : statusText(save, paused)}
                    </span>
                  </span>
                  {save.state === "failed" && (
                    <span className="quiet-error">{save.error}</span>
                  )}
                </span>
              </button>
              {isActive(save) ? (
                <button
                  type="button"
                  className="icon-button quiet-dismiss"
                  aria-label={`Cancel ${save.title}`}
                  onClick={() => actions.cancel(save.id)}
                >
                  <Close />
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-button quiet-dismiss"
                  aria-label={`View ${save.title}`}
                  onClick={() => actions.inspect(save)}
                >
                  <ChevronRight />
                </button>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="quiet-empty">
            <Check />
            <h3>
              {view === "saved"
                ? "No completed saves yet"
                : view === "attention"
                  ? "Nothing needs attention"
                  : "Everything is saved"}
            </h3>
            <p>
              {view === "saved"
                ? "Your completed downloads will appear here."
                : view === "attention"
                  ? "Retried saves are back in the queue."
                  : "Your downloads are ready in your library."}
            </p>
            {view !== "saved" && (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setView(view === "attention" ? "current" : "saved")
                }
              >
                {view === "attention" ? "Back to Current" : "View Saved"}
                <ChevronRight />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InspectDialog({
  save,
  paused,
  actions,
  close,
}: { save: SampleSave | undefined; close: () => void } & Omit<
  ViewProps,
  "saves"
>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (save && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [save]);
  if (!save) return null;
  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") dialogRef.current?.close();
      }}
      className="inspect-dialog"
      aria-labelledby="inspect-title"
    >
      <div className="dialog-heading">
        <span>Download Details</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close Details"
          onClick={() => dialogRef.current?.close()}
        >
          <Close />
        </button>
      </div>
      <div className="dialog-body">
        <Thumb save={save} large />
        <div className="eyebrow">
          <SourceIcon source={save.source} />
          {sourceNames[save.source]}
          <span>·</span>
          {save.kind}
        </div>
        <h2 id="inspect-title">{save.title}</h2>
        <div className={`dialog-status ${save.state}`}>
          <StateIcon save={save} paused={paused} />
          {statusText(save, paused)}
        </div>
        {save.state === "downloading" && (
          <>
            <Progress save={save} paused={paused} />
            <p className="muted">
              {save.received} MB of {save.total} MB
            </p>
          </>
        )}
        <ol className="stage-list">
          <li>
            <Check />
            <span>Save added</span>
            <small>Today</small>
          </li>
          <li>
            {save.state === "waiting" ? (
              <span className="state-dot waiting" />
            ) : (
              <Check />
            )}
            <span>Read source</span>
          </li>
          <li>
            {save.state === "processing" || save.state === "complete" ? (
              <Check />
            ) : (
              <StateIcon save={save} paused={paused} />
            )}
            <span>
              {save.state === "complete" || save.state === "processing"
                ? "Files downloaded"
                : "Download files"}
            </span>
          </li>
          <li>
            {save.state === "complete" ? (
              <Check />
            ) : (
              <span
                className={`state-dot ${save.state === "processing" ? "downloading" : "waiting"}`}
              />
            )}
            <span>
              {save.state === "complete"
                ? "Processed for your library"
                : "Process for your library"}
            </span>
          </li>
          <li>
            {save.state === "complete" ? (
              <Check />
            ) : (
              <span className="state-dot waiting" />
            )}
            <span>Available in library</span>
          </li>
        </ol>
        {save.state === "failed" && (
          <button
            type="button"
            className="button primary wide"
            onClick={() => actions.retry([save.id])}
          >
            <Retry />
            Retry Download
          </button>
        )}
        {isActive(save) && (
          <button
            type="button"
            className="button wide"
            onClick={() => {
              actions.cancel(save.id);
              close();
            }}
          >
            Cancel Download
          </button>
        )}
        <p className="sample-note">
          Sample save. No files are downloaded or changed.
        </p>
      </div>
    </dialog>
  );
}

function initialVariant(): Variant {
  const value = new URLSearchParams(location.search).get("variant");
  return value === "B" || value === "C" || value === "D" || value === "E"
    ? value
    : "A";
}

function initialScenario(): Scenario {
  const value = new URLSearchParams(location.search).get("scenario");
  return value === "attention" ||
    value === "processing" ||
    value === "complete" ||
    value === "empty"
    ? value
    : "mixed";
}

export function DownloadsPrototype() {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [scenario, setScenario] = useState<Scenario>(initialScenario);
  const [saves, setSaves] = useState(() => makeSaves(initialScenario()));
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [quietStatus, setQuietStatus] = useState<QuietStatus>("current");
  const [inspectedId, setInspectedId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [showState, setShowState] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("light");
  const [removed, setRemoved] = useState<SampleSave | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = variants.find((v) => v.key === variant) ?? variants[0];
  const active = saves.filter(isActive);
  const failed = saves.filter((s) => s.state === "failed");
  const complete = saves.filter((s) => s.state === "complete");

  function changeVariant(next: Variant) {
    setVariant(next);
    setInspectedId(null);
    const url = new URL(location.href);
    url.searchParams.set("variant", next);
    history.replaceState(null, "", url);
  }

  function cycle(direction: number) {
    const index = variants.findIndex((v) => v.key === variant);
    changeVariant(
      variants[(index + direction + variants.length) % variants.length].key,
    );
  }

  function reset(next = scenario) {
    setScenario(next);
    setSaves(makeSaves(next));
    setPaused(false);
    setPlaying(false);
    setQuery("");
    setSourceFilter("all");
    setShowFilters(false);
    setQuietStatus("current");
    setInspectedId(null);
    setToast("");
    setRemoved(null);
    const url = new URL(location.href);
    url.searchParams.set("scenario", next);
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest(
          "input,textarea,select,[contenteditable=true],dialog",
        ) ||
          inspectedId !== null)
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  useEffect(() => {
    if (!playing || paused) return;
    const timer = window.setInterval(
      () =>
        setSaves((previous) => {
          let slots =
            2 - previous.filter((s) => s.state === "downloading").length;
          return previous.map((save) => {
            if (save.held) return save;
            if (save.state === "processing")
              return { ...save, state: "complete" };
            if (save.state === "waiting" && slots > 0) {
              slots--;
              return { ...save, state: "downloading" };
            }
            if (save.state !== "downloading") return save;
            const received = Math.min(
              save.total,
              save.received + Math.max(1, Math.round(save.total * 0.065)),
            );
            return {
              ...save,
              received,
              state: received === save.total ? "processing" : "downloading",
            };
          });
        }),
      1100,
    );
    return () => window.clearInterval(timer);
  }, [playing, paused]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const actions: Actions = {
    inspect: (save) => setInspectedId(save.id),
    togglePause: (id) =>
      setSaves((previous) =>
        previous.map((save) =>
          save.id === id && isActive(save)
            ? { ...save, held: !save.held }
            : save,
        ),
      ),
    retry: (ids) => {
      setSaves((previous) =>
        previous.map((save) =>
          ids.includes(save.id) && save.state === "failed"
            ? {
                ...save,
                state: "waiting",
                received: 0,
                error: undefined,
                held: false,
              }
            : save,
        ),
      );
      setRemoved(null);
      setToast(
        `${ids.length === 1 ? "Save is" : `${ids.length} saves are`} waiting to retry. Use Play Sample to continue.`,
      );
    },
    cancel: (id) => {
      setRemoved(saves.find((save) => save.id === id) ?? null);
      setSaves((previous) => previous.filter((save) => save.id !== id));
      setToast("Download cancelled in this sample.");
    },
  };

  const filtered = saves.filter(
    (save) =>
      (sourceFilter === "all" || sourceFilter === save.source) &&
      `${save.title} ${sourceNames[save.source]} ${statusText(save, paused)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const viewProps = { saves: filtered, paused, actions };

  return (
    <div className="prototype" data-variant={variant}>
      <header className="exploration-header">
        <div className="exploration-brand">
          <Logo size={20} />
          <strong>Downloads</strong>
          <span className="header-divider" />
          <span>Design explorations</span>
          <span className="prototype-badge">Prototype</span>
        </div>
        <div className="sample-controls">
          <label>
            Sample
            <select
              value={scenario}
              onChange={(event) => reset(event.target.value as Scenario)}
            >
              <option value="mixed">Mixed Activity</option>
              <option value="processing">Processing Files</option>
              <option value="attention">Needs Attention</option>
              <option value="complete">All Completed</option>
              <option value="empty">Empty</option>
            </select>
          </label>
          <button
            type="button"
            className="icon-button"
            onClick={() => reset()}
            aria-label="Reset Sample"
            title="Reset Sample"
          >
            <Retry />
          </button>
          <button
            type="button"
            className="theme-button"
            onClick={() => {
              const next = theme === "light" ? "dark" : "light";
              setTheme(next);
              document.documentElement.dataset.theme = next;
            }}
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </header>
      <div className="design-caption">
        <div>
          <span className="variant-letter">{variant}</span>
          <h1>{current.description}</h1>
        </div>
        <p>{current.detail}</p>
      </div>
      <div className={`app-window ${sidebarOpen ? "" : "sidebar-hidden"}`}>
        <aside className="app-sidebar">
          <div className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="pond-brand">
            <span className="pond-logo">
              <Logo size={17} />
            </span>
            <strong>Pond</strong>
            <ChevronDown />
            <button
              type="button"
              className="icon-button"
              aria-label="Search Downloads"
              onClick={() => searchRef.current?.focus()}
            >
              <Search />
            </button>
          </div>
          <nav className="library-nav" aria-label="Library Context">
            <span>
              <Library />
              All
            </span>
            <span>
              <Folder />
              Uncategorized
            </span>
            <span>
              <Trash />
              Trash
            </span>
            <span className="selected" aria-current="page">
              <Download />
              Downloads
              <span className="nav-count">
                {active.length + failed.length || ""}
              </span>
            </span>
            <span>
              <Assistant />
              Assistant
            </span>
          </nav>
          <div className="folder-caption">
            Folders
            <ChevronDown />
          </div>
          <div className="folder-item">
            <Folder />
            References
          </div>
          <div className="folder-item">
            <Folder />
            Design
          </div>
          <div className="sidebar-bottom">
            <span className="local-indicator" />
            On this Mac
          </div>
        </aside>
        <div className="app-main">
          <div className="app-chrome">
            <button
              className="icon-button"
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <Sidebar />
            </button>
            <span className="chrome-divider" />
            <Library />
            <span>Library</span>
            <span className="breadcrumb-slash">/</span>
            <strong id="downloads-location">Downloads</strong>
            <span className="chrome-local">Sample library</span>
          </div>
          <main className="downloads-page" aria-labelledby="downloads-location">
            <div className="downloads-header">
              <div className="downloads-search-bar">
                <label className="downloads-search-field">
                  <Search />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search downloads…"
                    aria-label="Search downloads"
                  />
                  {query && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Clear Search"
                      onClick={() => setQuery("")}
                    >
                      <Close />
                    </button>
                  )}
                </label>
                <div className="downloads-header-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Filter Downloads"
                    title="Filter Downloads"
                    aria-expanded={showFilters}
                    aria-controls="downloads-filters"
                    data-active={
                      sourceFilter !== "all" ||
                      (variant === "E" && quietStatus !== "current") ||
                      undefined
                    }
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FilterToggle />
                  </button>
                  {variant === "E" &&
                    quietStatus !== "saved" &&
                    filtered.some((save) => save.state === "failed") && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Retry Failed"
                        title="Retry Failed"
                        onClick={() =>
                          actions.retry(
                            filtered
                              .filter((save) => save.state === "failed")
                              .map((save) => save.id),
                          )
                        }
                      >
                        <Retry />
                      </button>
                    )}
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={paused ? "Resume Downloads" : "Pause All"}
                    title={paused ? "Resume Downloads" : "Pause All"}
                    aria-pressed={paused}
                    disabled={active.length === 0}
                    onClick={() => setPaused(!paused)}
                  >
                    {paused ? <Play /> : <Pause />}
                  </button>
                </div>
              </div>
              <div
                className="downloads-filter-bar"
                id="downloads-filters"
                hidden={!showFilters}
              >
                {variant === "E" && (
                  <label className="filter-control">
                    <span>Status</span>
                    <select
                      aria-label="Filter by Status"
                      value={quietStatus}
                      onChange={(event) =>
                        setQuietStatus(event.target.value as QuietStatus)
                      }
                    >
                      <option value="current">
                        Current (
                        {
                          filtered.filter((save) => save.state !== "complete")
                            .length
                        }
                        )
                      </option>
                      <option value="attention">
                        Attention (
                        {
                          filtered.filter((save) => save.state === "failed")
                            .length
                        }
                        )
                      </option>
                      <option value="saved">
                        Saved (
                        {
                          filtered.filter((save) => save.state === "complete")
                            .length
                        }
                        )
                      </option>
                    </select>
                  </label>
                )}
                <label className="filter-control">
                  <Filter />
                  <select
                    aria-label="Filter by Source"
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                  >
                    <option value="all">All Sources</option>
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {sourceNames[source]}
                      </option>
                    ))}
                  </select>
                </label>
                {(sourceFilter !== "all" ||
                  (variant === "E" && quietStatus !== "current")) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSourceFilter("all");
                      setQuietStatus("current");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            <div className="downloads-content">
              {paused && active.length > 0 && (
                <div className="paused-notice">
                  <Pause />
                  <span>Downloads are paused. Resume when you're ready.</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPaused(false)}
                  >
                    Resume
                  </button>
                </div>
              )}
              {filtered.length === 0 ? (
                <Empty filtered={saves.length > 0} />
              ) : variant === "A" ? (
                <VariantA {...viewProps} />
              ) : variant === "B" ? (
                <VariantB {...viewProps} />
              ) : variant === "C" ? (
                <VariantC {...viewProps} />
              ) : variant === "D" ? (
                <VariantD key={scenario} {...viewProps} />
              ) : (
                <VariantE
                  key={scenario}
                  {...viewProps}
                  view={quietStatus}
                  setView={setQuietStatus}
                />
              )}
            </div>
          </main>
          {variant !== "E" && (
            <footer className="app-footer">
              <span>
                <span className={`footer-dot ${paused ? "paused" : ""}`} />
                {paused
                  ? "Downloads paused"
                  : active.length
                    ? "Pond keeps downloading in the background"
                    : "Downloads up to date"}
              </span>
              <span>{complete.length} completed</span>
            </footer>
          )}
        </div>
      </div>
      {import.meta.env.DEV && (
        <div className="prototype-dock">
          <div
            className="variant-switcher"
            role="toolbar"
            aria-label="Design Variants"
          >
            <button
              type="button"
              className="dock-arrow"
              aria-label="Previous Variant"
              onClick={() => cycle(-1)}
            >
              <ArrowLeft />
            </button>
            {variants.map((v) => (
              <button
                type="button"
                key={v.key}
                onClick={() => changeVariant(v.key)}
                aria-pressed={variant === v.key}
              >
                <span>{v.key}</span>
                {v.name}
              </button>
            ))}
            <button
              type="button"
              className="dock-arrow"
              aria-label="Next Variant"
              onClick={() => cycle(1)}
            >
              <ArrowRight />
            </button>
          </div>
          <span className="dock-divider" />
          <button
            type="button"
            className="play-sample"
            disabled={active.length === 0}
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause /> : <Play />}
            {playing ? "Hold Sample" : "Play Sample"}
          </button>
          <button
            type="button"
            className="state-toggle"
            aria-expanded={showState}
            onClick={() => setShowState(!showState)}
          >
            State
          </button>
        </div>
      )}
      {showState && (
        <div className="state-panel">
          <div>
            <strong>Prototype State</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Close State"
              onClick={() => setShowState(false)}
            >
              <Close />
            </button>
          </div>
          <pre>
            {JSON.stringify(
              {
                variant,
                scenario,
                paused,
                playing,
                query,
                sourceFilter,
                quietStatus,
                saves: saves.map(
                  ({ id, title, source, state, received, total }) => ({
                    id,
                    title,
                    source,
                    state,
                    received,
                    total,
                  }),
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check />
          <span>{toast}</span>
          {removed && (
            <button
              type="button"
              onClick={() => {
                setSaves((previous) => [...previous, removed]);
                setRemoved(null);
                setToast("Download restored.");
              }}
            >
              Undo
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            aria-label="Dismiss Notification"
            onClick={() => setToast("")}
          >
            <Close />
          </button>
        </div>
      )}
      <InspectDialog
        save={saves.find((save) => save.id === inspectedId)}
        paused={paused}
        actions={actions}
        close={() => setInspectedId(null)}
      />
    </div>
  );
}
