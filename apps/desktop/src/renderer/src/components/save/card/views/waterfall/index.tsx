import { PreparedCardThumb } from "@/components/save/card/media";
import { Card } from "@/components/save/card/parts";
import type { SaveCardViewProps } from "@/components/save/card/views/types";
import styles from "./styles.module.css";

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
