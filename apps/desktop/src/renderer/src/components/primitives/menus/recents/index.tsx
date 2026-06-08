import { IconClockRotateAnticlockwiseOutline18 as History } from "@pond/icons/outline/18";
import { Menu, Tooltip } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useRecents } from "@/lib/stores/recents";
import { pool } from "@/pool/pool";

export function Recents() {
  const navigate = useNavigate();

  const recents = useRecents();

  const rows = recents.flatMap((entry) => {
    const save = pool.get(entry.saveId);
    return save ? [{ entry, save }] : [];
  });

  return (
    <Menu.Root>
      <Tooltip label="Recently viewed" side="bottom">
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="Recently Viewed"
        >
          <History />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Group>
              <Menu.GroupLabel>Recently viewed</Menu.GroupLabel>
              {rows.length === 0 ? (
                <Menu.Item disabled>Nothing yet</Menu.Item>
              ) : (
                rows.map(({ entry, save }) => (
                  <Menu.Item
                    key={entry.saveId}
                    onClick={() =>
                      void navigate({ to: `/save/${entry.saveId}` })
                    }
                  >
                    <Menu.ItemLabel>
                      {save.title?.trim() || save.url || "Untitled save"}
                    </Menu.ItemLabel>
                    {save.source ? (
                      <Menu.ItemLabel>{save.source}</Menu.ItemLabel>
                    ) : null}
                  </Menu.Item>
                ))
              )}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
