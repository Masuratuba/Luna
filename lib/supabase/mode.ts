export function isLoginBypassed(): boolean {
  return process.env.LUNA_TEST_MODE?.trim().toLowerCase() === "true";
}
