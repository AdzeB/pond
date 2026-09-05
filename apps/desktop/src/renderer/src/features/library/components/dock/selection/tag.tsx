import { TrayCard } from "@pond/ui";
import { Calligraph } from "calligraph";
import { useState } from "react";
import { useDock } from "@/features/library/components/dock/lib/context";
import { selection } from "@/features/library/state/selection";
import { addTagsToSelection } from "@/features/saves/lib/selection";
import { useTags } from "@/features/tags/state/tags";
import { formatNumber } from "@/shared/lib/format";
import styles from "./selection.module.css";

export function SelectionTagSection() {
  const dock = useDock();
  const tags = useTags();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const count = dock.selectionSize;

  const names = tags.map((t) => t.name);
  const trimmed = query.trim();
  const shown = [...picked.filter((p) => !names.includes(p)), ...names].filter(
    (name) =>
      trimmed === "" || name.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const canCreate =
    trimmed !== "" &&
    !shown.some((name) => name.toLowerCase() === trimmed.toLowerCase());

  const toggle = (tag: string) =>
    setPicked((p) =>
      p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag],
    );

  const create = () => {
    if (!canCreate) return;
    setPicked((p) => [...p, trimmed]);
    setQuery("");
  };

  const apply = async () => {
    const scope = selection.snapshot();
    if (scope.length === 0 || picked.length === 0 || busy) return;
    setBusy(true);
    try {
      await addTagsToSelection(scope, picked);
    } finally {
      setBusy(false);
      dock.closeViewMenu();
    }
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Add Tags</TrayCard.Title>
        <TrayCard.Close disabled={busy} />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.field}>
        <input
          type="text"
          placeholder="Search or create a tag…"
          value={query}
          disabled={busy}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
      </div>
      <div className={styles.chips}>
        {shown.map((name) => (
          <button
            key={name}
            type="button"
            className={styles.chip}
            data-active={picked.includes(name) || undefined}
            disabled={busy}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}
        {canCreate ? (
          <button
            type="button"
            className={styles.chip}
            disabled={busy}
            onClick={create}
          >
            Create “{trimmed}”
          </button>
        ) : null}
        {shown.length === 0 && !canCreate ? (
          <p className={styles["chips-empty"]}>
            No tags yet. Type a name to create one.
          </p>
        ) : null}
      </div>
      <TrayCard.Footer>
        <TrayCard.Confirm
          disabled={picked.length === 0 || busy}
          onClick={(e) => {
            e.preventDefault();
            void apply();
          }}
        >
          <Calligraph>
            {busy
              ? "Tagging"
              : `Tag ${formatNumber(count)} Item${count === 1 ? "" : "s"}`}
          </Calligraph>
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
