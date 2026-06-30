import {
  IconPlusOutline18 as PlusIcon,
  IconTrash2Outline18 as TrashIcon,
} from "@pond/icons/outline/18";
import { Button } from "@pond/ui";
import { useState } from "react";
import { SkillDialog } from "@/components/skill-dialog";
import { usePrefs } from "@/stores/prefs";
import styles from "./styles.module.css";

const COLLAPSED_COUNT = 5;

export function SkillsSection() {
  const [prefs, patch] = usePrefs("skills");
  const skills = prefs.custom ?? [];
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const remove = (id: string) => {
    patch({ custom: skills.filter((s) => s.id !== id) });
  };

  const hidden = Math.max(0, skills.length - COLLAPSED_COUNT);
  const visible = expanded ? skills : skills.slice(0, COLLAPSED_COUNT);

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Skills</h1>
          <p className={styles.description}>
            Saved prompts you can run with “/” in the composer. Each one
            resolves through the “find anything” search.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className={styles.new}
          onClick={() => setAdding(true)}
        >
          <PlusIcon width={14} height={14} />
          New
        </Button>
      </div>

      <div className={styles.list}>
        {skills.length === 0 ? (
          <p className={styles.empty}>
            No skills yet. Create one to get started.
          </p>
        ) : (
          <>
            {visible.map((skill) => (
              <div key={skill.id} className={styles.item}>
                <div className={styles.itemText}>
                  <span className={styles.itemName}>/{skill.name}</span>
                  <span className={styles.itemDesc}>
                    {skill.description || skill.prompt}
                  </span>
                </div>
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  className={styles.delete}
                  aria-label={`Delete /${skill.name}`}
                  onClick={() => remove(skill.id)}
                >
                  <TrashIcon width={16} height={16} />
                </Button>
              </div>
            ))}
            {hidden > 0 ? (
              <button
                type="button"
                className={styles.showAll}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : `Show all (${hidden} more)`}
              </button>
            ) : null}
          </>
        )}
      </div>

      <SkillDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}
