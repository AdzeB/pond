import { cn, Input } from "@pond/ui";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./styles.module.css";

interface SearchChromeProps {
  children: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  className?: string;
  tone?: "plain" | "header";
}

export function SearchChrome({
  children,
  filters,
  actions,
  below,
  className,
  tone,
}: SearchChromeProps) {
  const scrollFade = useScrollFade<HTMLDivElement>("x");
  return (
    <div className={cn(styles.root, className)} data-tone={tone}>
      <div className={styles.bar}>
        <div className={styles.search}>{children}</div>
        {filters ? (
          <div className={styles.filters} {...scrollFade}>
            {filters}
          </div>
        ) : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {below ? <div className={styles.below}>{below}</div> : null}
    </div>
  );
}

interface SearchChromeInputProps
  extends ComponentPropsWithoutRef<typeof Input.Field> {
  variant?: "primary" | "secondary" | "borderless";
}

export const SearchChromeInput = forwardRef<
  HTMLInputElement,
  SearchChromeInputProps
>(function SearchChromeInput(
  { className, variant = "borderless", ...props },
  ref,
) {
  return (
    <Input.Root
      className={cn(styles.input, className)}
      size="md"
      variant={variant}
    >
      <Input.Field ref={ref} className={styles.field} {...props} />
    </Input.Root>
  );
});
