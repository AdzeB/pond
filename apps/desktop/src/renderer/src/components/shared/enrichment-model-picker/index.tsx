import { IconGlobeOutline18 as Globe } from "@pond/icons/outline/18";
import { Combobox } from "@pond/ui";
import { useMemo, useState } from "react";
import {
  findModel,
  groupedModels,
  type ModelCatalog,
  type PickerModel,
} from "@/lib/enrichment/model-catalogs";
import styles from "./styles.module.css";

interface Props {
  catalog: ModelCatalog;
  /** Empty string means "use the catalog default". */
  value: string;
  onChange: (id: string) => void;
}

/** The free-form "use this id" candidate is appended as its own "Custom" group. */
type Group = { value: string; items: string[] };

export function EnrichmentModelPicker({ catalog, value, onChange }: Props) {
  const [query, setQuery] = useState("");

  const selectedId = value.trim() || catalog.defaultId;
  const [activeId, setActiveId] = useState(selectedId);

  const selected = findModel(catalog, selectedId);
  const triggerLabel = selected?.name ?? selectedId;

  /** Offer a custom id when the search looks like a model path and matches nothing. */
  const trimmed = query.trim();
  const customCandidate =
    trimmed.includes("/") && !findModel(catalog, trimmed) ? trimmed : null;

  const groups = useMemo<Group[]>(() => {
    const base: Group[] = groupedModels(catalog.models).map((g) => ({
      value: g.group,
      items: g.models.map((m) => m.id),
    }));
    if (customCandidate) {
      base.push({ value: "Custom", items: [customCandidate] });
    }
    return base;
  }, [catalog.models, customCandidate]);

  const active = findModel(catalog, activeId);

  const labelFor = (id: string) => {
    const model = findModel(catalog, id);
    return model ? `${model.name} ${model.id} ${model.group}` : id;
  };

  return (
    <Combobox.Root<string>
      items={groups}
      value={selectedId}
      onValueChange={(next) => onChange(next ?? "")}
      onInputValueChange={setQuery}
      onItemHighlighted={(id) => setActiveId(id || selectedId)}
      onOpenChange={(open) => {
        if (open) {
          setQuery("");
          setActiveId(selectedId);
        }
      }}
      itemToStringLabel={labelFor}
    >
      <Combobox.Trigger aria-label={`Model: ${triggerLabel}`}>
        <Combobox.Value>{() => triggerLabel}</Combobox.Value>
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Backdrop />
        <Combobox.Positioner
          align="end"
          style={{ "--popup-width": "auto" } as React.CSSProperties}
        >
          <Combobox.Popup className={styles.popup}>
            <div className={styles.panel}>
              <div className={styles.left}>
                <Combobox.Input
                  autoFocus
                  placeholder={catalog.searchPlaceholder}
                />
                <Combobox.List>
                  {(group: Group) => (
                    <Combobox.Group key={group.value} items={group.items}>
                      <Combobox.GroupLabel>{group.value}</Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(id: string) => {
                          const model = findModel(catalog, id);
                          if (!model)
                            return (
                              <Combobox.Item key={id} value={id}>
                                <Combobox.ItemLabel>
                                  Use “{id}”
                                </Combobox.ItemLabel>
                                <Combobox.ItemEnd>
                                  <Combobox.ItemMeta>Custom</Combobox.ItemMeta>
                                </Combobox.ItemEnd>
                              </Combobox.Item>
                            );
                          return (
                            <Combobox.Item key={id} value={id}>
                              <Combobox.ItemLabel>
                                {model.name}
                              </Combobox.ItemLabel>
                              <Combobox.ItemEnd>
                                {model.multilingual ? (
                                  <Globe aria-label="Multilingual" />
                                ) : null}
                                {model.meta ? (
                                  <Combobox.ItemMeta>
                                    {model.meta}
                                  </Combobox.ItemMeta>
                                ) : null}
                                <Combobox.ItemIndicator />
                              </Combobox.ItemEnd>
                            </Combobox.Item>
                          );
                        }}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.List>
                <Combobox.Empty>No models match.</Combobox.Empty>
              </div>

              <InfoPanel model={active} fallbackId={activeId} />
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function InfoPanel({
  model,
  fallbackId,
}: {
  model: PickerModel | undefined;
  fallbackId: string;
}) {
  if (!model) {
    return (
      <div className={styles.info}>
        <div className={styles["info-title"]}>Custom model</div>
        <p className={styles["info-summary"]}>
          {fallbackId
            ? `Uses "${fallbackId}". It must be a Transformers.js model with ONNX weights.`
            : "Enter any Transformers.js model id with ONNX weights."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.info}>
      <div className={styles["info-title"]}>{model.name}</div>

      <Meter label="Speed" value={model.speed} />
      <Meter label="Quality" value={model.quality} />

      <dl className={styles.specs}>
        {model.specs.map((spec) => (
          <div key={spec.label} className={styles.spec}>
            <dt>{spec.label}</dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>

      <p className={styles["info-summary"]}>{model.summary}</p>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.meter}>
      <span className={styles["meter-label"]}>{label}</span>
      <span className={styles["meter-track"]} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length meter
            key={i}
            className={styles["meter-segment"]}
            data-on={i < value || undefined}
          />
        ))}
      </span>
    </div>
  );
}
