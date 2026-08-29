export type PerformanceSample = { name: string; durationMs: number; success: boolean; timestamp: string };
export async function measure<T>(name: string, fn: () => Promise<T>): Promise<{ value: T; sample: PerformanceSample }> {
  const start = Date.now();
  try { const value = await fn(); return { value, sample: { name, durationMs: Date.now() - start, success: true, timestamp: new Date().toISOString() } }; }
  catch (error) { void error; throw error; }
}
