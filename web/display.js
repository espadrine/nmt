/*
 * A fast javascript implementation of simplex noise by Jonas Wagner
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2012 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
(function () {

var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
    G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
    F3 = 1.0 / 3.0,
    G3 = 1.0 / 6.0,
    F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
    G4 = (5.0 - Math.sqrt(5.0)) / 20.0;


function SimplexNoise(random) {
    if (!random) random = Math.random;
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (var i = 0; i < 256; i++) {
        this.p[i] = random() * 256;
    }
    for (i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
        this.permMod12[i] = this.perm[i] % 12;
    }

}
SimplexNoise.prototype = {
    grad3: new Float32Array([1, 1, 0,
                            - 1, 1, 0,
                            1, - 1, 0,

                            - 1, - 1, 0,
                            1, 0, 1,
                            - 1, 0, 1,

                            1, 0, - 1,
                            - 1, 0, - 1,
                            0, 1, 1,

                            0, - 1, 1,
                            0, 1, - 1,
                            0, - 1, - 1]),
    grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
                            0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
                            1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
                            - 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
                            1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
                            - 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
                            1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
                            - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
    noise2D: function (xin, yin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0=0, n1=0, n2=0; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t; // Unskew the cell origin back to (x,y) space
        var Y0 = j - t;
        var x0 = xin - X0; // The x,y distances from the cell origin
        var y0 = yin - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            var gi0 = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    },
    // 3D simplex noise
    noise3D: function (xin, yin, zin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0; // The x,y,z distances from the cell origin
        var y0 = yin - Y0;
        var z0 = zin - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // X Z Y order
            else {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Y Z X order
            else {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
            t3 *= t3;
            n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    },
    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D: function (x, y, z, w) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad4 = this.grad4;

        var n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var s = (x + y + z + w) * F4; // Factor for 4D skewing
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);
        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        var Y0 = j - t;
        var Z0 = k - t;
        var W0 = l - t;
        var x0 = x - X0; // The x,y,z,w distances from the cell origin
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0;
        var ranky = 0;
        var rankz = 0;
        var rankw = 0;
        if (x0 > y0) rankx++;
        else ranky++;
        if (x0 > z0) rankx++;
        else rankz++;
        if (x0 > w0) rankx++;
        else rankw++;
        if (y0 > z0) ranky++;
        else rankz++;
        if (y0 > w0) ranky++;
        else rankw++;
        if (z0 > w0) rankz++;
        else rankw++;
        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;
        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;
        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;
        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;
        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;
        // Calculate the contribution from the five corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
            t0 *= t0;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
            t1 *= t1;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
            t2 *= t2;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
            t3 *= t3;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
        }
        var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0) n4 = 0.0;
        else {
            var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
            t4 *= t4;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }


};

// amd
if (typeof define !== 'undefined' && define.amd) define(function(){return SimplexNoise;});
//common js
if (typeof exports !== 'undefined') exports.SimplexNoise = SimplexNoise;
// browser
else if (typeof navigator !== 'undefined') this.SimplexNoise = SimplexNoise;
// nodejs
if (typeof module !== 'undefined') {
    module.exports = SimplexNoise;
}

})();
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
var prng1 = new PRNG(0);
var prng2 = new PRNG(1);
var simplex1 = new SimplexNoise(prng1.random.bind(prng1));
var simplex2 = new SimplexNoise(prng2.random.bind(prng2));

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var tileTypes = {
  water:        0,
  steppe:       1,
  hill:         2,
  mountain:     3,
  swamp:        4,
  meadow:       5,
  forest:       6,
  taiga:        7,
  farm:         8,
  residence:    9,
  skyscraper:   10,
  factory:      11,
  dock:         12,
  airland:      13,
  airport:      14,
  gunsmith:     15,
  road:         16,
  wall:         17,
  blackdeath:   18,
  metal:        19,
  lumber:       20,
  mine:         21,
  industry:     22,
  citrus:       23,
  university:   24,
  beach:        25,
  arsenal:      26,
  smoke:        27,
  impact:       28,
  curvedRoad:   29,
  // Commodities.
  whales:       30,
  pearls:       31,
  fish:         32,
  algae:        33,

  glass:        34,
  salt:         35,
  cattle:       36,
  poultry:      37,

  ivory:        38,
  limestone:    39,
  wool:         40,
  grapes:       41,

  fur:          42,
  pigments:     43,
  rubber:       44,
  coal:         45,

  crocodile:    46,
  petroleum:    47,
  shrimp:       48,
  clay:         49,

  spices:       50,
  cotton:       51,
  coffee:       52,
  tea:          53,

  resin:        54,
  cocoa:        55,
  honey:        56,
  silk:         57,

  gems:         58,
  fungus:       59,
  pelt:         60,
  amber:        61,

  field:        62,
  market:       63,
  'space mission': 64,
  'stock exchange': 65,
  monument:     66
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 24,
    26, 62, 63, 64, 65, 66 ];

var resourceTypes = {
  fuel:       -1,
  metal:      -2,
  wealth:     -3
};
var listOfResourceTypes = [
  resourceTypes.fuel,
  resourceTypes.metal,
  resourceTypes.wealth
];

function setupStringFromTileType() {
  var map = Object.create(null);
  for (var type in tileTypes) { map[tileTypes[type]] = type; }
  for (var type in resourceTypes) { map[resourceTypes[type]] = type; }
  return map;
}
var stringFromTileType = setupStringFromTileType();

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hill]     = tileTypes.forest;
tileVegetationTypeFromSteepness[tileTypes.mountain] = tileTypes.taiga;

// Terrain generation

function tileType(steepness, vegetation) {
  if (vegetation) { return tileVegetationTypeFromSteepness[steepness]; }
  else { return steepness; }
}

function heatmap(x, y, simplex, size, harmonics) {
  var value = 0;
  var sum = 0;
  for (var i = 0; i < harmonics; i++) {
    var coeff = Math.pow(2, i);
    value += simplex.noise2D(x/size*coeff, y/size*coeff) / coeff;
    sum += 1 / coeff;
  }
  return value / sum;
}


// Movements.
var distancesNormal = [17,2,4,16,8,3,8,24,,,,,,,,,1,32];
var distancesBoat = [1,4,8,16,1,8,16,24,,,,,,,,,1,32];
var distancesPlane = [1,1,2,2,1,1,2,2,,,,,,,,,1,8];

var MAX_INT = 9007199254740992;


// Humanity

var manufacture = {
  boat: 1,
  car: 2,
  plane: 4,
  artillery: 8,
  gun: 16
};

// The index is the tileTypes id.
// It is a list of [number, tileType] requirements to build something.
// This is for tiles around the building.
var buildingDependencies = [,,,,,,,,
    ,
    [[2, tileTypes.farm]],      // residence [9].
    [[6, tileTypes.residence]],
    [[3, tileTypes.residence]],
    [[1, tileTypes.residence], [1, tileTypes.water], [1, resourceTypes.fuel]],
    [[2, tileTypes.road]],
    [[1, tileTypes.gunsmith], [3, tileTypes.airland], [1, resourceTypes.fuel]],
    [[1, tileTypes.skyscraper], [1, tileTypes.factory]],
    ,,,,
    [[1, tileTypes.residence]],
    [[1, resourceTypes.fuel], [1, tileTypes.factory]],
    [[10, resourceTypes.wealth], [1, tileTypes.mine], [5, tileTypes.road]],
    ,
    [[1, tileTypes.meadow], [1, tileTypes.water], [2, tileTypes.residence]],
    ,
    [[1, tileTypes.gunsmith], [1, resourceTypes.metal]],
    ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
    [],
    [[1, tileTypes.dock], [1, tileTypes.skyscraper], [4, resourceTypes.metal]],
    [[2, tileTypes.airport],
      [20, resourceTypes.metal], [20, resourceTypes.fuel]],
    [[1, tileTypes.market], [1, tileTypes.university],
      [200, resourceTypes.wealth], [20, resourceTypes.metal]],
    [[3, tileTypes.skyscraper], [200, resourceTypes.wealth],
      [20, resourceTypes.fuel]]
];

// What the current tile must hold to allow a building to be constructed.
var buildingTileDependency = [,,,,,,,, ,,,,,,,,,,,,
    [tileTypes.forest, tileTypes.taiga],         // Lumber [20]
    [tileTypes.metal],,,,,
    [tileTypes.steppe]
];

var planTypes = {
  move: 1,
  build: 2
};





function Terrain(humanity) {
  this.humanity = humanity;
  this.plans = {};
}

Terrain.prototype = {
  humanity: null,
  centerTile: { q: 0, r: 0 },
  centerPoint: { x: 0, y: 0 },

  tileTypes: tileTypes,
  buildingTypes: buildingTypes,
  resourceTypes: resourceTypes,
  listOfResourceTypes: listOfResourceTypes,
  stringFromTileType: function(tile) { return stringFromTileType[tile]; },
  tileType: tileType,
  heatmap: heatmap,

  setCenterTile: function setCenterTile(coord) {
    this.centerTile = coord;
    this.centerPoint.x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
    this.centerPoint.y = (3/2 * coord.r);
  },

  // Returns true if it is part of the continent.
  continent: function continent(x, y) {
    var size = 512;
    var hm = heatmap(x, y, simplex1, size, 8);
    var center = this.centerPoint;
    var squareDistanceFromCenter = (x - center.x) * (x - center.x)
                                 + (y - center.y) * (y - center.y);
    var continents = heatmap(x, y, simplex1, 4 * size, 8);
    var island =
      // Keep the center above ocean level.
      + (hm + .7) * Math.exp(-squareDistanceFromCenter / (size * size));
    if (island < continents) { island = continents; }
    island = Math.min(1, island);
    return island;
  },

  continentLimit: 0.42,

  // Get information about the tile at hexagonal coordinates `coord` {q, r}.
  // Returns
  //  - steepness: altitude level. See `tileTypes`.
  //  - vegetation: boolean; whether there is vegetation.
  //  - type: tile type. See `tileTypes`.
  //  - rain: floating point number between -1 and 1, representing how heavy
  //  the rainfall is.
  tile: function tile(coord) {
    var x, y;
    if (coord.x === undefined) {
      x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
      y = (3/2 * coord.r);
    } else { x = coord.x; y = coord.y; }
    var size = simplex2.noise2D(y/4/factor, x/4/factor);
    var riverNoise = 1-Math.abs((
        + 4 * (simplex1.noise2D(x/4/factor, y/4/factor))
        + 2 * (simplex1.noise2D(x/2/factor, y/2/factor))
        + 1 * (simplex1.noise2D(x/1/factor, y/1/factor))
        + 1/2 * (simplex1.noise2D(x*2/factor, y*2/factor))
        )/(1/2+1+2+4));
    var heightNoise = Math.sin(
        // Abs gives valleys.
        - (size * 5) * Math.abs(simplex1.noise2D(1/8*x/factor, 1/8*y/factor))
        + simplex1.noise2D(x/factor, y/factor)
        - 1/2 * simplex1.noise2D(2*x/factor, 2*y/factor)
        + 1/4 * simplex1.noise2D(4*x/factor, 4*y/factor)
        - 1/8 * simplex1.noise2D(8*x/factor, 8*y/factor)
        + 1/16 * simplex1.noise2D(16*x/factor, 16*y/factor));
    var seaNoise = -simplex2.noise2D(y/factor/8, x/factor/8)
        + simplex2.noise2D(y/factor/4, x/factor/4)
        + heightNoise/2;
    var vegetationNoise = (size) * simplex2.noise2D(x/factor, y/factor)
        + 1/2 * simplex2.noise2D(2*x/factor, 2*y/factor)
        + 1/4 * simplex2.noise2D(4*x/factor, 4*y/factor)
        + 1/8 * simplex2.noise2D(8*x/factor, 8*y/factor)
        + 1/16 * simplex2.noise2D(16*x/factor, 16*y/factor);
    var height = heightNoise - riverNoise;
    var continentNoise = this.continent(x, y);

    if (continentNoise > this.continentLimit) {
      var seaHeight = -1.3, seaHeightX;
      var steepness = (
      // Rivers are thinner in mountains.
      (((heightNoise > 0.6)? false: (riverNoise > 0.98))
      // Seas are smaller in mountains.
      || seaNoise*3/4 + heightNoise/4 < -1.0) ?
          // Inverse of oceanHeight.
          // sea height = X * 1 + Y
          // limit height = X * continentLimit + Y
          // => X = sea height - Y
          //    limit height = X * continentLimit + sea height - X
          // => limit height = X * (continentLimit - 1) + sea height
          // => X = (limit height - sea height) / (continentLimit - 1)
          (seaHeightX = (-1.5 - seaHeight) / (this.continentLimit - 1),
           height = (continentNoise * seaHeightX) + seaHeight - seaHeightX,
           tileTypes.water):
      (vegetationNoise < -1.0)?
          tileTypes.hill:
      (height < -0.2) ?
          tileTypes.steppe:
      // Mountains are cut off (by river) to avoid circular mountain formations.
      (height < 0.2) ?
          tileTypes.hill:
          tileTypes.mountain);
      var vegetation = (vegetationNoise
          // Less vegetation on water.
          - (steepness === tileTypes.water? 2 * seaNoise: 0)
          + Math.abs(heightNoise + 0.15)) < 0;
    } else {
      var steepness = tileTypes.water;
      var vegetation = false;
      // When continentNoise is at maximum (continentLimit),
      // height must be at -1.5 (-continentLimit - 1.5).
      var oceanHeight = continentNoise - 1.92;
      height = oceanHeight;
    }

    var tile = {
      steepness: steepness,
      vegetation: vegetation,
      type: this.tileType(steepness, vegetation),
      height: height,
      rain: -vegetationNoise / 2
    };
    return tile;
  },

  // Get the commodity at the tile at hexagonal coordinates `coord` {q, r}.
  // Returns -1 if there are no commodity.
  // See `tileTypes`.
  commodity: function commodity(coord, tile) {
    var x = coord.q, y = coord.r;
    //if (coord.x === undefined) {
    //  x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
    //  y = (3/2 * coord.r);
    //} else { x = coord.x; y = coord.y; }

    var magnitude1 = (-simplex1.noise2D(x/60,y/60)/8 + 1) / 2;
    var magnitude2 = (simplex1.noise2D(x/60,y/60)/8 + 1) / 2;
    var magnitude3 = (-simplex2.noise2D(x/60,y/60)/8 + 1) / 2;
    var magnitude4 = (simplex2.noise2D(x/60,y/60)/8 + 1) / 2;
    var hm1 = (magnitude1) * simplex1.noise2D(x/4, y/4);
    var hm2 = (magnitude2) * simplex1.noise2D(x/16, y/16);
    var hm3 = (magnitude3) * simplex2.noise2D(x/2, y/2);
    var hm4 = (magnitude4) * simplex2.noise2D(x/8, y/8);
    var frequency;
    if (hm1 > 0.49) {         // rare spread
      frequency = 0;
    } else if (hm2 > 0.49) {  // rare packed
      frequency = 1;
    } else if (hm3 > 0.45) {  // frequent spread
      frequency = 2;
    } else if (hm4 > 0.45) {  // frequent packed
      frequency = 3;
    } else {
      return -1;  // No commodity.
    }
    var tileType;
    if (tile != null) { tileType = tile.type; }
    else { tileType = this.tile(coord).type; }
    return tileTypes.whales + (tileType << 2) + frequency;
  },

  // Movements.
  distances: distancesNormal,

  distance: function distance(tpos) {
    var t = this.tile(tpos);
    var h = this.humanity.tile(tpos);
    var d = this.distances[(h && h.b)? h.b: t.type];
    if (d === undefined) { d = this.distances[t.type]; }
    return d;
  },

  // a and b are tiles = {q,r}.
  distanceBetweenTiles: function distanceBetweenTiles(a, b) {
    return (Math.abs(a.q - b.q) +
            Math.abs(a.r - b.r) +
            Math.abs(a.q + a.r - b.q - b.r)) / 2;
  },


  // Find a neighboring tile.
  // `tile` is {q, r}.
  // `orientation` is 0 for right, 1 for top right, and
  // so on counter-clockwise until 5 for bottom right.
  neighborFromTile: function neighborFromTile(tile, orientation) {
    if (orientation === 0) { return { q: tile.q + 1, r: tile.r };
    } else if (orientation === 1) { return { q: tile.q + 1, r: tile.r - 1 };
    } else if (orientation === 2) { return { q: tile.q, r: tile.r - 1};
    } else if (orientation === 3) { return { q: tile.q - 1, r: tile.r };
    } else if (orientation === 4) { return { q: tile.q - 1, r: tile.r + 1 };
    } else if (orientation === 5) { return { q: tile.q, r: tile.r + 1 };
    }
  },

  // Return a string key unique to the tile.
  keyFromTile: function keyFromTile(tile) { return tile.q + ':' + tile.r; },
  tileFromKey: function tileFromKey(key) {
    var values = key.split(':');
    return { q: values[0]|0, r: values[1]|0 };
  },


  // Humanity.

  manufacture: manufacture,

  manufactureFromBuilding: function manufactureFromBuilding(b) {
    if (b === tileTypes.dock) { return manufacture.boat;
    } else if (b === tileTypes.factory) { return manufacture.car;
    } else if (b === tileTypes.airport) { return manufacture.plane;
    } else if (b === tileTypes.gunsmith) { return manufacture.gun;
    } else { return null; }
  },

  speedFromHuman: function speedFromHuman(human) {
    var speed = 8;
    if ((human.o & manufacture.car) !== 0) {
      speed += 8;
    }
    return speed;
  },

  // Find the set of tiles one can move to, from a starter tile.
  // Requires humans to be on that tile.
  // `tstart` is a {q, r} tile position. (It's Dijkstra.)
  // Returns a map from tileKey (see keyFromTile) to the tile key whence we come.
  travelFrom: function travelFrom(tstart, speed) {
    var camp = this.humanity.tile(tstart).c;  // Camp which wants to travel.
    var walkedTiles = {};     // Valid accessible tiles mapped to parents.
    var current = this.keyFromTile(tstart);
    walkedTiles[current] = null;
    var consideredTiles = {}; // Map from tile keys to distance walked.
    consideredTiles[current] = 0;
    var fastest = [];         // List of tile keys from fastest to slowest.
    fastest.push(current);
    // Going through each considered tile.
    while (fastest.length > 0) {
      current = fastest.shift();
      // Check the camp. Is there a potential battle?
      var humanityNeighbor = this.humanity.tile(this.tileFromKey(current));
      if (humanityNeighbor && humanityNeighbor.c != null
          && humanityNeighbor.c !== camp) {
        continue;
      }
      for (var i = 0; i < 6; i++) {
        var neighbor = this.neighborFromTile(this.tileFromKey(current), i);
        var newDistance = consideredTiles[current] + this.distance(neighbor);
        if (newDistance <= speed) {
          // Update data.
          var neighborKey = this.keyFromTile(neighbor);
          if (consideredTiles[neighborKey] !== undefined &&
              newDistance < consideredTiles[neighborKey]) {
            // We have a better path to this tile.
            delete consideredTiles[neighborKey];
          }
          if (consideredTiles[neighborKey] === undefined &&
              walkedTiles[neighborKey] === undefined) {
            consideredTiles[neighborKey] = newDistance;
            walkedTiles[neighborKey] = current;
            // Where should we insert it in `fastest`?
            var insertionIndex = -1;
            for (var k = 0; k < fastest.length; k++) {
              if (consideredTiles[fastest[k]] === undefined) {
                fastest.splice(k, 1);  // Has been removed before.
                k--;
                continue;
              }
              if (consideredTiles[neighborKey] <= consideredTiles[fastest[k]]) {
                insertionIndex = k;
                break;
              }
            }
            if (insertionIndex === -1) { fastest.push(neighborKey); }
            else { fastest.splice(insertionIndex, 0, neighborKey); }
          }
        }
      }
    }
    return walkedTiles;
  },

  // Find the path from tstart = {q, r} to tend = {q, r}
  // with a minimal distance, at a certain speed. (It's A*.)
  // Requires humans to be on that tile.
  // Returns a list of tiles = "q:r" through the trajectory.
  // - endKey: the "q:r" tile of the target.
  // - parents: map from "q:r" tiles to the "q:r" tile you would walk from
  //   to get there.
  // - costs: map from "q:r" tiles to the speed cost to get there.
  travelTo: function travelTo(tstart, tend, speed,
                              limitToSpeed, maxTiles, human) {
    // Optional parameters.
    if (maxTiles == null) { maxTiles = MAX_INT; }
    if (human == null) { human = this.humanity.tile(tstart); }
    var camp = human.c;       // Camp which wants to travel.
    var endKey = this.keyFromTile(tend);
    var walkedTiles = {};     // Valid accessed tiles.
    var consideredTiles = {}; // Map from tile keys to distance walked.
    var heuristic = {};       // Just like consideredTiles, with heuristic.
    var fastest = [];         // List of tile keys from fastest to slowest.
    var parents = {};         // Map from tile keys to parent tile keys.
    var current = this.keyFromTile(tstart);
    parents[current] = null;
    consideredTiles[current] = 0;
    fastest.push(current);
    // Going through each considered tile.
    while (fastest.length > 0 && endKey !== current) {
      current = fastest.shift();
      walkedTiles[current] = true;
      // Check the camp. Is there a potential battle?
      var humanityNeighbor = this.humanity.tile(this.tileFromKey(current));
      if (humanityNeighbor && humanityNeighbor.c != null
          && humanityNeighbor.c !== camp) {
        continue;
      }
      for (var i = 0; i < 6; i++) {
        var neighbor = this.neighborFromTile(this.tileFromKey(current), i);
        var distanceCost = this.distance(neighbor);
        // Can we go there at that speed?
        if (speed < distanceCost) { continue; }
        if (maxTiles <= 0) { return null; }
        else { maxTiles--; }
        // Here, we can go there.
        var newDistance = consideredTiles[current] + distanceCost;
        if (!!limitToSpeed && speed < newDistance) { continue; }
        var neighborKey = this.keyFromTile(neighbor);
        if (consideredTiles[neighborKey] !== undefined &&
            newDistance < consideredTiles[neighborKey]) {
          // We have a better path to this tile.
          delete consideredTiles[neighborKey];
        }
        if (consideredTiles[neighborKey] === undefined &&
            walkedTiles[neighborKey] === undefined) {
          consideredTiles[neighborKey] = newDistance;
          heuristic[neighborKey] = newDistance + (
              Math.abs(tend.q - neighbor.q) +
              Math.abs(tend.r - neighbor.r) +
              Math.abs(tend.q + tend.r - neighbor.q - neighbor.r)) / 2;
          // Where should we insert it in `fastest`?
          var insertionIndex = -1;
          for (var k = 0; k < fastest.length; k++) {
            if (heuristic[fastest[k]] === undefined) {
              fastest.splice(k, 1);  // Has been removed before.
              k--;
              continue;
            }
            if (heuristic[neighborKey] <= heuristic[fastest[k]]) {
              insertionIndex = k;
              break;
            }
          }
          if (insertionIndex === -1) { fastest.push(neighborKey); }
          else { fastest.splice(insertionIndex, 0, neighborKey); }
          parents[neighborKey] = current;
        }
      }
    }
    if (endKey !== current) { return null; }  // No dice. ☹
    return {
      endKey: endKey,
      parents: parents,
      costs: consideredTiles,
    };
  },

  // Given a target tileKey `endKey`
  // and `parents`, a map from tileKey to the previous tileKey,
  // return a list from the start position to `endKey`, tile by tile.
  pathFromParents: function pathFromParents(endKey, parents) {
    var path = [];
    if (parents[endKey] == null) { return []; }
    while (parents[endKey] !== null) {
      path.push(endKey);
      endKey = parents[endKey];
    }
    path.push(endKey);
    return path.reverse();
  },

  setDistancesForHuman: function setDistancesForHuman(h) {
    if ((h.o & manufacture.plane) !== 0) {
      this.distances = distancesPlane;
    } else if ((h.o & manufacture.boat) !== 0) {
      this.distances = distancesBoat;
    }
  },
  unsetDistancesForHuman: function unsetDistancesForHuman(h) {
    this.distances = distancesNormal;
  },
  humanTravelFrom: function humanTravelFrom(tpos) {
    var h = this.humanity.tile(tpos);
    if (!h || h.h <= 0) { return {}; }
    this.setDistancesForHuman(h);
    var tiles = this.travelFrom(tpos, this.speedFromHuman(h));
    this.unsetDistancesForHuman(h);
    return tiles;
  },

  humanTravelTo: function humanTravelTo(tpos, tend, limitToSpeed, maxTiles, h) {
    if (h == null) { h = this.humanity.tile(tpos); }
    if (!h || h.h <= 0) { return null; }
    this.setDistancesForHuman(h);
    var tiles = this.travelTo(tpos, tend, this.speedFromHuman(h),
        limitToSpeed, maxTiles, h);
    this.unsetDistancesForHuman(h);
    return tiles;
  },

  humanTravelPath: function humanTravelPath(tpos, tend) {
    var travel = this.humanTravelTo(tpos, tend);
    if (travel == null) { return []; }
    return this.pathFromParents(travel.endKey, travel.parents);
  },

  humanTravelSpeedPath: function humanTravelPath(tpos, tend) {
    var travel = this.humanTravelTo(tpos, tend, true);
    if (travel == null) { return []; }
    return this.pathFromParents(travel.endKey, travel.parents);
  },


  // Buildings.

  buildingDependencies: buildingDependencies,
  buildingTileDependency: buildingTileDependency,

  // Given a building (see tileTypes) and a tile = {q, r},
  // check whether the building can be built there.
  // resources = {fuel, usedFuel, metal, usedMetal, wealth,
  // usedWealth}
  // is the resources available for use in the current camp.
  validConstruction: function validConstruction(building, tile, resources) {
    if (building == null) { return true; }   // Destruction is always valid.
    var humanityTile = this.humanity.tile(tile);
    var tileInfo = this.tile(tile);
    var spareFuel = resources.fuel - resources.usedFuel;
    var spareMetal = resources.metal - resources.usedMetal;
    var spareFarm = resources.wealth - resources.usedWealth;
    if (!humanityTile || humanityTile.h <= 0) { return false; }
    // Special requirements for fields
    if (building === tileTypes.field) {
      return this.commodity(tile, tileInfo) >= 0;
    }
    // Requirements on the current tile.
    if (tileInfo.type === tileTypes.water &&
        (building === tileTypes.farm || building === tileTypes.residence ||
         building === tileTypes.skyscraper || building === tileTypes.factory ||
         building === tileTypes.airland || building === tileTypes.airport ||
         building === tileTypes.gunsmith)) { return false; }
    if (buildingTileDependency[building] !== undefined) {
      var validCurrentTile = false;
      for (var i = 0; i < buildingTileDependency[building].length; i++) {
        if (buildingTileDependency[building][i] === tileInfo.type ||
            buildingTileDependency[building][i] === humanityTile.b) {
              validCurrentTile = true;
            }
      }
      if (!validCurrentTile) { return false; }
    }
    // Requirements on the surrounding tiles.
    if (buildingDependencies[building] !== undefined) {
      // There are dependency requirements.
      var requiredDependencies = buildingDependencies[building];
      var dependencies = new Array(requiredDependencies.length);
      for (var i = 0; i < dependencies.length; i++) { dependencies[i] = 0; }
      for (var i = 0; i < 6; i++) {
        // Check all neighbors for dependencies.
        var neighbor = this.neighborFromTile(tile, i);
        var humanityNeighbor = this.humanity.tile(neighbor);
        var terrainNeighbor = this.tile(neighbor);
        for (var j = 0; j < requiredDependencies.length; j++) {
          if (requiredDependencies[j][1] >= 0 && (humanityNeighbor
                && humanityNeighbor.b === requiredDependencies[j][1]) ||
              terrainNeighbor.type === requiredDependencies[j][1]) {
            dependencies[j]++;
          } else if (requiredDependencies[j][1] < 0) {
            // Resources.
            if (requiredDependencies[j][1] === resourceTypes.fuel
                && spareFuel < requiredDependencies[j][0]) {
              return false;
            } else if (requiredDependencies[j][1] === resourceTypes.metal
                && spareMetal < requiredDependencies[j][0]) {
              return false;
            } else if (requiredDependencies[j][1] === resourceTypes.wealth
                && spareFarm < requiredDependencies[j][0]) {
              return false;
            }
            dependencies[j] = requiredDependencies[j][0];
          }
        }
      }
      // Check that we have the correct number of buildings around.
      for (var j = 0; j < dependencies.length; j++) {
        if (dependencies[j] < requiredDependencies[j][0]) {
          return false;
        }
      }
      return true;
    } else { return true; }
    return false;
  },


  // Remote connection.
  //

  planTypes: planTypes,
  plans: {},

  addPlan: function addPlan(plan) { plans[plan.at] = plan; },
  eachPlan: function eachPlan(f) {
    for (var tileKey in plans) { f(plans[tileKey]); }
  },
  clearPlans: function clearPlans() { plans = {}; },


};
// Listen to server connection.

var gameOver;
var socket;
var retries = 0;
function connectSocket(cb) {
  cb = cb || function(){};
  socket = new WebSocket(
    // Trick: use the end of either http: or https:.
    'ws' + window.location.protocol.slice(4) + '//' +
      window.location.hostname +
      (window.location.port.length > 0? (':' + window.location.port): '') +
      '/act');
  socket.onmessage = socketMessage;
  socket.onclose = socket.onerror = socketError;
  socket.onopen = function() { retries = 0; cb(); };
}
function socketMessage(e) {
  var change = JSON.parse(e.data);
  if (change.winners) {
    // The game is over.
    gameOver = {};
    gameOver.winners = change.winners;
    gameOver.winType = change.winType;
    if (gameOver.winners[0] === playerCamp) {
      // We won!
      if (!localStorage.getItem('gamesWon')) {
        localStorage.setItem('gamesWon', 0);
      }
      localStorage.setItem('gamesWon', (+localStorage.getItem('gamesWon'))+1);
    }
  } else {
    if (change.camp !== undefined) {
      playerCamp = change.camp;
      delete change.camp;
    }
    if (change.lockedTiles !== undefined) {
      lockedTiles = change.lockedTiles;
      delete change.lockedTiles;
    }
    if (change.resources !== undefined) {
      campResources = change.resources;
      resources = change.resources[playerCamp];
      delete change.resources;
    }
    if (change.commodities !== undefined) {
      campCommodities = change.commodities;
      delete change.commodities;
    }
    if (change.population !== undefined) {
      humanityPopulation = change.population;
      delete change.population;
    }
    if (change.war !== undefined) {
      addHumanMessages(warTiles, change.war, warMessages);
      delete change.war;
    }
    if (change.surrender !== undefined) {
      addHumanMessages(surrenderTiles, change.surrender, surrenderMessages);
      delete change.surrender;
    }
    if (change.artilleryFire !== undefined) {
      // Artillery Fire. {"q:r":["q:r"]}
      addShells(movementAnimations, change.artilleryFire);
      delete change.artilleryFire;
    }
    if (change.goto !== undefined) {
      // goto is the spawn tile.
      gotoPlace(change.goto);
      delete change.goto;
    }
    if (change.centerTile !== undefined) {
      // Set the places.
      terrain.setCenterTile(change.centerTile);
      sendCenterTile(change.centerTile);
      delete change.centerTile;
    }
    if (change.places !== undefined) {
      // Set the places.
      insertPlaces(change.places);
      fillMapIndex(change.places);
      delete change.places;
    }
    if (change.campNames !== undefined) {
      // Set the spawn names.
      campNames = change.campNames;
      delete change.campNames;
    }
    if (humanityPopulation) {
      setResourcesTable();
    }
    addStarveMessages(change);
    changeHumanity(humanityData, change);
    paintPopulation();
    updateCurrentTileInformation();
    // Update paint cache for each building change.
    updateCachedPaint(gs, change);
  }
  paint(gs);
  paintHumans(gs, humanityData);
}
function socketError(e) {
  retries++;
  if (retries < 1) {
    setTimeout(connectSocket, 50);
  } else if (retries === 1) {
    alert('You are disconnected.\nPlease reload the page.');
  }
};
connectSocket();

var registerMoves = Object.create(null);
var registerBuilds = Object.create(null);
function sendMove(from, to, humans) {
  if (!from || !to) { return; }
  var keyTo = terrain.keyFromTile(to);
  registerMoves[keyTo] = from;
  if (socket.readyState === 1) {
    var keyFrom = terrain.keyFromTile(from);
    var layType = layRoadBox.checked? terrain.tileTypes.road:
      terrain.tileTypes.wall;
    socket.send(JSON.stringify({
      at: keyFrom,
      do: planTypes.move,
      to: keyTo,
      h: humans,
      lay: layType
    }));
  } else { connectSocket(function(){sendMove(from, to, humans);}); }
}

function sendPos(at, to) {
  socket.send(JSON.stringify({
    at: at? terrain.keyFromTile(at): null,
    to: terrain.keyFromTile(to)
  }));
}

function sendBuild(at, building) {
  if (!at) { return; }
  var keyAt = terrain.keyFromTile(at);
  registerBuilds[keyAt] = building;
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      at: keyAt,
      do: planTypes.build,
      b: building
    }));
  } else { connectSocket(function(){sendBuild(at, building);}); }
}

// Send the center tile to workers, etc.
function sendCenterTile(centerTile) {
  for (var i = 0; i < workerPool.length; i++) {
    workerPool[i].postMessage({centerTile: centerTile});
  }
};


// Places

// List of camp names, indexed by the camp ID.
var campNames;

var defaultPlacesPanelHTML = placesPanel.innerHTML;

// Insert places = {"tileKey": "Place name"} into the panel.
function insertPlaces(places) {
  placesPanel.innerHTML = defaultPlacesPanelHTML;
  var keys = Object.keys(places), last = keys.length - 1;
  for (var i = 0; i <= last; i++) {
    var place = keys[i];
    var aPlace = document.createElement('p');
    aPlace.classList.add('buildSelection');
    aPlace.classList.add('validSelection');
    // Add the place block.
    var tile = terrain.tileFromKey(place);
    aPlace.setAttribute('data-tilekey', place);
    var html = '<div class="arrow">➢</div>' +
      '<span class=buildHelp></span>' + places[place];
    if (i < last) { html += '<hr class=separator>'; }
    aPlace.innerHTML = html;
    aPlace.addEventListener('click', (function(t) {
      return function() {
        gotoPlace(t);
        paint(gs);
      };
    }(tile)));
    placesPanel.appendChild(aPlace);
  }
}


// Resources

var resourceFromName = {
  Folks:      campResourcePopulation,
  Wealth:     campResourceWealth,
  Fuel:       campResourceFuel,
  Metal:      campResourceMetal,
  Health:     campResourceHealth
};
function setResourcesTable() {
  // Make the header.
  var header = '<th></th>';
  for (var i = 0; i < numberOfCamps; i++) {
    header += '<th style="color:' + campHsl(i) +'">■</th>';
  }
  header = '<tr>' + header + '</tr>';
  // Make the body.
  var content = '';
  ['Folks', 'Wealth', 'Fuel', 'Metal',
  'Health'].forEach(function(resourceName) {
    var row = '';
    var shortName = resourceName;
    var isWealth = (resourceName === 'Wealth');
    row += '<th>' + shortName + '</th>';
    for (var i = 0; i < numberOfCamps; i++) {
      var resource = resourceFromName[resourceName](i);
      var hoverAction = '';
      if (isWealth) { hoverAction = hoverWealthAction(i); }
      row += '<td ' + hoverAction + '>' + resource + '</td>';
    }
    row = '<tr class="' + resourceName + '">' + row + '</tr>';
    content += row;
  });
  var thead = '<thead>' + header + '<thead>';
  var tbody = '<tbody>' + content + '<tbody>';
  var table = '<table>' + thead + tbody + '</table>';
  resourcesPanel.innerHTML = table;
}

function capitalize(str) {
  var first = String.fromCharCode(str.charCodeAt(0) - 32);
  return first + str.slice(1);
}
// Return the HTML data to display on the hover resource display.
function hoverResourceDisplayWealth(campId) {
  var commodities = campCommodities[campId];
  var commodityData = [];
  for (var commodity in commodities) {
    if (commodities[commodity] <= 0) { continue; }
    var total = 0;
    for (var i = 0; i < numberOfCamps; i++) {
      total += campCommodities[i][commodity] || 0;
    }
    var fields = commodities[commodity] || 0;
    if (total === 0) {
      var marketShare = 0;
    } else {
      var marketShare = fields / total;
    }
    // wealth = 50 x fields/total x (2 - 1/fields)
    var wealth = 50 * marketShare * (2 - 1/fields);
    commodityData.push({
      name: capitalize(tileNames[commodity]),
      wealth: wealth.toFixed(0)
    });
  }
  var html = '';
  if (commodityData.length === 0) {
    html = 'Nothing';
  } else {
    commodityData.sort(function(a, b) { return b.wealth - a.wealth; });
    for (var i = 0; i < commodityData.length; i++) {
      var comm = commodityData[i];
      html += comm.name + ' (' + comm.wealth + ')<br>';
    }
  }
  return html;
}
// Return the inserted HTML in a tag to trigger a hover resource display.
function hoverWealthAction(campId) {
  return 'onmouseover="showHoverResourceDisplayWealth(event, ' +
    'hoverResourceDisplayWealth(' + campId + '))" ' +
    'onmouseout="hideHoverResourceDisplay()"';
}
function hideHoverResourceDisplay() {
  hoverResourceDisplay.style.display = 'none';
}
// Takes HTML data to display on the
function showHoverResourceDisplayWealth(event, data) {
  hoverResourceDisplay.innerHTML = data;
  hoverResourceDisplay.style.color = '#bb0';
  var target = event.target;
  var bounds = target.getBoundingClientRect();
  hoverResourceDisplay.style.display = 'block';
  var hoverWidth = hoverResourceDisplay.offsetWidth;
  hoverResourceDisplay.style.left =
    (bounds.left + ((bounds.width - hoverWidth) >> 1) + 5) + 'px';
  hoverResourceDisplay.style.top = (bounds.top + 20) + 'px';
}


// Travel information.

function displayTravelInfo(currentTile, targetTile) {
  var ct = terrain.tile(currentTile);  // current terrain
  var tt = terrain.tile(targetTile);   // target terrain
  var ch = humanity.tile(currentTile); // current humans
  var th = humanity.tile(targetTile);  // target humans
  var traveling = travelingNumber(ch.h);
  var html = '';
  if (ch === undefined) { return; }

  // War bonuses / maluses.
  if (th != null && th.c != null && th.c != ch.c) {
    var log = [];
    html += '<dl class="attack-info">';
    var ourForces = attackForce(traveling, ch, th, ct, tt, log);
    html += '<dt>Attack ' + ourForces + '</dt><dd>';
    for (var i = 0; i < log.length; i++) { html += log[i] + '<br>'; }
    log = [];
    var theirForces = defenseForce(th.h, ch, th, ct, tt, log);
    var imbalance = ourForces / theirForces;
    if (imbalance <= 1) { html += 'Lose all';
    } else { html += 'Lose ' + (((1/imbalance) * traveling)|0); }
    html += '</dd>';
    html += '<dt>Defense ' + theirForces + '</dt><dd>';
    for (var i = 0; i < log.length; i++) { html += log[i] + '<br>'; }
    if (imbalance > 1) {
      html += 'Lose all';
      var surrounded = surrender(targetTile, ch.c);
      var surrenderers = (((surrounded / 6) * th.h)|0);
      if (surrenderers > 0) { html += '<br>Surrender ' + surrenderers; }
    } else { html += 'Lose ' + ((imbalance * th.h)|0); }
    html += '</dd>';
    travelInfo.innerHTML = html;
  } else {
    travelInfo.innerHTML = '';
  }
}

// Forcepower bonuses.
function vehicleBonus(fromManufacture, toManufacture, steepness, log) {
  var bonus = 1;
  if ((fromManufacture & terrain.manufacture.gun) !== 0) {
    bonus *= 2; log.push('2x guns');
  }
  // Car
  if ((fromManufacture & terrain.manufacture.car) !== 0) {
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x car vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5; log.push('0.5x car vs. plane');
    }
    if (steepness === terrain.tileTypes.steppe) {
      bonus *= 1.5; log.push('1.5x flat terrain drive');
    }
  }
  // Boat
  if ((fromManufacture & terrain.manufacture.boat) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x boat vs. car');
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x boat vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5; log.push('0.5x boat vs. plane');
    }
    if (steepness === terrain.tileTypes.water) {
      bonus *= 1.5; log.push('1.5x battleship');
    }
  }
  // Artillery
  if ((fromManufacture & terrain.manufacture.artillery) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x artillery vs. car');
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5; log.push('0.5x artillery vs. boat');
    }
    if (steepness === terrain.tileTypes.hill) {
      bonus *= 1.5; log.push('1.5x hill ballistics');
    }
  }
  // Plane
  if ((fromManufacture & terrain.manufacture.plane) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x plane vs. car');
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x plane vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5; log.push('0.5x plane vs. boat');
    }
    if (steepness === terrain.tileTypes.mountain) {
      bonus *= 1.5; log.push('1.5x mountain air strike');
    }
  }
  return bonus;
}
function attackForce(force, attacker, defender,
    attackerTerrain, defenderTerrain, log) {
  force *= vehicleBonus(attacker.o, defender.o,
    attackerTerrain.steepness, log);
  if (attackerTerrain.steepness > defenderTerrain.steepness) {
    force *= 1.5; log.push('1.5x high ground');
  }
  return force;
}
function defenseForce(force, attacker, defender,
    attackerTerrain, defenderTerrain, log) {
  force *= vehicleBonus(defender.o, 0,
    defenderTerrain.steepness, log);
  if (defenderTerrain.vegetation) {
    force *= 1.5; log.push('1.5x vegetation cover');
  }
  return force;
}
function surrender(tile, campId) {
  // How many people around.
  var surrounded = 0;
  for (var i = 0; i < 6; i++) {
    var neighbor = humanity.tile(
        terrain.neighborFromTile(tile, i));
    if (neighbor && neighbor.c === campId) {
      surrounded++;
    }
  }
  return surrounded;
}



// Map

// Focus the screen on tile t = {q, r}.
// Changes `origin`.
function gotoPlace(t) {
  currentTile = t;
  var placePixel = pixelFromTile(t, { x0:0, y0:0 }, gs.hexSize);
  gs.origin.x0 = placePixel.x - ((gs.width / 2)|0);
  gs.origin.y0 = placePixel.y - ((gs.height / 2)|0);
}

// Orient the arrows in the Places panel.
function orientPlacesArrow() {
  for (var i = 1; i < placesPanel.childNodes.length; i++) {
    var block = placesPanel.childNodes[i];
    if (block.getAttribute && block.getAttribute('data-tilekey') != null) {
      var screenCenter = {
        x: gs.origin.x0 + ((gs.width / 2)|0),
        y: gs.origin.y0 + ((gs.height / 2)|0)
      };
      var tileCenter = pixelFromTile(
          terrain.tileFromKey(block.getAttribute('data-tilekey')),
          {x0:0,y0:0}, gs.hexSize);
      var angle = -orientation(screenCenter, tileCenter);
      var arrow = block.firstChild;
      arrow.style.transform = 'rotate(' + angle + 'rad)';
      arrow.style.WebkitTransform = 'rotate(' + angle + 'rad)';
      arrow.nextSibling.textContent =
        kmDistance(screenCenter, tileCenter).toFixed(2) + ' km';
    }
  }
}

// Orientation of the second pixel related to the first,
// in radians, trigonometric direction. Both pixels are {x, y}.
function orientation(p1, p2) {
  var res = Math.atan((p1.y - p2.y) / Math.abs(p2.x - p1.x));
  if (p2.x < p1.x) { res = Math.PI - res; }
  return res;
}

// Distance in pixels between two pixels {x, y}.
function pixelDistance(p1, p2) {
  var horiz = Math.abs(p1.x - p2.x);
  var vert = Math.abs(p1.y - p2.y);
  return Math.sqrt(horiz * horiz + vert * vert);
}

// Distance in kilometers between two pixels {x, y}.
// Each tile is about 50 meters from top to bottom.
function kmDistance(p1, p2) {
  return pixelDistance(p1, p2) / gs.hexSize * 0.025;
}



// Data change in humanity information: {tileKey: humanTile}.
// tileKey = 'q:r'
// humanTile = {b, h, c, f, o}.
// b: building;
// h: number of humans;
// c: camp (territory to which it belongs);
// f: food (how much there is in the group);
// o: manufactured goods owned;
// Also a special key, population = [population of camp 0, etc.].
var humanityData = {};
var humanityPopulation;
var playerCamp;
var resources = {
  wealth: 0,
  usedWealth: 0,
  fuel: 0,
  usedFuel: 0,
  metal: 0,
  usedMetal: 0
};
var campResources;
function campResourcePopulation(c) { return humanityPopulation[c]; }
function campResourceWealth(c) {
  var r = campResources[c]; return r.wealth - r.usedWealth; }
function campResourceFuel(c) {
  var r = campResources[c]; return r.fuel - r.usedFuel; }
function campResourceMetal(c) {
  var r = campResources[c]; return r.metal - r.usedMetal; }
function campResourceHealth(c) {
  var r = campResources[c]; return r.health - r.usedHealth; }

var humanity = {
  // Takes a tile = {q, r}, returns the humanity information for that tile.
  // (See above for humanity information.)
  tile: function humanity(tile) {
    return humanityData[tile.q + ':' + tile.r];
  },
};

var terrain = new Terrain(humanity);

function changeHumanity(humanityData, change) {
  for (var tileKey in change) {
    if (change[tileKey].c >= numberOfCamps) {
      addCamp(change[tileKey].c);
    }
    humanityData[tileKey] = change[tileKey];
    delete registerMoves[tileKey];
    delete registerBuilds[tileKey];
  }
}

// Register a new camp.
function addCamp(id) {
  var campsToAdd = id - numberOfCamps + 1;
  numberOfCamps += campsToAdd;
}



// User Interface Heads-Up Display functions.

var helpPane = document.getElementById('helpPane');
addEventListener('load', function showIntro() {
  if (!localStorage.getItem('firstRun')) {
    localStorage.setItem('firstRun', 'no');
  } else if (Math.random() < 0.5 &&
    localStorage.getItem('paid') !== ''+(new Date()).getFullYear()) {
    showHelp('intro');
  }
});

// theme is a String.
function showHelp(theme) {
  helpPane.src = 'help/' + theme + '.html';
  helpPane.onload = function() {
    helpPane.style.display = 'block';
    helpPane.style.height =
      (helpPane.contentWindow.document.body.clientHeight + 40) + 'px';
    addEventListener('click', hideHelp);
  };
}

function hideHelp() {
  helpPane.style.display = 'none';
  removeEventListener('click', hideHelp);
}

// Some links to help.
buildPanel.firstElementChild.onclick = function() { showHelp('build'); };



// Graphic State functions.
// Painting primitives.
//


// Given real hexagonal coordinates p = {q, r}, round to the nearest integer
// hexagonal coordinate.
function intPointFromReal(p) {
  var x = p.q;
  var z = p.r;
  var y = - x - z;
  var rx = Math.round(x);
  var ry = Math.round(y);
  var rz = Math.round(z);
  var x_err = Math.abs(rx - x);
  var y_err = Math.abs(ry - y);
  var z_err = Math.abs(rz - z);
  if (x_err > y_err && x_err > z_err) {
    rx = - ry - rz;
  } else if (y_err > z_err) {
    ry = - rx - rz;
  } else {
    rz = - rx - ry;
  }

  return {
    q: rx,
    r: rz
  };
}

// Given a point px = {x, y} representing a pixel position on the screen,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a point {q, r} of the hexagon on the map.
// `size` is the radius of the smallest disk containing the hexagon.
function tileFromPixel(px, px0, size) {
  var xm = px.x + px0.x0;
  var ym = px.y + px0.y0;
  return intPointFromReal({
    q: (Math.sqrt(3) * xm - ym) / 3 / size,
    r: 2 * ym / 3 / size
  });
}

// Given a point p = {q, r} representing a hexagonal coordinate,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a pixel {x, y} of the hexagon's center.
// `size` is the radius of the smallest disk containing the hexagon.
function pixelFromTile(p, px0, size) {
  return {
    x: ((size * Math.sqrt(3) * (p.q + p.r / 2))|0) - px0.x0,
    y: (size * 3/2 * p.r) - px0.y0
  };
}

// Random nudge to {x: 0, y:0}. The size of the nudge is given by `size`.
// `tile` {q,r} is given as input to the randomness.
// The result will be the same for each tile.
function noisyPixel(size, tile) {
  var t = terrain.tile(tile);
  var c = { x: 0, y: 0 };
  c.x += (tile.q ^ tile.r ^ ((t.rain*128)|0)) % size;
  c.y +=  (tile.q ^ tile.r ^ ((t.rain*256)|0)) % size;
  return c;
}

// Sprites.

function loadSprites(src) {
  var img = new Image();
  img.src = src;
  return img;
}
var sprites = loadSprites('sprites.png');
// Canvas with the sprites on it. Set when loaded.
var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  spritesLoaded = true;
  paint(gs);
};


// Include all information pertaining to the state of the canvas.
// canvas: a DOM HTML canvas.
// sprites: a DOM Image of the sprites.
function makeGraphicState(canvas, sprites) {
  var ctx = canvas.getContext('2d');
  // Size of radius of the smallest disk containing the hexagon.
  var hexSize = 20;
  var spritesWidth = hexSize * 2;  // Each element of the sprite is 2x20px.
  return {
    hexSize: hexSize,
    // Pixel position of the top left screen pixel,
    // compared to the origin (pixel (0, 0)) of the map.
    origin: { x0: 0, y0: 0 },
    canvas: canvas,
    ctx: ctx,
    width: canvas.width,
    height: canvas.height,
    sprites: sprites,
    spritesWidth: sprites.width
  };
}

var canvas = document.getElementById('canvas');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
var gs = makeGraphicState(canvas, sprites);
var globalGs = gs;
// Blink and Webkit get the following wrong.
// Remove without worry
// when https://code.google.com/p/chromium/issues/detail?id=168840 is fixed.
document.styleSheets[0].insertRule('div.controlPanel { max-height:' +
  (gs.height - 16 - 58) + 'px; }', 0);

// Given a list of tile key "q:r" representing hexagon coordinates,
// construct the path along each hexagon's center.
// gs is the GraphicState.
function pathAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  if (tiles.length < 2) { return; }
  var penultimate;
  var cp = pixelFromTile(terrain.tileFromKey(tiles[0]), origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cp.x|0, cp.y|0);
  for (var i = 0; i < tiles.length - 1; i++) {
    cpNext = pixelFromTile(terrain.tileFromKey(tiles[i+1]), origin, size);
    var avgPoint = averagePoint(cp, cpNext);
    ctx.quadraticCurveTo(cp.x|0, cp.y|0, avgPoint.x|0, avgPoint.y|0);
    if (i === tiles.length - 2) { penultimate = cp; }
    cp = cpNext;
  }
  // Arrow at the end.
  cp = pixelFromTile(terrain.tileFromKey(tiles[tiles.length-1]), origin, size);
  var arrowOffsetX = (penultimate.x - cp.x) / 10;
  var arrowOffsetY = (penultimate.y - cp.y) / 10;
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
  ctx.lineTo((cp.x + arrowOffsetX - arrowOffsetY*2/3),
             (cp.y + arrowOffsetY + arrowOffsetX*2/3));
  ctx.lineTo(cp.x, cp.y);
  ctx.lineTo((cp.x + arrowOffsetX + arrowOffsetY*2/3),
             (cp.y + arrowOffsetY - arrowOffsetX*2/3));
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
}

// Given a list of tile key "q:r" representing hexagon coordinates,
// draw the path along each hexagon's center.
// gs is the GraphicState.
function paintAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  pathAlongTiles(gs, tiles);
  ctx.strokeStyle = '#ccf';
  ctx.lineWidth = '5';
  ctx.stroke();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = '3';
  ctx.stroke();
  // Reset lineWidth.
  ctx.lineWidth = '1';
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
function straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      var neighbor = terrain.neighborFromTile(tile, f);
      mask |= (((tiles[terrain.keyFromTile(neighbor)] !== undefined)|0) << f);
    }
    partialPathFromHex(gs, cp, mask, hexHorizDistance, hexVertDistance);
  }
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
function pathFromTiles(gs, tiles,
    hexHorizDistance, hexVertDistance, noisy, dashed) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  pathFromPolygons(gs,
      polygonFromVertices(gs, vertices, hexHorizDistance, noisy), !!dashed);
}

// Just like `pathFromTiles` above, but with polygonally-drawn paths.
// gs is the GraphicState.
function straightPolygonPathFromTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  var polygons = polygonFromVertices(gs, vertices, hexHorizDistance);
  for (var i = 0; i < polygons.length; i++) {
    partialPathFromPolygon(gs, polygons[i]);
  }
}

// Given a face 0…5 (0 = right, 1 = top right…), return the two vertices
// delimiting the segment for that face.
function vertexFromFace(tileKey, face) {
  var vertex1 = (face + 4) % 6;
  var vertex2 = (vertex1 + 1) % 6;
  return [
    vertexFromTileKey(tileKey, vertex1),
    vertexFromTileKey(tileKey, vertex2)
  ];
}

// Coordinate system for vertices.
// Takes a tileKey "q:r" and a vertex 0…5 (0 = top, 1 = top left…)
// Returns a vertex key "q:r:0" for the bottom right vertex of tile "q:r", and
// "q:r:1" for the top right vertex of tile "q:r".
function vertexFromTileKey(tileKey, vertex) {
  if (vertex === 0) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 2)) + ":0";
  } else if (vertex === 1) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":1";
  } else if (vertex === 2) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":0";
  } else if (vertex === 3) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 4)) + ":1";
  } else if (vertex === 4) {
    return tileKey + ":0";
  } else if (vertex === 5) {
    return tileKey + ":1";
  } else { return "invalid:vertex:key"; }
}

// Take a vertex key "q:r:0", return the {x,y} point in the screen's coordinate.
// gs is the GraphicState.
function pointFromVertex(gs, vertex, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var vertexSide = +vertex.slice(-1);
  var tileKey = vertex.slice(0, -2);
  var tile = terrain.tileFromKey(tileKey);
  var cp = pixelFromTile(tile, origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  var ncx = noisy? noisyPixel(size / 2, tile): {x:0, y:0};
  if (vertexSide === 0) {
    return { x: cx + halfHorizDistance + ncx.x, y: cy + halfSize + ncx.y };
  } else if (vertexSide === 1) {
    return {x: cx + halfHorizDistance, y: cy - halfSize};
  }
}

// Given a list of vertices "q:r:0" containing from / to line information,
// return a list of polygons [{x,y}] with no duplicate point.
// gs is the GraphicState.
function polygonFromVertices(gs, vertices, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var verticesLeft = new Array(vertices.length);
  for (var i = 0; i < vertices.length; i++) {
    verticesLeft[i] = vertices[i];
  }
  var polygons = [];
  while (verticesLeft.length > 0) {
    var startVertex = verticesLeft.shift();
    var currentVertex = verticesLeft.shift();
    var polygon = [
      pointFromVertex(gs, startVertex, hexHorizDistance, noisy),
      pointFromVertex(gs, currentVertex, hexHorizDistance, noisy)
    ];
    var infiniteLoopCut = 10000;
    while (currentVertex !== startVertex && (infiniteLoopCut--) > 0) {
      for (var i = 0; i < verticesLeft.length; i += 2) {
        if (verticesLeft[i] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i+1],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i+1];
          verticesLeft.splice(i, 2);
          break;
        } else if (verticesLeft[i+1] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i];
          verticesLeft.splice(i, 2);
          break;
        }
      }
    }
    polygon.pop();
    polygons.push(polygon);
  }
  return polygons;
}

// Continue the path of a polygon [{x,y}].
// gs is the GraphicState.
function partialPathFromPolygon(gs, polygon) {
  var ctx = gs.ctx;
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (var i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
}

// Construct the path of list of polygons [{x,y}].
// gs is the GraphicState.
function pathFromPolygons(gs, polygons, dashed) {
  var ctx = gs.ctx;
  ctx.beginPath();
  for (var i = 0; i < polygons.length; i++) {
    partialPathForSmoothPolygon(gs, polygons[i], !!dashed);
  }
}

// Average point {x,y} of two points {x,y}.
function averagePoint(a, b) {
  return { x:(a.x + b.x)>>1, y:(a.y + b.y)>>1 };
}
// Given a point b {x,y} and two points around it in a polygon,
// return a point which makes the three points further apart.
function extremizePoint(a, b, c) {
  var avgPoint = averagePoint(a1, c2);
  var avgPointLocal = averagePoint(a2, c1);
  return { x:b.x - ((avgPoint.x - b.x)/2)|0 + ((avgPointLocal.x - b.x)/2)|0, y:b.y - ((avgPoint.y - b.y)/2)|0 + ((avgPointLocal.y - b.y)/2)|0 };
}

// Given a canvas context and a polygon [{x,y}],
// construct the path that draws a smoother version of the polygon.
// gs is the GraphicState.
function partialPathForSmoothPolygon(gs, oldPolygon, dashed) {
  dashed = !!dashed;
  var ctx = gs.ctx;
  if (oldPolygon.length < 3) { return partialPathFromPolygon(gs, oldPolygon); }
  // This polygon's vertices are the middle of each edge.
  var polygon = new Array(oldPolygon.length);
  var avgPoint;
  for (var i = 0; i < oldPolygon.length; i++) {
    avgPoint = averagePoint(oldPolygon[i], oldPolygon[(i+1)%oldPolygon.length]);
    polygon[i] = avgPoint;
  }
  // Spline between the middle of each edge,
  // making each vertex the control point.
  var avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.moveTo(avgPoint.x, avgPoint.y);
  for (var i = 1; i < polygon.length; i++) {
    avgPoint = averagePoint(polygon[i], polygon[(i+1)%polygon.length]);
    if (dashed && ((i % 2) === 0)) {
      ctx.moveTo(avgPoint.x, avgPoint.y);
      continue;
    }
    ctx.quadraticCurveTo(polygon[i].x, polygon[i].y,
                         avgPoint.x, avgPoint.y);
  }
  if (dashed) { return; }
  avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.quadraticCurveTo(polygon[0].x, polygon[0].y,
                       avgPoint.x, avgPoint.y);
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// The mask is a sequence of six bits, each representing a hexagon edge,
// that are set to 1 in order to hide that edge.
// gs is the GraphicState.
// Returns a list of all points {x,y} gone through.
function partialPathFromHex(gs, cp, mask,
                            hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  mask = mask|0;
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  ctx.moveTo(cx, cy - size);    // top
  // top left
  var x = cx - halfHorizDistance;
  var y = cy - halfSize;
  if ((mask & 4) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom left
  x = cx - halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 8) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom
  x = cx;
  y = cy + size;
  if ((mask & 16) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom right
  x = cx + halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 32) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top right
  x = cx + halfHorizDistance;
  y = cy - halfSize;
  if ((mask & 1) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top
  x = cx;
  y = cy - size;
  if ((mask & 2) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// gs is the GraphicState.
function pathFromHex(gs, cp,
                     hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  ctx.beginPath();
  partialPathFromHex(gs, cp, 0, hexHorizDistance, hexVertDistance);
}

// Paint a white line around `tiles`
// (a map from tile keys (see keyFromTile) representing the coordinates of a
// hexagon, to a truthy value).
// Requires a canvas context `ctx` and the size of a hexagon
// (ie, the radius of the smallest disk containing the hexagon).
// gs is the GraphicState.
function paintAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance, /*noisy*/ true);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// Same as above, with the straight line algorithm.
// gs is the GraphicState.
function paintStraightAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// gs is the GraphicState.
function paintTileHexagon(gs, tile, color, lineWidth) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  var cp = pixelFromTile(tile, origin, size);
  var radius = hexVertDistance;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, radius, 0, 2*Math.PI, true);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth? lineWidth: 3;
  ctx.stroke();
  ctx.lineWidth = 1;
}

