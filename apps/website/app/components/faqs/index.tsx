import { IconPlusOutline18 } from "@pond/icons/outline/18";
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
      "In ~/Pond/My Pond.pond on your Mac. Move it, back it up from Settings → Storage, or browse it in Finder. Pond reads the bundle; the bundle is the source of truth.",
  },
  {
    value: "sources",
    question: "Which sources sync in the background?",
    answer:
      "X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube, Reddit, and Threads sync likes and saved lists once you connect an account. Any web URL can still be saved one at a time via the extension.",
  },
  {
    value: "sync",
    question: "Does anything sync to a Pond server?",
    answer:
      "No. The browser extension talks to Pond on your Mac through native messaging. Nothing is sent to a Pond server.",
  },
  {
    value: "gatekeeper",
    question: "macOS says the developer cannot be verified.",
    answer:
      "v0.0.1 ships unsigned. Right-click Pond.app and choose Open, or go to System Settings → Privacy & Security → Open Anyway.",
  },
  {
    value: "ai",
    question: "Does Pond send my data anywhere?",
    answer:
      "Your library stays on your Mac. On-device enrichment (captions, text in images, transcripts, visual search) never leaves the machine. Assistant uses a key you paste or a local host you run.",
  },
  {
    value: "platforms",
    question: "Does it work on Windows or Linux?",
    answer:
      "Windows and Linux are coming soon. Pond ships for macOS 12 or later.",
  },
];

export function Faqs() {
  return (
    <div className={styles.list}>
      {FAQS.map((item) => (
        <details key={item.value} className={styles.item}>
          <summary className={styles.trigger}>
            <span>{item.question}</span>
            <IconPlusOutline18 className={styles.plus} />
          </summary>
          <div className={styles.panel}>
            <p className={styles.answer}>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
