import { IconWindowDownloadFill18 } from "@pond/icons/fill/18";
import { Button, Empty } from "@pond/ui";
import { getAppRouter } from "@/shared/lib/app-router";

export function DownloadsEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconWindowDownloadFill18 />
      </Empty.Media>
      <Empty.Title>No downloads yet</Empty.Title>
      <Empty.Description>
        Files appear here while Pond downloads them for your library.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => getAppRouter()?.history.push("/")}
        >
          Open Library
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}
