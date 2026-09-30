/**
 * Polls until `probe` returns something truthy. The embedding worker runs on
 * its own timer, and polling the real end state is more honest than sleeping a
 * fixed interval and hoping — it fails loudly instead of flaking.
 */
export async function waitFor<T>(
  probe: () => Promise<T | null | undefined>,
  { timeoutMs = 15_000, intervalMs = 25, what = "condition" } = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const value = await probe();
    if (value) return value;

    if (Date.now() >= deadline) {
      throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
