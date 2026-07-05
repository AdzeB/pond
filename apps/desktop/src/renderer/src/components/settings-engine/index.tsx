import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { Settings } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { ItemView } from "@/components/settings-engine-field-control";
import type {
  Binding,
  GroupConfig,
  Item,
  SectionConfig,
} from "@/lib/settings/engine-types";
import { gentleSpring } from "@/lib/ui/motion";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

export type { Binding, SectionConfig } from "@/lib/settings/engine-types";

const EMPTY_BINDING: Binding = {
  values: {},
  patch: () => {},
  loaded: true,
};

export function SettingsSectionView({
  config,
  sectionId,
}: {
  config: SectionConfig;
  sectionId?: string;
}) {
  if (config.component) {
    const Custom = config.component;
    return <Custom />;
  }
  if (config.useBinding)
    return <BoundSection config={config} sectionId={sectionId} />;
  if (config.prefsKey)
    return (
      <PrefsSection
        config={config}
        prefsKey={config.prefsKey}
        sectionId={sectionId}
      />
    );
  return (
    <SectionBody
      config={config}
      binding={EMPTY_BINDING}
      sectionId={sectionId}
    />
  );
}

function PrefsSection({
  config,
  prefsKey,
  sectionId,
}: {
  config: SectionConfig;
  prefsKey: NonNullable<SectionConfig["prefsKey"]>;
  sectionId?: string;
}) {
  const [values, patch, loaded] = usePrefs(prefsKey);
  return (
    <SectionBody
      config={config}
      sectionId={sectionId}
      binding={{
        values: values as Record<string, unknown>,
        patch: patch as Binding["patch"],
        loaded,
      }}
    />
  );
}

function BoundSection({
  config,
  sectionId,
}: {
  config: SectionConfig;
  sectionId?: string;
}) {
  const binding = config.useBinding?.() ?? EMPTY_BINDING;
  return (
    <SectionBody config={config} binding={binding} sectionId={sectionId} />
  );
}

function SectionBody({
  config,
  binding,
  sectionId,
}: {
  config: SectionConfig;
  binding: Binding;
  sectionId?: string;
}) {
  const groups = config.groups ?? [];
  return (
    <>
      {groups.map((group, index) => (
        <GroupRouter
          key={groupKey(group, index)}
          group={group}
          sectionBinding={binding}
          sectionId={sectionId}
        />
      ))}
    </>
  );
}

function groupKey(group: GroupConfig, index: number): string {
  return typeof group.title === "string" ? group.title : `group-${index}`;
}

function GroupRouter({
  group,
  sectionBinding,
  sectionId,
}: {
  group: GroupConfig;
  sectionBinding: Binding;
  sectionId?: string;
}) {
  if (group.useBinding)
    return <UseBindingGroup group={group} sectionId={sectionId} />;
  if (group.prefsKey)
    return (
      <PrefsGroup
        group={group}
        prefsKey={group.prefsKey}
        sectionId={sectionId}
      />
    );
  return <Group group={group} binding={sectionBinding} sectionId={sectionId} />;
}

function PrefsGroup({
  group,
  prefsKey,
  sectionId,
}: {
  group: GroupConfig;
  prefsKey: NonNullable<GroupConfig["prefsKey"]>;
  sectionId?: string;
}) {
  const [values, patch, loaded] = usePrefs(prefsKey);
  return (
    <Group
      group={group}
      sectionId={sectionId}
      binding={{
        values: values as Record<string, unknown>,
        patch: patch as Binding["patch"],
        loaded,
      }}
    />
  );
}

function UseBindingGroup({
  group,
  sectionId,
}: {
  group: GroupConfig;
  sectionId?: string;
}) {
  const binding = group.useBinding?.() ?? EMPTY_BINDING;
  return <Group group={group} binding={binding} sectionId={sectionId} />;
}

function Group({
  group,
  binding,
  sectionId,
}: {
  group: GroupConfig;
  binding: Binding;
  sectionId?: string;
}) {
  if (group.visible && !group.visible(binding.values)) return null;

  // Items bound to their own slice resolve visibility inside their wrapper;
  // items on the group binding are filtered here so the empty short-circuit and
  // masonry layout stay correct for the common case.
  const items = (group.items ?? []).filter(
    (item) =>
      item.prefsKey !== undefined ||
      !item.visible ||
      item.visible(binding.values),
  );

  if (group.render === undefined && items.length === 0) return null;

  const body = (
    <>
      {items.length > 0 ? (
        <Settings.List>
          {items.map((item) => (
            <ItemRow
              key={item.key}
              item={item}
              groupBinding={binding}
              sectionId={sectionId}
            />
          ))}
        </Settings.List>
      ) : null}
      {group.render ? group.render(binding) : null}
    </>
  );

  if (group.collapsible && group.title) {
    return (
      <CollapsibleGroup
        title={group.title}
        defaultCollapsed={group.defaultCollapsed}
        fullWidth={group.fullWidth}
      >
        {body}
      </CollapsibleGroup>
    );
  }

  return (
    <Settings.Section span={group.fullWidth ? "full" : undefined}>
      {group.title ? (
        <Settings.SectionTitle>{group.title}</Settings.SectionTitle>
      ) : null}
      {body}
    </Settings.Section>
  );
}

// Renders one item. Items with their own `prefsKey` bind to that slice and
// self-resolve visibility; everything else uses the group binding.
function ItemRow({
  item,
  groupBinding,
  sectionId,
}: {
  item: Item;
  groupBinding: Binding;
  sectionId?: string;
}) {
  if (item.prefsKey)
    return (
      <OverriddenItemRow
        item={item}
        prefsKey={item.prefsKey}
        sectionId={sectionId}
      />
    );
  return <ItemShell item={item} binding={groupBinding} sectionId={sectionId} />;
}

function OverriddenItemRow({
  item,
  prefsKey,
  sectionId,
}: {
  item: Item;
  prefsKey: NonNullable<Item["prefsKey"]>;
  sectionId?: string;
}) {
  const [values, patch, loaded] = usePrefs(prefsKey);
  const binding: Binding = {
    values: values as Record<string, unknown>,
    patch: patch as Binding["patch"],
    loaded,
  };
  if (item.visible && !item.visible(binding.values)) return null;
  return <ItemShell item={item} binding={binding} sectionId={sectionId} />;
}

function ItemShell({
  item,
  binding,
  sectionId,
}: {
  item: Item;
  binding: Binding;
  sectionId?: string;
}) {
  return (
    <Settings.Item
      id={sectionId ? `setting-${sectionId}-${item.key}` : undefined}
    >
      <ItemView item={item} binding={binding} />
    </Settings.Item>
  );
}

function CollapsibleGroup({
  title,
  defaultCollapsed,
  fullWidth,
  children,
}: {
  title: ReactNode;
  defaultCollapsed?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const reduceMotion = useReducedMotion();

  return (
    <Settings.Section span={fullWidth ? "full" : undefined}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.toggleTitle}>{title}</span>
        <ChevronRight
          className={styles.chevron}
          data-open={open || undefined}
          width={14}
          height={14}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.collapsibleBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : gentleSpring}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Settings.Section>
  );
}
