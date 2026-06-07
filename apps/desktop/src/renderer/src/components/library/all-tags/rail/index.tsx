import {
  IconBookmarkOutline18 as Bookmark,
  IconCircleQuestionOutline18 as CircleQuestionMark,
  IconPlusOutline18 as Plus,
  IconStarOutline18 as Star,
} from "@pond/icons/outline/18";
import { Input } from "@pond/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm";
import { TagGroupContextMenu } from "@/components/menus/tag-group-context";
import type { useTagGroups } from "@/pool/tag-groups";
import type { TagRow } from "@/pool/tags";
import styles from "./styles.module.css";

export type RailKey = "all" | "uncategorized" | "starred" | `g:${string}`;

interface RailProps {
  tags: ReadonlyArray<TagRow>;
  groups: ReturnType<typeof useTagGroups>;
  counts: Map<string, number>;
  uncategorisedCount: number;
  starredCount: number;
  selected: RailKey;
  onSelect: (next: RailKey) => void;
}

export function Rail({
  tags,
  groups,
  counts,
  uncategorisedCount,
  starredCount,
  selected,
  onSelect,
}: RailProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(
    null,
  );
  const createRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (creating) createRef.current?.focus();
  }, [creating]);

  function tagCountFor(name: string) {
    return counts.get(name.toLowerCase()) ?? 0;
  }

  function groupTotal(group: (typeof groups)[number]) {
    let total = 0;
    for (const name of group.tagNames) total += tagCountFor(name);
    return total;
  }

  async function commitCreate() {
    const cleaned = draft.trim();
    if (!cleaned) {
      setCreating(false);
      setDraft("");
      return;
    }
    await window.pond.query("tagGroups.create", { name: cleaned });
    setDraft("");
    setCreating(false);
  }

  async function commitRename(group: (typeof groups)[number]) {
    const cleaned = renameDraft.trim();
    setRenamingId(null);
    if (!cleaned || cleaned === group.name) return;
    await window.pond.query("tagGroups.rename", {
      from: group.name,
      to: cleaned,
    });
  }

  async function commitDelete(name: string) {
    await window.pond.query("tagGroups.delete", { name });
    setConfirmDeleteName(null);
  }

  async function setColor(
    group: (typeof groups)[number],
    color: string | null,
  ) {
    await window.pond.query("tagGroups.update", {
      name: group.name,
      patch: { color },
    });
  }

  return (
    <aside className={styles.rail} aria-label="Tag groups">
      <RailRow
        active={selected === "all"}
        onSelect={() => onSelect("all")}
        icon={<Bookmark width={14} height={14} />}
        label="All"
        count={tags.length}
      />
      <RailRow
        active={selected === "uncategorized"}
        onSelect={() => onSelect("uncategorized")}
        icon={<CircleQuestionMark width={14} height={14} />}
        label="Uncategorized"
        count={uncategorisedCount}
      />
      <RailRow
        active={selected === "starred"}
        onSelect={() => onSelect("starred")}
        icon={<Star width={14} height={14} />}
        label="Starred"
        count={starredCount}
      />

      <div className={styles["rail-section-header"]}>
        <span className={styles["rail-section-label"]}>
          Groups
          <span className={styles["rail-section-count"]}>
            ({groups.length})
          </span>
        </span>
        <button
          type="button"
          className={styles["rail-section-action"]}
          aria-label="New tag group"
          title="New tag group"
          onClick={() => setCreating(true)}
        >
          <Plus width={12} height={12} />
        </button>
      </div>

      {creating ? (
        <div className={styles["rail-create"]}>
          <Input.Field
            ref={createRef}
            data-size="sm"
            placeholder="New group name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setDraft("");
              }
            }}
            onBlur={() => void commitCreate()}
          />
        </div>
      ) : null}

      {groups.map((g) => {
        const railKey: RailKey = `g:${g.id}`;
        const isRenaming = renamingId === g.id;
        return (
          <TagGroupContextMenu
            key={g.id}
            onRename={() => {
              setRenameDraft(g.name);
              setRenamingId(g.id);
            }}
            onSetColor={(color) => void setColor(g, color)}
            onRequestDelete={() => setConfirmDeleteName(g.name)}
          >
            {isRenaming ? (
              <div
                className={styles["rail-row"]}
                data-active={selected === railKey || undefined}
              >
                <span
                  className={styles["rail-icon"]}
                  style={g.color ? { color: g.color } : undefined}
                  aria-hidden
                >
                  <Bookmark width={14} height={14} />
                </span>
                <Input.Field
                  data-size="sm"
                  value={renameDraft}
                  autoFocus
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") void commitRename(g);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => void commitRename(g)}
                />
              </div>
            ) : (
              <button
                type="button"
                className={styles["rail-row"]}
                data-active={selected === railKey || undefined}
                onClick={() => onSelect(railKey)}
              >
                <span
                  className={styles["rail-icon"]}
                  style={g.color ? { color: g.color } : undefined}
                  aria-hidden
                >
                  <Bookmark width={14} height={14} />
                </span>
                <span className={styles["rail-label"]}>{g.name}</span>
                <span className={styles["rail-count"]}>{groupTotal(g)}</span>
              </button>
            )}
          </TagGroupContextMenu>
        );
      })}

      <ConfirmDialog
        open={confirmDeleteName !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteName(null);
        }}
        title="Remove tag group?"
        description={`"${confirmDeleteName}" will be removed. The tags inside it stay in your library; they just won't belong to this group anymore.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmDeleteName) void commitDelete(confirmDeleteName);
        }}
      />
    </aside>
  );
}

interface RailRowProps {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
  count: number;
}

function RailRow({ active, onSelect, icon, label, count }: RailRowProps) {
  return (
    <button
      type="button"
      className={styles["rail-row"]}
      data-active={active || undefined}
      onClick={onSelect}
    >
      <span className={styles["rail-icon"]} aria-hidden>
        {icon}
      </span>
      <span className={styles["rail-label"]}>{label}</span>
      <span className={styles["rail-count"]}>{count}</span>
    </button>
  );
}
