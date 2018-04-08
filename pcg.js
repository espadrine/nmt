// This PRNG is inspired by PCG, but relies on a 32-bit state (instead of
// 64-bit) for speed, as JS does not have native 64-bit numbers.
class PCG {
  constructor(seed, incr) {
    this.state = 0;
    this.incr = ((incr >>> 0) << 1) | 1;
    this.random32();
    this.state += seed >>> 0;
    this.random32();
  }
  // Random 32-bit integer.
  random32() {
    const oldState = this.state >>> 0;
    this.state = ((oldState * 0x5851f42d) >>> 0) + (this.incr|1);
    const xorshifted = ((oldState >>> 9) ^ oldState) >>> 13;
    const rot = oldState >>> 29;
    return (xorshifted >>> rot) | (xorshifted << ((-rot) & 15));
  }
  // Random number in [0,1).
  random() {
    return this.random32() / 4294967296;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = PCG;
}
