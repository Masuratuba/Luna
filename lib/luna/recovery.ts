export type RecoveryResult<T> = { ok: true; value: T; attempts: number } | { ok: false; error: string; attempts: number };

export async function withRecovery<T>(operation: () => Promise<T>, retries = 2): Promise<RecoveryResult<T>> {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try { return { ok: true, value: await operation(), attempts: attempt }; }
    catch (error) { lastError = error instanceof Error ? error.message : String(error); }
  }
  return { ok: false, error: lastError, attempts: retries + 1 };
}
