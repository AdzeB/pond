import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import { IconChevronDownOutline12 as ChevronDown } from "@pond/icons/outline/12";
import {
  IconArchivePlusOutline18 as Plus,
  IconRefresh2Outline18 as Refresh,
  IconWindowSettingsOutline18 as Settings,
  IconArrowUpDownTrailOutline18 as Switch,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { usePonds } from "@/lib/hooks/use-ponds";
import { initials } from "@/lib/utils/initials";
import styles from "./styles.module.css";

export function PondSwitcher() {
  const { ponds, active, switching, switchTo, refresh } = usePonds();

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) refresh();
      }}
    >
      <Menu.Trigger variant="ghost" className={styles.switcher}>
        <span className={styles.logo} />
        {active?.name ?? "Pond"}
        <ChevronDown style={{ marginLeft: "auto" }} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item>
              <Menu.ItemIcon>
                <Settings />
              </Menu.ItemIcon>
              Settings
              <Menu.SecondaryLabel>G then S</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item>
              <Menu.ItemIcon>
                <Plus />
              </Menu.ItemIcon>
              Create Pond
              <Menu.SecondaryLabel>P then C</Menu.SecondaryLabel>
            </Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger>
                <Menu.ItemIcon>
                  <Switch />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Switch Pond</Menu.ItemLabel>
                <CaretRight
                  width={8}
                  height={8}
                  style={{ marginLeft: "auto" }}
                />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner align="start" sideOffset={4}>
                  <Menu.Popup>
                    {ponds.map((pond) => (
                      <Menu.Item
                        key={pond.path}
                        disabled={switching || pond.active || !pond.exists}
                        onClick={() => switchTo(pond.path)}
                      >
                        <span
                          aria-hidden
                          className={styles.avatar}
                          data-emoji={pond.avatar ? true : undefined}
                          data-missing={!pond.exists || undefined}
                        >
                          {pond.avatar ?? initials(pond.name)}
                        </span>
                        <Menu.ItemLabel>{pond.name}</Menu.ItemLabel>
                        {pond.active ? (
                          <span className={styles.dot} aria-hidden />
                        ) : null}
                      </Menu.Item>
                    ))}
                    {ponds.length === 0 ? (
                      <div className={styles.empty}>No ponds yet.</div>
                    ) : null}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Item>
              <Menu.ItemIcon>
                <Refresh />
              </Menu.ItemIcon>
              Reload Pond
              <Menu.SecondaryLabel>P then R</Menu.SecondaryLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
