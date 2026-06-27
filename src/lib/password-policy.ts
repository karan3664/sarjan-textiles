/** Minimum length for client (B2B) account passwords — register, reset, and profile change. */
import { isTransportHashedPassword } from "@/lib/password-transport";

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

/** Skip length/complexity when client already sent SHA-256 transport hash (dev). */
export function assertMinClientPasswordFromClient(
  password: string,
  context = "Password",
) {
  if (isTransportHashedPassword(password)) return;
  assertMinClientPassword(password, context);
}

export function assertAdminPasswordFromClient(
  password: string,
  context = "Password",
) {
  if (isTransportHashedPassword(password)) return;
  assertAdminPassword(password, context);
}
