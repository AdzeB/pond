import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import { Keyboard } from "@pond/ui";
import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  RefObject,
} from "react";
import { SearchChromeInput } from "@/shared/components/search-chrome";
import styles from "./styles.module.css";

interface SearchFieldProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  activeDescendant?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}

export function SearchField({
  inputRef,
  value,
  activeDescendant,
  onChange,
  onKeyDown,
}: SearchFieldProps) {
  return (
    <div className={styles.search}>
      <IconMagnifierOutline18 className={styles.magnifier} aria-hidden />
      <SearchChromeInput
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search Pond or type a command…"
        aria-label="Search Pond"
        role="combobox"
        aria-expanded="true"
        aria-controls="pond-command-menu-results"
        aria-activedescendant={activeDescendant}
        spellCheck={false}
      />
      <Keyboard.Key aria-hidden>esc</Keyboard.Key>
    </div>
  );
}
