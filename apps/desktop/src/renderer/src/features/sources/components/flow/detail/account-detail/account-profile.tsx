import {
  IconAtSignFill18 as AtSign,
  IconSignatureFill18 as Signature,
} from "@pond/icons/fill/18";
import { PageDialog } from "@pond/ui";
import { useRef } from "react";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import {
  sourceDetail,
  useDetailAccountId,
} from "@/features/sources/state/source-detail";
import styles from "./account-detail.module.css";

export function AccountProfileSection() {
  const { accounts, refetch } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];
  const nickRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  if (!account) return null;

  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const saveNickname = async () => {
    const raw = nickRef.current?.value.trim() ?? "";
    const next = raw.length > 0 ? raw : null;
    if (next === account.label) return;
    await window.pond.query("accounts.setLabel", {
      accountId: account.id,
      label: next,
    });
    changed();
  };
  const saveHandle = async () => {
    const raw = handleRef.current?.value.trim().replace(/^@/, "") ?? "";
    const next = raw.length > 0 ? raw : null;
    if (next === account.handle) return;
    await window.pond.query("accounts.setHandle", {
      accountId: account.id,
      handle: next,
    });
    changed();
  };

  return (
    <>
      <PageDialog.Description>
        Customize how this account appears in Pond.
      </PageDialog.Description>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.icon}>
            <Signature size={18} />
          </span>
          <span className={styles.label}>Nickname</span>
          <input
            ref={nickRef}
            className={styles.input}
            placeholder="None"
            defaultValue={account.label ?? ""}
            onBlur={() => void saveNickname()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
        <div className={styles.row} title="Unlocks the profile picture">
          <span className={styles.icon}>
            <AtSign size={18} />
          </span>
          <span className={styles.label}>Handle</span>
          <input
            ref={handleRef}
            className={styles.input}
            placeholder="@username"
            defaultValue={account.handle ? `@${account.handle}` : ""}
            onBlur={() => void saveHandle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
      </div>
    </>
  );
}
