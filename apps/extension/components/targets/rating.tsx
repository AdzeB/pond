import { IconStarFill } from "@pond/icons";
import { Button } from "@pond/ui/button";
import styles from "./styles.module.css";

const STARS = [1, 2, 3, 4, 5];

interface RatingProps {
  value: number;
  onValueChange: (value: number) => void;
}

export function Rating({ value, onValueChange }: RatingProps) {
  return (
    <fieldset
      className={styles.rating}
      aria-label={
        value
          ? `Rating: ${value} of 5 stars. Select the current rating to remove it.`
          : "Rating: Unrated"
      }
    >
      {STARS.map((star) => (
        <Button
          key={star}
          icon
          size="xs"
          variant="text"
          aria-label={`${star} ${star === 1 ? "Star" : "Stars"}`}
          aria-pressed={star === value}
          data-active={star <= value || undefined}
          className={styles.star}
          onClick={() => onValueChange(star === value ? 0 : star)}
        >
          <IconStarFill size={14} />
        </Button>
      ))}
    </fieldset>
  );
}
