import {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
} from "@assistant-ui/react-markdown";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import { CodeHeader } from "../code-block";
import styles from "./styles.module.css";

export type MarkdownProps = MarkdownTextPrimitiveProps;
export type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "@assistant-ui/react-markdown";

export function Markdown({
  className,
  smooth = true,
  skipHtml = true,
  components,
  ...props
}: MarkdownProps) {
  const reduced = useReducedMotionConfig();
  return (
    <MarkdownTextPrimitive
      {...props}
      components={{ CodeHeader, ...components }}
      skipHtml={skipHtml}
      smooth={reduced ? false : smooth}
      className={cn(styles.markdown, className)}
    />
  );
}
