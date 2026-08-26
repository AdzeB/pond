import type { ComponentType, SVGProps } from "react";
import { Avatar } from "@/components/tweet/card/header";
import { VerifiedIcon } from "@/components/tweet/card/icons";
import type { TweetCardData } from "@/components/tweet/card/lib/data";
import { MediaGrid } from "@/components/tweet/card/media-grid";
import styles from "./styles.module.css";

type VerifiedGlyph = ComponentType<SVGProps<SVGSVGElement>>;

export function QuotedCard({
  data,
  Verified = VerifiedIcon,
}: {
  data: TweetCardData;
  Verified?: VerifiedGlyph;
}) {
  const { author, text, media } = data;
  return (
    <div className={styles.quoted}>
      <div className={styles["quoted-header"]}>
        <Avatar author={author} size={20} />
        <span className={styles["quoted-name"]}>
          {author.name}
          {author.verified ? (
            <Verified className={styles.verified} width={15} height={15} />
          ) : null}
        </span>
        <span className={styles["quoted-handle"]}>@{author.handle}</span>
      </div>
      {text ? <p className={styles["quoted-body"]}>{text}</p> : null}
      {media && media.length > 0 ? <MediaGrid media={media} compact /> : null}
    </div>
  );
}
