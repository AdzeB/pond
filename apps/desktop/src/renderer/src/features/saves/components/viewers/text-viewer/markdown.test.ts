import { $isLinkNode } from "@lexical/link";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  INDENT_CONTENT_COMMAND,
} from "lexical";
import { describe, expect, it } from "vitest";
import { $applyNoteBlock } from "./commands";
import { markdownFromEditor } from "./markdown";
import { createNoteEditor } from "./note-extension";
import { $createYouTubeNode, parseYouTubeId } from "./youtube-node";

function editorWith(markdown: string) {
  return createNoteEditor(markdown);
}

describe("note markdown", () => {
  it("round-trips headings, lists, quote, and inline format", () => {
    const source = [
      "# Title",
      "",
      "A **bold** and *italic* line with ~~strike~~ and `code`.",
      "",
      "- one",
      "- two",
      "",
      "1. first",
      "",
      "> quoted",
    ].join("\n");
    const editor = editorWith(source);
    expect(markdownFromEditor(editor)).toContain("# Title");
    expect(markdownFromEditor(editor)).toContain("**bold**");
    expect(markdownFromEditor(editor)).toContain("*italic*");
    expect(markdownFromEditor(editor)).toContain("~~strike~~");
    expect(markdownFromEditor(editor)).toContain("`code`");
    expect(markdownFromEditor(editor)).toContain("- one");
    expect(markdownFromEditor(editor)).toContain("1. first");
    expect(markdownFromEditor(editor)).toContain("> quoted");
  });

  it("applies heading blocks from the command helper", () => {
    const editor = createNoteEditor();
    editor.update(
      () => {
        const text = $createTextNode("Hello");
        const paragraph = $createParagraphNode();
        paragraph.append(text);
        $getRoot().clear();
        $getRoot().append(paragraph);
        text.select(0, 5);
        $applyNoteBlock("h1");
      },
      { discrete: true },
    );
    expect(markdownFromEditor(editor)).toMatch(/^# Hello/m);
  });

  it("applies inline format commands used by the bubble and shortcuts", () => {
    const editor = createNoteEditor();
    editor.update(
      () => {
        const text = $createTextNode("Hello");
        const paragraph = $createParagraphNode();
        paragraph.append(text);
        $getRoot().clear();
        $getRoot().append(paragraph);
        text.select(0, 5);
        text.toggleFormat("bold");
        text.toggleFormat("italic");
        text.toggleFormat("strikethrough");
        text.toggleFormat("underline");
        text.toggleFormat("code");
      },
      { discrete: true },
    );
    const markdown = markdownFromEditor(editor);
    expect(markdown).toContain("**");
    expect(markdown).toContain("~~");
    expect(markdown).toContain("++");
    expect(markdown).toContain("`");
  });

  it("round-trips a collapsible section", () => {
    const source = [":::collapse", "Notes", "", "Hidden paragraph", ":::"].join(
      "\n",
    );
    const editor = editorWith(source);
    expect(markdownFromEditor(editor)).toContain(":::collapse");
    expect(markdownFromEditor(editor)).toContain("Notes");
    expect(markdownFromEditor(editor)).toContain("Hidden paragraph");
  });

  it("inserts a collapsible section from the command helper", () => {
    const editor = createNoteEditor();
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
        $applyNoteBlock("collapse");
      },
      { discrete: true },
    );
    expect(markdownFromEditor(editor)).toContain(":::collapse");
  });

  it("round-trips underline markers", () => {
    const editor = editorWith("A ++marked++ word");
    expect(markdownFromEditor(editor)).toContain("++marked++");
  });

  it("turns a typed URL into an autolink", () => {
    const editor = createNoteEditor();
    editor.update(
      () => {
        const text = $createTextNode("https://pond.app ");
        const paragraph = $createParagraphNode();
        paragraph.append(text);
        $getRoot().clear();
        $getRoot().append(paragraph);
      },
      { discrete: true },
    );
    editor.getEditorState().read(() => {
      const hasLink = $getRoot()
        .getAllTextNodes()
        .some((node) => $isLinkNode(node.getParent()));
      expect(hasLink).toBe(true);
    });
  });

  it("indents a list item with Tab", () => {
    const editor = editorWith("- one\n- two");
    editor.update(
      () => {
        const text = $getRoot().getLastDescendant();
        text?.selectEnd();
      },
      { discrete: true },
    );
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
    expect(markdownFromEditor(editor)).toMatch(/^\s+- two/m);
  });

  it("round-trips a local image", () => {
    const source = "![photo](file:///tmp/shot.png)";
    const editor = editorWith(source);
    expect(markdownFromEditor(editor)).toContain("file:///tmp/shot.png");
  });

  it("round-trips a YouTube watch URL as an embed", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(parseYouTubeId(url)).toBe("dQw4w9WgXcQ");
    const editor = editorWith(url);
    expect(markdownFromEditor(editor)).toContain(url);
    const editorFromNode = createNoteEditor();
    editorFromNode.update(
      () => {
        $getRoot().clear();
        $insertNodeToNearestRoot($createYouTubeNode("dQw4w9WgXcQ"));
      },
      { discrete: true },
    );
    expect(markdownFromEditor(editorFromNode)).toContain(url);
  });

  it("inserts heading 4 and a divider from the command helper", () => {
    const editor = createNoteEditor();
    editor.update(
      () => {
        const text = $createTextNode("Small");
        const paragraph = $createParagraphNode();
        paragraph.append(text);
        $getRoot().clear();
        $getRoot().append(paragraph);
        text.select(0, 5);
        $applyNoteBlock("h4");
      },
      { discrete: true },
    );
    expect(markdownFromEditor(editor)).toMatch(/^#### Small/m);
    editor.update(
      () => {
        $applyNoteBlock("hr");
      },
      { discrete: true },
    );
    expect(markdownFromEditor(editor)).toMatch(/^[-*_]{3,}$/m);
  });
});
