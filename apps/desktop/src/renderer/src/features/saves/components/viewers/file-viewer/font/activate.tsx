import { IconTypography } from "@pond/icons";
import { useEffect, useState } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import type { Save } from "@/features/saves/types";

export function FontActivate({ save }: { save: Save }) {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let active = true;
    void window.pond
      .query("saves.fontStatus", { id: save.id })
      .then((status) => {
        if (active) setActivated(status.activated);
      });
    return () => {
      active = false;
    };
  }, [save.id]);

  return (
    <ViewerHud.Tool
      label={activated ? "Deactivate Font" : "Activate Font"}
      pressed={activated}
      onClick={() => {
        void window.pond
          .query(activated ? "saves.deactivateFont" : "saves.activateFont", {
            id: save.id,
          })
          .then((result) => {
            if (result.ok) setActivated(!activated);
          });
      }}
    >
      <IconTypography />
    </ViewerHud.Tool>
  );
}
