import {
  IconAtSignFill18 as AtSign,
  IconSignatureFill18 as Signature,
} from "@pond/icons/fill/18";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import {
  sourceDetail,
  useDetailAccountId,
} from "@/features/sources/state/source-detail";
import styles from "../detail.module.css";
import { ProfileField } from "../profile-field";

export function AccountProfileSection() {
  const { accounts, refetch } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];

  if (!account) return null;

  const changed = () => {
    void refetch();
    sourceDetail.changed();
  };
  const saveNickname = async (value: string) => {
    const raw = value.trim();
    const next = raw.length > 0 ? raw : null;
    if (next === account.label) return;
    await window.pond.query("accounts.setLabel", {
      accountId: account.id,
      label: next,
    });
    changed();
  };

  return (
    <div className={styles.rows}>
      <ProfileField
        key={`${account.id}-nickname`}
        label="Nickname"
        value={account.label ?? ""}
        placeholder="None"
        icon={<Signature size={18} />}
        onSave={saveNickname}
      />
      <div className={styles.row}>
        <span className={styles.icon}>
          <AtSign size={18} />
        </span>
        <input
          className={styles.input}
          aria-label="Handle"
          readOnly
          value={account.handle?.replace(/^@/, "") ?? ""}
          placeholder="Not available"
        />
      </div>
    </div>
  );
}
