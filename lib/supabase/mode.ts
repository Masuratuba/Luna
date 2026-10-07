export function isLoginBypassed(): boolean {
  const testModeEnabled = process.env.LUNA_TEST_MODE?.trim().toLowerCase() === "true";
  const isProduction = process.env.NODE_ENV === "production";

  // Test-mode authentication bypass is intentionally unavailable in production.
  return testModeEnabled && !isProduction;
}
