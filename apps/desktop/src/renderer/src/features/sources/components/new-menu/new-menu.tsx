import { IconPlusFill18 } from "@pond/icons/fill/18";
import {
  IconEyeOutline18,
  IconFolderOpenOutline18,
  IconUserPlusOutline18,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { useQueryClient } from "@tanstack/react-query";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { sourceFlow } from "@/features/sources/state/source-flow";
import {
  sourceNewMenu,
  useSourceNewMenuOpen,
} from "@/features/sources/state/source-new-menu";

export function NewSourceMenu({
  children: label = "New Source",
  controlled = false,
  onWatchedFolder,
}: {
  children?: string;
  controlled?: boolean;
  onWatchedFolder?: () => void;
} = {}) {
  const storedOpen = useSourceNewMenuOpen();
  const client = useQueryClient();

  function chooseWatchedFolder(): void {
    if (onWatchedFolder) {
      onWatchedFolder();
      return;
    }
    void pickWatchedFolder().then(() =>
      client.invalidateQueries({ queryKey: ["watched-folder"] }),
    );
  }

  return (
    <Menu.Root
      {...(controlled
        ? {
            open: storedOpen,
            onOpenChange: (next: boolean) => sourceNewMenu.setOpen(next),
          }
        : {})}
    >
      <Menu.Trigger
        variant="ghost"
        size="sm"
        icon
        aria-label={label}
        data-sources-new={controlled || undefined}
      >
        <IconPlusFill18 />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" side="bottom">
          <Menu.Popup>
            <Menu.Items
              items={[
                {
                  label: "Connect a Source",
                  icon: <IconUserPlusOutline18 />,
                  onClick: () => sourceFlow.open("connect-source"),
                },
                {
                  label: "Watch Account",
                  icon: <IconEyeOutline18 />,
                  onClick: () => sourceFlow.open("watch-target"),
                },
                {
                  label: "Watched Folder",
                  icon: <IconFolderOpenOutline18 />,
                  onClick: chooseWatchedFolder,
                },
              ]}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
