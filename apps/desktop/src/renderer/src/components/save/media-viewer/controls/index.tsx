import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import styles from "./styles.module.css";

export function NavButtons({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Tooltip label="Previous" side="right">
        <Button
          size="sm"
          icon
          onClick={onPrev}
          aria-label="Previous"
          className={styles.nav}
          data-side="prev"
        >
          <ArrowLeft width={14} height={14} />
        </Button>
      </Tooltip>
      <Tooltip label="Next" side="left">
        <Button
          size="sm"
          icon
          onClick={onNext}
          aria-label="Next"
          className={styles.nav}
          data-side="next"
        >
          <ArrowRight width={14} height={14} />
        </Button>
      </Tooltip>
    </>
  );
}
