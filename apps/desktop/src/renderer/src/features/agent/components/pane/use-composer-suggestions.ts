import { IconFileOutline18 } from "@pond/icons/outline/18";
import { type AssistantSource, assistantSources } from "@shared/assistant";
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useState,
} from "react";
import { z } from "zod";
import { ASSISTANT_ACTIONS } from "./actions";
import {
  findComposerTrigger,
  replaceComposerTrigger,
} from "./composer-trigger";

const AssistantSearchSchema = z.object({ saves: assistantSources });

export function useComposerSuggestions({
  value,
  attachments,
  inputRef,
  disabled,
  onChange,
  onAttach,
}: {
  value: string;
  attachments: AssistantSource[];
  inputRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  onChange: (value: string) => void;
  onAttach: (saves: AssistantSource[]) => void;
}) {
  const listId = useId();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState({ key: "", id: "" });
  const [result, setResult] = useState<{
    query: string;
    saves: AssistantSource[];
    error?: string;
  } | null>(null);
  const trigger =
    focused && !disabled && !composing
      ? findComposerTrigger(value, selection.start, selection.end)
      : null;
  const key = trigger
    ? `${trigger.kind}:${trigger.start}:${trigger.query}`
    : "";
  const open = Boolean(trigger) && key !== dismissed;
  const kind = open ? trigger?.kind : undefined;
  const query = trigger?.query.trim() ?? "";

  useEffect(() => {
    if (kind !== "@") return;
    let current = true;
    const timer = setTimeout(() => {
      void window.pond
        .query("agent.searchSaves", { query, limit: 12 })
        .then((data) => {
          if (current)
            setResult({
              query,
              saves: AssistantSearchSchema.parse(data).saves,
            });
        })
        .catch(() => {
          if (current)
            setResult({
              query,
              saves: [],
              error: "Could not search Saves. Type to try again.",
            });
        });
    }, 150);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [kind, query]);

  const loading = kind === "@" && result?.query !== query;
  const atLimit = attachments.length >= 24;
  const saves = !loading && result?.query === query ? result.saves : [];
  const options =
    kind === "@"
      ? (atLimit
          ? []
          : saves.filter(
              (save) =>
                !attachments.some((attached) => attached.id === save.id),
            )
        ).map((save) => ({
          id: save.id,
          title: save.title || "Untitled",
          detail: save.source,
          icon: IconFileOutline18,
          save,
          prompt: save.title || "this Save",
        }))
      : ASSISTANT_ACTIONS.filter((action) =>
          `${action.title} ${action.detail}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ).map((action) => ({ ...action, save: undefined }));
  const active =
    options.find(
      (option) => highlighted.key === key && option.id === highlighted.id,
    ) ?? options[0];
  const activeIndex = options.findIndex((option) => option.id === active?.id);
  const optionId = (index: number) => `${listId}-${index}`;

  function sync(target: HTMLTextAreaElement) {
    setSelection({ start: target.selectionStart, end: target.selectionEnd });
  }
  function dismiss() {
    setDismissed(key);
  }
  function choose(id: string) {
    const option = options.find((option) => option.id === id);
    if (!trigger || !option) return;
    const next = replaceComposerTrigger(value, trigger, option.prompt);
    if (option.save) onAttach([option.save]);
    dismiss();
    onChange(next.value);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.cursor, next.cursor);
      setSelection({ start: next.cursor, end: next.cursor });
    });
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || event.nativeEvent.isComposing || event.keyCode === 229)
      return false;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        options[
          (activeIndex +
            (event.key === "ArrowDown" ? 1 : -1) +
            options.length) %
            options.length
        ];
      if (next) setHighlighted({ key, id: next.id });
      return true;
    }
    if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
      if (event.key === "Tab" && !active) {
        dismiss();
        return false;
      }
      event.preventDefault();
      if (active) choose(active.id);
      return true;
    }
    return false;
  }
  return {
    open,
    kind,
    listId,
    options,
    activeIndex,
    optionId,
    choose,
    dismiss,
    loading,
    empty:
      kind === "@"
        ? atLimit
          ? "You can attach up to 24 Saves."
          : result?.query === query && result.error
            ? result.error
            : "No Saves found. Try another search."
        : "No matching actions.",
    highlight: (id: string) => setHighlighted({ key, id }),
    inputProps: {
      role: "combobox" as const,
      "aria-expanded": open,
      "aria-autocomplete": "list" as const,
      "aria-haspopup": "listbox" as const,
      "aria-controls": open ? listId : undefined,
      "aria-activedescendant":
        open && active ? optionId(activeIndex) : undefined,
      onFocus: (event: React.FocusEvent<HTMLTextAreaElement>) => {
        setFocused(true);
        sync(event.currentTarget);
      },
      onBlur: () => setFocused(false),
      onSelect: (event: React.SyntheticEvent<HTMLTextAreaElement>) =>
        sync(event.currentTarget),
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDismissed(null);
        onChange(event.currentTarget.value);
        sync(event.currentTarget);
      },
      onCompositionStart: () => setComposing(true),
      onCompositionEnd: (
        event: React.CompositionEvent<HTMLTextAreaElement>,
      ) => {
        setComposing(false);
        sync(event.currentTarget);
      },
    },
    onKeyDown,
  };
}
