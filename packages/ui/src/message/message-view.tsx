import type { ReactNode } from "react";
import { Message } from "./message";
import styles from "./styles.module.css";

export function MessageView({
  role,
  leading,
  footer,
  actions,
  children,
  animateEntrance = false,
}: {
  role: "user" | "assistant" | "system";
  leading?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  animateEntrance?: boolean;
}) {
  return (
    <Message.Root role={role} data-enter={animateEntrance || undefined}>
      <Message.Leading>{leading}</Message.Leading>
      <div className={styles["message-body"]}>
        {children}
        <Message.Footer>{footer}</Message.Footer>
      </div>
      <Message.Actions>{actions}</Message.Actions>
    </Message.Root>
  );
}
