import {
  IconAlbum2Outline18,
  IconArrowDiagonalInOutline18,
  IconBookmarkOutline18,
  IconBookmarkSlashOutline18,
  IconFolderBanOutline18,
  IconTrashXmarkOutline18,
  IconWindowDownloadOutline18,
} from "@pond/icons/outline/18";
import { Button, Window } from "@pond/ui";
import { useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, useState } from "react";
import { RightPaneView } from "@/app/components/right-pane/right-pane";
import { DownloadInspector } from "@/features/downloads/components/inspector/download-inspector";
import { DownloadsPage } from "@/features/downloads/components/page/page";
import shell from "@/features/library/components/workspace-shell/workspace-shell.module.css";
import {
  libraryChrome,
  useInspectorSaveId,
  useRightPane,
} from "@/features/library/state/library-chrome";
import styles from "./preview.module.css";
import { resetPreview, setPreviewStalled } from "./preview-fixtures";

function EmptyPane() {
  return null;
}
export function DownloadPreview() {
  const pane = useRightPane();
  const saveId = useInspectorSaveId();
  const [panelWidth, setPanelWidth] = useState(340);
  const [stalled, setStalled] = useState(false);
  const client = useQueryClient();
  return (
    <Window.Root
      className={`${shell.shell} ${styles.window}`}
      style={
        // SAFETY: React forwards this CSS custom property to the window root.
        { "--window-right-track": `${panelWidth}px` } as CSSProperties
      }
      leftOpen
      rightOpen={pane !== null}
    >
      <Window.Left open defaultWidth={220}>
        <div className={styles.sidebar}>
          <strong>Pond</strong>
          <span>Library</span>
          <div>
            <IconAlbum2Outline18 />
            All
          </div>
          <div>
            <IconFolderBanOutline18 />
            Uncategorized
          </div>
          <div>
            <IconBookmarkSlashOutline18 />
            Untagged
          </div>
          <div>
            <IconBookmarkOutline18 />
            Tags
          </div>
          <div>
            <IconTrashXmarkOutline18 />
            Trash
          </div>
          <span>Harvesting</span>
          <div className={styles.selected}>
            <IconWindowDownloadOutline18 />
            Downloads
          </div>
          <div>
            <IconArrowDiagonalInOutline18 />
            Sources
          </div>
          <span>Saved Views</span>
          <span>Folders</span>
        </div>
      </Window.Left>
      <Window.Top>
        <div className={styles.toolbar}>
          <IconWindowDownloadOutline18 />
          <span>Downloads</span>
          <span className={styles.demo}>Local preview</span>
          <Button
            size="xs"
            variant="ghost"
            aria-pressed={stalled}
            onClick={() => {
              setStalled(!stalled);
              setPreviewStalled(!stalled);
              void client.invalidateQueries({
                queryKey: ["downloads.activity"],
              });
            }}
          >
            Slow Connection
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              resetPreview();
              setStalled(false);
              void client.invalidateQueries();
            }}
          >
            Reset
          </Button>
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Toggle Details"
            onClick={libraryChrome.toggleRightPane}
          >
            <IconWindowDownloadOutline18 />
          </Button>
        </div>
      </Window.Top>
      <Window.Center>
        <DownloadsPage />
      </Window.Center>
      <Window.Right
        className={shell["right-pane"]}
        open={pane !== null}
        minWidth={280}
        maxWidth={560}
        defaultWidth={340}
        resizeLabel="Resize Details"
        onResize={setPanelWidth}
        onCollapse={libraryChrome.closeRightPane}
      >
        <RightPaneView
          pane={pane}
          saveId={saveId}
          inspectorMode="download"
          assistantPage={false}
          reduceMotion={false}
          AgentContent={EmptyPane}
          InspectorContent={EmptyPane}
          DownloadInspectorContent={DownloadInspector}
        />
      </Window.Right>
    </Window.Root>
  );
}
