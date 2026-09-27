import { cn, Input } from "@pond/ui";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import styles from "./styles.module.css";

interface SearchChromeProps {
  children: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  className?: string;
}

export function SearchChrome({
  children,
  actions,
  below,
  className,
}: SearchChromeProps) {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.search}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {below ? <div className={styles.below}>{below}</div> : null}
    </div>
  );
}

export const SearchChromeInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<typeof Input.Field>
>(function SearchChromeInput({ className, ...props }, ref) {
  return (
    <Input.Root
      className={cn(styles.input, className)}
      size="md"
      variant="borderless"
    >
      <Input.Field ref={ref} className={styles.field} {...props} />
    </Input.Root>
  );
});
