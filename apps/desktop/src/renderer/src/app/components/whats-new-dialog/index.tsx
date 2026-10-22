import type { ChangelogEntry } from "@pond/schema/changelog";
import { Button, Changelog, Dialog } from "@pond/ui";
import { useEffect, useRef } from "react";
import { loadAppInfo } from "@/shared/lib/app-info";
import { useWhatsNewDialog, whatsNewDialog } from "@/shared/state/whats-new";
import { CHANGELOG, unseenVersions } from "./entries";
import styles from "./styles.module.css";

const RELEASES_URL = "https://github.com/raphaelsalaja/pond/releases";
const SEEN_KEY = "pond:whatsNewSeenVersion";
const CHECK_DELAY_MS = 1500;

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(version: string): void {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {}
}

/** Opens once per version change, after the Library has had a moment to load. */
function useShowAfterUpdate(): void {
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { version } = await loadAppInfo();
        const lastSeen = readSeen();
        if (!active || lastSeen === version) return;
        const hasSaves =
          lastSeen !== null ||
          (await window.pond.query("saves.sidebarCounts", {})).library > 0;
        if (!active) return;
        writeSeen(version);
        const versions = unseenVersions({
          entries: CHANGELOG,
          current: version,
          lastSeen,
          hasSaves,
        });
        if (versions.length > 0) whatsNewDialog.open(versions);
      } catch {}
    }, CHECK_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
}

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <Changelog.Entry>
      <Changelog.Meta>
        <Changelog.Version>v{entry.version}</Changelog.Version>
        <Changelog.Date dateTime={entry.date}>
          {DATE_FORMAT.format(new Date(`${entry.date}T00:00:00Z`))}
        </Changelog.Date>
      </Changelog.Meta>
      <Changelog.Body>
        <Changelog.Title>{entry.title}</Changelog.Title>
        <Changelog.Summary>{entry.summary}</Changelog.Summary>
        {entry.sections.map((section) => (
          <Changelog.Section key={section.category} category={section.category}>
            <Changelog.Heading />
            <Changelog.List>
              {section.items.map((item) => (
                <Changelog.Item key={item}>{item}</Changelog.Item>
              ))}
            </Changelog.List>
          </Changelog.Section>
        ))}
      </Changelog.Body>
    </Changelog.Entry>
  );
}

export function WhatsNewDialog() {
  const { open, versions } = useWhatsNewDialog();
  const doneRef = useRef<HTMLButtonElement>(null);
  useShowAfterUpdate();

  const filtered = versions
    ? CHANGELOG.filter((entry) => versions.includes(entry.version))
    : CHANGELOG;
  const entries = filtered.length > 0 ? filtered : CHANGELOG;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) whatsNewDialog.close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup} initialFocus={doneRef}>
          <Dialog.Header>
            <Dialog.Title>What's New</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Content className={styles.content}>
            <Changelog.Root>
              {entries.map((entry) => (
                <Entry key={entry.version} entry={entry} />
              ))}
            </Changelog.Root>
          </Dialog.Content>
          <Dialog.Footer>
            <Button
              variant="secondary"
              onClick={() => void window.pond.openExternal(RELEASES_URL)}
            >
              All Releases
            </Button>
            <Dialog.Confirm
              ref={doneRef}
              onClick={() => whatsNewDialog.close()}
            >
              Done
            </Dialog.Confirm>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
