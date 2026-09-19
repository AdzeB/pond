import type { Query } from "@pond/schema/filters/types";
import { Button, Dialog, Input } from "@pond/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { combineQueries } from "@/features/library/lib/smart-folders";
import {
  compileRuleQuery,
  editableQuery,
  type RuleChoices,
  RuleEditor,
  ruleQueryReady,
} from "../rule-editor";
import styles from "./styles.module.css";

export interface RuleDialogProps {
  kind: "smart_folder" | "group";
  name?: string;
  query: Query;
  inheritedQuery: Query;
  parentName?: string;
  editing?: boolean;
  libraryRevision?: number;
  choices: RuleChoices;
  count: (query: Query) => Promise<number>;
  onSave: (name: string, query: Query) => Promise<void>;
  onClose: () => void;
}

type PreviewState =
  | {
      status: "incomplete" | "loading" | "failed";
      query: Query;
      revision: number;
    }
  | { status: "ready"; query: Query; count: number; revision: number };

export function RuleDialog(props: RuleDialogProps) {
  const {
    kind,
    inheritedQuery,
    parentName,
    choices,
    count,
    onSave,
    onClose,
    editing,
    libraryRevision = 0,
  } = props;
  const [name, setName] = useState(props.name ?? "");
  const [query, setQuery] = useState(() => editableQuery(props.query));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const nameId = useId();
  const label = kind === "group" ? "Group" : "Smart Folder";
  const ready = ruleQueryReady(query);
  const effectiveQuery = useMemo(
    () =>
      ready ? combineQueries([inheritedQuery, compileRuleQuery(query)]) : query,
    [inheritedQuery, query, ready],
  );
  const [preview, setPreview] = useState<PreviewState>({
    status: "loading",
    query: effectiveQuery,
    revision: libraryRevision,
  });

  useEffect(() => {
    if (!ready) return;
    let current = true;
    const timer = window.setTimeout(() => {
      setPreview({
        status: "loading",
        query: effectiveQuery,
        revision: libraryRevision,
      });
      void count(effectiveQuery).then(
        (total) => {
          if (current)
            setPreview({
              status: "ready",
              query: effectiveQuery,
              count: total,
              revision: libraryRevision,
            });
        },
        () => {
          if (current)
            setPreview({
              status: "failed",
              query: effectiveQuery,
              revision: libraryRevision,
            });
        },
      );
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [effectiveQuery, ready, count, libraryRevision]);

  const previewStatus = !ready
    ? "incomplete"
    : preview.query === effectiveQuery && preview.revision === libraryRevision
      ? preview.status
      : "loading";
  const countText =
    previewStatus === "incomplete"
      ? "Complete the rules to preview matches."
      : previewStatus === "loading"
        ? "Counting matches"
        : previewStatus === "failed"
          ? "Couldn't count matches. Your rules can still be saved."
          : preview.status === "ready"
            ? `Found ${preview.count.toLocaleString()} ${preview.count === 1 ? "save" : "saves"}`
            : "Counting matches";

  const submit = async () => {
    if (!ready || !name.trim() || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), compileRuleQuery(query));
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn't save these rules. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open, details) => {
        if (pending.current) details.cancel();
        else if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            aria-busy={busy}
          >
            <Dialog.Header className={styles.header}>
              <Dialog.Title className={styles.title}>
                {editing ? "Edit" : "New"} {label}
              </Dialog.Title>
              <Dialog.Close disabled={busy} />
            </Dialog.Header>
            <div className={styles.body}>
              <label htmlFor={nameId} className={styles.nameLabel}>
                {label} Name
              </label>
              <Input.Root size="xl" className={styles.nameInput}>
                <Input.Field
                  id={nameId}
                  autoFocus
                  value={name}
                  onValueChange={setName}
                  disabled={busy}
                />
              </Input.Root>
              <Dialog.Description className={styles.description}>
                {kind === "group"
                  ? "These rules filter every smart folder and saved view in this group."
                  : "This smart folder automatically collects saves that match these rules."}
              </Dialog.Description>
              {parentName ? (
                <p className={styles.inherited}>
                  Also matches the rules in {parentName}.
                </p>
              ) : null}
              <fieldset className={styles.editor} disabled={busy}>
                <legend className={styles.srOnly}>Matching Rules</legend>
                <RuleEditor
                  query={query}
                  choices={choices}
                  onChange={setQuery}
                />
              </fieldset>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}
            </div>
            <div className={styles.footer}>
              <p className={styles.count} role="status" aria-live="polite">
                {countText}
              </p>
              <Button
                type="submit"
                size="lg"
                variant="primary"
                disabled={busy || !ready || !name.trim()}
                loading={busy}
              >
                {busy ? "Saving" : editing ? "Save" : "Create"}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
