import { IconChevronDownOutline12 } from "@pond/icons/outline/12";
import { useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Accordion } from "../accordion";
import { Reveal } from "../reveal";
import styles from "./styles.module.css";

export function Details({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const reduced = useReducedMotionConfig();
  return (
    <Reveal>
      <Accordion.Root defaultValue={defaultOpen ? ["details"] : []}>
        <Accordion.Item value="details" className={styles.disclosure}>
          <Accordion.Header>
            <Accordion.Trigger>
              {title}
              <IconChevronDownOutline12 />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel
            className={styles.detailsPanel}
            data-reduced-motion={reduced || undefined}
          >
            <div className={styles.details}>{children}</div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </Reveal>
  );
}
