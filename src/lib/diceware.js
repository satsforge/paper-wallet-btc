import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

const BITS_PER_ROLL = Math.log2(6); // ~2.585 bits of entropy per fair d6 roll

/** Extracts only the digits 1-6 from free-form user input (spaces/dashes allowed). */
export function parseRolls(input) {
  return (input.match(/[1-6]/g) || []);
}

export function rollsNeededForBits(bits) {
  return Math.ceil(bits / BITS_PER_ROLL);
}

export function bitsFromRollCount(count) {
  return count * BITS_PER_ROLL;
}

/**
 * Reduces a sequence of physical dice rolls to 32 bytes via SHA-256. Hashing
 * is a standard, safe way to extract uniform bytes from a longer, imperfect
 * entropy source — it never needs to be reversed, only mixed in.
 */
export function diceEntropyBytes(rolls) {
  return sha256(utf8ToBytes(rolls.join('')));
}
