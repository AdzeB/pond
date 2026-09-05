import styles from "./assistant-response.module.css";
import { CopyButton } from "./message-actions";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return (
    <figure className={styles["code-block"]}>
      <figcaption>
        <span>{language || "Plain text"}</span>
        <CopyButton text={code} label="Copy Code" />
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
