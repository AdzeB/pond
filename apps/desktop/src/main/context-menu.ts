/** Native right-click menu for editable fields; non-editable surfaces get renderer-driven Base UI menus instead. */
import {
  Menu,
  type MenuItemConstructorOptions,
  type WebContents,
} from "electron";

export function attachEditableContextMenu(contents: WebContents): void {
  contents.on("context-menu", (_event, params) => {
    if (!params.isEditable) return;

    const template: MenuItemConstructorOptions[] = [];

    for (const suggestion of params.dictionarySuggestions) {
      template.push({
        label: suggestion,
        click: () => contents.replaceMisspelling(suggestion),
      });
    }
    if (params.misspelledWord) {
      template.push({
        label: "Add to Dictionary",
        click: () =>
          contents.session.addWordToSpellCheckerDictionary(
            params.misspelledWord,
          ),
      });
      template.push({ type: "separator" });
    }

    template.push(
      { role: "cut", enabled: params.editFlags.canCut },
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "paste", enabled: params.editFlags.canPaste },
      { type: "separator" },
      { role: "selectAll", enabled: params.editFlags.canSelectAll },
    );

    Menu.buildFromTemplate(template).popup();
  });
}
