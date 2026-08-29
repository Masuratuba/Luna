export function getServerSecret(name: string): string | undefined {
  if (typeof window !== "undefined") throw new Error("Secrets are server-only");
  return process.env[name];
}
