import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { base58check, bech32 } from '@scure/base';
import { p2trAddress } from './taproot.js';

const b58c = base58check(sha256);

export const ADDRESS_TYPES = {
  legacy: { label: 'Legacy (P2PKH)', prefix: '1...', path: "m/44'/0'/0'/0/0" },
  p2sh: { label: 'SegWit compatible (P2SH)', prefix: '3...', path: "m/49'/0'/0'/0/0" },
  bech32: { label: 'Native SegWit (Bech32)', prefix: 'bc1...', path: "m/84'/0'/0'/0/0" },
  taproot: { label: 'Taproot (P2TR)', prefix: 'bc1p...', path: "m/86'/0'/0'/0/0" },
};

function hash160(bytes) {
  return ripemd160(sha256(bytes));
}

function toBase58Check(versionByte, payload) {
  return b58c.encode(concatBytes(Uint8Array.of(versionByte), payload));
}

export function p2pkhAddress(pubkey) {
  return toBase58Check(0x00, hash160(pubkey));
}

export function p2shP2wpkhAddress(pubkey) {
  const program = hash160(pubkey);
  const redeemScript = concatBytes(Uint8Array.of(0x00, 0x14), program);
  return toBase58Check(0x05, hash160(redeemScript));
}

export function p2wpkhAddress(pubkey) {
  const program = hash160(pubkey);
  const words = concatWords(0, bech32.toWords(program));
  return bech32.encode('bc', words);
}

function concatWords(version, rest) {
  return [version, ...rest];
}

export function addressForType(type, pubkey) {
  if (type === 'legacy') return p2pkhAddress(pubkey);
  if (type === 'p2sh') return p2shP2wpkhAddress(pubkey);
  if (type === 'bech32') return p2wpkhAddress(pubkey);
  if (type === 'taproot') return p2trAddress(pubkey);
  throw new Error(`Unknown address type: ${type}`);
}

/** WIF encoding, always compressed (standard for HD-derived keys). */
export function toWIF(privateKey, compressed = true) {
  const payload = compressed
    ? concatBytes(Uint8Array.of(0x80), privateKey, Uint8Array.of(0x01))
    : concatBytes(Uint8Array.of(0x80), privateKey);
  return b58c.encode(payload);
}

/**
 * Derives the account-0/external-chain/index-0 keypair for a given address
 * type from a BIP32 master seed, following BIP44 (legacy), BIP49
 * (P2SH-SegWit) and BIP84 (native SegWit) path conventions.
 */
export function deriveWallet(seed, type) {
  const root = HDKey.fromMasterSeed(seed);
  const path = ADDRESS_TYPES[type].path;
  const node = root.derive(path);
  const privateKey = node.privateKey;
  const publicKey = node.publicKey;
  const address = addressForType(type, publicKey);
  const wif = toWIF(privateKey, true);
  root.wipePrivateData();
  return { path, address, wif, privateKey, publicKey };
}

/** Derives every supported address type from the same seed in one pass. */
export function deriveAllWallets(seed) {
  const root = HDKey.fromMasterSeed(seed);
  const out = {};
  for (const type of Object.keys(ADDRESS_TYPES)) {
    const node = root.derive(ADDRESS_TYPES[type].path);
    const privateKey = node.privateKey;
    const publicKey = node.publicKey;
    out[type] = {
      type,
      path: ADDRESS_TYPES[type].path,
      address: addressForType(type, publicKey),
      wif: toWIF(privateKey, true),
      privateKey,
      publicKey,
    };
  }
  root.wipePrivateData();
  return out;
}

/** P2PKH (legacy) address for a given pubkey — used as the BIP38 salt input
 * regardless of receive-address type, per the BIP38 spec (pre-dates SegWit). */
export function legacyAddressForSalt(pubkey) {
  return p2pkhAddress(pubkey);
}
