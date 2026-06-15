import { inject } from "@/sources/threads/inject";
import { matches } from "@/sources/threads/matches";

export default defineContentScript({
  matches,
  runAt: "document_start",
  world: "MAIN",
  globalName: false,
  main: inject,
});
