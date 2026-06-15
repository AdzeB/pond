import { inject } from "@/sources/reddit/inject";
import { matches } from "@/sources/reddit/matches";

export default defineContentScript({
  matches,
  runAt: "document_start",
  world: "MAIN",
  globalName: false,
  main: inject,
});
