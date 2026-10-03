export function createNavigationMailbox() {
  const listeners = new Set<(path: string) => void>();
  let pending: string | undefined;
  return {
    receive(path: string): void {
      if (!listeners.size) pending = path;
      else for (const listener of listeners) listener(path);
    },
    subscribe(listener: (path: string) => void): () => void {
      listeners.add(listener);
      if (pending !== undefined) {
        const path = pending;
        pending = undefined;
        listener(path);
      }
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
