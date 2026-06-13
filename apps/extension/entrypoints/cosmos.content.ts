import { matches } from "@/sources/cosmos/matches";
import { bridge } from "@/utils/bridge";

export default defineContentScript({
  matches,
  runAt: "document_start",
  main() {
    void bridge("cosmos");
  },
});