var πx2 = 2 * Math.PI;
var mπd3 = - Math.PI / 3;   // Minus PI divided by 3.

// gs is the GraphicState.
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…2π} is the orientation where to orient the sprite.
// gs is the GraphicState.
function paintRotatedSprite(gs, cx, cy, sprite, rotation) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var spritesWidth = gs.spritesWidth;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  var factor = size / 20;
  var msize = - (spritesWidth * factor / 2)|0;
  var mwidth = (spritesWidth * factor)|0;
  ctx.drawImage(gs.sprites,
      0, (spritesWidth * sprite)|0, spritesWidth, spritesWidth,
      msize, msize, mwidth, mwidth);
  ctx.restore();
}

// gs is the GraphicState.
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the sprite.
// gs is the GraphicState.
function paintSprite(gs, cx, cy, sprite, rotation) {
  return paintRotatedSprite(gs, cx, cy, sprite, rotation * mπd3);
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// building is a tileTypes.
// rotation = {0…5} is the orientation where to orient the building.
// It is optional and ignored for some buildings.
// t is a tile.
// gs is the GraphicState.
function paintBuilding(gs, cx, cy, tilePos, building, rotation, t) {
  if (building != null) {
    // Buildings with graphics for curves.
    if (building === tileTypes.road) {
      var curveTile = tileTypes.curvedRoad;
      var oriented = false;
      var neighbors = [
        humanity.tile(terrain.neighborFromTile(tilePos, 0)),
        humanity.tile(terrain.neighborFromTile(tilePos, 1)),
        humanity.tile(terrain.neighborFromTile(tilePos, 2)),
        humanity.tile(terrain.neighborFromTile(tilePos, 3)),
        humanity.tile(terrain.neighborFromTile(tilePos, 4)),
        humanity.tile(terrain.neighborFromTile(tilePos, 5)),
      ];
      for (var i = 0; i < 6; i++) {
        // Orient roads along other roads.
        if (neighbors[i] && neighbors[i].b === building) {
          var curved = neighbors[(i + 2) % 6];
          var curvedStart = neighbors[(i + 4) % 6];
          if (curved && curved.b === building) {
            paintSprite(gs, cx, cy, curveTile, i);
          } else if (curvedStart && curvedStart.b === building) {
            // It was already drawn.
          } else {
            paintSprite(gs, cx, cy, building, i);
          }
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(gs, cx, cy, building, 0); }
    } else if (building === tileTypes.wall || building === tileTypes.airland) {
      // Orient roads, walls and airlands.
      var oriented = false;
      for (var i = 0; i < 6; i++) {
        var neighbor = humanity.tile(terrain.neighborFromTile(tilePos, i));
        if (neighbor &&
            // Orient roads along other roads, walls against walls.
            (((building === tileTypes.road || building === tileTypes.wall)
              && neighbor.b === building)
            // Orient airlands towards airports.
          || (building === tileTypes.airland
              && neighbor.b === tileTypes.airport))) {
          paintSprite(gs, cx, cy, building, i);
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(gs, cx, cy, building, 0); }
    } else if (building > 26 && building < 63) {
      paintRotatedSprite(gs, cx, cy, building,
        ((tilePos.q * tilePos.r * ((t.rain*128)|0)) % 64) / 64 * πx2);
    } else if (building === tileTypes.airport || building === tileTypes.factory
        || building > tileTypes.wall) {
      paintSprite(gs, cx, cy, building, 0);
    } else {
      rotation = rotation || 0;
      paintSprite(gs, cx, cy, building, rotation);
    }
  }
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// gs is the GraphicState.
function paintLoneBuilding(gs, tilePos, building) {
  var cp = pixelFromTile(tilePos, gs.origin, gs.hexSize);
  var t = terrain.tile(tilePos);
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintBuilding(gs, cp.x, cp.y, tilePos, building, rotation, t);
}

// gs is the GraphicState.
// Paint on a canvas with hexagonal tiles.
function paintBuildingsSprited(gs) {
  var width = gs.width;
  var height = gs.height;
  var ctx = gs.ctx; var origin = gs.origin; var size = gs.hexSize;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  var offLeft = true;     // Each row is offset from the row above.
  while (cy - hexVertDistance < height) {
    while (cx - hexHorizDistance < width) {
      tilePos = tileFromPixel({ x:cx, y:cy }, gs.origin, size);
      // Draw building.
      var t = terrain.tile(tilePos);
      var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
      var human = humanity.tile(tilePos);
      paintBuilding(gs, cx, cy, tilePos, (human? human.b: null), rotation, t);
      cx += hexHorizDistance;
    }
    cy += hexVertDistance;
    cx = centerPixel.x;
    if (offLeft) {
      cx -= hexHorizDistance / 2;   // This row is offset.
      offLeft = false;
    } else {
      offLeft = true;
    }
    cx = Math.floor(cx);
    cy = Math.floor(cy);
  }
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen.
// gs is the GraphicState.
function paintTerrain(gs, cx, cy, tilePos, t) {
  t = t || terrain.tile(tilePos);
  // Draw terrain.
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintSprite(gs, cx, cy, t.type, rotation);
}

// From 'size:x:y' to cached terrain, centered on the map origin.
var cachedTerrainPaint = {};

// gs is the GraphicState.
// Paint on a canvas with hexagonal tiles.
function paintTilesSprited(gs) {
  var width = gs.width;
  var height = gs.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  // Check the cache.
  var cachePos = size + ':' + origin.x0 + ':' + origin.y0;
  if (cachedTerrainPaint[cachePos] === undefined) {
    // Prepare cache.
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = gs.width;
    canvasBuffer.height = gs.height;
    var gsBuffer = makeGraphicState(canvasBuffer, sprites);
    gsBuffer.hexSize = gs.hexSize;
    gsBuffer.origin = gs.origin;

    for (var i = 0; i < 9; i++) {
      var offLeft = true;     // Each row is offset from the row above.
      var cx = centerPixel.x;
      var cy = centerPixel.y;
      while (cy - hexVertDistance < height) {
        while (cx - hexHorizDistance < width) {
          tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
          var t = terrain.tile(tilePos);
          var comm = terrain.commodity(tilePos, t);
          if (t.type === i) {
            // Draw tile.
            paintTerrain(gsBuffer, cx, cy, tilePos, t);
            if (comm >= 0) {
              paintBuilding(gsBuffer, cx, cy, tilePos, comm, null, t);
            }
          } else if (i === 8 && t.type === tileTypes.water) {
            // Overlay sprites (beaches, …).
            for (var f = 0; f < 6; f++) {
              var neighbor = terrain.neighborFromTile(tilePos, f);
              var neighborTile = terrain.tile(neighbor);
              if (neighborTile.type !== tileTypes.water
                  && neighborTile.type !== tileTypes.swamp) {
                paintSprite(gsBuffer, cx, cy, tileTypes.beach, (f) % 6);
              }
            }
          }
          cx += hexHorizDistance;
        }
        cy += hexVertDistance;
        cx = centerPixel.x;
        if (offLeft) {
          cx -= hexHorizDistance / 2;   // This row is offset.
          offLeft = false;
        } else {
          offLeft = true;
        }
        cx = cx|0;
        cy = cy|0;
      }
    }

    cachedTerrainPaint[cachePos] = canvasBuffer;

    // Prepare overlay, computed from worker.
    var renderWorker = getWorkerFromPool();
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        workerCanvasBuffer.getContext('2d').putImageData(e.data.image, 0, 0);
        gsBuffer.ctx.drawImage(workerCanvasBuffer, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        var cx = centerPixel.x + origin.x0 - size/2;
        var cy = centerPixel.y + origin.y0 - size/2;
        updateCachedRegion(cx, cy, width, height);
        updateCachedRegion(cx + width, cy, width, height);
        updateCachedRegion(cx, cy + height, width, height);
        updateCachedRegion(cx + width, cy + height, width, height);
        paint(globalGs);
        paintHumans(globalGs, humanityData);
      }
    });
    workerMessage.image = workerImageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
    workerMessage.type = 'rainfall';
    renderWorker.postMessage(workerMessage);
  }

  ctx.drawImage(cachedTerrainPaint[cachePos], 0, 0);
}


// Paint on a canvas with hexagonal tiles.
// gs is the GraphicState.
function paintTilesRaw(gs) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var imgdata = ctx.getImageData(0, 0, width, height);
  var data = imgdata.data;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ x:x, y:y }, origin, size);
      var t = terrain.tile(tilePos);
      var color = [180, 0, 0];
      if (t.steepness == tileTypes.water) {
        color = [50, 50, 180];
      } else if (t.steepness == tileTypes.steppe) {
        color = [0, 180, 0];
      } else if (t.steepness == tileTypes.hill) {
        color = [180, 100, 0];
      }
      // Rainfall
      var rain = Math.min(Math.abs(color[0] - color[1]) / 2 * t.rain, 255);
      color[0] -= rain; // darker red
      color[1] -= rain; // darker green
      color[2] -= Math.min(t.rain * 50, 255);   // darker blue
      // Vegetation
      if (t.vegetation) {
        color[0] -= 100;
        color[1] -= 50;
        color[2] -= 100;
      }
      var position = (x + y * width) * 4;
      data[position + 0] = color[0];
      data[position + 1] = color[1];
      data[position + 2] = color[2];
      data[position + 3] = 255;
    }
  }
  ctx.putImageData(imgdata, 0, 0);
}

