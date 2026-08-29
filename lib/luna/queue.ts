export type LunaQueueItem<T = unknown> = { id: string; payload: T; attempts: number; maxAttempts: number; availableAt: string };
export function nextAttempt<T>(item: LunaQueueItem<T>, delayMs = 1000): LunaQueueItem<T> {
  return { ...item, attempts: item.attempts + 1, availableAt: new Date(Date.now() + delayMs).toISOString() };
}
export function canRetry(item: LunaQueueItem) { return item.attempts < item.maxAttempts; }
