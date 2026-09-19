import { CodeExtension } from "@lexical/code";
import {
  EditorStateExtension,
  HorizontalRuleExtension,
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
import { configExtension, defineExtension } from "lexical";

export const markdownEditorExtension = defineExtension({
  name: "@pond/markdown-editor",
  dependencies: [
    RichTextExtension,
    configExtension(HistoryExtension, { delay: 400 }),
    ListExtension,
    CheckListExtension,
    LinkExtension,
    configExtension(AutoLinkExtension, { matchers: [autoLinkUrlMatcher] }),
    configExtension(ClickableLinkExtension, { disabled: true }),
    CodeExtension,
    HorizontalRuleExtension,
    TabIndentationExtension,
    EditorStateExtension,
    TableExtension,
    MdastCommonMarkExtension,
    MdastGfmExtension,
    MdastTableExtension,
    MdastExtension,
    MdastShortcutsExtension,
  ],
});
