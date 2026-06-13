import {
  IconMinusOutline18 as Minus,
  IconPlusOutline18 as Plus,
  IconArrowRotateAnticlockwiseOutline18 as RotateCcw,
} from "@pond/icons/outline/18";
import {
  Button,
  ColorField,
  Input,
  RangeField,
  Settings,
  Stepper,
  Switch,
} from "@pond/ui";
import type { ReactNode } from "react";
import { type EnumOption, EnumSelect } from "@/components/enum-select";
import type {
  Binding,
  ButtonItem,
  CustomItem,
  FieldItem,
  Item,
  SelectOption,
} from "@/lib/settings-engine-types";
import styles from "./styles.module.css";

export function ItemView({ item, binding }: { item: Item; binding: Binding }) {
  if (item.control === "custom") {
    return <CustomControl item={item} binding={binding} />;
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{item.title}</Settings.ItemTitle>
        {item.description ? (
          <Settings.ItemDescription>
            {item.description}
          </Settings.ItemDescription>
        ) : null}
      </Settings.ItemDetails>
      <Settings.ItemControl>
        {item.control === "button" ? (
          <ButtonControl item={item} binding={binding} />
        ) : (
          <FieldControl item={item} binding={binding} />
        )}
      </Settings.ItemControl>
    </>
  );
}

function CustomControl({
  item,
  binding,
}: {
  item: CustomItem;
  binding: Binding;
}) {
  return <>{item.render(binding)}</>;
}

function ButtonControl({
  item,
  binding,
}: {
  item: ButtonItem;
  binding: Binding;
}) {
  return (
    <Button
      size={item.size ?? "sm"}
      variant={item.variant}
      disabled={item.disabled?.(binding.values) ?? false}
      onClick={item.onClick}
    >
      {item.label}
    </Button>
  );
}

function runApply(item: FieldItem) {
  if (item.apply) setTimeout(item.apply, 50);
}

function FieldControl({
  item,
  binding,
}: {
  item: FieldItem;
  binding: Binding;
}): ReactNode {
  const { values, patch } = binding;
  const current = values[item.key];
  const disabled = item.disabled?.(values) ?? false;

  switch (item.control) {
    case "switch":
      return (
        <Switch.Root
          checked={Boolean(current)}
          disabled={disabled}
          onCheckedChange={(v) => {
            patch({ [item.key]: v });
            runApply(item);
          }}
        />
      );

    case "select":
      return (
        <EnumSelect<SelectOption["value"]>
          value={current as SelectOption["value"]}
          disabled={disabled}
          onValueChange={(next) => {
            patch({ [item.key]: next });
            runApply(item);
          }}
          options={item.options as readonly EnumOption<SelectOption["value"]>[]}
          placeholder={item.placeholder}
        />
      );

    case "range":
      return (
        <RangeField
          aria-label={item.title}
          min={item.min}
          max={item.max}
          step={item.step}
          suffix={item.suffix}
          value={toNumber(current, item.min)}
          onValueChange={(n) => {
            patch({ [item.key]: n });
            runApply(item);
          }}
        />
      );

    case "stepper":
      return (
        <Stepper
          aria-label={item.title}
          min={item.min}
          max={item.max}
          step={item.step}
          fallback={item.fallback ?? item.min}
          value={toNumber(current, item.fallback ?? item.min)}
          onValueChange={(n) => {
            patch({ [item.key]: n });
            runApply(item);
          }}
          decrementIcon={<Minus />}
          incrementIcon={<Plus />}
          resetIcon={<RotateCcw />}
        />
      );

    case "number":
      return (
        <div className={styles.number}>
          <Input.Field
            data-size="sm"
            type="number"
            min={item.min}
            max={item.max}
            disabled={disabled}
            value={String(toNumber(current, item.min))}
            onChange={(e) => {
              const next = clamp(
                Number(e.target.value) || item.min,
                item.min,
                item.max,
              );
              patch({ [item.key]: next });
              runApply(item);
            }}
            style={{ width: item.width ?? 96 }}
          />
          {item.unit ? <span className={styles.unit}>{item.unit}</span> : null}
        </div>
      );

    case "color":
      return (
        <ColorField
          aria-label={item.title}
          value={typeof current === "string" ? current : "#000000"}
          onChange={(hex) => {
            patch({ [item.key]: hex });
            runApply(item);
          }}
        />
      );

    default:
      return null;
  }
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