var workerCanvasBuffer = document.createElement('canvas');
workerCanvasBuffer.width = gs.width;
workerCanvasBuffer.height = gs.height;
var workerImageBuffer =
  workerCanvasBuffer.getContext('2d').getImageData(0, 0, gs.width, gs.height);
var workerMessage = { image: null, size: gs.hexSize, origin: gs.origin };
var workerPool = [
  new Worker('render-worker.js'),
  new Worker('render-worker.js'),
  new Worker('render-worker.js'),
  new Worker('render-worker.js')
];
var workerPoolRoundRobin = 0;
function getWorkerFromPool() {
  workerPoolRoundRobin++;
  workerPoolRoundRobin = workerPoolRoundRobin % workerPool.length;
  return workerPool[workerPoolRoundRobin];
}
// gs is the GraphicState.
function paintTiles(gs, cb) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    var renderWorker = getWorkerFromPool();
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        ctx.putImageData(e.data.image, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        cb();
      }
    });
    workerMessage.image = workerImageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
    workerMessage.type = 'raw';
    renderWorker.postMessage(workerMessage);
  } else {
    paintTilesSprited(gs);
    paintBuildingsSprited(gs);
    cb();
  }
}

// Cached paint reference is centered on the map origin.
var cachedPaint = {};
var cachePending = {};  // map from 'x:y' to truthy values.
// gs is the GraphicState.
// cacheX, cacheY: pixel positions on the map.
// cb(canvas) returns a canvas with the correct paint on it.
// blackcb(canvas) returns a black canvas if this is the first access
// to that cache.
function getCachedPaint(gs, cacheX, cacheY, cb, blackcb) {
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache == null) {
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = gs.width;
    canvasBuffer.height = gs.height;
    if ((cache === undefined) && (blackcb instanceof Function)) {
      // The cache was never there; it wasn't invalidated.
      // Paint it black immediately.
      var ctxBuffer = canvasBuffer.getContext('2d');
      ctxBuffer.fillStyle = 'black';
      ctxBuffer.fillRect(0, 0, gs.width, gs.height);
      blackcb(canvasBuffer);
    }
    // Deferred actual painting.
    if (cachePending[pos] === undefined) {
      cachePending[pos] = cb;
      var gsBuffer = makeGraphicState(canvasBuffer, sprites);
      gsBuffer.hexSize = gs.hexSize;
      gsBuffer.origin = { x0: cacheX, y0: cacheY };
      paintTiles(gsBuffer, function() {
        cache = cachedPaint[pos] = canvasBuffer;
        cachePending[pos](cache);
        delete cachePending[pos];
      });
    } else { cachePending[pos] = cb; }
  } else { cb(cache); }
}

