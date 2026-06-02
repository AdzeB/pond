// The boot-time shell hint (`window.__pondShell.onboarded`) is frozen by
// contextBridge, so we can't flip it in place once the user finishes
// onboarding. Record completion in sessionStorage instead: the root guard
// reads it so it stops redirecting to /welcome for the rest of this
// session, including across the dev soft-reload that a library switch
// triggers. A real relaunch rereads the DB and gets onboarded=true from
// the hint directly, so this is only needed in-session.
const KEY = "pond:onboarded";

// In-memory mirror so the guard works even if sessionStorage is blocked.
// It survives SPA navigation (same module instance) and only resets on a
// full reload, where sessionStorage takes over.
let memo = false;

export function markOnboardedLocally(): void {
  memo = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // sessionStorage can throw in locked-down contexts. The in-memory
    // mirror still covers this session.
  }
}

export function wasOnboardedLocally(): boolean {
  if (memo) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
