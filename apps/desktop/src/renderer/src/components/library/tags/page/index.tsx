import { TagsSection } from "@/components/settings/tags";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import styles from "./styles.module.css";

export function TagsPage() {
  const scrollFade = useScrollFade<HTMLDivElement>();

  return (
    <div className={styles.page} {...scrollFade}>
      <TagsSection />
    </div>
  );
}
