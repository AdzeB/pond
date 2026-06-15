import { cn } from "@pond/ui";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";

export function LibraryMask() {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollBottom, setScrollBottom] = useState(0);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      setScrollTop(window.scrollY);
      setScrollBottom(
        window.innerHeight - window.scrollY - document.body.offsetHeight,
      );
    });
    return () => {
      window.removeEventListener("scroll", () => {
        setScrollTop(0);
        setScrollBottom(0);
      });
    };
  }, []);

  const topVisible = scrollTop > 0;
  const bottomVisible = scrollBottom > 0;

  return (
    <div className={styles.mask}>
      <div className={cn(styles.top, topVisible && styles.visible)} />
      <div className={cn(styles.bottom, bottomVisible && styles.visible)} />
    </div>
  );
}
