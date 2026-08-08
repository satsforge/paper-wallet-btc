import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRolls, rollsNeededForBits, bitsFromRollCount, diceEntropyBytes } from '../src/lib/diceware.js';

test('parseRolls keeps only digits 1-6 and drops everything else', () => {
  assert.deepEqual(parseRolls('3 6-1,4/2 5 6 1'), ['3', '6', '1', '4', '2', '5', '6', '1']);
  // 0, 7, 8, 9 are not valid d6 faces and must be dropped, not just non-digit characters.
  assert.deepEqual(parseRolls('0789 abc 4'), ['4']);
  assert.deepEqual(parseRolls(''), []);
});

test('rollsNeededForBits/bitsFromRollCount agree with each other', () => {
  const need256 = rollsNeededForBits(256);
  assert.ok(bitsFromRollCount(need256) >= 256);
  assert.ok(bitsFromRollCount(need256 - 1) < 256);
});

test('diceEntropyBytes is deterministic and 32 bytes long', () => {
  const rolls = ['1', '2', '3', '4', '5', '6'];
  const a = diceEntropyBytes(rolls);
  const b = diceEntropyBytes(rolls);
  assert.equal(a.length, 32);
  assert.equal(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});

test('different roll sequences produce different entropy bytes', () => {
  const a = diceEntropyBytes(['1', '2', '3', '4', '5']);
  const b = diceEntropyBytes(['1', '2', '3', '4', '6']);
  assert.notEqual(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});
