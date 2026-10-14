import { IconNodes3Fill } from "@pond/icons";
import { Button, Empty } from "@pond/ui";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";

export function SourcesEmpty() {
  return (
    <Empty.Root>
      <Empty.Media>
        <IconNodes3Fill />
      </Empty.Media>
      <Empty.Title>No sources yet</Empty.Title>
      <Empty.Description>
        Connect an account or watch a public one to keep Pond in sync.
      </Empty.Description>
      <Empty.Action>
        <Button
          variant="primary"
          size="sm"
          onClick={() => sourceNewMenu.open()}
        >
          New Source
        </Button>
      </Empty.Action>
    </Empty.Root>
  );
}
