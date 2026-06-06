import {
  IconChevronExpandYOutline18 as ChevronsUpDown,
  IconMinusOutline18 as Minus,
  IconPlusOutline18 as Plus,
  IconArrowRotateAnticlockwiseOutline18 as RotateCcw,
} from "@pond/icons/outline/18";
import {
  Button,
  ColorField,
  Input,
  RangeField,
  Select,
  Settings,
  Stepper,
  Switch,
} from "@pond/ui";
import type { ReactNode } from "react";
import { usePrefs } from "@/pool/prefs";
import styles from "./styles.module.css";
import type {
  Binding,
  ButtonItem,
  CustomItem,
  FieldItem,
  GroupConfig,
  Item,
  SectionConfig,
} from "./types";

export type {
  Binding,
  ButtonItem,
  CustomItem,
  FieldItem,
  GroupConfig,
  Item,
  SectionConfig,
  SelectOption,
} from "./types";

const EMPTY_BINDING: Binding = {
  values: {},
  patch: () => {},
  loaded: true,
};

export function SettingsSectionView({ config }: { config: SectionConfig }) {
  if (config.component) {
    const Custom = config.component;
    return <Custom />;
  }
  if (config.useBinding) return <BoundSection config={config} />;
  if (config.prefsKey)
    return <PrefsSection config={config} prefsKey={config.prefsKey} />;
  return <SectionBody config={config} binding={EMPTY_BINDING} />;
}

function PrefsSection({
  config,
  prefsKey,
}: {
  config: SectionConfig;
  prefsKey: NonNullable<SectionConfig["prefsKey"]>;
}) {
  const [values, patch, loaded] = usePrefs(prefsKey);
  return (
    <SectionBody
      config={config}
      binding={{
        values: values as Record<string, unknown>,
        patch: patch as Binding["patch"],
        loaded,
      }}
    />
  );
}

function BoundSection({ config }: { config: SectionConfig }) {
  const binding = config.useBinding?.() ?? EMPTY_BINDING;
  return <SectionBody config={config} binding={binding} />;
}

function SectionBody({
  config,
  binding,
}: {
  config: SectionConfig;
  binding: Binding;
}) {
  const groups = config.groups ?? [];
  return (
    <Settings.Page width={config.width}>
      {config.title || config.description ? (
        <Settings.Header>
          {config.title ? (
            <Settings.Title>{config.title}</Settings.Title>
          ) : null}
          {config.description ? (
            <Settings.Description>{config.description}</Settings.Description>
          ) : null}
        </Settings.Header>
      ) : null}

      {groups.map((group, index) => (
        <GroupRouter
          key={groupKey(group, index)}
          group={group}
          sectionBinding={binding}
        />
      ))}
    </Settings.Page>
  );
}

function groupKey(group: GroupConfig, index: number): string {
  return typeof group.title === "string" ? group.title : `group-${index}`;
}

function GroupRouter({
  group,
  sectionBinding,
}: {
  group: GroupConfig;
  sectionBinding: Binding;
}) {
  if (group.useBinding) return <UseBindingGroup group={group} />;
  if (group.prefsKey)
    return <PrefsGroup group={group} prefsKey={group.prefsKey} />;
  return <Group group={group} binding={sectionBinding} />;
}

function PrefsGroup({
  group,
  prefsKey,
}: {
  group: GroupConfig;
  prefsKey: NonNullable<GroupConfig["prefsKey"]>;
}) {
  const [values, patch, loaded] = usePrefs(prefsKey);
  return (
    <Group
      group={group}
      binding={{
        values: values as Record<string, unknown>,
        patch: patch as Binding["patch"],
        loaded,
      }}
    />
  );
}

function UseBindingGroup({ group }: { group: GroupConfig }) {
  const binding = group.useBinding?.() ?? EMPTY_BINDING;
  return <Group group={group} binding={binding} />;
}

function Group({ group, binding }: { group: GroupConfig; binding: Binding }) {
  if (group.visible && !group.visible(binding.values)) return null;

  const items = (group.items ?? []).filter(
    (item) => !item.visible || item.visible(binding.values),
  );

  if (group.render === undefined && items.length === 0) return null;

  return (
    <Settings.Section>
      {group.title ? (
        <Settings.SectionTitle>{group.title}</Settings.SectionTitle>
      ) : null}
      {items.length > 0 ? (
        <Settings.List>
          {items.map((item) => (
            <Settings.Item key={item.key}>
              <ItemView item={item} binding={binding} />
            </Settings.Item>
          ))}
        </Settings.List>
      ) : null}
      {group.render ? group.render(binding) : null}
    </Settings.Section>
  );
}

function ItemView({ item, binding }: { item: Item; binding: Binding }) {
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

    case "select": {
      const index = item.options.findIndex((o) => Object.is(o.value, current));
      const selected = index >= 0 ? item.options[index] : undefined;
      return (
        <Select.Root
          value={index >= 0 ? String(index) : ""}
          disabled={disabled}
          onValueChange={(v) => {
            if (v === null || v === "") return;
            const option = item.options[Number(v)];
            if (!option) return;
            patch({ [item.key]: option.value });
            runApply(item);
          }}
        >
          <Select.Trigger>
            <Select.Value>{selected?.label ?? item.placeholder}</Select.Value>
            <Select.Icon>
              <ChevronsUpDown />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6}>
              <Select.Popup>
                {item.options.map((option, i) => (
                  <Select.Item key={String(i)} value={String(i)}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      );
    }

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
