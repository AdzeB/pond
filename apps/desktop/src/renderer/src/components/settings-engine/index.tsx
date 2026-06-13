import { Settings } from "@pond/ui";
import type {
  Binding,
  GroupConfig,
  SectionConfig,
} from "@/lib/settings-engine-types";
import { usePrefs } from "@/stores/prefs";
import { ItemView } from "./field-control";

export type { Binding, SectionConfig } from "@/lib/settings-engine-types";

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
