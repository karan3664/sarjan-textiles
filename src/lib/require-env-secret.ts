/** Fail closed when a signing secret is missing — never use hardcoded fallbacks. */
export function requireEnvSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Set it in environment variables before starting the server.`,
    );
  }
  return value;
}
