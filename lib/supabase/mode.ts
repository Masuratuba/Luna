export function isLoginBypassed(): boolean {
  // LUNA is currently a personal development deployment. Keep the direct
  // owner/test path active when the owner identity is configured, while still
  // allowing an explicit false to restore normal authentication.
  const configured = process.env.LUNA_TEST_MODE?.trim().toLowerCase();
  if (configured === "false") return false;
  return configured === "true" || Boolean(process.env.LUNA_OWNER_USER_ID?.trim());
}
