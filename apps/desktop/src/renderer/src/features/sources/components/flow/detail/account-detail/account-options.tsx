import { Dialog } from "@pond/ui";
import { accountName } from "@/features/sources/components/page/lib/helpers";
import { useAccounts } from "@/features/sources/hooks/use-accounts";
import {
  sourceDetail,
  useDetailAccountId,
} from "@/features/sources/state/source-detail";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { formatNumber } from "@/shared/lib/format";
import { DetailOptions } from "../detail-options";

export function AccountOptionsSection() {
  const { accounts, refetch } = useAccounts();
  const accountId = useDetailAccountId();
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];
  if (!account) return null;
  const count = account.sync?.knownCount ?? 0;
  const onChanged = () => {
    void refetch();
    sourceDetail.changed();
  };

  const confirmDisconnect = () => {
    Dialog.confirm({
      title: "Disconnect",
      description: `Pond signs ${accountName(account)} out and stops its syncing. The ${formatNumber(count)} item${count === 1 ? "" : "s"} already saved stay in your library.`,
      confirmLabel: "Disconnect",
      onConfirm: async () => {
        await window.pond.query("accounts.disconnect", {
          accountId: account.id,
        });
        onChanged();
        sourceFlow.close();
      },
    });
  };

  return (
    <DetailOptions onRemove={confirmDisconnect} removeLabel="Disconnect" />
  );
}
