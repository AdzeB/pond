import { IconStarOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { mutateSave } from "@/features/saves/lib/mutate";
import type { Save } from "@/features/saves/types";
import styles from "./rating.module.css";

export function RatingStars({ save }: { save: Save }) {
  const value = save.rating ?? 0;
  return (
    <fieldset className={styles.root} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          icon
          size="xs"
          variant="ghost"
          aria-label={`${star} ${star === 1 ? "Star" : "Stars"}`}
          data-active={star <= value || undefined}
          className={styles.star}
          onClick={() =>
            void mutateSave(
              save.id,
              { rating: value === star ? null : star },
              { actorReason: "inspect:rating" },
            )
          }
        >
          <IconStarOutline18 />
        </Button>
      ))}
    </fieldset>
  );
}
