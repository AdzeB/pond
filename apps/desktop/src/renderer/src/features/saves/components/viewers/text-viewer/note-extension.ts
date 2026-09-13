import {
  AriaLiveRegionExtension,
  EditorModeAnnounceExtension,
  FocusManagerExtension,
  HistoryAnnounceExtension,
} from "@lexical/a11y";
import { CodeShikiExtension } from "@lexical/code-shiki";
import {
  buildEditorFromExtensions,
  ClickAfterLastBlockExtension,
  EditorStateExtension,
  HorizontalRuleExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension,
} from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import {
  AutoLinkExtension,
  autoLinkUrlMatcher,
  ClickableLinkExtension,
  LinkExtension,
} from "@lexical/link";
import { CheckListExtension, ListExtension } from "@lexical/list";
import {
  MdastCommonMarkExtension,
  MdastExtension,
  MdastGfmExtension,
  MdastShortcutsExtension,
  MdastTableExtension,
} from "@lexical/mdast";
import { RichTextExtension } from "@lexical/rich-text";
import { TableExtension } from "@lexical/table";
import {
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  configExtension,
  defineExtension,
  type LexicalEditor,
} from "lexical";
import { COLLAPSE_NODES } from "./collapsible";
import { FileNode } from "./file-node";
import { ImageNode } from "./image-node";
import { $writeMarkdown, pondMdastExtension } from "./markdown";
import styles from "./styles.module.css";
import { YouTubeNode } from "./youtube-node";

export const NOTE_THEME = {
  paragraph: styles.p,
  heading: {
    h1: styles.h1,
    h2: styles.h2,
    h3: styles.h3,
    h4: styles.h4,
  },
  list: {
    ul: styles.ul,
    ol: styles.ol,
    listitem: styles.li,
    nested: { listitem: styles["nested-item"] },
    listitemChecked: styles.checked,
    listitemUnchecked: styles.unchecked,
  },
  quote: styles.quote,
  code: styles.code,
  text: {
    bold: styles.bold,
    italic: styles.italic,
    strikethrough: styles.strike,
    underline: styles.underline,
    code: styles["inline-code"],
  },
  link: styles.link,
  hr: styles.hr,
  table: styles.table,
  tableScrollableWrapper: styles["table-scroll"],
  tableCell: styles.cell,
  tableCellHeader: styles.header,
};

function registerOpenExternal(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    CLICK_COMMAND,
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return false;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return false;
      if (editor.isEditable() && !event.metaKey && !event.ctrlKey) return false;
      event.preventDefault();
      void window.pond.openExternal(anchor.href);
      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
}

export function createNoteExtension(opts: {
  markdown: string;
  editable: boolean;
}) {
  return defineExtension({
    name: "@pond/note",
    namespace: "note",
    theme: NOTE_THEME,
    editable: opts.editable,
    nodes: () => [...COLLAPSE_NODES, ImageNode, FileNode, YouTubeNode],
    $initialEditorState: () => {
      $writeMarkdown(opts.markdown);
    },
    onError: (error: Error) => {
      console.error("[pond note]", error);
    },
    dependencies: [
      RichTextExtension,
      configExtension(HistoryExtension, { delay: 400 }),
      ListExtension,
      CheckListExtension,
      LinkExtension,
      configExtension(AutoLinkExtension, { matchers: [autoLinkUrlMatcher] }),
      configExtension(ClickableLinkExtension, { disabled: true }),
      HorizontalRuleExtension,
      TabIndentationExtension,
      configExtension(CodeShikiExtension, {
        disabled: Boolean(import.meta.env.VITEST),
      }),
      SelectionAlwaysOnDisplayExtension,
      EditorStateExtension,
      SelectBlockExtension,
      ClickAfterLastBlockExtension,
      AriaLiveRegionExtension,
      configExtension(HistoryAnnounceExtension, {
        undone: "Undone",
        redone: "Redone",
      }),
      configExtension(EditorModeAnnounceExtension, {
        editable: "Editing",
        readOnly: "Read only",
      }),
      FocusManagerExtension,
      TableExtension,
      MdastCommonMarkExtension,
      MdastGfmExtension,
      MdastTableExtension,
      MdastExtension,
      MdastShortcutsExtension,
      pondMdastExtension,
    ],
    register: (editor) => registerOpenExternal(editor),
  });
}

export function createNoteEditor(markdown = "") {
  return buildEditorFromExtensions(
    createNoteExtension({ markdown, editable: true }),
  );
}
