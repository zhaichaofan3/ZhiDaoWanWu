import crypto from "node:crypto";

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function gen(bytes) {
  return base64url(crypto.randomBytes(bytes));
}

const tokenSecretBytes = 32; // 256-bit
const passwordSaltBytes = 16; // legacy md5 salt; 128-bit is enough

const TOKEN_SECRET = gen(tokenSecretBytes);
const PASSWORD_SALT = gen(passwordSaltBytes);

process.stdout.write(
  [
    "# Generated secrets (paste into your .env)",
    `TOKEN_SECRET=${TOKEN_SECRET}`,
    `PASSWORD_SALT=${PASSWORD_SALT}`,
    "BCRYPT_ROUNDS=10",
    "",
  ].join("\n")
);

