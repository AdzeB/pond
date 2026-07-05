import { Settings } from "@pond/ui";
import { PondCustomiseForm } from "@/components/pond-customise-form";
import { usePonds } from "@/hooks/use-ponds";
import styles from "./styles.module.css";

export function AccountSection() {
  const { active } = usePonds();
  if (!active) return null;

  return (
    <Settings.Page width="medium">
      <Settings.Header>
        <Settings.HeaderText>
          <Settings.Title>Account</Settings.Title>
          <Settings.Description>
            Your Pond's name, icon, and color.
          </Settings.Description>
        </Settings.HeaderText>
      </Settings.Header>
      <div className={styles.form}>
        <PondCustomiseForm key={active.path} pond={active} />
      </div>
    </Settings.Page>
  );
}
