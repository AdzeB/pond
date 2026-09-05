export async function optimistic<T>(
  optimisticUpdate: () => void,
  rollback: () => void,
  run: () => Promise<T>,
): Promise<T | null> {
  optimisticUpdate();
  try {
    return await run();
  } catch (err) {
    console.warn("[pond pool] tx failed, rolling back", err);
    rollback();
    return null;
  }
}
