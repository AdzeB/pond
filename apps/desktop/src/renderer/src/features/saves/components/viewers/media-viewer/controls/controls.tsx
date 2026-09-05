import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
} from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import { ShortcutKeys } from "@/shared/components/shortcut-keys/shortcut-keys";
import styles from "./controls.module.css";

export function NavButtons({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  const sharedProps = {
    size: "sm",
    icon: true,
    variant: "secondary",
    className: styles.nav,
  } as const;

  return (
    <>
      <Tooltip
        label="Previous"
        shortcut={<ShortcutKeys id="viewer.prev-slide" />}
        side="right"
      >
        <Button {...sharedProps} onClick={onPrev} data-side="prev">
          <ArrowLeft />
        </Button>
      </Tooltip>
      <Tooltip
        label="Next"
        shortcut={<ShortcutKeys id="viewer.next-slide" />}
        side="left"
      >
        <Button {...sharedProps} onClick={onNext} data-side="next">
          <ArrowRight />
        </Button>
      </Tooltip>
    </>
  );
}
