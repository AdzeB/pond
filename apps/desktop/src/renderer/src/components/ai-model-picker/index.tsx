import {
  IconCheckOutline18 as Check,
  IconChevronExpandYOutline18 as Expand,
} from "@pond/icons/outline/18";
import { type AiProviderId, providerModels } from "@pond/schema";
import { Input, Popover } from "@pond/ui";
import { useMemo, useState } from "react";
import styles from "./styles.module.css";

interface Props {
  provider: AiProviderId;
  // Empty string means "use the provider default" (placeholder).
  value: string;
  onChange: (id: string) => void;
  // The provider's default model id, shown when nothing is selected.
  placeholder: string;
}

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 ? m.toFixed(1) : m}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

export function AiModelPicker({
  provider,
  value,
  onChange,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const models = useMemo(() => providerModels(provider), [provider]);
  const selectedId = value.trim();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return models;
    return models.filter((m) => m.id.toLowerCase().includes(needle));
  }, [query, models]);

  const trimmed = query.trim();
  const customCandidate =
    trimmed.length > 0 && !models.some((m) => m.id === trimmed)
      ? trimmed
      : null;

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <Popover.Trigger
        className={styles.trigger}
        aria-label={`Model: ${selectedId || placeholder}`}
      >
        <span className={styles.triggerLabel}>{selectedId || placeholder}</span>
        <Expand width={14} height={14} className={styles.triggerIcon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          align="end"
          sideOffset={6}
          style={
            { "--popup-width": "auto", "--popup-min-width": "0px" } as Record<
              string,
              string
            >
          }
        >
          <Popover.Popup className={styles.popup}>
            <div className={styles.panel}>
              <Input.Field
                autoFocus
                data-size="sm"
                className={styles.search}
                placeholder="Search models…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className={styles.list}>
                <button
                  type="button"
                  className={styles.row}
                  data-selected={selectedId === "" || undefined}
                  onClick={() => choose("")}
                >
                  <span className={styles.rowName}>
                    Default · {placeholder}
                  </span>
                  {selectedId === "" ? <Check width={14} height={14} /> : null}
                </button>

                {filtered.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={styles.row}
                    data-selected={model.id === selectedId || undefined}
                    onClick={() => choose(model.id)}
                  >
                    <span className={styles.rowName}>{model.id}</span>
                    <span className={styles.rowEnd}>
                      {model.agent ? (
                        <span className={styles.badge}>agent</span>
                      ) : null}
                      {model.context > 0 ? (
                        <span className={styles.rowMeta}>
                          {formatContext(model.context)}
                        </span>
                      ) : null}
                      {model.id === selectedId ? (
                        <Check width={14} height={14} />
                      ) : null}
                    </span>
                  </button>
                ))}

                {customCandidate ? (
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => choose(customCandidate)}
                  >
                    <span className={styles.rowName}>
                      Use “{customCandidate}”
                    </span>
                    <span className={styles.rowMeta}>Custom</span>
                  </button>
                ) : null}

                {filtered.length === 0 && !customCandidate ? (
                  <div className={styles.empty}>No models match.</div>
                ) : null}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
