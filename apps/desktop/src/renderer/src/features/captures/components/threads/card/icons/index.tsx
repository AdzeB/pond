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
      <path d="M12 2C6.48 2 2 6.2 2 11.4c0 2.9 1.4 5.5 3.6 7.3V22l3.4-1.9c.96.27 1.97.4 3 .4 5.52 0 10-4.2 10-9.4S17.52 2 12 2zm1.1 12.6-2.5-2.7-4.6 2.7 5.1-5.4 2.5 2.7 4.6-2.7-5.1 5.4z" />
    </Glyph>
  );
}

export function RepostIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Reposts" {...props}>
      <path d="M7 7h11.2l-1.6-1.6L18 4l4 4-4 4-1.4-1.4L18.2 9H7c-1.7 0-3 1.3-3 3v2H2v-2c0-2.8 2.2-5 5-5zm10 10H5.8l1.6 1.6L6 20l-4-4 4-4 1.4 1.4L5.8 15H17c1.7 0 3-1.3 3-3v-2h2v2c0 2.8-2.2 5-5 5z" />
    </Glyph>
  );
}

export function LikeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Likes" {...props}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Glyph>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Glyph title="Shares" {...props}>
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-2.96 3.3L11 12.4l7.05 4.12c.5-.5 1.19-.82 1.95-.82A3 3 0 1 1 18 16.08z" />
    </Glyph>
  );
}

export function MetaVerifiedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 22 22" fill="currentColor" role="img" {...props}>
      <title>Verified</title>
      <circle cx="11" cy="11" r="11" />
      <path
        d="M6.4 11.2 9.2 14l6.4-6.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThreadsWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" role="img" {...props}>
      <title>Threads</title>
      <path d="M16.3 10.2c-.15-1.9-1.12-3.35-2.9-4.32C12.3 5.2 10.7 4.8 8.9 4.8c-2.3 0-4.2.7-5.6 2.1C1.9 8.3.95 10.3.7 12.9h3.7c.18-1.6.7-2.8 1.55-3.6.86-.8 2.05-1.2 3.55-1.2 1.3 0 2.3.35 3 .95.7.6 1.08 1.45 1.15 2.55-1.7-.2-3.5-.15-5.3.3-1.9.47-3.4 1.4-4.4 2.8-1 1.4-1.5 3.05-1.5 4.95 0 1.85.62 3.35 1.85 4.5 1.23 1.14 2.85 1.7 4.85 1.7 2.05 0 3.75-.7 5.1-2.1.9-.95 1.55-2.15 1.95-3.6.2 1.7.7 3 1.5 3.9h4.1c-1.15-1.5-1.75-3.7-1.85-6.6-.12-2.7.25-4.95 1.1-6.75h-3.8c-.55 1.15-1 2.55-1.2 4.15zm-4.55 7.55c-1.15 0-2.05-.32-2.7-.95-.64-.64-.96-1.5-.96-2.6 0-1.2.4-2.15 1.2-2.85.8-.7 1.95-1.1 3.4-1.2 1.15-.08 2.3-.02 3.45.2-.4 2.7-1.85 4.4-4.39 4.4z" />
    </svg>
  );
}
