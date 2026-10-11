import { IconLayers } from "@pond/icons";
import { Button, Popover, Tooltip } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { SourceThumbnail, useSourceCovers } from "../save-preview";
import styles from "./styles.module.css";

export function ChatContext({
  attached,
  previous,
}: {
  attached: AssistantSource[];
  previous: AssistantSource[];
}) {
  const groups = [
    { title: "Next Message", saves: attached },
    { title: "In This Conversation", saves: previous },
  ];
  useSourceCovers([...attached, ...previous].map((save) => save.id));
  return (
    <Popover.Root>
      <Tooltip label="Library Access" side="top">
        <Popover.Trigger
          render={<Button icon size="xs" variant="ghost" />}
          aria-label="Library Access"
        >
          <IconLayers />
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={6}>
          <Popover.Popup className={styles.popup} aria-label="Chat Context">
            <div className={styles.access}>
              <h3>Library Access</h3>
              <p>
                Assistant searches your library only when your request needs it.
              </p>
            </div>
            {groups.map((group) =>
              group.saves.length ? (
                <section key={group.title} className={styles.group}>
                  <h3>
                    {group.title} <span>{group.saves.length}</span>
                  </h3>
                  <ul>
                    {group.saves.map((save) => (
                      <li key={save.id}>
                        <span className={styles.media}>
                          <SourceThumbnail id={save.id} source={save} />
                        </span>
                        <span
                          className={styles.title}
                          title={save.title || "Untitled"}
                        >
                          {save.title || "Untitled"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
            {!attached.length && !previous.length ? (
              <p className={styles.empty}>
                No Saves mentioned. Type @, drag a Save onto the composer, or
                choose Add to Chat.
              </p>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
