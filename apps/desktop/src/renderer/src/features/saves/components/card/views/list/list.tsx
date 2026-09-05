import { PreparedCardThumb } from "@/features/saves/components/card/media/media";
import { Card } from "@/features/saves/components/card/parts/parts";
import type { SaveCardViewProps } from "@/features/saves/components/card/views/types";
import styles from "./list.module.css";

export function ListCard({ model, width }: SaveCardViewProps) {
  return (
    <div className={styles.body}>
      <Card.Media className={styles.media}>
        <Card.Frame>
          <PreparedCardThumb
            save={model.save}
            view="list"
            width={width}
            mediaUnits={model.mediaUnits}
            pickOptions={model.pickOptions}
            unit={model.unit}
            primary={model.primary}
          />
        </Card.Frame>
        <Card.Overlay model={model.overlay} />
      </Card.Media>
      <Card.Meta
        className={styles.meta}
        title={model.title}
        time={model.time}
      />
    </div>
  );
}
