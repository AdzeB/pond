import { IconArrowLeft, IconArrowRight } from "@pond/icons";
import { Button } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { libraryChrome } from "@/features/library/state/library-chrome";
import {
  navigationHistory,
  useNavigationHistory,
} from "@/features/library/state/navigation-history";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import styles from "./styles.module.css";

export function ChromeHistoryNav() {
  const router = useRouter();
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const history = useNavigationHistory();

  useEffect(() => {
    const sync = () => {
      setCanBack(router.history.canGoBack());
      const index = router.history.location.state?.__TSR_index ?? 0;
      setCanForward(index < router.history.length - 1);
    };

    sync();

    return router.history.subscribe(sync);
  }, [router]);

  return (
    <div className={styles.nav}>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Back"
        disabled={history.index === 0 && !canBack}
        onClick={() => {
          if (saveIdFromPath(router.state.location.pathname)) {
            router.history.back();
            return;
          }
          const target = navigationHistory.back();
          if (target) libraryChrome.setNav(target);
          else router.history.back();
        }}
      >
        <IconArrowLeft />
      </Button>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Forward"
        disabled={history.index >= history.entries.length - 1 && !canForward}
        onClick={() => {
          if (saveIdFromPath(router.state.location.pathname)) {
            router.history.forward();
            return;
          }
          const target = navigationHistory.forward();
          if (target) libraryChrome.setNav(target);
          else router.history.forward();
        }}
      >
        <IconArrowRight />
      </Button>
    </div>
  );
}
