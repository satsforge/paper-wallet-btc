import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, randomBytes } from '@noble/hashes/utils.js';

const MIN_SAMPLES = 120;
const MIN_MS = 4500;

/**
 * Collects mouse/touch movement as *supplementary* entropy. The CSPRNG
 * (crypto.getRandomValues, via @noble/hashes randomBytes) is already the
 * sole source of security here; this pool is XORed on top of it so the
 * final bytes stay uniformly random even if every user sample were fully
 * predictable. Its purpose is UX reassurance, not a security requirement.
 */
export class EntropyCollector {
  constructor() {
    this.samples = 0;
    this.startedAt = null;
    this.pool = new Uint8Array(32); // running hash state
    this._onSample = null;
  }

  start(onSample) {
    this._onSample = onSample;
    this.startedAt = performance.now();
  }

  /** feed(x, y) — call on every pointer/touch move */
  feed(x, y, extra) {
    this.samples += 1;
    const t = performance.now();
    const buf = new Float64Array([x, y, t, extra ?? Math.random()]);
    const bytes = new Uint8Array(buf.buffer);
    this.pool = sha256(concatBytes(this.pool, bytes));
    if (this._onSample) this._onSample(this.progress());
  }

  progress() {
    const elapsed = this.startedAt ? performance.now() - this.startedAt : 0;
    const byTime = Math.min(1, elapsed / MIN_MS);
    const byCount = Math.min(1, this.samples / MIN_SAMPLES);
    return Math.min(byTime, byCount);
  }

  isReady() {
    return this.progress() >= 1;
  }

  /** Mixes externally-sourced bytes (e.g. physical dice rolls) into the pool. */
  mixExternalBytes(bytes) {
    this.pool = sha256(concatBytes(this.pool, bytes));
  }

  /** Returns n bytes: CSPRNG output XORed with the collected pool. */
  getMixedBytes(n) {
    const csprng = randomBytes(n);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = csprng[i] ^ this.pool[i % this.pool.length];
    }
    return out;
  }
}
