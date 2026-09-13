import {
  AutoEmbedOption,
  type EmbedConfig,
  type EmbedMatchResult,
  LexicalAutoEmbedPlugin,
} from "@lexical/react/LexicalAutoEmbedPlugin";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { Menu } from "@pond/ui";
import type { LexicalEditor } from "lexical";
import { type MouseEvent as ReactMouseEvent, useMemo } from "react";
import { createPortal } from "react-dom";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";
import {
  $createYouTubeNode,
  parseYouTubeId,
  youtubeWatchUrl,
} from "./youtube-node";

interface YouTubeEmbedConfig extends EmbedConfig {
  type: "youtube";
}

const YOUTUBE_EMBED: YouTubeEmbedConfig = {
  type: "youtube",
  parseUrl: (text) => {
    const id = parseYouTubeId(text);
    if (!id) return null;
    return { id, url: youtubeWatchUrl(id) };
  },
  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.update(() => {
      $insertNodeToNearestRoot($createYouTubeNode(result.id));
    });
  },
};

export function YouTubeEmbed() {
  const configs = useMemo(() => [YOUTUBE_EMBED], []);

  return (
    <LexicalAutoEmbedPlugin<YouTubeEmbedConfig>
      embedConfigs={configs}
      getMenuOptions={(_config, embedFn, dismissFn) => [
        new AutoEmbedOption("Embed", {
          onSelect: () => embedFn(),
        }),
        new AutoEmbedOption("Keep as Link", {
          onSelect: () => dismissFn(),
        }),
      ]}
      menuRenderFn={(
        anchor,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex, options },
      ) =>
        anchor.current
          ? createPortal(
              <EmbedMenu>
                {options.map((option, index) => (
                  <Menu.Row
                    key={option.key}
                    id={`note-embed-${option.key}`}
                    ref={option.setRefElement}
                    role="option"
                    aria-selected={selectedIndex === index}
                    tabIndex={-1}
                    highlighted={selectedIndex === index}
                    onMouseDown={(event: ReactMouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOptionAndCleanUp(option)}
                  >
                    <Menu.ItemLabel>{option.title}</Menu.ItemLabel>
                  </Menu.Row>
                ))}
              </EmbedMenu>,
              anchor.current,
            )
          : null
      }
    />
  );
}

function EmbedMenu({ children }: { children: React.ReactNode }) {
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <Menu.Surface className={styles.slash} aria-label="Embed">
      <div className={styles.commands} {...scrollFade}>
        <Menu.Group>{children}</Menu.Group>
      </div>
    </Menu.Surface>
  );
}

export function insertYouTubeFromUrl(editor: LexicalEditor, url: string): void {
  const id = parseYouTubeId(url);
  if (!id) throw new Error("Enter a YouTube URL.");
  editor.update(() => {
    $insertNodeToNearestRoot($createYouTubeNode(id));
  });
}
