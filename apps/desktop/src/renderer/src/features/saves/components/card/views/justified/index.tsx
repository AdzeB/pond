import { PreparedCardThumb } from "@/features/saves/components/card/media";
import { Card } from "@/features/saves/components/card/parts";
import type { SaveCardViewProps } from "@/features/saves/components/card/views/types";
import styles from "./styles.module.css";

export function JustifiedCard({ model, width }: SaveCardViewProps) {
  return (
    <>
      <Card.Media className={styles.media}>
        <Card.Frame>
          <PreparedCardThumb
            save={model.save}
            view="justified"
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
