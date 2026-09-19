import { IconAlertQuestionFill12 } from "@pond/icons/fill/12";
import type { Source, WatchKind } from "@pond/schema/db";
import { Button, Tooltip } from "@pond/ui";
import { HeroAvatar } from "@/features/sources/components/flow/detail/hero-avatar";
import { watchKindLabel } from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import styles from "./styles.module.css";

interface WatchTargetMatchData {
  kind?: WatchKind;
  handle: string;
  display: string;
  avatarUrl?: string;
}

function matchSub(match: WatchTargetMatchData): string {
  const handleText = /[:./]/.test(match.handle)
    ? match.handle
    : `@${match.handle}`;
  const kind = match.kind === "user" ? "" : watchKindLabel(match.kind);
  return kind ? `${handleText} · ${kind}` : handleText;
}

export function WatchTargetMatch({
  source,
  match,
  handle,
  disabled,
  status,
  hint,
  onSelect,
}: {
  source: Source;
  match: WatchTargetMatchData | null;
  handle: string;
  disabled: boolean;
  status?: string;
  hint?: string;
  onSelect: () => void;
}) {
  const label = getSourceDef(source).label;
  return (
    <div className={styles.wrapper}>
      <Button
        data-hint={hint ? "" : undefined}
        className={styles.row}
        variant="ghost"
        width="full"
        disabled={disabled}
        aria-label={`${label}: ${match?.display ?? handle}`}
        onClick={onSelect}
      >
        <span className={styles.avatar}>
          <HeroAvatar
            key={match?.avatarUrl ?? source}
            source={source}
            avatarUrl={match?.avatarUrl}
            size={36}
          />
        </span>
        <span className={styles.meta}>
          <span className={styles.name}>{match?.display ?? handle}</span>
          <span className={styles.sub}>{match ? matchSub(match) : ""}</span>
          {status ? <span className={styles.sub}>{status}</span> : null}
        </span>
      </Button>
      {hint ? (
        <Tooltip label={hint} side="top">
          <Button
            className={styles.help}
            icon
            size="xs"
            variant="ghost"
            aria-label={hint}
          >
            <IconAlertQuestionFill12 aria-hidden />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
