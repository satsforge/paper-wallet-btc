import { sha256 } from '@noble/hashes/sha2.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { ecb } from '@noble/ciphers/aes.js';
import { base58check } from '@scure/base';
import { legacyAddressForSalt } from './wallet.js';

const b58c = base58check(sha256);

function xorBytes(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/**
 * BIP38 encryption (non-EC-multiply mode) of a compressed private key.
 * The address-hash salt is always computed from the P2PKH (legacy) address
 * of the same public key, per the BIP38 spec, independent of which address
 * type the wallet displays for receiving funds.
 */
export async function bip38Encrypt(privateKey, pubkey, passphrase, onProgress) {
  const address = legacyAddressForSalt(pubkey);
  const addressHash = sha256(sha256(utf8ToBytes(address))).slice(0, 4);

  const derived = await scryptAsync(utf8ToBytes(passphrase.normalize('NFC')), addressHash, {
    N: 16384,
    r: 8,
    p: 8,
    dkLen: 64,
    onProgress,
  });
  const derivedHalf1 = derived.slice(0, 32);
  const derivedHalf2 = derived.slice(32, 64);

  const block1 = xorBytes(privateKey.slice(0, 16), derivedHalf1.slice(0, 16));
  const block2 = xorBytes(privateKey.slice(16, 32), derivedHalf1.slice(16, 32));

  // A fresh cipher instance per call: @noble/ciphers refuses to encrypt()
  // twice with the same instance (nonce-reuse guard), even in ECB mode.
  const encryptedHalf1 = ecb(derivedHalf2, { disablePadding: true }).encrypt(block1);
  const encryptedHalf2 = ecb(derivedHalf2, { disablePadding: true }).encrypt(block2);

  const flagByte = 0xe0; // non-EC-multiply, compressed
  const payload = concatBytes(
    Uint8Array.of(0x01, 0x42, flagByte),
    addressHash,
    encryptedHalf1,
    encryptedHalf2
  );
  return b58c.encode(payload);
}
