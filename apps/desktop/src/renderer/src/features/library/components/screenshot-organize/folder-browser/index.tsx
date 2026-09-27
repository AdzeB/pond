import {
  IconChevronRightOutline12,
  IconMagnifierOutline12,
} from "@pond/icons/outline/12";
import { IconFolderOutline18, IconPlusOutline18 } from "@pond/icons/outline/18";
import type { Folder } from "@pond/schema/db";
import { Button, cssVars, Input } from "@pond/ui";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import {
  type ScreenshotFolderOption,
  screenshotFolderOptions,
} from "./folder-options";
import styles from "./styles.module.css";

export function ScreenshotFolderBrowser({
  folders,
  value,
  onChange,
  onCreate,
  recentIds,
  loading,
  error,
  onRetry,
  disabled,
}: {
  folders: readonly Folder[];
  value: string;
  onChange(id: string): void;
  onCreate(name: string): Promise<boolean>;
  recentIds: readonly string[];
  loading: boolean;
  error: string;
  onRetry(): void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const options = useMemo(
    () => screenshotFolderOptions(folders, search, collapsed),
    [folders, search, collapsed],
  );
  const allOptions = useMemo(
    () => screenshotFolderOptions(folders, "", new Set()),
    [folders],
  );
  const recent = search.trim()
    ? []
    : recentIds
        .flatMap((id) => {
          const folder = allOptions.find((option) => option.id === id);
          return folder ? [folder] : [];
        })
        .slice(0, 5);
  const unavailable = disabled || loading || Boolean(error);
  const needle = search.trim();
  const canCreate =
    needle &&
    !folders.some(
      (folder) =>
        !folder.parentId && folder.name.toLowerCase() === needle.toLowerCase(),
    );

  function navigate(event: KeyboardEvent, fromSearch = false) {
    if (event.nativeEvent.isComposing) return;
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key))
      return;
    if (event.key === "Enter") {
      if (fromSearch) {
        event.preventDefault();
        list.current
          ?.querySelector<HTMLButtonElement>("[data-destination]")
          ?.click();
      }
      return;
    }
    if (fromSearch && !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const controls = Array.from(
      list.current?.querySelectorAll<HTMLButtonElement>(
        "[data-destination]:not(:disabled)",
      ) ?? [],
    );
    const active = document.activeElement;
    const current =
      active instanceof HTMLButtonElement ? controls.indexOf(active) : -1;
    if (!fromSearch && current === 0 && event.key === "ArrowUp") {
      input.current?.focus();
      return;
    }
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End" || (fromSearch && event.key === "ArrowUp")
          ? controls.length - 1
          : fromSearch
            ? 0
            : Math.max(
                0,
                Math.min(
                  controls.length - 1,
                  current + (event.key === "ArrowDown" ? 1 : -1),
                ),
              );
    controls[index]?.focus();
    controls[index]?.scrollIntoView?.({ block: "nearest" });
  }

  function renderFolder(folder: ScreenshotFolderOption, isRecent = false) {
    return (
      <div
        key={folder.id}
        className={styles.row}
        style={cssVars({
          "--depth": isRecent || needle ? 0 : Math.min(folder.depth, 8),
        })}
      >
        <button
          type="button"
          className={styles.destination}
          data-destination
          data-selected={value === folder.id || undefined}
          aria-label={`${isRecent ? "Recent: " : ""}${folder.path}`}
          aria-pressed={value === folder.id}
          disabled={unavailable}
          onKeyDown={navigate}
          onClick={() => onChange(folder.id)}
        >
          <IconFolderOutline18 />
          <span>{folder.name}</span>
          {(isRecent || needle) && folder.depth > 0 ? (
            <small>{folder.path.slice(0, -(folder.name.length + 3))}</small>
          ) : null}
        </button>
        {folder.hasChildren && !needle && !isRecent ? (
          <button
            type="button"
            className={styles.expand}
            aria-label={`${collapsed.has(folder.id) ? "Expand" : "Collapse"} ${folder.path}`}
            aria-expanded={!collapsed.has(folder.id)}
            disabled={unavailable}
            onClick={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(folder.id)) next.delete(folder.id);
                else next.add(folder.id);
                return next;
              })
            }
          >
            <IconChevronRightOutline12 />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className={styles.root} aria-label="Screenshot destination">
      <div className={styles.search}>
        <Input.Root variant="borderless" size="sm">
          <Input.Icon>
            <IconMagnifierOutline12 />
          </Input.Icon>
          <Input.Field
            ref={input}
            aria-label="Search screenshot folders"
            placeholder="Search folders…"
            value={search}
            onValueChange={setSearch}
            disabled={disabled}
            onKeyDown={(event) => navigate(event, true)}
          />
        </Input.Root>
      </div>
      <div ref={list} className={styles.list} aria-busy={loading}>
        {loading ? (
          <p className={styles.message} role="status">
            Loading folders
          </p>
        ) : error ? (
          <div className={styles.message} role="alert">
            <p>{error}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onRetry}
              disabled={disabled}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {recent.length > 0 ? (
              <>
                <p className={styles.heading}>Recent</p>
                {recent.map((folder) => renderFolder(folder, true))}
                <hr className={styles.separator} />
              </>
            ) : null}
            {!needle ? (
              <button
                type="button"
                className={styles.destination}
                data-destination
                data-selected={!value || undefined}
                aria-label="Library"
                aria-pressed={!value}
                disabled={disabled}
                onKeyDown={navigate}
                onClick={() => onChange("")}
              >
                <IconFolderOutline18 />
                <span>Library</span>
              </button>
            ) : null}
            {options.map((folder) => renderFolder(folder))}
            {needle && options.length === 0 ? (
              <p className={styles.message}>No matching folders.</p>
            ) : null}
            {canCreate ? (
              <Button
                className={styles.create}
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  void onCreate(needle).then((created) => {
                    if (created) setSearch("");
                  })
                }
              >
                <IconPlusOutline18 />
                Create "{needle}"
              </Button>
            ) : null}
            {!needle && folders.length === 0 ? (
              <p className={styles.message}>
                Search for a name to create a folder.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
