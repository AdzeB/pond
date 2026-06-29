import { IconCaretRightFill12 as CaretRight } from "@pond/icons/fill/12";
import {
  IconClosedCaptionsOutline18 as Caption,
  IconCheckOutline18 as Check,
  IconClone2Outline18 as Copy,
  IconImageOutline18 as Image,
  IconLinkOutline18 as Link,
  IconWindowShareOutline18 as OpenExternal,
  IconMagnifierOutline18 as Search,
  IconTrashOutline18 as Trash,
  IconWandSparkleOutline18 as Wand,
} from "@pond/icons/outline/18";
import { Button, cn } from "@pond/ui";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

function Card({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardCaption}>{caption}</p>
      </div>
      <div className={styles.cardStage}>{children}</div>
    </section>
  );
}

function Keys({ combo }: { combo: string }) {
  return (
    <span className={styles.itemKeyboard}>
      {[...combo].map((key) => (
        <kbd key={`${combo}-${key}`} className={styles.key}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

const caret = (
  <CaretRight width={6} height={6} style={{ color: "var(--ds-gray-9)" }} />
);

function MenuSurface() {
  return (
    <div className={styles.popup}>
      <div className={styles.groupLabel}>Edit</div>
      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Copy />
        </span>
        <span className={styles.itemLabel}>Copy</span>
        <Keys combo="⌘C" />
      </div>
      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Search />
        </span>
        <span className={styles.itemLabel}>Find</span>
        <Keys combo="⌘F" />
      </div>

      <hr className={styles.separator} />

      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Wand />
        </span>
        <span className={styles.itemLabel}>Reprocess</span>
        {caret}
      </div>
      <div
        className={cn(styles.item, styles.hasSubmenu)}
        data-popup-open="true"
      >
        <span className={styles.itemIcon}>
          <OpenExternal />
        </span>
        <span className={styles.itemLabel}>Open</span>
        {caret}
        <div className={styles.submenu}>
          <div className={styles.item}>
            <span className={styles.itemLabel}>Default app</span>
          </div>
          <div className={styles.item}>
            <span className={styles.itemLabel}>Reveal in Finder</span>
          </div>
          <div className={styles.item}>
            <span className={styles.itemLabel}>Browser</span>
          </div>
        </div>
      </div>

      <hr className={styles.separator} />

      <div className={styles.item} data-selected="true">
        <span className={styles.indicator}>
          <Check width={14} height={14} />
        </span>
        <span className={styles.itemLabel}>List view</span>
      </div>
      <div className={styles.item} data-stale="true">
        <span className={styles.itemIcon}>
          <Link />
        </span>
        <span className={styles.itemLabel}>Syncing…</span>
      </div>
      <div className={styles.item} data-disabled="true">
        <span className={styles.itemIcon}>
          <Image />
        </span>
        <span className={styles.itemLabel}>Unavailable</span>
      </div>

      <hr className={styles.separator} />

      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Trash />
        </span>
        <span className={styles.itemLabel}>Delete</span>
        <Keys combo="⌫" />
      </div>
    </div>
  );
}

function ContextMenuSurface() {
  return (
    <div className={styles.popup}>
      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Copy />
        </span>
        <span className={styles.itemLabel}>Copy</span>
        <Keys combo="⌘C" />
      </div>
      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Link />
        </span>
        <span className={styles.itemLabel}>Copy link</span>
      </div>

      <hr className={styles.separator} />

      <div className={styles.item} data-checked="true">
        <span className={styles.indicator}>
          <Check width={14} height={14} />
        </span>
        <span className={styles.itemLabel}>Pinned</span>
      </div>
      <div
        className={cn(styles.item, styles.hasSubmenu)}
        data-popup-open="true"
      >
        <span className={styles.itemIcon}>
          <OpenExternal />
        </span>
        <span className={styles.itemLabel}>Open with</span>
        {caret}
        <div className={styles.submenu}>
          <div className={styles.item}>
            <span className={styles.itemLabel}>Default app</span>
          </div>
          <div className={styles.item}>
            <span className={styles.itemLabel}>Browser</span>
          </div>
        </div>
      </div>

      <hr className={styles.separator} />

      <div className={styles.item} data-disabled="true">
        <span className={styles.itemIcon}>
          <Caption />
        </span>
        <span className={styles.itemLabel}>Disabled action</span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemIcon}>
          <Trash />
        </span>
        <span className={styles.itemLabel}>Delete</span>
        <Keys combo="⌫" />
      </div>
    </div>
  );
}

function PopoverSurface() {
  return (
    <div className={styles.popup}>
      <div className={styles.popoverBody}>
        <h3 className={styles.popoverTitle}>Share this pond</h3>
        <p className={styles.popoverDescription}>
          Anyone with the link can view the items in this collection.
        </p>
        <div className={styles.popoverActions}>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            Copy link
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectSurface() {
  return (
    <div className={styles.popup}>
      <div className={styles.groupLabel}>Time</div>
      <div className={styles.item} data-selected="true">
        <span className={styles.itemLabel}>Most recent</span>
        <span className={styles.indicator}>
          <Check width={14} height={14} />
        </span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>Oldest first</span>
      </div>

      <hr className={styles.separator} />

      <div className={styles.groupLabel}>Name</div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>A → Z</span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>Z → A</span>
      </div>
      <div className={styles.item} data-disabled="true">
        <span className={styles.itemLabel}>Unavailable (soon)</span>
      </div>
    </div>
  );
}

export function PopupsPreview() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Popups</h1>
          <p className={styles.subtitle}>
            Menu, context menu, popover & select — every surface composes one
            canonical stylesheet (packages/ui/src/shared/popup.module.css)
          </p>
        </div>
      </header>

      <div className={styles.scroll}>
        <div className={styles.grid}>
          <Card
            title="Menu"
            caption="Group label, icons, keyboard hints, submenu carets, selected, stale & disabled."
          >
            <MenuSurface />
          </Card>

          <Card
            title="Context menu"
            caption="Same surface as menu: items, checked indicator, submenu & destructive action."
          >
            <ContextMenuSurface />
          </Card>

          <Card
            title="Popover"
            caption="Freeform surface with title, description and actions."
          >
            <PopoverSurface />
          </Card>

          <Card
            title="Select"
            caption="Grouped options with sticky labels, selected indicator & a disabled item."
          >
            <SelectSurface />
          </Card>
        </div>
      </div>
    </div>
  );
}
