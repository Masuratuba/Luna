export type SandboxResult<T> = { ok: true; value: T } | { ok: false; error: string };
export async function runInSandbox<T>(fn: () => Promise<T>): Promise<SandboxResult<T>> {
  try { return { ok: true, value: await fn() }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unknown sandbox error" }; }
}
