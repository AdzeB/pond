import { clsx as cn } from "clsx";
import { useEffect, useRef } from "react";
import type { TextStyle } from "../../lib/text-style";
import { useBoard } from "../board/context";
import styles from "./styles.module.css";

interface EditableTextProps {
  id: string;
  text: string;
  label: string;
  placeholder: string;
  hint: string;
  variant: "note" | "text" | "figure" | "label" | "topic" | "section";
  style?: TextStyle;
}

export function EditableText({
  id,
  text,
  label,
  placeholder,
  hint,
  variant,
  style,
}: EditableTextProps) {
  const board = useBoard();
  const editing = board.editingId === id;
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = field.current;
    if (!editing || !element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, [editing]);

  if (editing)
    return (
      <textarea
        ref={field}
        className={cn(styles.field, "nodrag", "nowheel", "nopan")}
        data-variant={variant}
        data-size={style?.textSize}
        data-font={style?.font}
        aria-label={label}
        placeholder={placeholder}
        value={text}
        spellCheck
        rows={1}
        onChange={(event) => board.setText(id, event.currentTarget.value)}
        onBlur={() => board.finishEditing(id)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.currentTarget.blur();
            return;
          }
          const ends = event.key === "Enter" && !event.shiftKey;
          if (variant === "topic" && (event.key === "Tab" || ends)) {
            event.preventDefault();
            board.branch(id, event.key === "Tab" ? "child" : "sibling");
          } else if (variant === "section" && ends) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    );
  return (
    <div
      className={styles.body}
      data-variant={variant}
      data-size={style?.textSize}
      data-font={style?.font}
      data-empty={text ? undefined : true}
    >
      {text || hint}
    </div>
  );
}
