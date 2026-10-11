import { IconArrowDiagonalInFill18 } from "@pond/icons/fill/18";
import { Button, Empty } from "@pond/ui";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";

export function SourcesEmpty({ scope }: { scope?: "account" | "watch" }) {
  const title =
    scope === "account"
      ? "No accounts yet"
      : scope === "watch"
        ? "No watches yet"
        : "No sources yet";
  const description =
    scope === "account"
      ? "Connect an account to keep Pond in sync."
      : scope === "watch"
        ? "Watch a public page to keep Pond in sync."
        : "Connect an account or watch a public one to keep Pond in sync.";
  return (
    <Empty.Root>
      <Empty.Media>
        <IconArrowDiagonalInFill18 />
      </Empty.Media>
      <Empty.Title>{title}</Empty.Title>
      <Empty.Description>{description}</Empty.Description>
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
