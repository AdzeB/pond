import { IconCheckOutline18, IconPlusOutline18 } from "@pond/icons/outline/18";
import { ContentRow, Tooltip } from "@pond/ui";
import type { AssistantSource } from "@shared/assistant";
import { sourceExcerpt } from "@shared/assistant-text";
import { SourceThumbnail, sourceDomain } from "./save-preview";

export function SaveReferenceCard({
  source,
  attached = false,
  onOpenSave,
  onAttach,
}: {
  source: AssistantSource;
  attached?: boolean;
  onOpenSave: (id: string) => void;
  onAttach: (sources: AssistantSource[]) => void;
}) {
  const title = sourceExcerpt(source.title, 180) || "Untitled";
  return (
    <ContentRow.Root>
      <ContentRow.Trigger
        onClick={() => onOpenSave(source.id)}
        aria-label={`Open ${title}`}
      >
        <ContentRow.Media size="thumbnail">
          <SourceThumbnail id={source.id} source={source} />
        </ContentRow.Media>
        <ContentRow.Content>
          <ContentRow.Title>{title}</ContentRow.Title>
          <ContentRow.Description>
            {sourceDomain(source)}
          </ContentRow.Description>
          {source.notes || source.description ? (
            <ContentRow.Description>
              {sourceExcerpt(source.notes || source.description, 140)}
            </ContentRow.Description>
          ) : null}
        </ContentRow.Content>
      </ContentRow.Trigger>
      <Tooltip label={attached ? "Added to Message" : "Add to Message"}>
        <ContentRow.Action
          aria-label={`Add ${title} to message`}
          disabled={attached}
          onClick={() => onAttach([source])}
        >
          {attached ? <IconCheckOutline18 /> : <IconPlusOutline18 />}
        </ContentRow.Action>
      </Tooltip>
    </ContentRow.Root>
  );
}
