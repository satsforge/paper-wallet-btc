import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256 } from '@noble/hashes/sha2.js';
import { hexToBytes, bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { base58check } from '@scure/base';
import { seedFromMnemonic } from '../src/lib/mnemonic.js';
import {
  ADDRESS_TYPES,
  deriveWallet,
  deriveAllWallets,
  p2pkhAddress,
  p2shP2wpkhAddress,
  toWIF,
} from '../src/lib/wallet.js';

const b58c = base58check(sha256);
const bip84 = JSON.parse(readFileSync(new URL('./fixtures/bip84-vector.json', import.meta.url)));
const bip49 = JSON.parse(readFileSync(new URL('./fixtures/bip49-hash-vector.json', import.meta.url)));

test('BIP84 (native SegWit) derivation matches the official test vector end-to-end', async () => {
  const seed = await seedFromMnemonic(bip84.mnemonic, bip84.passphrase);
  const derived = deriveWallet(seed, 'bech32');
  assert.equal(derived.path, bip84.path);
  assert.equal(bytesToHex(derived.publicKey), bip84.pubkeyHex);
  assert.equal(derived.wif, bip84.wif);
  assert.equal(derived.address, bip84.address);
});

test('toWIF reproduces the official BIP84 vector WIF from its raw private key', async () => {
  const seed = await seedFromMnemonic(bip84.mnemonic, bip84.passphrase);
  const derived = deriveWallet(seed, 'bech32');
  assert.equal(toWIF(derived.privateKey, true), bip84.wif);
});

test('p2pkhAddress and p2shP2wpkhAddress hash a pubkey the same way BIP49 specifies', () => {
  // BIP49's worked example is testnet-only, but HASH160(pubkey) and
  // HASH160(redeemScript) are network-independent, so we can validate our
  // mainnet-only functions against them by stripping the version byte
  // from our own output and comparing the remaining 20-byte hash.
  const pubkey = hexToBytes(bip49.pubkeyHex);

  const p2pkh = p2pkhAddress(pubkey);
  const p2pkhPayload = b58c.decode(p2pkh);
  assert.equal(bytesToHex(p2pkhPayload.slice(1)), bip49.hash160OfPubkeyHex);

  const p2sh = p2shP2wpkhAddress(pubkey);
  const p2shPayload = b58c.decode(p2sh);
  assert.equal(bytesToHex(p2shPayload.slice(1)), bip49.hash160OfRedeemScriptHex);
});

test('every address type uses the expected mainnet prefix and a distinct key', async () => {
  const seed = randomBytes(64);
  const all = deriveAllWallets(seed);

  assert.ok(all.legacy.address.startsWith('1'));
  assert.ok(all.p2sh.address.startsWith('3'));
  assert.ok(all.bech32.address.startsWith('bc1q'));
  assert.ok(all.taproot.address.startsWith('bc1p'));

  const addresses = new Set(Object.values(all).map((w) => w.address));
  assert.equal(addresses.size, Object.keys(ADDRESS_TYPES).length, 'each type must derive a distinct address');
});

test('deriveAllWallets agrees with deriveWallet called individually for every type', async () => {
  const seed = randomBytes(64);
  const all = deriveAllWallets(seed.slice());
  for (const type of Object.keys(ADDRESS_TYPES)) {
    const solo = deriveWallet(seed.slice(), type);
    assert.equal(all[type].address, solo.address, `${type} address`);
    assert.equal(all[type].wif, solo.wif, `${type} wif`);
    assert.equal(all[type].path, solo.path, `${type} path`);
  }
});

test('deriveWallet is deterministic for the same seed and type', () => {
  const seed = randomBytes(64);
  const a = deriveWallet(seed.slice(), 'bech32');
  const b = deriveWallet(seed.slice(), 'bech32');
  assert.equal(a.address, b.address);
  assert.equal(a.wif, b.wif);
});
