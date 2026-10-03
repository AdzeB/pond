import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";

const references = [
  {
    app: "Mintlify",
    image: "/onboarding-references/mintlify.jpg",
    url: "https://mobbin.com/screens/48e93135-e7f5-4cc4-8a5d-375ba19bc47d",
  },
  {
    app: "Mixpanel",
    image: "/onboarding-references/mixpanel.jpg",
    url: "https://mobbin.com/screens/f5586f82-321b-464c-b6fe-426e50d34b81",
  },
  {
    app: "Rox",
    image: "/onboarding-references/rox.jpg",
    url: "https://mobbin.com/screens/9d59ef92-7e86-4a73-9152-c0d1e97b1062",
  },
  {
    app: "Outseta",
    image: "/onboarding-references/outseta.jpg",
    url: "https://mobbin.com/screens/353f5e59-4a91-46aa-8c1b-2af7e287cea9",
  },
  {
    app: "Sentry",
    image: "/onboarding-references/sentry.jpg",
    url: "https://mobbin.com/screens/0d631489-4a2b-4011-b3d1-4da38b36419f",
  },
  {
    app: "Deputy",
    image: "/onboarding-references/deputy.jpg",
    url: "https://mobbin.com/screens/a346f34e-507e-4f13-bddd-8e70df6a9039",
  },
  {
    app: "Aboard",
    image: "/onboarding-references/aboard-welcome.jpg",
    url: "https://mobbin.com/screens/5ce40c97-2846-4503-b98e-1f4795d59bcf",
  },
  {
    app: "Productboard",
    image: "/onboarding-references/productboard.jpg",
    url: "https://mobbin.com/screens/6ac03b69-2d30-49c7-a8e1-14c48a2d542f",
  },
  {
    app: "Kajabi",
    image: "/onboarding-references/kajabi.jpg",
    url: "https://mobbin.com/screens/1e6206fd-e5da-41df-8df8-43e67c7f98a7",
  },
  {
    app: "Okta",
    image: "/onboarding-references/okta.jpg",
    url: "https://mobbin.com/screens/02a533b3-ba02-4194-b5cb-5762d3d2b279",
  },
  {
    app: "Charma",
    image: "/onboarding-references/charma.jpg",
    url: "https://mobbin.com/screens/2d8f03fe-2fdf-4f2f-814a-257c867b8352",
  },
  {
    app: "Intercom",
    image: "/onboarding-references/intercom.jpg",
    url: "https://mobbin.com/screens/d72f1b2c-5fd0-4ebb-bc3b-bd66c43cec5e",
  },
  {
    app: "Superlist",
    image: "/onboarding-references/superlist.jpg",
    url: "https://mobbin.com/screens/36d518e7-e12a-4a16-8490-9df86113fc99",
  },
  {
    app: "Modal",
    image: "/onboarding-references/modal.jpg",
    url: "https://mobbin.com/screens/1052aa52-940d-4600-b211-d2bac1cdf7fa",
  },
  {
    app: "Aboard",
    image: "/onboarding-references/aboard-board.jpg",
    url: "https://mobbin.com/screens/98f97dfe-2d19-46dd-9841-5243ad17b99b",
  },
] as const;

export default function OnboardingReferencesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Pond Design Research</p>
          <h1>Onboarding References</h1>
          <p className={styles.summary}>
            Fifteen web onboarding screens collected for the Pond first-run
            redesign.
          </p>
        </div>
        <Link className={styles.home} href="/">
          Pond
        </Link>
      </header>
      <section className={styles.grid} aria-label="Onboarding references">
        {references.map((reference, index) => (
          <a
            className={styles.card}
            href={reference.url}
            key={reference.url}
            rel="noreferrer"
            target="_blank"
          >
            <div className={styles.frame}>
              <Image
                alt={`${reference.app} onboarding screen`}
                fill
                priority={index < 6}
                sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"
                src={reference.image}
              />
            </div>
            <div className={styles.caption}>
              <strong>{reference.app}</strong>
              <span>View on Mobbin</span>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
