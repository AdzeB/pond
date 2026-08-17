import {
  IconEyeFill18 as Eye,
  IconUserPlusFill18 as UserPlus,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, TrayCard } from "@pond/ui";
import { useDock } from "@/components/library/dock/lib/context";
import styles from "./styles.module.css";

/** Chooser between the two ways of adding a source: sign in, or watch a public account. */
export function SourceNewSection() {
  const dock = useDock();

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>New Source</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Sync an account you own, or watch someone public.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          onClick={() => dock.openViewMenu("connect-source")}
        >
          <span className={styles.icon}>
            <UserPlus size={18} />
          </span>
          <span className={styles.label}>Connect a Source</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          onClick={() => dock.openViewMenu("watch-source")}
        >
          <span className={styles.icon}>
            <Eye size={18} />
          </span>
          <span className={styles.label}>Watch Someone</span>
          <span className={styles.value}>
            <ChevronRight />
          </span>
        </Button>
      </div>
    </>
  );
}
