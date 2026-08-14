import { IconNotepadOutline18 as NotebookPen } from "@pond/icons/outline/18";
import { cn } from "@pond/ui";
import React, { memo, type ReactNode, useMemo } from "react";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import {
  buildMediaUnits,
  deriveTypeKind,
  deriveTypeLabel,
} from "@/lib/media/units";
import { pickSourceIconUrl } from "@/lib/media/url";
import { getSourceLabel } from "@/lib/save/source-labels";
import { getSourceIcon, getSourceLogo } from "@/lib/save/sources-registry";
import type { Save, SaveFile } from "@/lib/types";
import { useDisplayPref } from "@/stores/display-prefs";
import styles from "./styles.module.css";

interface RootProps extends React.ComponentPropsWithRef<"li"> {
  selected?: boolean;
  multi?: boolean;
  dimmed?: boolean;
  /** Native dragstart under a non-colliding name: Motion wrappers consume `onDragStart` as their pan-gesture prop. */
  onNativeDragStart?: React.DragEventHandler<HTMLLIElement>;
}

function Root({
  selected,
  multi,
  dimmed,
  className,
  onNativeDragStart,
  ...props
}: RootProps) {
  return (
    <li
      className={cn(styles.item, className)}
      data-selected={selected ? "true" : undefined}
      data-multi={multi ? "true" : undefined}
      data-dimmed={dimmed ? "true" : undefined}
      onDragStart={onNativeDragStart}
      {...props}
    />
  );
}

function Select({
  className,
  type,
  ...props
}: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type ?? "button"}
      className={cn(styles.select, className)}
      {...props}
    />
  );
}

interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  checked: boolean;
}

function Checkbox({ checked, className, type, ...props }: CheckboxProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={checked}
      className={cn(styles.checkbox, className)}
      {...props}
    >
      <span aria-hidden className={styles.checkmark}>
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

function Media({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn(styles.media, className)} {...props} />;
}

function Meta({ title, time }: { title?: ReactNode; time?: ReactNode }) {
  if (title == null && time == null) return null;
  return (
    <div className={styles.meta}>
      {title != null ? <span className={styles.title}>{title}</span> : null}
      {time != null ? <span className={styles.time}>{time}</span> : null}
    </div>
  );
}

function Type({ className, ...props }: React.ComponentPropsWithoutRef<"span">) {
  return <span className={cn(styles.type, className)} {...props} />;
}

function Source({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return <span className={cn(styles.source, className)} {...props} />;
}

interface CountProps extends React.ComponentPropsWithoutRef<"span"> {}

function Count({ className, role, ...props }: CountProps) {
  return (
    <span
      role={role ?? "status"}
      className={cn(styles.count, className)}
      {...props}
    />
  );
}

interface NoteProps extends React.ComponentPropsWithoutRef<"span"> {}

function Note({ className, ...props }: NoteProps) {
  return <span className={cn(styles.note, className)} {...props} />;
}

const Overlay = memo(function Overlay({
  save,
  primary,
}: {
  save: Save;
  primary: SaveFile | null;
}) {
  const showType = useDisplayPref("type");
  const showSource = useDisplayPref("source");
  const showFileCount = useDisplayPref("fileCount");
  const showNotes = useDisplayPref("notes");
  const pickOpts = useMediaPickOptions();
  const typeLabel = useMemo(
    () => (showType ? deriveTypeLabel(primary, save) : null),
    [showType, primary, save],
  );
  const typeKind = useMemo(
    () => deriveTypeKind(primary, save),
    [primary, save],
  );
  const sourceLabel = showSource ? getSourceLabel(save.source) : null;
  const sourceLogo =
    (showSource ? getSourceLogo(save.source) : null) ??
    (showSource && save.source === "web" ? pickSourceIconUrl(save) : null);
  const SourceIcon = showSource ? getSourceIcon(save.source) : null;
  const mediaUnitCount = useMemo(
    () => (showFileCount ? buildMediaUnits(save, pickOpts).length : 0),
    [showFileCount, save, pickOpts],
  );
  const hasNotes = showNotes && Boolean(save.notes?.trim());

  return (
    <div className={styles.overlay}>
      {typeLabel ? (
        <Type data-kind={typeKind} aria-label={`Type: ${typeLabel}`}>
          {typeLabel}
        </Type>
      ) : null}
      {sourceLabel ? (
        <Source
          aria-label={`Saved from ${sourceLabel}`}
          title={`Saved from ${sourceLabel}`}
        >
          {sourceLogo ? (
            <img src={sourceLogo} alt="" width={18} height={18} />
          ) : SourceIcon ? (
            <SourceIcon />
          ) : (
            sourceLabel
          )}
        </Source>
      ) : null}
      {showFileCount && mediaUnitCount > 1 ? (
        <Count aria-label={`${mediaUnitCount} media files`}>
          {mediaUnitCount}
        </Count>
      ) : null}
      {hasNotes ? (
        <Note aria-label="Has a note" title="Has a note">
          <NotebookPen size={11} />
        </Note>
      ) : null}
    </div>
  );
});

export const Card = Object.assign(Root, {
  Root,
  Select,
  Checkbox,
  Media,
  Meta,
  Type,
  Source,
  Count,
  Note,
  Overlay,
});
