import type { ComponentProps, ReactNode, RefObject } from "react";
import { useCallback, useState } from "react";
import { ComposerView } from "../composer/composer-view";
import { Thread } from "./thread";

export function ConversationView({
  empty,
  composer = <ComposerView />,
  children,
  viewportProps,
  ...props
}: ComponentProps<typeof Thread.Root> & {
  empty?: ReactNode;
  composer?: ReactNode;
  viewportProps?: ComponentProps<typeof Thread.Viewport> & {
    ref?: RefObject<HTMLDivElement | null>;
  };
}) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const { ref: viewportRef, ...restViewport } = viewportProps ?? {};
  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      setViewport(node);
      if (viewportRef) viewportRef.current = node;
    },
    [viewportRef],
  );
  return (
    <Thread.Root {...props}>
      <Thread.Viewport {...restViewport} ref={setViewportRef}>
        <Thread.Messages empty={empty}>{children}</Thread.Messages>
        <Thread.ViewportFooter>
          <Thread.ScrollToLatest viewport={viewport} />
          {composer}
        </Thread.ViewportFooter>
      </Thread.Viewport>
    </Thread.Root>
  );
}
