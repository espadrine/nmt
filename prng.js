(function(global) {
// This PRNG is inspired by Weyl, which relies on a 32-bit state, which is
// necessary as JS does not have native 64-bit numbers.
// https://github.com/Marc-B-Reynolds/Stand-alone-junk/blob/master/src/SFH/lprns.h
// Randomness visualization: https://thefiletree.com/espadrine/%E2%9A%92/random.html?app=data
const LPRNS_WEYL = 0x3504f333, LPRNS_M0 = 0x85ebca77, LPRNS_M1 = 0xc2b2ae3d;
const LPRNS_S0 = 15, LPRNS_S1 = 13, LPRNS_S2 = 16;
class Weyl {
  constructor(seed) { this.state = seed; }
  // Random 32-bit integer.
  random32() {
    const oldState = this.state >>> 0;
    let x = oldState;
    x ^= oldState >>> LPRNS_S0; x *= LPRNS_M0;
    x ^= x >>> LPRNS_S1; x *= LPRNS_M1;
    x ^= x >>> LPRNS_S2;
    this.state = oldState + LPRNS_WEYL;
    return x;
  }
  // Random number from 0 incl to 1 excl.
  random() { return this.random32() / 0x100000000; }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Weyl;
} else {
  global.PRNG = Weyl;
}
}(this));
