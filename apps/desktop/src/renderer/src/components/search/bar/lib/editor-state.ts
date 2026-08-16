import { $getRoot } from "lexical";

/** Token nodes contribute their literal `key:value` text, so `parseSearchInput` sees exactly the tokens the user assembled. */
export function $readSearchString(): string {
  return $getRoot().getTextContent().replace(/\s+/g, " ").trim();
}
