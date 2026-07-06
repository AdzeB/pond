import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import {
  IconPencilOutline18 as EditIcon,
  IconPlusOutline18 as PlusIcon,
  IconTrash2Outline18 as TrashIcon,
} from "@pond/icons/outline/18";
import { Button, Menu, type MenuItemSpec, Settings } from "@pond/ui";
import { useMemo, useState } from "react";
import type { CustomSkill } from "@/lib/save/skills";
import { usePrefs } from "@/stores/prefs";
import { SkillEditor } from "./editor";
import styles from "./styles.module.css";

type Editing = { mode: "new" } | { mode: "edit"; id: string } | null;

export function SkillsSection() {
  const [prefs, patch] = usePrefs("skills");
  const skills = prefs.custom ?? [];
  const [editing, setEditing] = useState<Editing>(null);

  const editingSkill = useMemo(
    () =>
      editing?.mode === "edit"
        ? (skills.find((s) => s.id === editing.id) ?? null)
        : null,
    [editing, skills],
  );

  const remove = (id: string) =>
    patch({ custom: skills.filter((s) => s.id !== id) });

  const upsert = (skill: CustomSkill) => {
    const exists = skills.some((s) => s.id === skill.id);
    patch({
      custom: exists
        ? skills.map((s) => (s.id === skill.id ? skill : s))
        : [...skills, skill],
    });
    setEditing(null);
  };

  // Editing/creating swaps the whole pane for a full-page editor.
  if (editing) {
    return (
      <SkillEditor
        skill={editingSkill}
        existingNames={skills
          .filter((s) => s.id !== editingSkill?.id)
          .map((s) => s.name)}
        onCancel={() => setEditing(null)}
        onSave={upsert}
        onDelete={
          editingSkill
            ? () => {
                remove(editingSkill.id);
                setEditing(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <Settings.Page width="medium">
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Skills</Settings.Title>
          <Settings.Description>
            Saved prompts you can run with “/” in the composer. Each one
            resolves through the “find anything” search.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>

      <div className={styles.card}>
        <div className={styles["card-header"]}>
          <span className={styles.count}>
            {skills.length} {skills.length === 1 ? "skill" : "skills"}
          </span>
          <Button
            icon
            size="sm"
            variant="ghost"
            aria-label="New skill"
            onClick={() => setEditing({ mode: "new" })}
          >
            <PlusIcon width={16} height={16} />
          </Button>
        </div>

        {skills.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles["empty-title"]}>No skills yet</span>
            <span className={styles["empty-text"]}>
              Create a skill to run a saved prompt with “/” in the composer.
            </span>
            <Button
              className={styles["empty-action"]}
              size="sm"
              variant="primary"
              onClick={() => setEditing({ mode: "new" })}
            >
              New skill
            </Button>
          </div>
        ) : (
          <ul className={styles.list}>
            {skills.map((skill) => (
              <li key={skill.id} className={styles.item}>
                <button
                  type="button"
                  className={styles["item-main"]}
                  onClick={() => setEditing({ mode: "edit", id: skill.id })}
                >
                  <span className={styles["item-name"]}>/{skill.name}</span>
                  <span className={styles["item-description"]}>
                    {skill.description || skill.prompt}
                  </span>
                </button>
                <SkillRowMenu
                  name={skill.name}
                  onEdit={() => setEditing({ mode: "edit", id: skill.id })}
                  onDelete={() => remove(skill.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Settings.Page>
  );
}

function SkillRowMenu({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const items: MenuItemSpec[] = [
    { label: "Edit", icon: <EditIcon />, onClick: onEdit },
    { type: "separator" },
    { label: "Delete", icon: <TrashIcon />, onClick: onDelete },
  ];
  return (
    <Menu.Root>
      <Menu.Trigger
        icon
        size="sm"
        variant="ghost"
        className={styles.kebab}
        aria-label={`Actions for /${name}`}
      >
        <Ellipsis width={16} height={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
