"use client";

import { Accordion } from "@pond/ui";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

interface FaqItem {
  value: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    value: "cost",
    question: "What does Pond cost?",
    answer: "Free. MIT licensed.",
  },
  {
    value: "where",
    question: "Where do my saves live?",
    answer:
      "In ~/Pond/My Pond.pond on your Mac. Move it, back it up, browse it in Finder. Pond reads the bundle; the bundle is the source of truth.",
  },
  {
    value: "sync",
    question: "Does anything sync to a server?",
    answer:
      "No. The browser extension talks to a local server on 127.0.0.1:41610 that only your Mac can reach.",
  },
  {
    value: "platforms",
    question: "Does it work on Windows or Linux?",
    answer: "Not yet. Mac-first, by design.",
  },
  {
    value: "uninstall",
    question: "How do I uninstall it?",
    answer:
      "Quit Pond, drag the app to the trash, and delete ~/Pond/ if you want the library gone too.",
  },
  {
    value: "open-source",
    question: "Is it open source?",
    answer: "Yes. The code is on GitHub.",
  },
];

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      className={styles.chevron}
      aria-hidden="true"
      focusable="false"
    >
      <title>Toggle</title>
      <path
        d="m4 6 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Faqs() {
  return (
    <Section.Root id="faqs">
      <Section.Header>
        <Section.Eyebrow>FAQs</Section.Eyebrow>
        <Section.Title>Common questions.</Section.Title>
      </Section.Header>
      <Accordion.Root className={styles.list}>
        {FAQS.map((item) => (
          <Accordion.Item
            key={item.value}
            value={item.value}
            className={styles.item}
          >
            <Accordion.Header className={styles.header}>
              <Accordion.Trigger className={styles.trigger}>
                <span>{item.question}</span>
                <ChevronIcon />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className={styles.panel}>
              <p className={styles.answer}>{item.answer}</p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Section.Root>
  );
}
