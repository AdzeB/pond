import type { SourceMessagePartProps } from "@assistant-ui/react";
import { ContentRow } from "../content-row";
import { Reveal } from "../reveal";

export function Source({ title, url }: SourceMessagePartProps) {
  const safeUrl =
    url &&
    URL.canParse(url) &&
    ["https:", "http:"].includes(new URL(url).protocol)
      ? url
      : undefined;
  return (
    <Reveal>
      <ContentRow.Root>
        <ContentRow.Content>
          <ContentRow.Title>
            {safeUrl ? (
              <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                {title || url || "Reference"}
              </a>
            ) : (
              title || url || "Reference"
            )}
          </ContentRow.Title>
          {title && <ContentRow.Description>{url}</ContentRow.Description>}
        </ContentRow.Content>
      </ContentRow.Root>
    </Reveal>
  );
}
