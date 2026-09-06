import { IconChevronRightOutline12 } from "@pond/icons/outline/12";
import {
  IconGear3Outline18,
  IconMagnifierOutline18,
  IconSlidersOutline18,
  IconUserOutline18,
} from "@pond/icons/outline/18";
import type { Source } from "@pond/schema/db";
import { Button, Dialog } from "@pond/ui";
import type { ReactNode } from "react";
import {
  type SourceFlowPage,
  sourceFlow,
} from "@/features/sources/state/source-flow";
import styles from "./detail.module.css";
import { HeroAvatar } from "./hero-avatar/hero-avatar";

export function DetailOverview({
  source,
  avatarUrl,
  name,
  handle,
  pages,
  children,
  error,
  onViewItems,
}: {
  onViewItems: () => void;
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  handle: string | null;
  pages: {
    profile: SourceFlowPage;
    maintenance?: SourceFlowPage;
    options: SourceFlowPage;
  };
  children: ReactNode;
  error?: string | null;
}) {
  const links = [
    { label: "Profile", page: pages.profile, Icon: IconUserOutline18 },
    ...(pages.maintenance
      ? [
          {
            label: "Maintenance",
            page: pages.maintenance,
            Icon: IconGear3Outline18,
          },
        ]
      : []),
    { label: "Options", page: pages.options, Icon: IconSlidersOutline18 },
  ];
  return (
    <>
      <div className={styles.hero}>
        <HeroAvatar
          source={source}
          avatarUrl={avatarUrl}
          size={96}
          badgeSize={32}
        />
        <div className={styles.copy}>
          <h1 className={styles.name}>{name}</h1>
          {handle ? <span className={styles.handle}>{handle}</span> : null}
        </div>
      </div>
      <div className={styles.navigation}>
        {links.map(({ label, page, Icon }) => (
          <Button
            key={page}
            variant="ghost"
            size="xl"
            width="full"
            className={styles.row}
            data-button=""
            onClick={() => sourceFlow.push(page)}
          >
            <span className={styles.icon}>
              <Icon size={18} />
            </span>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>
              <IconChevronRightOutline12 />
            </span>
          </Button>
        ))}
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          data-button=""
          onClick={() => {
            onViewItems();
            sourceFlow.close();
          }}
        >
          <span className={styles.icon}>
            <IconMagnifierOutline18 size={18} />
          </span>
          <span className={styles.label}>View Items in Library</span>
          <span className={styles.value}>
            <IconChevronRightOutline12 />
          </span>
        </Button>
      </div>
      <Dialog.Footer className={styles.footer}>{children}</Dialog.Footer>
      {error ? <p className={styles.error}>{error}</p> : null}
    </>
  );
}
