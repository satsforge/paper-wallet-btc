import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptMnemonic, decryptMnemonic } from '../src/lib/seedCipher.js';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test('encryptMnemonic/decryptMnemonic roundtrip with the correct password', async () => {
  const blob = await encryptMnemonic(MNEMONIC, 'correct horse battery staple');
  const decrypted = await decryptMnemonic(blob, 'correct horse battery staple');
  assert.equal(decrypted, MNEMONIC);
});

test('the encrypted blob never contains the plaintext mnemonic', async () => {
  const blob = await encryptMnemonic(MNEMONIC, 'a password');
  assert.equal(blob.includes(MNEMONIC), false);
  for (const word of MNEMONIC.split(' ')) {
    assert.equal(blob.toLowerCase().includes(word), false);
  }
});

test('decrypting with the wrong password throws instead of returning garbage', async () => {
  const blob = await encryptMnemonic(MNEMONIC, 'right-password');
  await assert.rejects(() => decryptMnemonic(blob, 'wrong-password'));
});

test('each encryption uses a fresh salt/nonce, so the same input never repeats', async () => {
  const blobA = await encryptMnemonic(MNEMONIC, 'same-password');
  const blobB = await encryptMnemonic(MNEMONIC, 'same-password');
  assert.notEqual(blobA, blobB);
  // ...but both still decrypt back to the same plaintext.
  assert.equal(await decryptMnemonic(blobA, 'same-password'), MNEMONIC);
  assert.equal(await decryptMnemonic(blobB, 'same-password'), MNEMONIC);
});

test('decryptMnemonic tolerates whitespace/line breaks from re-typing the printed PDF blob', async () => {
  const blob = await encryptMnemonic(MNEMONIC, 'recovery-password');
  // Simulate what the PDF actually prints: the base64 blob wrapped across
  // several lines, which a person re-typing or copy-pasting it back in is
  // very likely to reproduce with line breaks and/or stray spaces.
  const reTyped = blob.match(/.{1,20}/g).join('\n  ') + '\n';
  assert.equal(await decryptMnemonic(reTyped, 'recovery-password'), MNEMONIC);
});
