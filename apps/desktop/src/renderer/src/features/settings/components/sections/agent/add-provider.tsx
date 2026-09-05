import { Menu } from "@pond/ui";
import type { AssistantProvider } from "@shared/assistant";
import { PROVIDER_ICONS } from "./icons";

export function AddProviderMenu({
  remaining,
  variant = "secondary",
  onAdd,
}: {
  remaining: Array<{ id: AssistantProvider; provider: string }>;
  variant?: "primary" | "secondary";
  onAdd: (id: AssistantProvider) => void;
}) {
  if (remaining.length === 0) return null;
  return (
    <Menu.Root>
      <Menu.Trigger variant={variant} size="sm">
        Add Model Provider
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom">
          <Menu.Popup>
            <Menu.Items
              items={remaining.map((catalog) => {
                const Icon = PROVIDER_ICONS[catalog.id];
                return {
                  label: catalog.provider,
                  icon: <Icon />,
                  onClick: () => onAdd(catalog.id),
                };
              })}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
