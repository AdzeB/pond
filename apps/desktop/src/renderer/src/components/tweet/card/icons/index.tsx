import type { ReactNode, SVGProps } from "react";

function Glyph({
  title,
  children,
  ...props
}: SVGProps<SVGSVGElement> & { title: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" role="img" {...props}>
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function ReplyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Replies" {...props}>
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
    </Glyph>
  );
}

export function RetweetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Retweets" {...props}>
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </Glyph>
  );
}

export function LikeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Likes" {...props}>
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C10.084 6.01 8.627 5.44 7.405 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.092 4.66.7 1.81 2.203 3.7 4.857 5.52l2.16 1.49 2.159-1.49c2.653-1.82 4.156-3.71 4.856-5.52.725-1.88.643-3.54.091-4.66-.561-1.13-1.666-1.84-2.909-1.91z" />
    </Glyph>
  );
}

export function ViewsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Views" {...props}>
      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-9h2v9h-2z" />
    </Glyph>
  );
}

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Bookmarks" {...props}>
      <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" />
    </Glyph>
  );
}

export function VerifiedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 22 22" fill="currentColor" role="img" {...props}>
      <title>Verified</title>
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.27-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.083 1.29.14 1.897-.586.274-1.084.705-1.438 1.246-.355.54-.552 1.17-.57 1.816.018.647.215 1.276.57 1.817.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.882 1.687.47.445 1.053.75 1.687.882.633.13 1.29.083 1.897-.14.273.587.704 1.086 1.245 1.44.54.354 1.169.551 1.816.569.647-.018 1.276-.215 1.817-.569.54-.354.972-.852 1.246-1.439.606.223 1.263.27 1.896.14.634-.131 1.218-.437 1.687-.882.445-.47.75-1.053.882-1.687.13-.633.083-1.29-.14-1.897.587-.273 1.086-.704 1.44-1.245.354-.54.551-1.17.569-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246-5.683 6.206z" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" role="img" {...props}>
      <title>Play</title>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
