import { Button, Input } from "@pond/ui";
import { useRef, useState } from "react";
import { errorCopy } from "@/shared/lib/error-copy";
import styles from "./styles.module.css";

interface Draft {
  value: string;
  pending: boolean;
  error: string | null;
}
export type InspectorDrafts = Map<string, Draft>;
export function InspectorTextField({
  className,
  drafts,
  cacheKey,
  label,
  value,
  multiline,
  readOnly,
  disabled,
  size = "sm",
  variant = "secondary",
  placeholder,
  mixedPlaceholder,
  maxLength,
  commit,
}: {
  className?: string;
  drafts: InspectorDrafts;
  cacheKey: string;
  label: string;
  value: string | null;
  multiline?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  size?: React.ComponentProps<typeof Input.Root>["size"];
  variant?: React.ComponentProps<typeof Input.Root>["variant"];
  placeholder?: string;
  mixedPlaceholder?: string;
  maxLength?: number;
  commit(value: string): Promise<void>;
}) {
  const [, update] = useState(0);
  const cancelled = useRef(false);
  const draft = drafts.get(cacheKey);
  const current = draft?.value ?? value ?? "";
  function refresh() {
    update((count) => count + 1);
  }
  async function save() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = drafts.get(cacheKey);
    if (!next || next.pending || readOnly || disabled) return;
    if (next.value === value) {
      drafts.delete(cacheKey);
      refresh();
      return;
    }
    next.pending = true;
    next.error = null;
    refresh();
    try {
      await commit(next.value);
      drafts.delete(cacheKey);
    } catch (error) {
      next.pending = false;
      next.error = errorCopy(error, "Couldn't save changes. Try again.");
    }
    refresh();
  }
  const props = {
    "aria-label": label,
    value: current,
    placeholder:
      value === null
        ? (mixedPlaceholder ?? `Multiple ${label.toLowerCase()}`)
        : (placeholder ?? label),
    disabled,
    readOnly: readOnly || draft?.pending,
    onValueChange: (text: string) => {
      if (disabled) return;
      drafts.set(cacheKey, { value: text, pending: false, error: null });
      refresh();
    },
    onBlur: () => void save(),
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        cancelled.current = true;
        drafts.delete(cacheKey);
        refresh();
        event.currentTarget.blur();
      } else if (event.key === "Enter" && !multiline)
        event.currentTarget.blur();
    },
  };
  return (
    <div className={className}>
      <Input.Root size={size} variant={variant} className={styles.field}>
        {multiline ? (
          <Input.Textarea {...props} rows={2} maxLength={maxLength ?? 8192} />
        ) : (
          <Input.Field {...props} maxLength={maxLength ?? 255} />
        )}
      </Input.Root>
      {draft?.error ? (
        <div role="alert" className={styles.error}>
          {draft.error}
          <Button size="sm" variant="ghost" onClick={() => void save()}>
            Try Again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
