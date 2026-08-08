import { schnorr } from '@noble/curves/secp256k1.js';
import { bytesToNumberBE } from '@noble/curves/utils.js';
import { bech32m } from '@scure/base';

const Point = schnorr.Point;
const CURVE_N = Point.Fn.ORDER;

/**
 * BIP341 key-path-only tweak: Q = lift_x(P) + hashTapTweak(P) * G,
 * where P is the 32-byte x-only internal public key. No script tree.
 * Returns the 32-byte x-only tweaked (output) public key.
 */
export function taprootTweakXOnly(internalXOnly) {
  const P = schnorr.utils.lift_x(bytesToNumberBE(internalXOnly));
  const t = bytesToNumberBE(schnorr.utils.taggedHash('TapTweak', internalXOnly)) % CURVE_N;
  const Q = P.add(Point.BASE.multiply(t));
  return schnorr.utils.pointToBytes(Q);
}

/** Native Taproot (P2TR, bech32m, witness v1) address from a 32-byte x-only internal pubkey. */
export function p2trAddressFromXOnly(internalXOnly) {
  const outputXOnly = taprootTweakXOnly(internalXOnly);
  const words = [1, ...bech32m.toWords(outputXOnly)];
  return bech32m.encode('bc', words);
}

/** Convenience: derive the P2TR address from a standard 33-byte compressed pubkey. */
export function p2trAddress(compressedPubkey) {
  return p2trAddressFromXOnly(compressedPubkey.slice(1, 33));
}
