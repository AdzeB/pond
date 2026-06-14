import { IconChevronDownOutline12 as ChevronDown } from "@pond/icons/outline/12";
import {
  IconArchivePlusOutline18 as Plus,
  IconRefresh2Outline18 as Refresh,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { usePonds } from "@/hooks/use-ponds";
import { initials } from "@/lib/initials";
import styles from "./styles.module.css";

interface PondSwitcherProps {
  // `compact` renders an icon-only avatar trigger instead of the full name + chevron row.
  compact?: boolean;
  className?: string;
}

export function PondSwitcher({ compact, className }: PondSwitcherProps) {
  const { ponds, active, switching, switchTo, refresh } = usePonds();

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (open) refresh();
      }}
    >
      {compact ? (
        <Menu.Trigger
          render={
            <button
              type="button"
              className={className}
              aria-label={`Switch pond (${active?.name ?? "Pond"})`}
            />
          }
        >
          <span
            className={styles.avatar}
            data-emoji={active?.avatar ? true : undefined}
            aria-hidden
          >
            {active?.avatar ?? (active ? initials(active.name) : "")}
          </span>
        </Menu.Trigger>
      ) : (
        <Menu.Trigger variant="ghost" className={styles.switcher}>
          <span className={styles.logo} />
          {active?.name ?? "Pond"}
          <ChevronDown style={{ marginLeft: "auto" }} />
        </Menu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
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
            <Menu.Separator />
            <Menu.Item>
              <Menu.ItemIcon>
                <Plus />
              </Menu.ItemIcon>
              Create Pond
              <Menu.SecondaryLabel>P then C</Menu.SecondaryLabel>
            </Menu.Item>
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
