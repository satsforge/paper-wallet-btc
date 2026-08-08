import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hexToBytes } from '@noble/hashes/utils.js';
import { generateMnemonicFromEntropy, isValidMnemonic, seedFromMnemonic } from '../src/lib/mnemonic.js';

const vectors = JSON.parse(readFileSync(new URL('./fixtures/bip39-vectors.json', import.meta.url)));

test('entropy -> mnemonic matches the canonical BIP39 test vectors', () => {
  for (const v of vectors) {
    const mnemonic = generateMnemonicFromEntropy(hexToBytes(v.entropyHex));
    assert.equal(mnemonic, v.mnemonic, `entropy ${v.entropyHex}`);
  }
});

test('generated mnemonics always pass their own checksum validation', () => {
  for (const v of vectors) {
    assert.equal(isValidMnemonic(v.mnemonic), true);
  }
});

test('validateMnemonic rejects a tampered word', () => {
  const words = vectors[0].mnemonic.split(' ');
  words[0] = words[0] === 'abandon' ? 'zebra' : 'abandon';
  assert.equal(isValidMnemonic(words.join(' ')), false);
});

test('seedFromMnemonic is deterministic and passphrase-sensitive', async () => {
  const mnemonic = vectors[0].mnemonic;
  const seedA = await seedFromMnemonic(mnemonic, '');
  const seedB = await seedFromMnemonic(mnemonic, '');
  const seedWithPass = await seedFromMnemonic(mnemonic, 'some-passphrase');
  assert.equal(Buffer.from(seedA).toString('hex'), Buffer.from(seedB).toString('hex'));
  assert.notEqual(Buffer.from(seedA).toString('hex'), Buffer.from(seedWithPass).toString('hex'));
  assert.equal(seedA.length, 64);
});
