import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { registerLexicalTextEntity } from "@lexical/text";
import type { TextNode } from "lexical";
import { useEffect } from "react";
import { TOKEN_FIELDS } from "@/lib/search/syntax";
import { $createFilterTokenNode, FilterTokenNode } from "./token-node";

const KEYS = TOKEN_FIELDS.flatMap((spec) => spec.keys);

// A `key op value` token restricted to known field keys, with a value that is
// either a quoted run (`by:"Jane Doe"`) or a whitespace-free word. Group 2 is
// the token itself (optionally negated), sitting at input start or after space.
const TOKEN_RE = new RegExp(
  `(^|\\s)(-?(?:${KEYS.join("|")})(?::|>=|<=|>|<)(?:"[^"]*"|[^\\s"])+)`,
  "i",
);

function getFilterMatch(text: string): { start: number; end: number } | null {
  const match = TOKEN_RE.exec(text);
  if (!match) return null;
  const lead = match[1] ?? "";
  const token = match[2] ?? "";
  const start = match.index + lead.length;
  return { start, end: start + token.length };
}

// Wraps matching tokens into editable FilterTokenNodes and reverts them the
// instant they stop matching, so highlighting tracks the text as it's edited.
export function FilterTokenPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([FilterTokenNode])) return;
    const cleanups = registerLexicalTextEntity(
      editor,
      getFilterMatch,
      FilterTokenNode,
      (node: TextNode) => $createFilterTokenNode(node.getTextContent()),
    );
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [editor]);

  return null;
}
