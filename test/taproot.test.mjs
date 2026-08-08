import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils.js';
import { taprootTweakXOnly, p2trAddressFromXOnly } from '../src/lib/taproot.js';

const vectors = JSON.parse(readFileSync(new URL('./fixtures/bip341-vectors.json', import.meta.url)));

test('Taproot key-path tweak matches the official BIP341 test vectors', () => {
  assert.ok(vectors.length > 0, 'fixture must not be empty');
  for (const v of vectors) {
    const internal = hexToBytes(v.given.internalPubkey);
    const outputXOnly = taprootTweakXOnly(internal);
    assert.equal(bytesToHex(outputXOnly), v.intermediary.tweakedPubkey);

    const address = p2trAddressFromXOnly(internal);
    assert.equal(address, v.expected.bip350Address);
  }
});
