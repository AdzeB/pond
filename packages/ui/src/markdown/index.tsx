import {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
} from "@assistant-ui/react-markdown";
import { clsx as cn } from "clsx";
import { useReducedMotionConfig } from "motion/react";
import remarkGfm from "remark-gfm";
import { CodeHeader } from "../code-block";
import styles from "./styles.module.css";

export type MarkdownProps = MarkdownTextPrimitiveProps;
export type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "@assistant-ui/react-markdown";

const defaultRemarkPlugins = [remarkGfm];

export function Markdown({
  className,
  smooth = true,
  skipHtml = true,
  components,
  remarkPlugins = defaultRemarkPlugins,
  ...props
}: MarkdownProps) {
  const reduced = useReducedMotionConfig();
  return (
    <MarkdownTextPrimitive
      {...props}
      components={{ CodeHeader, ...components }}
      remarkPlugins={remarkPlugins}
      skipHtml={skipHtml}
      smooth={reduced ? false : smooth}
      className={cn(styles.markdown, className)}
    />
  );
}
