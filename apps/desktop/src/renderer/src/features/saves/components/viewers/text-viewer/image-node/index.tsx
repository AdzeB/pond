import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import styles from "./styles.module.css";

export type SerializedImageNode = Spread<
  { src: string; alt: string },
  SerializedLexicalNode
>;

function $convertImage(element: HTMLElement): DOMConversionOutput | null {
  if (!(element instanceof HTMLImageElement) || !element.src) return null;
  return { node: $createImageNode({ src: element.src, alt: element.alt }) };
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serialized.src,
      alt: serialized.alt,
    }).updateFromJSON(serialized);
  }

  exportJSON(): SerializedImageNode {
    return { ...super.exportJSON(), src: this.__src, alt: this.__alt };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({ conversion: $convertImage, priority: 0 }),
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    return { element: img };
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

  getSrc(): string {
    return this.__src;
  }

  getAlt(): string {
    return this.__alt;
  }

  decorate(): JSX.Element {
    return <img className={styles.image} src={this.__src} alt={this.__alt} />;
  }
}

export function $createImageNode(opts: {
  src: string;
  alt: string;
}): ImageNode {
  return $applyNodeReplacement(new ImageNode(opts.src, opts.alt));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
