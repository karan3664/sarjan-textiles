#!/usr/bin/env node
/**
 * Generate bcrypt storage hash for dev transport-hashed passwords.
 * Clients send SHA-256(plaintext); DB/env stores bcrypt(SHA-256).
 *
 * Usage: node scripts/print-password-storage-hash.mjs 'YourPassword'
 */
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const plain = process.argv[2];
if (!plain) {
  console.error(
    "Usage: node scripts/print-password-storage-hash.mjs <plaintext-password>",
  );
  process.exit(1);
}

const transport = createHash("sha256")
  .update(plain.normalize("NFKC"), "utf8")
  .digest("hex");
const storage = bcrypt.hashSync(transport, 12);
const b64 = Buffer.from(storage).toString("base64");

console.log("Transport SHA-256 (sent by apps/web in dev):");
console.log(transport);
console.log("");
console.log("Bcrypt storage hash (DB / ADMIN_PASSWORD_HASH):");
console.log(storage);
console.log("");
console.log("ADMIN_PASSWORD_HASH_B64 (Coolify-safe):");
console.log(b64);