// gs is the GraphicState
// cacheX, cacheY: 'x' and 'y' values for a cache index 'x:y'
// x, y: pixel position on the window screen.
function drawCachedPaint(gs, cacheX, cacheY, x, y) {
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache != null) { gs.ctx.drawImage(cache, x, y); }
}

// Given a pixel relative to the center of the map, find the region index.
// Requires the cache's width and height.
function regionFromPixel(cx, cy, width, height) {
  var x, y;  // Coordinates related to the nearest rectangle cache.
  var x = (cx % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (cy % height);
  if (y < 0) { y += height; }
  var cacheX = cx - x;
  var cacheY = cy - y;
  return cacheX + ':' + cacheY;
}

// Force an update to the region paint (buildings and terrain).
// Note: this relies on you calling getCachedPaint().
function updateCachedRegion(cx, cy, width, height) {
  cachedPaint[regionFromPixel(cx, cy, width, height)] = null;
}

// gs is the GraphicState.
// Given tiles = {tileKey:something}, update the cache. Mainly, buildings.
function updateCachedPaint(gs, tiles) {
  var size = gs.hexSize;
  var origin = gs.origin;
  for (var changedTile in tiles) {
    var tile = terrain.tileFromKey(changedTile);
    var centerPixel = pixelFromTile(tile, origin, size);
    // We consider the size of the tile.
    // We can have up to 4 caches to draw.
    var width = gs.width;
    var height = gs.height;
    // Coordinates of corner of squared hexagon pixel in top left buffer,
    // related to the origin pixel of the map.
    var cx = centerPixel.x + origin.x0 - size/2;  // Top left pixel of hexagon.
    var cy = centerPixel.y + origin.y0 - size/2;
    // top left
    updateCachedRegion(cx, cy, width, height);
    // top right
    updateCachedRegion(cx + size, cy, width, height);
    // bottom left
    updateCachedRegion(cx, cy + size, width, height);
    // bottom right
    updateCachedRegion(cx + size, cy + size, width, height);
  }
}

// gs is the GraphicState.
function paintTilesFromCache(gs, cb) {
  var ctx = gs.ctx; var origin = gs.origin;
  // Double-buffering context.
  var doubleBufCanvas = document.createElement('canvas');
  doubleBufCanvas.width = gs.width;
  doubleBufCanvas.height = gs.height;
  var doubleBufContext = doubleBufCanvas.getContext('2d');
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = gs.width;
  var height = gs.height;
  // Coordinates of top left screen pixel in top left buffer.
  var x = (origin.x0 % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (origin.y0 % height);
  if (y < 0) { y += height; }
  var left   = origin.x0 - x;
  var right  = origin.x0 + width - x;
  var top    = origin.y0 - y;
  var bottom = origin.y0 + height - y;
  var countDone = 0;
  var makeDraw = function makeDraw(x, y, callcb) {
    return function draw(cache) {
      doubleBufContext.drawImage(cache, x, y);
      // We have four jobs to make in total.
      if (callcb) {
        countDone++;
        if (countDone === 4) {
          ctx.drawImage(doubleBufCanvas, 0, 0);
          cb();
        }
      } else {
        ctx.drawImage(doubleBufCanvas, 0, 0);
        paintTilesFromCurrentCache(gs);
      }
    }
  };
  var leftTopDraw = makeDraw(-x, -y, true);
  var rightTopDraw = makeDraw(width-x, -y, true);
  var leftBottomDraw = makeDraw(-x, height-y, true);
  var rightBottomDraw = makeDraw(width-x, height-y, true);
  var leftTopDrawBlack = makeDraw(-x, -y, false);
  var rightTopDrawBlack = makeDraw(width-x, -y, false);
  var leftBottomDrawBlack = makeDraw(-x, height-y, false);
  var rightBottomDrawBlack = makeDraw(width-x, height-y, false);
  getCachedPaint(gs, left, top, leftTopDraw, leftTopDrawBlack);
  getCachedPaint(gs, right, top, rightTopDraw, rightTopDrawBlack);
  getCachedPaint(gs, left, bottom, leftBottomDraw, leftBottomDrawBlack);
  getCachedPaint(gs, right, bottom, rightBottomDraw, rightBottomDrawBlack);
}

// Same as paintTilesFromCache, but won't update the cache.
function paintTilesFromCurrentCache(gs) {
  var ctx = gs.ctx; var origin = gs.origin;
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = gs.width;
  var height = gs.height;
  // Coordinates of top left screen pixel in top left buffer.
  var x = (origin.x0 % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (origin.y0 % height);
  if (y < 0) { y += height; }
  var left   = origin.x0 - x;
  var right  = origin.x0 + width - x;
  var top    = origin.y0 - y;
  var bottom = origin.y0 + height - y;

  drawCachedPaint(gs, left, top, -x, -y);
  drawCachedPaint(gs, right, top, width-x, -y);
  drawCachedPaint(gs, left, bottom, -x, height-y);
  drawCachedPaint(gs, right, bottom, width-x, height-y);
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = gs.width;
displayedPaint.height = gs.height;
var displayedPaintContext = displayedPaint.getContext('2d');

var showTitleScreen = true;
setTimeout(function() { showTitleScreen = false; }, 2000);

// Paint on a canvas.
// gs is the GraphicState.
function paint(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (selectionMode === selectionModes.places) {
    // Show the direction of the places.
    orientPlacesArrow();
  }
  if (!spritesLoaded) { return; }
  paintTilesFromCache(gs, function() { paintIntermediateUI(gs); });
}

// Paint the UI for population, winner information, etc.
// gs is the GraphicState.
function paintIntermediateUI(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // Paint unzoomed map information.
  if (size < 5) { drawMapPlaces(gs); }
  // Show tiles controlled by a player.
  for (var tileKey in lockedTiles) {
    paintTileHexagon(gs, terrain.tileFromKey(tileKey),
        campHsl(lockedTiles[tileKey]), 1);
  }
  if (currentTile != null && playerCamp != null) {
    paintTileHexagon(gs, currentTile, campHsl(playerCamp, 100, 40));
  }
  paintCamps(gs);
  // Paint the set of accessible tiles.
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 7]);
  paintAroundTiles(gs, accessibleTiles);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  if (currentTile != null && targetTile != null &&
      (selectionMode === selectionModes.travel)) {
    // Paint the path that the selected folks would take.
    paintAlongTiles(gs, terrain.pathFromParents(
          terrain.keyFromTile(targetTile), accessibleTiles));
    // Show travel information.
    displayTravelInfo(currentTile, targetTile);
  }
  // Paint the path that folks will take.
  for (var keyTo in registerMoves) {
    var to = terrain.tileFromKey(keyTo);
    paintAlongTiles(gs, terrain.humanTravelSpeedPath(registerMoves[keyTo], to));
  }
  for (var keyAt in registerBuilds) {
    var at = terrain.tileFromKey(keyAt);
    paintLoneBuilding(gs, at, registerBuilds[keyAt]);
  }
  paintTileMessages(gs);
  if (gameOver !== undefined) {
    drawTitle(gs, [
        campNames[gameOver.winners[0]]
        + " won a " + gameOver.winType + " Victory.",
        (gameOver.winners[0] === playerCamp
         ? ("YOU WON! (" + nth(localStorage.getItem('gamesWon')) + " win!)")
         : ("YOU NEARLY WON! " +
            "(" + nth(gameOver.winners.indexOf(playerCamp) + 1) + " place!)")),
        "You can reload to engage in the next game!"],
        campHsl(gameOver.winners[0]));
  }
  if (showTitleScreen) {
    drawTitle(gs, ["Welcome to Thaddée Tyl's…", "NOT MY TERRITORY", "(YET)"]);
  }
  displayedPaintContext.drawImage(canvas, 0, 0);
}

// Return the string corresponding to a rank (eg, 1→1st, etc.).
function nth(n) {
  n = n|0;
  var strNum = ''+n;
  if (strNum.charCodeAt(strNum.length - 2) === 49) { return strNum + 'th'; }
  var mod = n % 10;
  if (mod === 1) { return strNum + 'st';
  } else if (mod === 2) { return strNum + 'nd';
  } else if (mod === 3) { return strNum + 'rd';
  } else { return strNum + 'th'; }
}

// Draw three lines of text from a list of strings on the screen.
// gs is the GraphicState.
function drawTitle(gs, lines, color) {
  var ctx = gs.ctx;
  var width = gs.width;
  var height = gs.height;
  var line1 = lines[0];
  var line2 = lines[1];
  var line3 = lines[2];
  ctx.fillStyle = color || 'black';
  if (color) { ctx.strokeStyle = 'black'; }
  ctx.textAlign = 'center';
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line1, width / 2, height * 1/3);
  if (color) { ctx.strokeText(line1, width / 2, height * 1/3); }
  ctx.font = (height / 8) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line2, width / 2, height * 13/24);
  if (color) { ctx.strokeText(line2, width / 2, height * 13/24); }
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line3, width / 2, height * 2/3);
  if (color) { ctx.strokeText(line3, width / 2, height * 2/3); }
  ctx.textAlign = 'start';
}

