import { type AiProviderId, providerModels } from "@pond/schema";
import { Combobox } from "@pond/ui";
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
  const [query, setQuery] = useState("");

  const models = useMemo(() => providerModels(provider), [provider]);
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const ids = useMemo(() => models.map((m) => m.id), [models]);
  const selectedId = value.trim();

  const trimmed = query.trim();
  const customCandidate =
    trimmed.length > 0 && !byId.has(trimmed) ? trimmed : null;

  return (
    <Combobox.Root
      items={ids}
      value={selectedId}
      onValueChange={(next) => onChange(next ?? "")}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
    >
      <Combobox.Trigger aria-label={`Model: ${selectedId || placeholder}`}>
        <Combobox.Value>
          {(id: string | null) => id || placeholder}
        </Combobox.Value>
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Backdrop />
        <Combobox.Positioner
          align="end"
          style={{ "--popup-width": "300px" } as React.CSSProperties}
        >
          <Combobox.Popup>
            <Combobox.Input autoFocus placeholder="Search models…" />
            <Combobox.List>
              <Combobox.Item value="">
                <Combobox.ItemLabel>Default · {placeholder}</Combobox.ItemLabel>
                <Combobox.ItemEnd>
                  <Combobox.ItemIndicator />
                </Combobox.ItemEnd>
              </Combobox.Item>

              <Combobox.Collection>
                {(id: string) => {
                  const model = byId.get(id);
                  return (
                    <Combobox.Item key={id} value={id}>
                      <Combobox.ItemLabel>{id}</Combobox.ItemLabel>
                      <Combobox.ItemEnd>
                        {model?.agent ? (
                          <span className={styles.badge}>agent</span>
                        ) : null}
                        {model && model.context > 0 ? (
                          <Combobox.ItemMeta>
                            {formatContext(model.context)}
                          </Combobox.ItemMeta>
                        ) : null}
                        <Combobox.ItemIndicator />
                      </Combobox.ItemEnd>
                    </Combobox.Item>
                  );
                }}
              </Combobox.Collection>

              {customCandidate ? (
                <Combobox.Item value={customCandidate}>
                  <Combobox.ItemLabel>
                    Use “{customCandidate}”
                  </Combobox.ItemLabel>
                  <Combobox.ItemEnd>
                    <Combobox.ItemMeta>Custom</Combobox.ItemMeta>
                  </Combobox.ItemEnd>
                </Combobox.Item>
              ) : null}
            </Combobox.List>

            <Combobox.Empty>
              {customCandidate ? "" : "No models match."}
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
