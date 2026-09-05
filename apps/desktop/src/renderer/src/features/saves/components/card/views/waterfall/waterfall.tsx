import { PreparedCardThumb } from "@/features/saves/components/card/media/media";
import { Card } from "@/features/saves/components/card/parts/parts";
import type { SaveCardViewProps } from "@/features/saves/components/card/views/types";
import styles from "./waterfall.module.css";

export function WaterfallCard({ model, width }: SaveCardViewProps) {
  return (
    <>
      <Card.Media className={styles.media}>
        <Card.Frame>
          <PreparedCardThumb
            save={model.save}
            view="waterfall"
            width={width}
            mediaUnits={model.mediaUnits}
            pickOptions={model.pickOptions}
            unit={model.unit}
            primary={model.primary}
          />
        </Card.Frame>
        <Card.Overlay model={model.overlay} />
      </Card.Media>
      <Card.Meta title={model.title} time={model.time} />
    </>
  );
}
