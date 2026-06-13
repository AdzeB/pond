import { matches } from "@/sources/instagram/matches";
import { bridge } from "@/utils/bridge";

export default defineContentScript({
  matches,
  runAt: "document_start",
  main() {
    void bridge("instagram");
  },
});
