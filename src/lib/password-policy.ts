/** Minimum length for client (B2B) account passwords — register, reset, and profile change. */
export const MIN_CLIENT_PASSWORD_LENGTH = 10;

export function minClientPasswordMessage(context = "Password") {
  return `${context} must be at least ${MIN_CLIENT_PASSWORD_LENGTH} characters`;
}

export function assertMinClientPassword(
  password: string,
  context = "Password",
) {
  if (password.length < MIN_CLIENT_PASSWORD_LENGTH) {
    throw new Error(minClientPasswordMessage(context));
  }
}

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export function minAdminPasswordMessage(context = "Password") {
  return `${context} must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, and a number`;
}

export function assertAdminPassword(password: string, context = "Password") {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(minAdminPasswordMessage(context));
  }
  if (
    password === password.toLowerCase() ||
    password === password.toUpperCase()
  ) {
    throw new Error(
      `${context} must include both uppercase and lowercase letters`,
    );
  }
  if (!/[a-z]/.test(password)) {
    throw new Error(`${context} must include a lowercase letter`);
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error(`${context} must include an uppercase letter`);
  }
  if (!/[0-9]/.test(password)) {
    throw new Error(`${context} must include a number`);
  }
}
