import { clsx as cn } from "clsx";
import { useEffect, useRef } from "react";
import { useBoard } from "../board/context";
import styles from "./styles.module.css";

interface EditableTextProps {
  id: string;
  text: string;
  label: string;
  placeholder: string;
  hint: string;
  variant: "note" | "text" | "figure" | "label";
}

export function EditableText({
  id,
  text,
  label,
  placeholder,
  hint,
  variant,
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
        aria-label={label}
        placeholder={placeholder}
        value={text}
        spellCheck
        onChange={(event) => board.setText(id, event.currentTarget.value)}
        onBlur={() => board.finishEditing()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") event.currentTarget.blur();
        }}
      />
    );
  return (
    <div
      className={styles.body}
      data-variant={variant}
      data-empty={text ? undefined : true}
    >
      {text || hint}
    </div>
  );
}
