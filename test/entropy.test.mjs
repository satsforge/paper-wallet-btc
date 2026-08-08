import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntropyCollector } from '../src/lib/entropy.js';

test('progress is gated by elapsed time even with plenty of samples', () => {
  // This is the exact invariant behind a real bug: the UI only re-read
  // progress() from inside feed(), so once enough samples came in fast,
  // the time-gated half of progress() could stop advancing until another
  // pointer event fired. The fix polls progress() independently of feed();
  // this test locks in the underlying assumption that fix relies on.
  const c = new EntropyCollector();
  c.start(() => {});
  for (let i = 0; i < 200; i++) c.feed(i, i);
  assert.ok(c.progress() < 1, 'progress should not reach 1 within a synchronous burst of feeds');
});

test('isReady only becomes true once both the sample and time thresholds are met', () => {
  const c = new EntropyCollector();
  c.start(() => {});
  for (let i = 0; i < 150; i++) c.feed(i, i);
  assert.equal(c.isReady(), false, 'time threshold not met yet');
  c.startedAt -= 5000; // simulate 5s having elapsed without any further input
  assert.equal(c.isReady(), true, 'both thresholds met now');
});

test('progress stays below 1 with plenty of elapsed time but too few samples', () => {
  const c = new EntropyCollector();
  c.start(() => {});
  c.feed(1, 1);
  c.startedAt -= 5000;
  assert.ok(c.progress() < 1);
});

test('getMixedBytes returns the requested length and is not constant across calls', () => {
  const c = new EntropyCollector();
  c.start(() => {});
  const a = c.getMixedBytes(32);
  const b = c.getMixedBytes(32);
  assert.equal(a.length, 32);
  assert.notEqual(Buffer.from(a).toString('hex'), Buffer.from(b).toString('hex'));
});

test('mixExternalBytes updates the pool deterministically for identical input', () => {
  const c1 = new EntropyCollector();
  const c2 = new EntropyCollector();
  const bytes = new Uint8Array([1, 2, 3, 4]);
  c1.mixExternalBytes(bytes);
  c2.mixExternalBytes(bytes);
  assert.equal(Buffer.from(c1.pool).toString('hex'), Buffer.from(c2.pool).toString('hex'));
});
