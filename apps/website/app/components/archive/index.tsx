import { IconXTwitter } from "@pond/icons/social-media";
import { Inspector, InspectorField } from "../_fragments/inspector";
import { ArchivedChip } from "../_fragments/save-card";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

export function Archive() {
  return (
    <Section.Root id="archive">
      <Section.Header>
        <Section.Eyebrow>Archive</Section.Eyebrow>
        <Section.Title>Your saves don't disappear when they do.</Section.Title>
        <Section.Lead>
          When a tweet is deleted or an account vanishes, the saved version
          stays.
        </Section.Lead>
      </Section.Header>
      <Section.Grid>
        <Section.Card span={7} spanMd={6} padded={false}>
          <div className={styles.fragment}>
            <article className={styles.tweet}>
              <header className={styles["tweet-header"]}>
                <div className={styles["tweet-avatar"]} aria-hidden />
                <div className={styles["tweet-id"]}>
                  <span className={styles["tweet-name"]}>Jenny Odell</span>
                  <span className={styles["tweet-handle"]}>@the_jennitaur</span>
                </div>
                <IconXTwitter
                  width={14}
                  height={14}
                  fill="currentColor"
                  className={styles["tweet-mark"]}
                />
              </header>
              <p className={styles["tweet-body"]}>
                The greatest gift you can give yourself is the time to do
                nothing, without guilt, without a phone, without a plan. The
                rest is wallpaper.
              </p>
              <p className={styles["tweet-time"]}>3:42 PM · Aug 7, 2025</p>
              <ArchivedChip />
            </article>
            <Inspector>
              <InspectorField label="Source">x.com</InspectorField>
              <InspectorField label="Saved" mono>
                2025-08-09
              </InspectorField>
              <InspectorField label="Original" mono>
                deleted 2025-08-14
              </InspectorField>
              <InspectorField label="Tags">attention, time</InspectorField>
            </Inspector>
          </div>
          <div className={styles.body}>
            <h3 className={styles.title}>Original captured, kept locally.</h3>
            <p className={styles.description}>
              Pond keeps the saved post even after the original is gone.
            </p>
          </div>
        </Section.Card>
        <div className={styles["sub-column"]}>
          <Section.Card
            span={5}
            spanMd={6}
            title="Full-resolution media"
            description="Images and video saved at original quality, not platform thumbnails."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="Original metadata"
            description="Author, captured date, source URL, dimensions, all written next to the file."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="Trash, not delete"
            description="Removed saves move to a trash folder you can recover from."
          />
          <Section.Card
            span={5}
            spanMd={6}
            title="The library is yours"
            description="Move the folder, back it up, browse it in Finder. Pond reads the folder."
          />
        </div>
      </Section.Grid>
    </Section.Root>
  );
}
