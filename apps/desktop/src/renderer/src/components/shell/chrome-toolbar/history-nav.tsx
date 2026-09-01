import {
  IconArrowLeftOutline18,
  IconArrowRightOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import { Button, Menu } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { pickAuthorColor } from "@/components/save/preview/lib/helpers";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { pickAuthorAvatarUrl } from "@/lib/media/url";
import type { Save } from "@/lib/types";
import { openSave } from "@/lib/ui/save-nav";
import { initials } from "@/lib/util/initials";
import { pool, savesStore } from "@/stores/pool";
import { useRecents } from "@/stores/recents";
import styles from "./styles.module.css";

function titleFor(save: Save): string {
  const trimmed = save.title?.trim();
  if (trimmed) return trimmed;
  return save.url || "Untitled";
}

function HistoryAvatar({ save, title }: { save: Save; title: string }) {
  const avatarUrl = pickAuthorAvatarUrl(save);
  const author = save.author?.trim() || title;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);

  return (
    <span
      aria-hidden
      className={styles["history-avatar"]}
      style={showImage ? undefined : { background: pickAuthorColor(author) }}
    >
      {showImage && avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initials(author)
      )}
    </span>
  );
}

export function ChromeHistoryNav() {
  const router = useRouter();
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const recents = useRecents();
  const revision = useSelector(savesStore, (s) => s.revision);
  const scrollFade = useScrollFade<HTMLDivElement>();

  const historySaves = useMemo(() => {
    void revision;
    const items: Save[] = [];
    for (const entry of recents) {
      const save = pool.get(entry.saveId);
      if (save) items.push(save);
    }
    return items;
  }, [recents, revision]);

  useEffect(() => {
    const sync = () => {
      setCanBack(router.history.canGoBack());
      const index =
        (router.history.location.state as { __TSR_index?: number } | undefined)
          ?.__TSR_index ?? 0;
      setCanForward(index < router.history.length - 1);
    };

    sync();

    return router.history.subscribe(sync);
  }, [router]);

  return (
    <div className={styles.nav}>
      <Menu.Root>
        <Menu.Trigger
          icon
          size="sm"
          variant="ghost"
          aria-label="History"
          disabled={historySaves.length === 0}
        >
          <IconVersionsOutline18 />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" side="bottom">
            <Menu.Popup className={styles.popup} {...scrollFade}>
              <Menu.Group>
                <Menu.GroupLabel>History</Menu.GroupLabel>
                {historySaves.map((save) => (
                  <Menu.Item
                    key={save.id}
                    className={styles.item}
                    onClick={() => openSave(save.id)}
                  >
                    <HistoryAvatar save={save} title={titleFor(save)} />
                    <Menu.ItemLabel>{titleFor(save)}</Menu.ItemLabel>
                  </Menu.Item>
                ))}
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Back"
        disabled={!canBack}
        onClick={() => router.history.back()}
      >
        <IconArrowLeftOutline18 />
      </Button>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Forward"
        disabled={!canForward}
        onClick={() => router.history.forward()}
      >
        <IconArrowRightOutline18 />
      </Button>
    </div>
  );
}
