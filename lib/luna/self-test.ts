export type SelfTest = { name: string; run: () => boolean | Promise<boolean> };
export async function runSelfTests(tests: SelfTest[]) {
  const results = await Promise.all(tests.map(async (test) => { try { return { name: test.name, ok: await test.run() }; } catch { return { name: test.name, ok: false }; } }));
  return { ok: results.every((result) => result.ok), results };
}
