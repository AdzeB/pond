import { matches } from "@/sources/threads/matches";
import { bridge } from "@/utils/bridge";

export default defineContentScript({
  matches,
  runAt: "document_start",
  main() {
    void bridge("threads");
  },
});
