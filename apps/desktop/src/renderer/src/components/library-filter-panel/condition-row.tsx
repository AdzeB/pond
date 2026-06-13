import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconChevronDownOutline12 as ChevronDown } from "@pond/icons/outline/12";
import {
  IconGripDotsVerticalOutline18 as Grip,
  IconTrash2Outline18 as Trash,
} from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { FIELD_UI } from "@/components/library-view-menu/filter/field-ui";
import {
  changeComparator,
  operatorOptions,
  operatorPhrase,
} from "@/components/library-view-menu/filter/operators";
import {
  Body,
  summariseValue,
} from "@/components/library-view-menu/filter/value-select";
import { FieldPicker } from "./field-picker";
import styles from "./styles.module.css";

interface ConditionRowProps {
  index: number;
  predicate: Predicate;
  combinator: "and" | "or";
  onSetCombinator: (next: "and" | "or") => void;
  onChangeField: (field: FieldId) => void;
  onChange: (next: Predicate) => void;
  onRemove: () => void;
}

export function ConditionRow({
  index,
  predicate,
  combinator,
  onSetCombinator,
  onChangeField,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(index) });

  const meta = FIELD_META[predicate.field];
  const FieldIcon = FIELD_UI[predicate.field].icon;
  const opOptions = operatorOptions(predicate);
  const valueless = predicate.operator === "empty";
  const summary = summariseValue(predicate);
  const valueEmpty = summary === "Select";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} className={styles.row} style={style}>
      <Conjunction
        index={index}
        combinator={combinator}
        onSetCombinator={onSetCombinator}
      />

      <FieldPicker
        value={predicate.field}
        onSelect={onChangeField}
        trigger={
          <button type="button" className={`${styles.control} ${styles.field}`}>
            <span className={styles.fieldIcon}>
              <FieldIcon width={14} height={14} />
            </span>
            <span className={styles.controlLabel}>{meta.label}</span>
            <ChevronDown width={10} height={10} className={styles.chevron} />
          </button>
        }
      />

      {opOptions.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={styles.operator}
                aria-label={`${meta.label} operator`}
              >
                {operatorPhrase(predicate)}
              </button>
            }
          />
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup>
                {opOptions.map((option) => (
                  <Menu.Item
                    key={option.operator}
                    data-checked={
                      option.operator === predicate.operator ? "" : undefined
                    }
                    onClick={() =>
                      onChange(changeComparator(predicate, option.operator))
                    }
                  >
                    <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        <span className={styles.operator}>{operatorPhrase(predicate)}</span>
      )}

      {valueless ? null : (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={`${styles.control} ${styles.value}`}
                data-empty={valueEmpty ? "true" : undefined}
                aria-label={`${meta.label} value`}
              >
                <span className={styles.controlLabel}>{summary}</span>
                <ChevronDown
                  width={10}
                  height={10}
                  className={styles.chevron}
                />
              </button>
            }
          />
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup>
                <Body predicate={predicate} onChange={onChange} />
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}

      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Remove ${meta.label} condition`}
        onClick={onRemove}
      >
        <Trash width={15} height={15} />
      </button>

      <button
        type="button"
        className={`${styles.iconButton} ${styles.handle}`}
        aria-label="Reorder condition"
        {...attributes}
        {...listeners}
      >
        <Grip width={15} height={15} />
      </button>
    </div>
  );
}

interface ConjunctionProps {
  index: number;
  combinator: "and" | "or";
  onSetCombinator: (next: "and" | "or") => void;
}

function Conjunction({ index, combinator, onSetCombinator }: ConjunctionProps) {
  if (index === 0) {
    return <span className={styles.conj}>Where</span>;
  }

  const label = combinator === "or" ? "Or" : "And";

  if (index > 1) {
    return <span className={styles.conj}>{label}</span>;
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={`${styles.control} ${styles.conj}`}
            aria-label="Combinator"
          >
            <span className={styles.controlLabel}>{label}</span>
            <ChevronDown width={10} height={10} className={styles.chevron} />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Item
              data-checked={combinator === "and" ? "" : undefined}
              onClick={() => onSetCombinator("and")}
            >
              <Menu.ItemLabel>And</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item
              data-checked={combinator === "or" ? "" : undefined}
              onClick={() => onSetCombinator("or")}
            >
              <Menu.ItemLabel>Or</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
