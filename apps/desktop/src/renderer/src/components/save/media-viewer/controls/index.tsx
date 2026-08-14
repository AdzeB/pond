import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
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
      <Tooltip
        label="Previous"
        shortcut={<ShortcutKeys id="viewer.prev-slide" />}
        side="right"
      >
        <Button
          size="sm"
          icon
          onClick={onPrev}
          aria-label="Previous"
          className={styles.nav}
          data-side="prev"
        >
          <ArrowLeft />
        </Button>
      </Tooltip>
      <Tooltip
        label="Next"
        shortcut={<ShortcutKeys id="viewer.next-slide" />}
        side="left"
      >
        <Button
          size="sm"
          icon
          onClick={onNext}
          aria-label="Next"
          className={styles.nav}
          data-side="next"
        >
          <ArrowRight />
        </Button>
      </Tooltip>
    </>
  );
}
