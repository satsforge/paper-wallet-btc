import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { hexToBytes, bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { ecb } from '@noble/ciphers/aes.js';
import { base58check } from '@scure/base';
import { bip38Encrypt } from '../src/lib/bip38.js';
import { toWIF } from '../src/lib/wallet.js';

const b58c = base58check(sha256);
const vectors = JSON.parse(readFileSync(new URL('./fixtures/bip38-vectors.json', import.meta.url)));

/**
 * Independent reference BIP38 decrypt (non-EC-multiply), written directly
 * from the spec rather than reusing app code, so it can act as an oracle
 * for bip38Encrypt's output instead of just checking the code against
 * itself.
 */
async function referenceDecrypt(encrypted, passphrase) {
  const payload = b58c.decode(encrypted);
  const addressHash = payload.slice(3, 7);
  const encryptedHalf1 = payload.slice(7, 23);
  const encryptedHalf2 = payload.slice(23, 39);

  const derived = await scryptAsync(utf8ToBytes(passphrase.normalize('NFC')), addressHash, {
    N: 16384, r: 8, p: 8, dkLen: 64,
  });
  const derivedHalf1 = derived.slice(0, 32);
  const derivedHalf2 = derived.slice(32, 64);

  const dec1 = ecb(derivedHalf2, { disablePadding: true }).decrypt(encryptedHalf1);
  const dec2 = ecb(derivedHalf2, { disablePadding: true }).decrypt(encryptedHalf2);

  const xor = (a, b) => a.map((byte, i) => byte ^ b[i]);
  return new Uint8Array([...xor(dec1, derivedHalf1.slice(0, 16)), ...xor(dec2, derivedHalf1.slice(16, 32))]);
}

test('bip38Encrypt reproduces the official BIP38 compressed-key test vectors', async () => {
  for (const v of vectors) {
    const privateKey = hexToBytes(v.privateKeyHex);
    const pubkey = secp256k1.getPublicKey(privateKey, true);
    assert.equal(toWIF(privateKey, true), v.wif, `${v.passphrase}: WIF encoding`);

    const encrypted = await bip38Encrypt(privateKey, pubkey, v.passphrase);
    assert.equal(encrypted, v.encrypted, `${v.passphrase}: encrypted output`);
    assert.match(encrypted, /^6PY/, 'compressed BIP38 keys always start with 6PY');
  }
});

test('an independent reference decrypt recovers the original key from the official ciphertext', async () => {
  for (const v of vectors) {
    const recovered = await referenceDecrypt(v.encrypted, v.passphrase);
    assert.equal(bytesToHex(recovered), v.privateKeyHex.toLowerCase(), v.passphrase);
  }
});

test('a wrong passphrase decrypts to a different (garbage) key, never the original', async () => {
  const v = vectors[0];
  const recovered = await referenceDecrypt(v.encrypted, 'definitely-the-wrong-passphrase');
  assert.notEqual(bytesToHex(recovered), v.privateKeyHex.toLowerCase());
});
