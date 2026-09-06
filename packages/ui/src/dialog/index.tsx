import { ConfirmDialogHost, confirm } from "./confirm";
import { DialogParts } from "./dialog";
import { PromptDialogHost, prompt } from "./prompt";

function Host() {
  return (
    <>
      <ConfirmDialogHost />
      <PromptDialogHost />
    </>
  );
}

export const Dialog = { ...DialogParts, confirm, prompt, Host };
