import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  useResultIndex,
  useResultTotal,
} from "@/features/saves/state/result-navigation";

export function ViewerResultCount({ saveId }: { saveId: string }) {
  const index = useResultIndex(saveId);
  const total = useResultTotal();

  if (index < 0 || total <= 0) return null;

  return (
    <ViewerHud.Scale>
      {index + 1} / {total}
    </ViewerHud.Scale>
  );
}
