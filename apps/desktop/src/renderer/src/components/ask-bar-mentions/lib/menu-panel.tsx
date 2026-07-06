import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { motion } from "motion/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "../styles.module.css";
import type { AskMenu, AskMenuItem } from "./menu-model";

export class AskOption extends MenuOption {
  item: AskMenuItem;
  constructor(item: AskMenuItem) {
    super(item.key);
    this.item = item;
  }
}

// The grouped popup, portaled into the plugin's caret-anchored container so it
// always sits on the active trigger token. `.menu` positions it above the caret.
export function AskMenuPanel({
  menu,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  menu: AskMenu;
  options: AskOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: AskOption) => void;
  setHighlightedIndex: (index: number) => void;
}) {
  return (
    <motion.div
      className={styles.menu}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={bouncySpring}
    >
      {menu.groups.map((group) => (
        <div key={group.id} className={styles["menu-group"]}>
          <div className={styles["menu-group-label"]}>{group.label}</div>
          {group.items.map((item) => {
            const index = menu.flat.indexOf(item);
            const option = options[index];
            return (
              <AskMenuRow
                key={item.key}
                item={item}
                active={selectedIndex === index}
                onHover={() => setHighlightedIndex(index)}
                onSelect={() => option && selectOptionAndCleanUp(option)}
              />
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}

function AskMenuRow({
  item,
  active,
  onHover,
  onSelect,
}: {
  item: AskMenuItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const common = {
    type: "button" as const,
    "data-active": active || undefined,
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onMouseEnter: onHover,
    onClick: onSelect,
  };

  if (item.kind === "more") {
    return (
      <button className={styles["menu-more"]} {...common}>
        Show {item.count} more
      </button>
    );
  }

  if (item.kind === "create") {
    return (
      <button className={styles["menu-create"]} {...common}>
        <Plus width={14} height={14} />
        {item.name ? `Create skill “/${item.name}”` : "Create skill…"}
      </button>
    );
  }

  const name =
    item.kind === "skill"
      ? `/${item.skill.name}`
      : item.kind === "tag"
        ? `#${item.tag}`
        : (item.save.title ?? "Untitled");
  const description =
    item.kind === "skill"
      ? item.skill.description || item.skill.prompt
      : item.kind === "tag"
        ? `${item.count} ${item.count === 1 ? "item" : "items"}`
        : [item.save.source, item.save.author].filter(Boolean).join(" · ");

  return (
    <button className={styles["menu-row"]} {...common}>
      <span className={styles["menu-name"]}>{name}</span>
      <span className={styles["menu-description"]}>{description}</span>
    </button>
  );
}