// Map from "size:q:r" places to textual information.
var mapIndex = Object.create(null);

// Insert places = {"tileKey": "Place name"} into mapIndex.
function fillMapIndex(places) {
  for (var tileKey in places) {
    mapIndex['2:' + tileKey] = places[tileKey];
  }
}

function drawMapPlaces(gs) {
  var ctx = gs.ctx;
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'lightgrey';
  ctx.textAlign = 'center';
  for (var tileSizeKey in mapIndex) {
    var e = tileSizeKey.split(':');
    var size = +e[0];
    var tile = { q: e[1]|0, r: e[2]|0 };
    var pixel = pixelFromTile(tile, gs.origin, gs.hexSize);
    var text = mapIndex[tileSizeKey];
    ctx.font = 'bold italic '
      + (gs.hexSize*size*7) + 'px "Linux Biolinum", sans-serif';
    ctx.strokeText(text, pixel.x, pixel.y - 15);
    ctx.fillText(text, pixel.x, pixel.y - 15);
  }
  ctx.textAlign = 'start';
}


// Animations.

var numberOfHumanAnimations = 20;
var humanAnimation = new Array(numberOfHumanAnimations);
function initHumans() {
  for (var i = 0; i < numberOfHumanAnimations; i++) {
    // Position is in a square of width 1.
    humanAnimation[i] = {
      x: Math.random(),
      y: Math.random(),
      targetx: Math.random(),
      targety: Math.random(),
      period: (Math.random() * 20 + 3)|0,
      tick: 0
    };
  }
}
initHumans();

