import { IconArrowUpRightOutline18 } from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import {
  $applyNodeReplacement,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import styles from "./styles.module.css";

const YOUTUBE_ID =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export type SerializedYouTubeNode = Spread<
  { id: string },
  SerializedLexicalNode
>;

export function parseYouTubeId(value: string): string | null {
  const match = YOUTUBE_ID.exec(value);
  return match?.[1] ?? null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export class YouTubeNode extends DecoratorNode<JSX.Element> {
  __id: string;

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  static getType(): string {
    return "youtube";
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__id, node.__key);
  }

  static importJSON(serialized: SerializedYouTubeNode): YouTubeNode {
    return $createYouTubeNode(serialized.id).updateFromJSON(serialized);
  }

  exportJSON(): SerializedYouTubeNode {
    return { ...super.exportJSON(), id: this.__id };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = styles.media ?? "";
    return figure;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): false {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getId(): string {
    return this.__id;
  }

  decorate(): JSX.Element {
    const watch = youtubeWatchUrl(this.__id);
    return (
      <div className={styles.youtube}>
        <iframe
          className={styles.frame}
          src={youtubeEmbedUrl(this.__id)}
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        <Button
          size="xs"
          variant="ghost"
          aria-label="Open"
          onClick={() => {
            void window.pond.openExternal(watch);
          }}
        >
          <IconArrowUpRightOutline18 />
          Open
        </Button>
      </div>
    );
  }
}

export function $createYouTubeNode(id: string): YouTubeNode {
  return $applyNodeReplacement(new YouTubeNode(id));
}

export function $isYouTubeNode(
  node: LexicalNode | null | undefined,
): node is YouTubeNode {
  return node instanceof YouTubeNode;
}
