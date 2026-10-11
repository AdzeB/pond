"use client";

import { Button } from "@pond/ui";
import Link from "next/link";
import { useState } from "react";
import { Onboarding } from "../../../../desktop/src/renderer/src/app/components/onboarding";
import styles from "./styles.module.css";

export function OnboardingPreview() {
  const [session, setSession] = useState(0);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dialogs" className={styles.back}>
          Dialogs
        </Link>
        <Button
          variant="secondary"
          onClick={() => setSession((current) => current + 1)}
        >
          Show Onboarding
        </Button>
      </header>
      <Onboarding key={session} preview />
    </main>
  );
}