// Update animations related to humans. See humanAnimation.
function updateHumans() {
  for (var i = 0; i < humanAnimation.length; i++) {
    var human = humanAnimation[i];
    human.x += (human.targetx - human.x) / human.period;
    human.y += (human.targety - human.y) / human.period;
    human.tick++;
    if (human.tick > human.period) {
      // New target.
      human.targetx = Math.random();
      human.targety = Math.random();
      human.tick = 0;
    }
  }
}

// Paint the animation of people moving around.
// gs is the GraphicState.
function paintHumans(gs, humanityData) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (size < 20) { return; }
  ctx.drawImage(displayedPaint, 0, 0);
  for (var tileKey in humanityData) {
    var tileKeyCoord = tileKey.split(':');
    var q = +tileKeyCoord[0];
    var r = +tileKeyCoord[1];
    var human = humanityData[tileKey];
    var tile = terrain.tile(terrain.tileFromKey(tileKey));
    var centerPixel = pixelFromTile({ q:q, r:r }, origin, size);
    var cx = centerPixel.x;
    var cy = centerPixel.y;
    // Count different manufacture to show.
    var ownManufacture = [];
    var manufactures = [2,4,8,16,32,64];
    for (var mi = 0; mi < manufactures.length; mi++) {
      if ((human.o & manufactures[mi]) !== 0) {
        ownManufacture.push(manufactures[mi]);
      }
    }
    var onABoat = (tile.type === tileTypes.water
        || tile.type === tileTypes.swamp)
        && (human.o & manufacture.boat) !== 0;
    var flyingOverWater = (tile.type === tileTypes.water
        || tile.type === tileTypes.swamp)
        && (human.o & manufacture.plane) !== 0;
    var number = human.h;
    if (number > humanAnimation.length) { number = humanAnimation.length; }
    // Paint people.
    for (var i = 0; i < number; i++) {
      var animation = humanAnimation[
        Math.abs(i+q^r^human.f) % humanAnimation.length];
      var animx = (cx - size + animation.x * 2 * size)|0;
      var animy = (cy - size + animation.y * 2 * size)|0;
      var shownManufacture = -1;
      if (onABoat) {
        shownManufacture = manufacture.boat;
      } else if (flyingOverWater) {
        shownManufacture = manufacture.plane;
      } else if (ownManufacture.length > 0) {
        shownManufacture = ownManufacture[i % ownManufacture.length];
      }
      paintHuman(gs, shownManufacture, tile, animx, animy, size);
    }
  }
}

