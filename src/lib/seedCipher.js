import { scryptAsync } from '@noble/hashes/scrypt.js';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes, randomBytes, concatBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';

// Independent of the BIP38 cost parameters: this protects the printed
// mnemonic text itself, not a WIF, and uses authenticated encryption (GCM)
// so a wrong password fails loudly instead of silently returning garbage.
const SCRYPT_OPTS = { N: 65536, r: 8, p: 1, dkLen: 32 };
const SALT_LEN = 16;
const NONCE_LEN = 12;

async function deriveKey(password, salt) {
  return scryptAsync(utf8ToBytes(password.normalize('NFC')), salt, SCRYPT_OPTS);
}

/** Encrypts the mnemonic phrase (as plain text) with a password. Returns a base64 blob. */
export async function encryptMnemonic(mnemonic, password) {
  const salt = randomBytes(SALT_LEN);
  const nonce = randomBytes(NONCE_LEN);
  const key = await deriveKey(password, salt);
  const ciphertext = gcm(key, nonce).encrypt(utf8ToBytes(mnemonic));
  return base64.encode(concatBytes(salt, nonce, ciphertext));
}

/**
 * Decrypts a blob produced by encryptMnemonic. Throws if the password is
 * wrong or the blob is malformed. Whitespace (spaces/newlines) is stripped
 * first: the PDF wraps the base64 blob across several printed lines, so
 * whoever re-types or copy-pastes it back in will very likely include line
 * breaks or stray spaces that aren't part of the actual base64 data.
 */
export async function decryptMnemonic(blob, password) {
  const payload = base64.decode(blob.replace(/\s+/g, ''));
  const salt = payload.slice(0, SALT_LEN);
  const nonce = payload.slice(SALT_LEN, SALT_LEN + NONCE_LEN);
  const ciphertext = payload.slice(SALT_LEN + NONCE_LEN);
  const key = await deriveKey(password, salt);
  const plaintext = gcm(key, nonce).decrypt(ciphertext); // throws on auth-tag mismatch
  return new TextDecoder().decode(plaintext);
}
