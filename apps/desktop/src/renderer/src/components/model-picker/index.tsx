import {
  IconCheckOutline18 as Check,
  IconChevronExpandYOutline18 as Expand,
  IconGlobeOutline18 as Globe,
} from "@pond/icons/outline/18";
import { Input, Popover } from "@pond/ui";
import { useMemo, useState } from "react";
import {
  findModel,
  groupedModels,
  type ModelCatalog,
  type PickerModel,
} from "@/lib/model-catalogs";
import styles from "./styles.module.css";

interface Props {
  catalog: ModelCatalog;
  // Empty string means "use the catalog default".
  value: string;
  onChange: (id: string) => void;
}

export function ModelPicker({ catalog, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedId = value.trim() || catalog.defaultId;
  const selected = findModel(catalog, selectedId);
  const [activeId, setActiveId] = useState(selectedId);

  const triggerLabel = selected?.name ?? selectedId;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return catalog.models;
    return catalog.models.filter((m) =>
      `${m.name} ${m.id} ${m.group}`.toLowerCase().includes(needle),
    );
  }, [query, catalog.models]);

  const groups = useMemo(() => groupedModels(filtered), [filtered]);

  // Offer a custom id when the search looks like a model path and matches nothing.
  const trimmed = query.trim();
  const customCandidate =
    trimmed.includes("/") && !findModel(catalog, trimmed) ? trimmed : null;

  const active = findModel(catalog, activeId);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActiveId(selectedId);
        }
      }}
    >
      <Popover.Trigger
        className={styles.trigger}
        aria-label={`Model: ${triggerLabel}`}
      >
        <span className={styles.triggerLabel}>{triggerLabel}</span>
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
              <div className={styles.left}>
                <Input.Field
                  autoFocus
                  data-size="sm"
                  className={styles.search}
                  placeholder={catalog.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <div className={styles.list}>
                  {groups.map(({ group, models }) => (
                    <div key={group} className={styles.group}>
                      <div className={styles.groupLabel}>{group}</div>
                      {models.map((model) => (
                        <ModelRow
                          key={model.id}
                          model={model}
                          selected={model.id === selectedId}
                          onActivate={() => setActiveId(model.id)}
                          onChoose={() => choose(model.id)}
                        />
                      ))}
                    </div>
                  ))}

                  {customCandidate ? (
                    <button
                      type="button"
                      className={styles.row}
                      onMouseEnter={() => setActiveId("")}
                      onFocus={() => setActiveId("")}
                      onClick={() => choose(customCandidate)}
                    >
                      <span className={styles.rowName}>
                        Use “{customCandidate}”
                      </span>
                      <span className={styles.rowMeta}>Custom</span>
                    </button>
                  ) : null}

                  {groups.length === 0 && !customCandidate ? (
                    <div className={styles.empty}>No models match.</div>
                  ) : null}
                </div>
              </div>

              <InfoPanel model={active} fallbackId={activeId} />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ModelRow({
  model,
  selected,
  onActivate,
  onChoose,
}: {
  model: PickerModel;
  selected: boolean;
  onActivate: () => void;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.row}
      data-selected={selected || undefined}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onChoose}
    >
      <span className={styles.rowName}>{model.name}</span>
      <span className={styles.rowEnd}>
        {model.multilingual ? (
          <Globe width={13} height={13} aria-label="Multilingual" />
        ) : null}
        {model.meta ? (
          <span className={styles.rowMeta}>{model.meta}</span>
        ) : null}
        {selected ? <Check width={14} height={14} /> : null}
      </span>
    </button>
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
        <div className={styles.infoTitle}>Custom model</div>
        <p className={styles.infoSummary}>
          {fallbackId
            ? `Uses "${fallbackId}". It must be a Transformers.js model with ONNX weights.`
            : "Enter any Transformers.js model id with ONNX weights."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.info}>
      <div className={styles.infoTitle}>{model.name}</div>

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

      <p className={styles.infoSummary}>{model.summary}</p>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.meter}>
      <span className={styles.meterLabel}>{label}</span>
      <span className={styles.meterTrack} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length meter
            key={i}
            className={styles.meterSegment}
            data-on={i < value || undefined}
          />
        ))}
      </span>
    </div>
  );
}