function paintHuman(gs, shownManufacture, tile, animx, animy) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var pixel = size/20;
  if (shownManufacture < 0) {
    ctx.fillStyle = 'black';
    ctx.fillRect(animx, animy, pixel, 2*pixel);
  } else if (shownManufacture === manufacture.boat) {
    ctx.fillStyle = '#aaf';
    ctx.fillRect(animx - pixel, animy - pixel, pixel, pixel);
    ctx.fillRect(animx, animy, 7*pixel, pixel);
    ctx.fillRect(animx + 7*pixel, animy - pixel, pixel, pixel);
  } else if (shownManufacture === manufacture.car) {
    ctx.fillStyle = '#420';
    ctx.fillRect(animx, animy, 3*pixel, 2*pixel);
  } else if (shownManufacture === manufacture.plane) {
    ctx.fillStyle = '#edf';
    ctx.fillRect(animx - pixel, animy - pixel, 2*pixel, pixel);
    ctx.fillRect(animx, animy, 9*pixel, pixel);
    ctx.fillRect(animx + 5*pixel, animy - pixel, pixel, pixel);
    ctx.fillRect(animx + 3*pixel, animy + pixel, pixel, pixel);
  } else if (shownManufacture === manufacture.artillery) {
    ctx.fillStyle = '#425';
    ctx.fillRect(animx - 2*pixel, animy, 5*pixel, 2*pixel);
    ctx.fillRect(animx, animy - 1*pixel, 5*pixel, 1*pixel);
  } else if (shownManufacture === manufacture.gun) {
    ctx.fillStyle = '#440';
    ctx.fillRect(animx, animy, pixel, 2*pixel);
  }
}

function animateHumans() {
  paintHumans(gs, humanityData);
  updateHumans();
  paintMovementAnimations();
}
var humanAnimationTimeout = setInterval(animateHumans, 100);

// from:{x,y}, to:{x,y}, velocity, drawFunction: function(){}.
function InterpolationAnimation(gs, from, to, velocity, drawFunction) {
  this.gs = gs;
  this.from = from; this.to = to;
  this.pos = { x: this.from.x, y: this.from.y };
  this.velocity = velocity;
  this.deltaX = to.x - from.x;
  this.deltaY = to.y - from.y;
  this.length =
    Math.sqrt(this.deltaX * this.deltaX + this.deltaY * this.deltaY);
  this.portions = this.length / velocity;
  this.usedPortions = 0;
  this.dx = this.deltaX / this.portions;
  this.dy = this.deltaY / this.portions;
  this.normalizedDx = this.deltaX / this.length;
  this.normalizedDy = this.deltaY / this.length;
  this.drawFunction = drawFunction;
}
InterpolationAnimation.prototype = {
  draw: function() {
    this.drawFunction();
    this.pos.x += this.dx;
    this.pos.y += this.dy;
    this.usedPortions++;
    // If we're past our final location, we clear this up.
    if (this.usedPortions > this.portions) {
      var animationIndex = movementAnimations.indexOf(this);
      movementAnimations.splice(animationIndex, 1);
    }
  }
};

function paintMovementAnimations() {
  for (var i = 0; i < movementAnimations.length; i++) {
    movementAnimations[i].draw();
  }
}

// List of InterpolationAnimation instances.
var movementAnimations = [];
var animationVelocity = 32; // pixels

function drawShell() {
  var ctx = this.gs.ctx;
  ctx.lineWidth = 2;
  var segments = Math.min(this.usedPortions, 8);
  var x = this.pos.x;
  var y = this.pos.y;
  var segmentSize = 4; // pixels
  var incrx = segmentSize * this.normalizedDx;
  var incry = segmentSize * this.normalizedDy;
  for (var i = 9; i > (8 - segments); i--) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    x -= incrx;
    y -= incry;
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(0,0,0,0.' + i + ')';
    ctx.stroke();
  }
}

// artilleryFire: map from a "q:r" target to a list of "q:r" artilleries.
function addShells(movementAnimations, artilleryFire) {
  var visibleHumans = listVisibleHumans(gs);
  for (var targetTileKey in artilleryFire) {
    var tileKeys = artilleryFire[targetTileKey];
    for (var i = 0; i < tileKeys.length; i++) {
      var tileKey = tileKeys[i];
      // Check that we can see it.
      if (visibleHumans.indexOf(tileKey) >= 0
       || visibleHumans.indexOf(targetTileKey) >= 0) {
        var fromTile = terrain.tileFromKey(tileKey);
        var toTile = terrain.tileFromKey(targetTileKey);
        var from = pixelFromTile(fromTile, gs.origin, gs.hexSize);
        var to = pixelFromTile(toTile, gs.origin, gs.hexSize);
        var shellAnimation = new InterpolationAnimation(
          gs, from, to, animationVelocity, drawShell
        );
        movementAnimations.push(shellAnimation);
      }
    }
  }
}




// Return a list of tileKeys for each tile with a visible human.
// gs is the GraphicState.
function listVisibleHumans(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var maxQ, minQ, maxR, minR, tilePos;
  // This is a jigsaw. We want the corner tiles of the screen.
  // bottom left pixel of the screen.
  tilePos = tileFromPixel({ x:0, y:gs.height }, origin, size);
  minQ = tilePos.q - 1;     // Adding 1 to include half-tiles.
  maxR = tilePos.r + 1;
  // top right pixel of the screen.
  tilePos = tileFromPixel({ x:gs.width, y:0 }, origin, size);
  maxQ = tilePos.q + 1;
  minR = tilePos.r - 1;
  // Go through all of humanity. Pick the ones we can see.
  var visibleHumans = [];
  for (var tileKey in humanityData) {
    tile = terrain.tileFromKey(tileKey);
    if (tile.q >= minQ && tile.q <= maxQ && tile.r >= minR && tile.r <= maxR
        && humanityData[tileKey].c != null) {
      visibleHumans.push(tileKey);
    }
  }
  return visibleHumans;
}

var numberOfCamps = 3;
// gs is the GraphicState.
function paintCamps(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var visibleHumans = listVisibleHumans(gs);
  var visibleCamps = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) { visibleCamps[i] = {}; }
  for (var i = 0; i < visibleHumans.length; i++) {
    var humans = humanityData[visibleHumans[i]];
    visibleCamps[humans.c][visibleHumans[i]] = true;
  }
  var bold = gs.hexSize * 2/9;
  var hexHorizDistance = gs.hexSize * Math.sqrt(3);
  var hexVertDistance = gs.hexSize * 3/2;
  if (size < 5) {
    // We're too far above.
    ctx.fillStyle = 'black';
    var bSize = 2 * size;
    for (var i = 0; i < numberOfCamps; i++) {
      var visibleCamp = visibleCamps[i];
      for (var key in visibleCamp) {
        var px = pixelFromTile(terrain.tileFromKey(key), origin, size);
        ctx.fillRect(px.x - bSize, px.y - bSize, 2 * bSize, 2 * bSize);
      }
    }
    for (var i = 0; i < numberOfCamps; i++) {
      ctx.fillStyle = campHsl(i);
      var visibleCamp = visibleCamps[i];
      for (var key in visibleCamp) {
        var px = pixelFromTile(terrain.tileFromKey(key), origin, size);
        ctx.fillRect(px.x - size, px.y - size, 2 * size, 2 * size);
      }
    }
  } else {
    for (var i = 0; i < numberOfCamps; i++) {
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ false);
      // Background grey.
      ctx.lineWidth = bold * 2;
      ctx.strokeStyle = 'hsla(' + campHueCreator9000(i) + ',30%,40%,0.4)';
      ctx.stroke();
    }

    for (var i = 0; i < numberOfCamps; i++) {
      // Inside translucent border.
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ false);
      ctx.save();
      ctx.clip();
      // Inside border.
      ctx.lineWidth = bold;
      ctx.strokeStyle = campHsl(i, 70, 35, 0.4);
      ctx.stroke();
      // Dashed border.
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ true);
      ctx.strokeStyle = campHsl(i, 80, 42, 0.4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.lineWidth = 1;
  }
}

// Return CSS hsl string.
// saturation: number from 0 to 100.
// lightness: number from 0 to 100.
function campHsl(camp, saturation, lightness, opacity) {
  if (saturation == null) { saturation = 100; }
  if (lightness == null) { lightness = 45; }
  if (opacity == null) {
    return 'hsl(' + campHueCreator9000(camp)
        + ',' + saturation + '%,' + lightness + '%)';
  } else {
    return 'hsla(' + campHueCreator9000(camp)
        + ',' + saturation + '%,' + lightness + '%,' + opacity + ')';
  }
}

var campHue = [];
// The name is not a joke.
function campHueCreator9000(camp) {
  if (campHue[camp] !== undefined) { return campColors[camp];
  } else if (camp === 0) { return 270;
  } else { return (campHueCreator9000(camp - 1) + 60) % 360;
  }
}

// Paint the relative population of each camp.
function paintPopulation() {
  if (!humanityPopulation) { return; }
  var top = 55;
  var left = 7;
  var width = 187;
  var height = 10;
  var svg = '<svg id=populationMonitor>';
  // Paint the border.
  svg += '<rect stroke="hsl(0,0%,40%)" stroke-width="1" x="0" y="0" rx="3" ry="3" width="'
    + (width) + '" height="' + (height) + '" />';
  // Paint the population.
  var totalPopulation = 0;
  for (var i = 0; i < humanityPopulation.length; i++) {
    totalPopulation += humanityPopulation[i];
  }
  var start = 1;
  var innerWidth = width - 2;
  var popWidth;
  var allButLastWidth = 0;
  for (var i = 0; i < humanityPopulation.length - 1; i++) {
    popWidth = (innerWidth * humanityPopulation[i] / totalPopulation)|0;
    allButLastWidth += popWidth;
    svg += '<rect fill="' + campHsl(i) + '"'
        + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
        + ' height="' + (height - 2) + '" />';
    start += popWidth;
  }
  popWidth = innerWidth - allButLastWidth;
  svg += '<rect fill="' + campHsl(i) + '"'
      + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
      + ' height="' + (height - 2) + '" />'
      + '<linearGradient id="grad" y2="100%" x2="0">'
      + '<stop offset="0" stop-color="#fff" stop-opacity=".1"/>'
      + '<stop offset="1" stop-color="#000" stop-opacity=".2"/>'
      + '</linearGradient>'
      + '<rect fill="url(#grad)" x="1" y="1" '
      + 'width="' + (width - 2) + '" height="' + (height - 2) + '"/>'
      + '</svg>';
  // Using outerHTML to avoid this bug: <https://bugzilla.mozilla.org/show_bug.cgi?id=886390>
  populationMonitor.outerHTML = svg;
}

// Tile Messages.
var surrenderMessages = [
  "We surrender!",
  "I give up!",
  "Enemies captured!",
  "I, for one, welcome our new overlords."
];
var hungerMessages = [
  "Make a farm.",
  "Hungry!",
  "Is dinner ready?",
  "I can't feel my stomach!",
  "You're starving us!",
  "I could eat anything. Rats. Babies.",
  "You look like a sandwich to me."
];
var warMessages = [
  "You've got red on you.",
  "Silence will fall!",
  "Silence! I kill you!",
  "Boy, that escalated quickly.",
  "Sorry Mommy!",
  "New legs, please!",
  "Have you seen my head?",
  "There is wine on the floor…",
  "They're bleeding demised!",
  "Them ex-people make daisies happy.",
  "⬐ Acclimated to the being dead position",
  "So much for survival!",
  "Today I died.",
  "I dare you! I double-dare you!",
  "Mayday!",
  "Area pacified, over!",
  "Resistance is futile.",
  "All your base are belong to us.",
  "Nobody expects the Spanish Inquisition!",
  "Whoop-de-doo!",
  "You'll never take me alive!",
  "Told you he wasn't immortal!",
  "Tu quoque, fili mi!",
  "Do not disturb my circles!",
  "This is no time to be making enemies.",
  "I owe a cock to Asclepius.",
  "More light!",
  "Life's too short!",
  "What will you do, kill m—?!",
  "Drink to me!"
];

// Map from tile = "q:r" to {message, timeout} (including timeout IDs).
var warTiles = {};
var surrenderTiles = {};
var starvedTiles = {};

// Add textual bubble set in tileMessages
// (a map from tile = "q:r" to {message, timeout})
// to tiles in tileKeys = ["q:r"]
// from messages = [message]
function addHumanMessages(tileMessages, tileKeys, messages) {
  var timeout;
  for (var i = 0; i < tileKeys.length; i++) {
    var tileKey = tileKeys[i];
    if (tileMessages[tileKey]) {
      clearTimeout(tileMessages[tileKey].timeout);
    }
    // Pick message.
    var msg = messages[(messages.length * Math.random())|0];
    // Set timeout.
    tileMessages[tileKey] = {
      message: msg,
      timeout: setTimeout((function (tileKey) {
        return function removeTimeout() {
          delete tileMessages[tileKey];
          paint(gs);
        };
      }(tileKey)), 2000)
    };
  }
}

// change = map from tileKey to humanity information.
function addStarveMessages(change) {
  var starved = [];
  for (var tileKey in change) {
    if (change[tileKey].h > 0 && change[tileKey].f < 4) {
      // They're starving.
      starved.push(tileKey);
    }
  }
  addHumanMessages(starvedTiles, starved, hungerMessages);
}

// Given a tileKey = "q:r" and a message, show a textual bubble.
// gs is the GraphicState.
function paintMessage(gs, tileKey, msg) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.font = '14px "Linux Biolinum", sans-serif';
  var msgSize = ctx.measureText(msg).width;
  // Find the pixel to start from.
  var center = pixelFromTile(terrain.tileFromKey(tileKey), origin, size);
  var x = center.x + size/4;
  var y = center.y - size/4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x - 12, y - 10);
  ctx.lineTo(x - 10, y - 40);
  ctx.lineTo(x + msgSize + 10, y - 35);
  ctx.lineTo(x + msgSize, y - 10);
  ctx.lineTo(x + 12, y - 10);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.strokeText(msg, x - 4, y - 20);
}

// Paints messages from warTiles and starvedTiles.
// gs is the GraphicState.
function paintTileMessages(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  for (var tileKey in warTiles) {
    paintMessage(gs, tileKey, warTiles[tileKey].message);
  }
  for (var tileKey in surrenderTiles) {
    paintMessage(gs, tileKey, surrenderTiles[tileKey].message);
  }
  for (var tileKey in starvedTiles) {
    paintMessage(gs, tileKey, starvedTiles[tileKey].message);
  }
}


// Tile information.

function attributeNameFromTile() {
  var nameFromTile = [];
  var i = 0;
  for (var name in tileTypes) {
    nameFromTile[i++] = name;
  }
  return nameFromTile;
}
// A map from tile type to their names.
var tileNames = attributeNameFromTile();

var tileInfo = document.getElementById('info');
var lockedTiles;    // Map from tileKey to camp index.
var accessibleTiles;
var currentTile;    // {q,r}.

