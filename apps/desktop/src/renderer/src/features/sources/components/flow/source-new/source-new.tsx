import {
  IconEyeFill18 as Eye,
  IconUserPlusFill18 as UserPlus,
} from "@pond/icons/fill/18";
import { IconChevronRightOutline12 as ChevronRight } from "@pond/icons/outline/12";
import { Button, PageDialog } from "@pond/ui";
import { sourceFlow } from "@/features/sources/state/source-flow";
import styles from "./source-new.module.css";

export function SourceNewSection() {
  return (
    <>
      <PageDialog.Description>
        Sync an account you own, or watch someone public.
      </PageDialog.Description>
      <div className={styles.rows}>
        <Button
          variant="ghost"
          size="xl"
          width="full"
          className={styles.row}
          onClick={() => sourceFlow.push("connect-source")}
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
          onClick={() => sourceFlow.push("watch-source")}
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
