interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

const excluded = new Set([
  "code",
  "inlineCode",
  "link",
  "linkReference",
  "image",
  "imageReference",
  "html",
  "definition",
]);

export function remarkSaveCitations({
  count,
  source,
}: {
  count: number;
  source: string;
}) {
  return (tree: MarkdownNode) => {
    if (!count) return;
    function visit(node: MarkdownNode) {
      if (!node.children || excluded.has(node.type)) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" || !child.value) {
          visit(child);
          return [child];
        }
        const start = child.position?.start.offset;
        const end = child.position?.end.offset;
        const raw =
          start !== undefined && end !== undefined
            ? source.slice(start, end)
            : child.value;
        const escaped = new Set<number>();
        let unescaped = "";
        let rawCursor = 0;
        for (const escapedCharacter of raw.matchAll(/\\([!-/:-@[-`{-~])/g)) {
          unescaped += raw.slice(rawCursor, escapedCharacter.index);
          escaped.add(unescaped.length);
          unescaped += escapedCharacter[1];
          rawCursor = escapedCharacter.index + escapedCharacter[0].length;
        }
        unescaped += raw.slice(rawCursor);
        if (escaped.size && unescaped !== child.value) return [child];
        const parts: MarkdownNode[] = [];
        let cursor = 0;
        for (const match of child.value.matchAll(
          /\[([1-9]\d*(?:\s*,\s*[1-9]\d*)*)\]|(?<![\p{L}\p{N}_/#-])#save-([1-9]\d*)(?![\p{L}\p{N}_#-]|\.\d)/gu,
        )) {
          const references = match[2]
            ? [Number(match[2])]
            : (match[1]?.split(/\s*,\s*/).map(Number) ?? []);
          if (
            references.some((reference) => reference > count) ||
            [...escaped].some(
              (offset) =>
                offset >= match.index && offset < match.index + match[0].length,
            )
          )
            continue;
          parts.push({
            type: "text",
            value: child.value.slice(cursor, match.index),
          });
          for (const reference of references) {
            parts.push({
              type: "link",
              url: `#save-${reference}`,
              children: [{ type: "text", value: String(reference) }],
            });
          }
          cursor = match.index + match[0].length;
        }
        if (!cursor) return [child];
        parts.push({ type: "text", value: child.value.slice(cursor) });
        return parts;
      });
    }
    visit(tree);
  };
}