// For a mouse event, give the information of the tile under the cursor.
function showTileInformation(tile) {
  var t = terrain.tile(tile);
  var comm = terrain.commodity(tile, t);
  var info = 'a ' + tileNames[t.type];
  if (t.type === 0) { info = tileNames[t.type]; }
  if (comm >= 0) { info += ' with ' + tileNames[comm]; }
  var h = humanity.tile(tile);
  if (h != null) {
    if (h.b != null) {
      info = (tileNames[h.b][0] === 'a'? 'an ': 'a ') + tileNames[h.b]
        + ' built in ' + info;
    }
    if (h.h > 0) {
      var ownership = '';
      var usedLocomotion = false;
      if ((h.o & manufacture.plane) !== 0) {
        ownership += 'on a plane ';
        usedLocomotion = true;
      }
      if ((h.o & manufacture.boat) !== 0) {
        ownership += ((t.type === tileTypes.water && !usedLocomotion)?
            (usedLocomotion = true, 'in'): 'with')
          + ' a boat ';
      }
      if ((h.o & manufacture.artillery) !== 0) {
        ownership += 'with cannons ';
      }
      if ((h.o & manufacture.car) !== 0) {
        ownership += (usedLocomotion? 'with': 'in') + ' a car ';
      }
      info = h.h + ((h.o & manufacture.gun) !== 0? ' armed': '') + ' folk'
        + (h.h === 1? '': 's') + ' '
        + ownership + 'in ' + info;
    }
  }
  tileInfo.value = info;
}

var buildSelectionButtons = document.querySelectorAll('p.buildSelection');
function indicateValidConstructions(currentTile) {
  var valid;
  for (var i = 0; i < buildSelectionButtons.length; i++) {
    var b = +buildSelectionButtons[i].dataset.b;
    if (terrain.validConstruction(b, currentTile, resources)) {
      buildSelectionButtons[i].classList.add('validSelection');
    } else {
      buildSelectionButtons[i].classList.remove('validSelection');
    }
  }
}
function hookBuildSelectionButtons() {
  for (var i = 0; i < buildSelectionButtons.length; i++) {
    var hook = (function(b) { return function hookBuildSelectionButton() {
        sendBuild(currentTile, b);
        enterMode(selectionModes.normal);
      };
    }(+buildSelectionButtons[i].dataset.b));
    buildSelectionButtons[i].addEventListener('click', hook);
  }
}
hookBuildSelectionButtons();

function updateCurrentTileInformation() {
  if (currentTile !== undefined) {
    // Tile information.
    showTileInformation(currentTile);
    // Accessible tiles.
    accessibleTiles = terrain.humanTravelFrom(currentTile);
    // Valid constructions.
    indicateValidConstructions(currentTile);
  }
}





// Initialization and event management.
//

var selectionModes = {
  normal:   1,
  settings: 2,
  travel:   3,
  build:    4,
  places:   5
};
var selectionMode = selectionModes.normal;

function hidePanel(panel, button) {
  panel.style.display = 'none';
  button.style.fill = 'black';
  button.firstElementChild.style.display = 'block';
  button.firstElementChild.nextElementSibling.style.display = 'none';
}
function showPanel(panel, button) {
  panel.style.display = 'block';
  button.style.fill = '#800080';
  button.firstElementChild.style.display = 'none';
  button.firstElementChild.nextElementSibling.style.display = 'block';
}

function enterMode(newMode) {
  if (selectionMode === newMode) { return; }
  // Remove things from the previous mode.
  if (selectionMode === selectionModes.settings) {
    hidePanel(settingsPanel, settingsBut);
    settingsBut.removeEventListener('click', enterNormalMode);
    settingsBut.addEventListener('click', enterSettingsMode);
  } else if (selectionMode === selectionModes.travel) {
    hidePanel(travelPanel, travelBut);
    targetTile = null;
    travelBut.removeEventListener('click', enterNormalMode);
    travelBut.addEventListener('click', enterTravelMode);
  } else if (selectionMode === selectionModes.build) {
    hidePanel(buildPanel, buildBut);
    buildBut.removeEventListener('click', enterNormalMode);
    buildBut.addEventListener('click', enterBuildMode);
  } else if (selectionMode === selectionModes.places) {
    hidePanel(placesPanel, placesBut);
    placesBut.removeEventListener('click', enterNormalMode);
    placesBut.addEventListener('click', enterPlacesMode);
  }
  // Add things from the new mode.
  if (newMode === selectionModes.settings) {
    showPanel(settingsPanel, settingsBut);
    settingsBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.travel) {
    splitPanelSetMoveStay();
    showPanel(travelPanel, travelBut);
    travelBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.build) {
    showPanel(buildPanel, buildBut);
    buildBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.places) {
    orientPlacesArrow();
    showPanel(placesPanel, placesBut);
    placesBut.addEventListener('click', enterNormalMode);
  }
  // Update shared mode variable.
  selectionMode = newMode;
  if (mousePosition) {
    showPath({ clientX: mousePosition.x, clientY: mousePosition.y });
  }
  if (newMode === selectionModes.normal) {
    paint(gs);
  }
}


// Control buttons.

function enterNormalMode() { enterMode(selectionModes.normal); }
function enterSettingsMode() { enterMode(selectionModes.settings); }
function enterTravelMode() { enterMode(selectionModes.travel); }
function enterBuildMode() { enterMode(selectionModes.build); }
function enterPlacesMode() { enterMode(selectionModes.places); }
travelBut.addEventListener('click', enterTravelMode);
buildBut.addEventListener('click', enterBuildMode);
settingsBut.addEventListener('click', enterSettingsMode);
placesBut.addEventListener('click', enterPlacesMode);

splitInputWidget.addEventListener('input', function changeSplitPortion() {
  splitPanelPortion.textContent = '' + splitInputWidget.value;
  splitPanelSetMoveStay();
});

function splitPanelSlider(percent) {
  splitInputWidget.value = ''+percent;
  splitPanelPortion.textContent = ''+percent;
}

// Update the number of people who move and stay in the travel panel UI.
function splitPanelSetMoveStay() {
  var humanityTile = humanity.tile(currentTile);
  var humans = 0;
  if (humanityTile != null) {
    humans = humanityTile.h;
  }
  var move = ((humans * splitInputWidget.value / 100)|0);
  var stay = humans - move;
  splitPanelPortionMove.textContent = '' + move;
  splitPanelPortionStay.textContent = '' + stay;
}


// Keyboard events.

var buildHotKeys = {
  48: tileTypes.airport,    // "0"
//  49: tileTypes.wall,       // "1"
//  50: tileTypes.road,       // "2"
  51: tileTypes.farm,       // "3"
  52: tileTypes.residence,  // "4"
  53: tileTypes.skyscraper, // "5"
  54: tileTypes.factory,    // "6"
  55: tileTypes.dock,       // "7"
  56: tileTypes.gunsmith,   // "8"
  57: tileTypes.airland     // "9"
};

window.onkeydown = function keyInputManagement(event) {
  var voidCache = false;
  var redraw = false;
  if (event.keyCode === 39 || event.keyCode === 68) {           // → D
    gs.origin.x0 += (gs.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 38 || event.keyCode === 87) {    // ↑ W
    gs.origin.y0 -= (gs.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 37 || event.keyCode === 65) {    // ← A
    gs.origin.x0 -= (gs.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 40 || event.keyCode === 83) {    // ↓ S
    gs.origin.y0 += (gs.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 187 || event.keyCode === 61) {  // +=
    // Zoom.
    var factor = 16;
    gs.hexSize *= factor;
    gs.origin.x0 = ((gs.origin.x0 * factor)|0) + (((factor-1) * gs.width)>>1);
    gs.origin.y0 = ((gs.origin.y0 * factor)|0) + (((factor-1) * gs.height)>>1);
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109 || event.keyCode === 219
          || event.keyCode === 169) {   // -
    // Unzoom.
    var factor = 16;
    gs.hexSize /= factor;
    gs.origin.x0 = ((gs.origin.x0 / factor)|0) - (((1-1/factor)*gs.width)>>1);
    gs.origin.y0 = ((gs.origin.y0 / factor)|0) - (((1-1/factor)*gs.height)>>1);
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 84) {    // T
    splitPanelSlider(100);
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 70) {    // F
    splitPanelSlider(50);
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 67) {    // C
    enterMode(selectionModes.build);
  } else if (event.keyCode === 192) {   // `
    sendBuild(currentTile, null);   // Destroy building.
  } else if (event.keyCode === 27) {    // ESC
    // Close all UI panes.
    enterMode(selectionModes.normal);
    helpPane.style.display = 'none';
  } else if (48 <= event.keyCode && event.keyCode <= 57) {
    sendBuild(currentTile, buildHotKeys[event.keyCode]);
  }
  if (voidCache) {
    cachedPaint = {};
  }
  if (redraw) {
    paint(gs);
  }
};


// Tile selection.


function travelingNumber(total) {
  return (total * splitInputWidget.value / 100)|0;
}

function mouseSelection(event) {
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  var posTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        gs.origin, gs.hexSize);

  if ((selectionMode === selectionModes.travel)
    && currentTile !== undefined && humanity.tile(currentTile) !== undefined) {
    var humanityTile = humanity.tile(currentTile);
    var numberOfPeople = travelingNumber(humanityTile.h);

    // Send travel information.
    var targetTile = posTile;
    if (terrain.humanTravelSpeedPath(currentTile, targetTile).length > 1
        && humanityTile.c === playerCamp) {
      if (humanityTile.f <= 0) {
        var starveMessage = {};
        starveMessage[terrain.keyFromTile(currentTile)] = humanityTile;
        addStarveMessages(starveMessage);
      }
      sendMove(currentTile, targetTile, numberOfPeople);

    } else if (numberOfPeople > 0) {
      // Try to go as far in that direction as we can.
      var minDist = MAX_INT;
      var closestTargetTile;
      for (var tileKey in accessibleTiles) {
        var accessedTile = terrain.tileFromKey(tileKey);
        var dist = terrain.distanceBetweenTiles(accessedTile, targetTile);
        if (dist < minDist) {
          closestTargetTile = accessedTile;
          minDist = dist;
        }
      }
      if (closestTargetTile != null) {
        sendMove(currentTile, closestTargetTile, numberOfPeople);
        // Put the cursor there instead of where we clicked.
        posTile = closestTargetTile;
      }
    }

    enterMode(selectionModes.normal);

  } else { sendPos(currentTile, posTile); }

  // Move there.
  currentTile = posTile;
  updateCurrentTileInformation();
  paint(gs);
};

var mousePosition;
var targetTile;
function showPath(event) {
  mousePosition = { x: event.clientX, y: event.clientY };
  if (currentTile && (selectionMode === selectionModes.travel)) {
    targetTile = tileFromPixel(mousePosition, gs.origin, gs.hexSize);
    paint(gs);
    paintHumans(gs, humanityData);
  }
}
canvas.addEventListener('mousemove', showPath);


// Map dragging.

function mouseDrag(event) {
  gs.canvas.style.cursor = 'move';
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  gs.canvas.addEventListener('mouseup', mouseEndDrag);
  gs.canvas.addEventListener('mousemove', dragMap);
  clearInterval(humanAnimationTimeout);
  currentlyDragging = true;
  resetDragVector();
  dragVelTo = setInterval(resetDragVector, dragVelInterval);
}

function mouseEndDrag(event) {
  gs.canvas.style.cursor = '';
  gs.canvas.removeEventListener('mousemove', dragMap);
  gs.canvas.removeEventListener('mouseup', mouseEndDrag);
  humanAnimationTimeout = setInterval(animateHumans, 100);
  currentlyDragging = false;
  paint(gs);
  clearInterval(dragVelTo);
  computeDragVelocity();
  inertiaDragMap();
}

gs.canvas.onmousedown = function mouseInputManagement(event) {
  if (event.button === 0) {
    gs.canvas.addEventListener('mouseup', mouseSelection);
    gs.canvas.addEventListener('mousemove', mouseDrag);
    lastMousePosition.clientX = event.clientX;
    lastMousePosition.clientY = event.clientY;
  } else if (event.button === 2) {  // Right click.
    enterTravelMode();
    splitPanelSlider(100);
    mouseSelection(event);
    enterNormalMode();
  }
};
gs.canvas.oncontextmenu = function(e) { e.preventDefault(); };

(function() {
  var requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame || function(f) { setTimeout(f, 0) };
  window.requestAnimationFrame = requestAnimationFrame;
}());

var lastMousePosition = { clientX: 0, clientY: 0 };
var drawingWhileDragging = false;
var currentlyDragging = false;
function dragMap(event) {
  if (drawingWhileDragging) { return; }
  drawingWhileDragging = true;
  var velocityX = (lastMousePosition.clientX - event.clientX);
  var velocityY = (lastMousePosition.clientY - event.clientY);
  gs.origin.x0 += velocityX;
  gs.origin.y0 += velocityY;
  // Save the last mouse position.
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
  paint(gs);
  requestAnimationFrame(function() {
    drawingWhileDragging = false;
  });
}

// Prevents Chrome from displaying a silly text cursor
// while dragging on the canvas.
canvas.onselectstart = function() { return false; }

// Inertial map dragging.

var dragVelocity = [0, 0];
var dragVector = [0, 0];
var dragTime = 0;
var dragVelTo; // drag timeout.
var dragVelInterval = 200; // 200ms.

function resetDragVector() {
  dragTime = Date.now();
  dragVector[0] = gs.origin.x0;
  dragVector[1] = gs.origin.y0;
}

function computeDragVelocity() {
  dragTime = Date.now() - dragTime;
  dragVector[0] = gs.origin.x0 - dragVector[0];
  dragVector[1] = gs.origin.y0 - dragVector[1];
  var nbFrames = dragTime * 0.03;  // 0.03 frames/ms
  dragVelocity[0] = (dragVector[0] / nbFrames)|0;
  dragVelocity[1] = (dragVector[1] / nbFrames)|0;
}

function inertiaDragMap() {
  gs.origin.x0 += dragVelocity[0];
  gs.origin.y0 += dragVelocity[1];
  dragVelocity[0] = (dragVelocity[0] / 1.1)|0;
  dragVelocity[1] = (dragVelocity[1] / 1.1)|0;
  paint(gs);
  requestAnimationFrame(function() {
    if (dragVelocity[0] !== 0 || dragVelocity[1] !== 0) {
      inertiaDragMap();
    }
  });
}
