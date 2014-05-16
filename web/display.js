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

/*
  I've wrapped Makoto Matsumoto and Takuji Nishimura's code in a namespace
  so it's better encapsulated. Now you can have multiple random number generators
  and they won't stomp all over eachother's state.
  
  If you want to use this as a substitute for Math.random(), use the random()
  method like so:
  
  var m = new MersenneTwister();
  var randomNumber = m.random();
  
  You can also call the other genrand_{foo}() methods on the instance.

  If you want to use a specific seed in order to get a repeatable random
  sequence, pass an integer into the constructor:

  var m = new MersenneTwister(123);

  and that will always produce the same random sequence.

  Sean McCullough (banksean@gmail.com)
*/

/* 
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.
 
   Before using, initialize the state by using init_genrand(seed)  
   or init_by_array(init_key, key_length).
 
   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.                          
 
   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
 
     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
 
     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.
 
     3. The names of its contributors may not be used to endorse or promote 
        products derived from this software without specific prior written 
        permission.
 
   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 
 
   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/

var MersenneTwister = function(seed) {
  if (seed == undefined) {
    seed = new Date().getTime();
  } 
  /* Period parameters */  
  this.N = 624;
  this.M = 397;
  this.MATRIX_A = 0x9908b0df;   /* constant vector a */
  this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
  this.LOWER_MASK = 0x7fffffff; /* least significant r bits */
 
  this.mt = new Array(this.N); /* the array for the state vector */
  this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

  this.init_genrand(seed);
}  
 
/* initializes mt[N] with a seed */
MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti=1; this.mti<this.N; this.mti++) {
      var s = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
   this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
  + this.mti;
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array mt[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      this.mt[this.mti] >>>= 0;
      /* for >32 bit machines */
  }
}
 
/* initialize by an array with array-length */
/* init_key is the array for initializing keys */
/* key_length is its length */
/* slight change for C++, 2004/2/26 */
MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
  var i, j, k;
  this.init_genrand(19650218);
  i=1; j=0;
  k = (this.N>key_length ? this.N : key_length);
  for (; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30)
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
      + init_key[j] + j; /* non linear */
    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
    i++; j++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
    if (j>=key_length) j=0;
  }
  for (k=this.N-1; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30);
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941))
      - i; /* non linear */
    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
    i++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
  }

  this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */ 
}
 
/* generates a random number on [0,0xffffffff]-interval */
MersenneTwister.prototype.genrand_int32 = function() {
  var y;
  var mag01 = new Array(0x0, this.MATRIX_A);
  /* mag01[x] = x * MATRIX_A  for x=0,1 */

  if (this.mti >= this.N) { /* generate N words at one time */
    var kk;

    if (this.mti == this.N+1)   /* if init_genrand() has not been called, */
      this.init_genrand(5489); /* a default initial seed is used */

    for (kk=0;kk<this.N-this.M;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    for (;kk<this.N-1;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
    this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

    this.mti = 0;
  }

  y = this.mt[this.mti++];

  /* Tempering */
  y ^= (y >>> 11);
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= (y >>> 18);

  return y >>> 0;
}
 
/* generates a random number on [0,0x7fffffff]-interval */
MersenneTwister.prototype.genrand_int31 = function() {
  return (this.genrand_int32()>>>1);
}
 
/* generates a random number on [0,1]-real-interval */
MersenneTwister.prototype.genrand_real1 = function() {
  return this.genrand_int32()*(1.0/4294967295.0); 
  /* divided by 2^32-1 */ 
}

/* generates a random number on [0,1)-real-interval */
MersenneTwister.prototype.random = function() {
  return this.genrand_int32()*(1.0/4294967296.0); 
  /* divided by 2^32 */
}
 
/* generates a random number on (0,1)-real-interval */
MersenneTwister.prototype.genrand_real3 = function() {
  return (this.genrand_int32() + 0.5)*(1.0/4294967296.0); 
  /* divided by 2^32 */
}
 
/* generates a random number on [0,1) with 53-bit resolution*/
MersenneTwister.prototype.genrand_res53 = function() { 
  var a=this.genrand_int32()>>>5, b=this.genrand_int32()>>>6; 
  return(a*67108864.0+b)*(1.0/9007199254740992.0); 
} 

/* These real versions are due to Isaku Wada, 2002/01/09 added */

var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));

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
  university:   24
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 24 ];

var resourceTypes = {
  lumber:   -1,
  metal:    -2,
  farm:     -3
};

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hill]     = tileTypes.forest;
tileVegetationTypeFromSteepness[tileTypes.mountain] = tileTypes.taiga;

function tileType(steepness, vegetation) {
  if (vegetation) { return tileVegetationTypeFromSteepness[steepness]; }
  else { return steepness; }
}

// (Sparse) Array of array of tiles.
var memoizedTiles = [];

// Get information about the tile at hexagonal coordinates `coord` {q, r}.
// Returns
//  - steepness: altitude level. See `tileTypes`.
//  - vegetation: boolean; whether there is vegetation.
//  - type: tile type. See `tileTypes`.
//  - rain: floating point number between -1 and 1, representing how heavy the
//  rainfall is.
function terrain(coord) {
  var x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
  var y = (3/2 * coord.r);
  if (memoizedTiles[x] != null && memoizedTiles[x][y] != null) {
    return memoizedTiles[x][y];
  }
  var size = simplex2.noise2D(y/500, x/500);
  var riverNoise = 1-Math.abs((
      + 4 * (simplex1.noise2D(x/4/factor, y/4/factor))
      + 2 * (simplex1.noise2D(x/2/factor, y/2/factor))
      + 1 * (simplex1.noise2D(x/1/factor, y/1/factor))
      + 1/2 * (simplex1.noise2D(x*2/factor, y*2/factor))
      )/(1/2+1+2+4));
  var heightNoise = Math.sin(
      // Abs gives valleys.
      - (size * 5) * Math.abs(simplex1.noise2D(1/4*x/factor, 1/4*y/factor))
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
  var steepness = (
    // Rivers are thinner in mountains.
    (riverNoise - (heightNoise > 0.6? riverNoise: 0) > 0.98
    // Seas are smaller in mountains.
    || seaNoise*3/4 + heightNoise/4 < -0.7) ?
        tileTypes.water:
    (heightNoise - riverNoise/2 < 0.1) ?
        tileTypes.steppe:
    // Mountains are cut off (by hills) to avoid circular mountain formations.
    (heightNoise - riverNoise < 0.2) ?
        tileTypes.hill:
        tileTypes.mountain);
  var vegetation = (vegetationNoise
      // Less vegetation on water.
      - (steepness === tileTypes.water? 2 * seaNoise: 0)
      + Math.abs(heightNoise + 0.15)) < 0;

  var tile = {
    steepness: steepness,
    vegetation: vegetation,
    type: tileType(steepness, vegetation),
    rain: -vegetationNoise / 2
  };
  if (memoizedTiles[x] == null) {
    memoizedTiles[x] = [];
  }
  memoizedTiles[x][y] = tile;
  return tile;
}

// Movements.
var distances = [];
distances[tileTypes.water]    = 0xbad;
distances[tileTypes.steppe]   = 2;
distances[tileTypes.hill]     = 4;
distances[tileTypes.mountain] = 16;
distances[tileTypes.swamp]    = 8;
distances[tileTypes.meadow]   = 3;
distances[tileTypes.forest]   = 8;
distances[tileTypes.taiga]    = 24;
distances[tileTypes.road]     = 1;
distances[tileTypes.wall]     = 32;

function distance(tpos) {
  var t = terrain(tpos);
  var h = humanity(tpos);
  var d = distances[(h && h.b)? h.b: t.type];
  if (d === undefined) { d = distances[t.type]; }
  return d;
}

// Find a neighboring tile.
// `tile` is {q, r}.
// `orientation` is 0 for right, 1 for top right, and
// so on counter-clockwise until 5 for bottom right.
function neighborFromTile(tile, orientation) {
  if (orientation === 0) { return { q: tile.q + 1, r: tile.r };
  } else if (orientation === 1) { return { q: tile.q + 1, r: tile.r - 1 };
  } else if (orientation === 2) { return { q: tile.q, r: tile.r - 1};
  } else if (orientation === 3) { return { q: tile.q - 1, r: tile.r };
  } else if (orientation === 4) { return { q: tile.q - 1, r: tile.r + 1 };
  } else if (orientation === 5) { return { q: tile.q, r: tile.r + 1 };
  }
}

// Return a string key unique to the tile.
function keyFromTile(tile) { return tile.q + ':' + tile.r; }
function tileFromKey(key) {
  var values = key.split(':');
  return { q: +values[0], r: +values[1] };
}

// Find the set of tiles one can move to, from a starter tile.
// Requires humans to be on that tile.
// `tstart` is a {q, r} tile position. (It's Dijkstra.)
// Returns a map from tileKey (see keyFromTile) to the tile key whence we come.
function travelFrom(tstart, speed) {
  var camp = humanity(tstart).c;    // Camp which wants to travel.
  var walkedTiles = {};     // Valid accessible tiles.
  var current = keyFromTile(tstart);
  walkedTiles[current] = current;
  var consideredTiles = {}; // Map from tile keys to distance walked.
  consideredTiles[current] = 0;
  var fastest = [];         // List of tile keys from fastest to slowest.
  fastest.push(current);
  // Going through each considered tile.
  while (fastest.length > 0) {
    current = fastest.shift();
    // Check the camp. Is there a potential battle?
    var humanityNeighbor = humanity(tileFromKey(current));
    if (humanityNeighbor && humanityNeighbor.c != null
        && humanityNeighbor.c !== camp) {
      continue;
    }
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(tileFromKey(current), i);
      var newDistance = consideredTiles[current] + distance(neighbor);
      if (newDistance <= speed) {
        // Update data.
        var neighborKey = keyFromTile(neighbor);
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
}

// Find the path from tstart = {q, r} to tend = {q, r}
// with a minimal distance, at a certain speed. (It's A*.)
// Requires humans to be on that tile.
// Returns a list of tiles = "q:r" through the trajectory.
function travelTo(tstart, tend, speed) {
  var camp = humanity(tstart).c;    // Camp which wants to travel.
  var endKey = keyFromTile(tend);
  var walkedTiles = {};     // Valid accessed tiles.
  var consideredTiles = {}; // Map from tile keys to distance walked.
  var heuristic = {};       // Just like consideredTiles, with heuristic.
  var fastest = [];         // List of tile keys from fastest to slowest.
  var parents = {};         // Map from tile keys to parent tile keys.
  var current = keyFromTile(tstart);
  consideredTiles[current] = 0;
  fastest.push(current);
  // Going through each considered tile.
  while (fastest.length > 0 && endKey !== current) {
    current = fastest.shift();
    walkedTiles[current] = true;
    // Check the camp. Is there a potential battle?
    var humanityNeighbor = humanity(tileFromKey(current));
    if (humanityNeighbor && humanityNeighbor.c != null
        && humanityNeighbor.c !== camp) {
      continue;
    }
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(tileFromKey(current), i);
      var newDistance = consideredTiles[current] + distance(neighbor);
      if (newDistance <= speed) {
        var neighborKey = keyFromTile(neighbor);
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
  }
  var path = [];
  if (endKey !== current) { return path; }  // No dice. ☹
  while (parents[endKey] !== undefined) {
    path.push(endKey);
    endKey = parents[endKey];
  }
  path.push(keyFromTile(tstart));
  return path.reverse();
}

var normalWater = distances[tileTypes.water];
var normalSwamp = distances[tileTypes.swamp];
function setDistancesForHuman(h) {
  if ((h.o & manufacture.boat) !== 0) {
    distances[tileTypes.water] = 1;
    distances[tileTypes.swamp] = 1;
  } else if ((h.o & manufacture.plane) !== 0) {
    distances[tileTypes.water] = 2;
    distances[tileTypes.swamp] = 2;
  }
}
function unsetDistancesForHuman(h) {
  distances[tileTypes.water] = normalWater;
  distances[tileTypes.swamp] = normalSwamp;
}
function humanTravel(tpos) {
  var h = humanity(tpos);
  if (!h || h.h <= 0) { return {}; }
  setDistancesForHuman(h);
  var tiles = travelFrom(tpos, speedFromHuman(h));
  unsetDistancesForHuman(h);
  return tiles;
}

function humanTravelTo(tpos, tend) {
  var h = humanity(tpos);
  if (!h || h.h <= 0) { return []; }
  setDistancesForHuman(h);
  var tiles = travelTo(tpos, tend, speedFromHuman(h));
  unsetDistancesForHuman(h);
  return tiles;
}



// Humanity

var manufacture = {
  boat: 1,
  car: 2,
  plane: 4,
  gun: 8
};

function speedFromHuman(human) {
  if ((human.o & manufacture.plane) !== 0) {
    return 32;
  } else if ((human.o & manufacture.car) !== 0) {
    return 16;
  } else { return 8; }
}

// The index is the tileTypes id.
// It is a list of [number, tileType] requirements to build something.
// This is for tiles around the building.
var buildingDependencies = [,,,,,,,,
    ,
    [[2, tileTypes.farm]],      // residence [9].
    [[6, tileTypes.residence]],
    [[3, tileTypes.residence], [2, tileTypes.road]],
    [[1, tileTypes.residence], [1, tileTypes.water], [1, resourceTypes.lumber]],
    [[2, tileTypes.road]],
    [[1, tileTypes.gunsmith], [3, tileTypes.airland], [1, resourceTypes.lumber]],
    [[1, tileTypes.skyscraper], [1, tileTypes.factory]],
    ,
    ,
    ,
    ,
    [[1, tileTypes.residence]],
    [[1, resourceTypes.lumber], [1, tileTypes.factory]],
    [[10, resourceTypes.farm], [1, tileTypes.mine], [5, tileTypes.road]],
    ,
    [[1, resourceTypes.metal], [20, resourceTypes.farm], [2, tileTypes.wall]]
];
// What the current tile must hold to allow a building to be constructed.
var buildingTileDependency = [,,,,,,,, ,,,,,,,,,,,,
    [tileTypes.forest, tileTypes.taiga],         // Lumber [20]
    [tileTypes.metal],,,
    [tileTypes.citrus]
];

// Given a building (see tileTypes) and a tile = {q, r},
// check whether the building can be built there.
// resources = {lumber, usedLumber, metal, usedMetal} is the resources available
// for use in the current camp.
function validConstruction(building, tile, resources) {
  if (building == null) { return true; }   // Destruction is always valid.
  var humanityTile = humanity(tile);
  var tileInfo = terrain(tile);
  var spareLumber = resources.lumber - resources.usedLumber;
  var spareMetal = resources.metal - resources.usedMetal;
  var spareFarm = resources.farm - resources.usedFarm;
  if (!humanityTile || humanityTile.h <= 0) { return false; }
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
      var neighbor = neighborFromTile(tile, i);
      var humanityNeighbor = humanity(neighbor);
      var terrainNeighbor = terrain(neighbor);
      for (var j = 0; j < requiredDependencies.length; j++) {
        if (requiredDependencies[j][1] >= 0 && (humanityNeighbor
             && humanityNeighbor.b === requiredDependencies[j][1]) ||
            terrainNeighbor.type === requiredDependencies[j][1]) {
          dependencies[j]++;
        } else if (requiredDependencies[j][1] < 0) {
          // Resources.
          if (requiredDependencies[j][1] === resourceTypes.lumber
              && spareLumber < requiredDependencies[j][0]) {
              return false;
          } else if (requiredDependencies[j][1] === resourceTypes.metal
              && spareMetal < requiredDependencies[j][0]) {
              return false;
          } else if (requiredDependencies[j][1] === resourceTypes.farm
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
}


// Remote connection.
//

var planTypes = {
  move: 1,
  build: 2
};

var plans = {};
function addPlan(plan) { plans[plan.at] = plan; }
function eachPlan(f) {
  for (var tileKey in plans) { f(plans[tileKey]); }
}
function clearPlans() { plans = {}; }

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
      '/$websocket:act');
  socket.onmessage = socketMessage;
  socket.onclose = socket.onerror = socketError;
  socket.onopen = function() { retries = 0; cb(); };
}
function socketMessage(e) {
  var change = JSON.parse(e.data);
  if (change.lockedTiles) {
    lockedTiles = change.lockedTiles;
  } else if (change.winners) {
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
    if (change.resources !== undefined) {
      campResources = change.resources;
      resources = change.resources[playerCamp];
      delete change.resources;
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
    if (change.goto !== undefined) {
      // goto is the spawn tile.
      gotoPlace(change.goto);
      delete change.goto;
    }
    if (change.places !== undefined) {
      // Set the places.
      insertPlaces(change.places);
      delete change.places;
    }
    if (change.campNames !== undefined) {
      // Set the spawn names.
      campNames = change.campNames;
      delete change.campNames;
    }
    if (humanityPopulation) {
      var humanityFarm = humanityResource(function(a) {return a.farm - a.usedFarm;});
      var humanityWood = humanityResource(function(a) {return a.lumber - a.usedLumber;});
      var humanityMetal = humanityResource(function(a) {return a.metal - a.usedMetal;});
      var humanityUniv = humanityResource(function(a) {return Object.keys(a.acquiredUniversitiesMap).length;});
      setResourcePanel(humanityPopulation,
          populationPanel, populationMaxPanel, populationMaxCampPanel);
      setResourcePanel(humanityFarm,
          farmPanel, farmMaxPanel, farmMaxCampPanel);
      setResourcePanel(humanityWood,
          woodPanel, woodMaxPanel, woodMaxCampPanel);
      setResourcePanel(humanityMetal,
          metalPanel, metalMaxPanel, metalMaxCampPanel);
      setResourcePanel(humanityUniv,
          uniPanel, uniMaxPanel, uniMaxCampPanel);
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
function sendMove(from, to, humans) {
  if (!from || !to) { return; }
  var keyTo = keyFromTile(to);
  registerMoves[keyTo] = from;
  if (socket.readyState === 1) {
    var keyFrom = keyFromTile(from);
    socket.send(JSON.stringify({
      at: keyFrom,
      do: planTypes.move,
      to: keyTo,
      h: humans
    }));
  } else { connectSocket(function(){sendMove(from, to, humans);}); }
}

function sendPos(at, to) {
  socket.send(JSON.stringify({
    at: at? keyFromTile(at): null,
    to: keyFromTile(to)
  }));
}

function sendBuild(at, building) {
  if (!at) { return; }
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      at: keyFromTile(at),
      do: planTypes.build,
      b: building
    }));
  } else { connectSocket(function(){sendBuild(at, building);}); }
}

// List of camp names, indexed by the camp ID.
var campNames;

var defaultPlacesPanelHTML = placesPanel.innerHTML;

// Insert places = {"tileKey": "Place name"} into the panel.
function insertPlaces(places) {
  placesPanel.innerHTML = defaultPlacesPanelHTML;
  for (var place in places) {
    var aPlace = document.createElement('p');
    aPlace.classList.add('buildSelection');
    aPlace.classList.add('validSelection');
    // Add a separator.
    var aSep = document.createElement('hr');
    aSep.classList.add('separator');
    placesPanel.appendChild(aSep);
    // Add the place block.
    var tile = tileFromKey(place);
    aPlace.setAttribute('data-tilekey', place);
    aPlace.innerHTML = '<div style="position:absolute;">→</div> <br>' + places[place];
    aPlace.addEventListener('click', (function(t) {
      return function() {
        gotoPlace(t);
        paint(gs);
      };
    }(tile)));
    placesPanel.appendChild(aPlace);
  }
}

function setResourcePanel(resourceList, panel, maxPanel, maxCampPanel) {
  panel.value = resourceList[playerCamp];
  var maxResourceIndex = 0;
  var maxResource = 0;
  for (var i = 0; i < resourceList.length; i++) {
    if (resourceList[i] > maxResource) {
      maxResourceIndex = i;
      maxResource = resourceList[i];
    }
  }
  maxPanel.value = maxResource;
  maxCampPanel.value = campNames[maxResourceIndex];
  maxCampPanel.style.color = campHsl(maxResourceIndex);
}

function humanityResource(resource) {
  var humanityResource = [];
  for (var i = 0; i < campResources.length; i++) {
    humanityResource[i] = resource(campResources[i]);
  }
  return humanityResource;
}

// Focus the screen on tile t = {q, r}.
// Changes `origin`.
function gotoPlace(t) {
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
      var tileCenter = pixelFromTile(tileFromKey(block.getAttribute('data-tilekey')),
          {x0:0,y0:0}, gs.hexSize);
      var angle = -orientation(screenCenter, tileCenter);
      var arrow = block.firstChild;
      arrow.style.transform = 'rotate(' + angle + 'rad)';
      arrow.style.WebkitTransform = 'rotate(' + angle + 'rad)';
      arrow.nextSibling.textContent =
        kmDistance(screenCenter, tileCenter).toFixed(2) + 'km';
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
  farm: 0,
  usedFarm: 0,
  lumber: 0,
  usedLumber: 0,
  metal: 0,
  usedMetal: 0
};
var campResources;

// Takes a tile = {q, r}, returns the humanity information for that tile.
// (See above for humanity information.)
function humanity(tile) {
  return humanityData[tile.q + ':' + tile.r];
}

function changeHumanity(humanityData, change) {
  for (var tileKey in change) {
    humanityData[tileKey] = change[tileKey];
    delete registerMoves[tileKey];
  }
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
travelPanel.onclick = function() { showHelp('welcome'); };
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

// Sprites.

function loadSprites() {
  var img = new Image();
  img.src = 'sprites.png';
  return img;
}
var sprites = loadSprites();
// Canvas with the sprites on it. Set when loaded.
var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  spritesLoaded = true;
  paint(gs);
};


// Size of radius of the smallest disk containing the hexagon.
var hexaSize = 20;
// Pixel position of the top left screen pixel,
// compared to the origin of the map.
var origin = { x0: 0, y0: 0 };
// Canvas.
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
// Blink and Webkit get the following wrong.
// Remove without worry
// when https://code.google.com/p/chromium/issues/detail?id=168840 is fixed.
document.styleSheets[0].insertRule('div.controlPanel { max-height:' +
  (canvas.height - 16 - 58) + 'px; }', 0);

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
    spritesWidth: spritesWidth
  };
}
var gs = makeGraphicState(document.getElementById('canvas'), sprites);


// Given a list of tile key "q:r" representing hexagon coordinates,
// construct the path along each hexagon's center.
// gs is the GraphicState.
function pathAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  if (tiles.length < 2) { return; }
  var penultimate;
  var cp = pixelFromTile(tileFromKey(tiles[0]), origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cp.x|0, cp.y|0);
  for (var i = 0; i < tiles.length - 1; i++) {
    cpNext = pixelFromTile(tileFromKey(tiles[i+1]), origin, size);
    var avgPoint = averagePoint(cp, cpNext);
    ctx.quadraticCurveTo(cp.x|0, cp.y|0, avgPoint.x|0, avgPoint.y|0);
    if (i === tiles.length - 2) { penultimate = cp; }
    cp = cpNext;
  }
  // Arrow at the end.
  cp = pixelFromTile(tileFromKey(tiles[tiles.length-1]), origin, size);
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
    var tile = tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      var neighbor = neighborFromTile(tile, f);
      mask |= (((tiles[keyFromTile(neighbor)] !== undefined)|0) << f);
    }
    partialPathFromHex(gs, cp, mask, hexHorizDistance, hexVertDistance);
  }
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
// gs is the GraphicState.
function pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = neighborFromTile(tile, f);
      if (tiles[keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  pathFromPolygons(gs,
      polygonFromVertices(gs, vertices, hexHorizDistance));
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
    var tile = tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = neighborFromTile(tile, f);
      if (tiles[keyFromTile(neighbor)] === undefined) {
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
    return keyFromTile(neighborFromTile(tileFromKey(tileKey), 2)) + ":0";
  } else if (vertex === 1) {
    return keyFromTile(neighborFromTile(tileFromKey(tileKey), 3)) + ":1";
  } else if (vertex === 2) {
    return keyFromTile(neighborFromTile(tileFromKey(tileKey), 3)) + ":0";
  } else if (vertex === 3) {
    return keyFromTile(neighborFromTile(tileFromKey(tileKey), 4)) + ":1";
  } else if (vertex === 4) {
    return tileKey + ":0";
  } else if (vertex === 5) {
    return tileKey + ":1";
  } else { return "invalid:vertex:key"; }
}

// Take a vertex key, return the {x,y} point in the screen's coordinate.
// gs is the GraphicState.
function pointFromVertex(gs, vertex, hexHorizDistance) {
  var size = gs.hexSize; var origin = gs.origin;
  var vertexSide = +vertex.slice(-1);
  var tileKey = vertex.slice(0, -2);
  var tile = tileFromKey(tileKey);
  var cp = pixelFromTile(tile, origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  if (vertexSide === 0) {
    return {x: cx + halfHorizDistance, y: cy + halfSize};
  } else if (vertexSide === 1) {
    return {x: cx + halfHorizDistance, y: cy - halfSize};
  }
}

// Given a list of vertices "q:r:0" containing from / to line information,
// return a list of polygons [{x,y}] with no duplicate point.
// gs is the GraphicState.
function polygonFromVertices(gs, vertices, hexHorizDistance) {
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
      pointFromVertex(gs, startVertex, hexHorizDistance),
      pointFromVertex(gs, currentVertex, hexHorizDistance)
    ];
    var infiniteLoopCut = 10000;
    while (currentVertex !== startVertex && (infiniteLoopCut--) > 0) {
      for (var i = 0; i < verticesLeft.length; i += 2) {
        if (verticesLeft[i] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i+1],hexHorizDistance));
          currentVertex = verticesLeft[i+1];
          verticesLeft.splice(i, 2);
          break;
        } else if (verticesLeft[i+1] === currentVertex) {
          polygon.push(gs, pointFromVertex(verticesLeft[i], hexHorizDistance));
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
function pathFromPolygons(gs, polygons) {
  var ctx = gs.ctx;
  ctx.beginPath();
  for (var i = 0; i < polygons.length; i++) {
    partialPathForSmoothPolygon(gs, polygons[i]);
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
function partialPathForSmoothPolygon(gs, oldPolygon) {
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
    ctx.quadraticCurveTo(polygon[i].x, polygon[i].y,
                         avgPoint.x, avgPoint.y);
  }
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
  pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance);
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

var mπd3 = - Math.PI / 3;   // Minus PI divided by 3.

// gs is the GraphicState.
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the sprite.
// gs is the GraphicState.
function paintSprite(gs, cx, cy, sprite, rotation) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var spritesWidth = gs.spritesWidth;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * mπd3);
  ctx.drawImage(sprites,
      0, (spritesWidth * sprite)|0, spritesWidth, spritesWidth,
      (-size)|0, (-size)|0, (size * 2)|0, (size * 2)|0);
  ctx.restore();
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the building.
// gs is the GraphicState.
function paintBuilding(gs, cx, cy, tilePos, rotation) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var human = humanity(tilePos);
  if (human != null && human.b != null) {
    if (human.b === tileTypes.road || human.b === tileTypes.wall
     || human.b === tileTypes.airland) {
      // Orient roads, walls and airlands.
      var oriented = false;
      for (var i = 0; i < 6; i++) {
        var neighbor = humanity(neighborFromTile(tilePos, i));
        if (neighbor &&
            // Orient roads along other roads, walls against walls.
            (((human.b === tileTypes.road || human.b === tileTypes.wall)
              && neighbor.b === human.b)
            // Orient airlands towards airports.
          || (human.b === tileTypes.airland
              && neighbor.b === tileTypes.airport))) {
          paintSprite(gs, cx, cy, human.b, i);
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(gs, cx, cy, human.b, 0); }
    } else if (human.b === tileTypes.airport || human.b === tileTypes.factory
        || human.b > tileTypes.wall) {
      paintSprite(gs, cx, cy, human.b, 0);
    } else {
      paintSprite(gs, cx, cy, human.b, rotation);
    }
  }
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
      var t = terrain(tilePos);
      var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
      paintBuilding(gs, cx, cy, tilePos, rotation);
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
function paintTerrain(gs, cx, cy, hexHorizDistance, hexVertDistance, tilePos) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var t = terrain(tilePos);
  // Draw terrain.
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintSprite(gs, cx, cy, t.type, rotation);
  // Heavy rain makes it darker.
  pathFromHex(gs, { x:cx, y:cy }, hexHorizDistance, hexVertDistance);
  var grey = Math.floor((1 - t.rain) / 2 * 127)|0;
  if (t.type === tileTypes.water) {
    // If it's next to something, make a beach.
    var border = false;
    for (var i = 0; i < 6; i++) {
      if (terrain(neighborFromTile(tilePos, i)).type !== tileTypes.water) {
        border = true;
      }
    }
    if (border) { grey += 20; }
    ctx.fillStyle = 'rgba(' + grey + ',' + grey + ',' + grey + ',0.3)';
  } else {
    var delta = (Math.abs(grey - 127/2) / 1)|0;
    var red = grey;
    var green = grey;
    if (grey < 127/2) { red -= delta; green += delta; }
    else if (grey > 127/2) { red += 2*delta; green += delta; }
    if (t.type === tileTypes.steppe) {
      // If it's next to water, make a beach.
      var leftTile = neighborFromTile(tilePos, 0);
      var rightTile = neighborFromTile(tilePos, 3);
      if (terrain(leftTile).type === tileTypes.water
       || terrain(rightTile).type === tileTypes.water) {
        red += ((127-grey)/2)|0; green += ((127-grey)/4)|0;
      }
    }
    ctx.fillStyle = 'rgba(' + red + ',' + green + ',' + grey + ',0.3)';
  }
  ctx.fill();
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
    canvasBuffer.width = canvas.width;
    canvasBuffer.height = canvas.height;
    var gsBuffer = makeGraphicState(canvasBuffer, sprites);
    gsBuffer.hexSize = gs.hexSize;

    var offLeft = true;     // Each row is offset from the row above.
    while (cy - hexVertDistance < height) {
      while (cx - hexHorizDistance < width) {
        tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
        // Draw terrain.
        paintTerrain(gsBuffer, cx, cy,
            hexHorizDistance, hexVertDistance, tilePos);
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

    cachedTerrainPaint[cachePos] = canvasBuffer;
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
      var t = terrain(tilePos);
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

var canvasBuffer = document.createElement('canvas');
canvasBuffer.width = gs.width;
canvasBuffer.height = gs.height;
var imageBuffer =
  canvasBuffer.getContext('2d').getImageData(0, 0, gs.width, gs.height);
var workerMessage = { image: null, size: gs.hexSize, origin: origin };
var renderWorker = new Worker('render-worker.js');
// gs is the GraphicState.
function paintTiles(gs, cb) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        ctx.putImageData(e.data.image, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        cb();
      }
    });
    workerMessage.image = imageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
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
// Note: the callback `cb(canvas)` may be called several times.
function getCachedPaint(gs, cacheX, cacheY, cb) {
  var size = gs.hexSize; var origin = gs.origin;
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache == null) {
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = gs.width;
    canvasBuffer.height = gs.height;
    if (cache === undefined) {
      // The cache was never there; it wasn't invalidated.
      // Paint it black immediately.
      var ctxBuffer = canvasBuffer.getContext('2d');
      ctxBuffer.fillStyle = 'black';
      ctxBuffer.fillRect(0, 0, canvas.width, canvas.height);
      cb(canvasBuffer);
    }
    // Deferred actual painting.
    if (cachePending[pos] === undefined) {
      cachePending[pos] = cb;
      var gsBuffer = makeGraphicState(canvasBuffer, sprites);
      gsBuffer.hexSize = gs.hexSize;
      gsBuffer.origin = { x0: cacheX, y0: cacheY };
      paintTiles(gsBuffer, function() {
        cache = cachedPaint[cacheX + ':' + cacheY] = canvasBuffer;
        cachePending[pos](cache);
        delete cachePending[pos];
      });
    } else { cachePending[pos] = cb; }
  } else { cb(cache); }
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
    var tile = tileFromKey(changedTile);
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
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
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
  var makeDraw = function makeDraw(x, y) {
    return function draw(cache) {
      ctx.drawImage(cache, x, y);
      // We have four jobs to make in total.
      countDone++;
      if (countDone >= 4) { cb(); }
    }
  };
  getCachedPaint(gs, left, top, makeDraw(-x, -y));
  getCachedPaint(gs, right, top, makeDraw(width-x, -y));
  getCachedPaint(gs, left, bottom, makeDraw(-x, height-y));
  getCachedPaint(gs, right, bottom, makeDraw(width-x, height-y));
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = canvas.width;
displayedPaint.height = canvas.height;
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

// previousTile is a map from tileKey to the previous tileKey.
function humanTravelToCache(currentTile, targetTile, previousTile) {
  var trajectory = [];
  var tileKey = keyFromTile(targetTile);
  if (previousTile[tileKey] === undefined) { return trajectory; }
  while (previousTile[tileKey] !== tileKey) {
    trajectory.unshift(tileKey);
    tileKey = previousTile[tileKey];
  }
  trajectory.unshift(tileKey);
  return trajectory;
}

// Paint the UI for population, winner information, etc.
// gs is the GraphicState.
function paintIntermediateUI(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // Show tiles controlled by a player.
  for (var tileKey in lockedTiles) {
    paintTileHexagon(gs, tileFromKey(tileKey),
        campHsl(lockedTiles[tileKey]), 1);
  }
  if (currentTile != null && playerCamp != null) {
    paintTileHexagon(gs, currentTile, campHsl(playerCamp));
  }
  paintCamps(gs);
  // Paint the set of accessible tiles.
  ctx.lineWidth = 1.5;
  paintAroundTiles(gs, accessibleTiles);
  ctx.lineWidth = 1;
  if (currentTile != null && targetTile != null &&
      (selectionMode === selectionModes.travel ||
       selectionMode === selectionModes.split)) {
    // Paint the path that the selected folks would take.
    paintAlongTiles(gs,
        humanTravelToCache(currentTile, targetTile, accessibleTiles));
  }
  // Paint the path that folks will take.
  for (var to in registerMoves) {
    paintAlongTiles(gs, humanTravelTo(registerMoves[to], tileFromKey(to)));
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
  var measure;
  ctx.fillStyle = color || 'black';
  ctx.strokeStyle = 'black';
  ctx.textAlign = 'center';
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line1).width;
  ctx.fillText(line1, width / 2, height * 1/3);
  ctx.strokeText(line1, width / 2, height * 1/3);
  ctx.font = (height / 8) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line2).width;
  ctx.fillText(line2, width / 2, height * 13/24);
  ctx.strokeText(line2, width / 2, height * 13/24);
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line3).width;
  ctx.fillText(line3, width / 2, height * 2/3);
  ctx.strokeText(line3, width / 2, height * 2/3);
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
    var tile = terrain(tileFromKey(tileKey));
    var centerPixel = pixelFromTile({ q:q, r:r }, origin, size);
    var cx = centerPixel.x;
    var cy = centerPixel.y;
    // Paint people.
    var number = human.h;
    if (number > humanAnimation.length) { number = humanAnimation.length; }
    for (var i = 0; i < number; i++) {
      var animation = humanAnimation[Math.abs(i+q^r^human.f) % humanAnimation.length];
      var animx = cx - size + animation.x * 2 * size;
      var animy = cy - size + animation.y * 2 * size;
      var pixel = size/20;
      ctx.fillStyle = 'black';
      if ((tile.type === tileTypes.water || tile.type === tileTypes.swamp)
          && (human.o & manufacture.boat) !== 0) {
        ctx.fillStyle = '#aaf';
        ctx.fillRect(animx - pixel, animy - pixel, pixel, pixel);
        ctx.fillRect(animx, animy, 7*pixel, pixel);
        ctx.fillRect(animx + 7*pixel, animy - pixel, pixel, pixel);
      } else if ((human.o & manufacture.plane) !== 0) {
        ctx.fillStyle = '#edf';
        ctx.fillRect(animx - pixel, animy - pixel, 2*pixel, pixel);
        ctx.fillRect(animx, animy, 9*pixel, pixel);
        ctx.fillRect(animx + 5*pixel, animy - pixel, pixel, pixel);
        ctx.fillRect(animx + 3*pixel, animy + pixel, pixel, pixel);
      } else if ((human.o & manufacture.car) !== 0) {
        ctx.fillStyle = '#420';
        ctx.fillRect(animx, animy, 2*pixel, pixel);
      } else {
        ctx.fillRect(animx, animy, pixel, 2*pixel);
      }
    }
  }
}

function animateHumans() {
  paintHumans(gs, humanityData);
  updateHumans();
}
var humanAnimationTimeout = setInterval(animateHumans, 100);


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
    tile = tileFromKey(tileKey);
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
  for (var i = 0; i < numberOfCamps; i++) {
    if (size < 5) {
      // We're too far above.
      ctx.fillStyle = campHsl(i);
      var visibleCamp = visibleCamps[i];
      for (var key in visibleCamp) {
        var px = pixelFromTile(tileFromKey(key), origin, size);
        ctx.fillRect(px.x - size, px.y - size, 2 * size, 2 * size);
      }
    } else {
      ctx.lineWidth = 4;
      paintAroundTiles(gs, visibleCamps[i], '#777');
      ctx.lineWidth = 2;
      ctx.strokeStyle = campHsl(i);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}

// Return CSS hsl string.
function campHsl(camp) {
  return 'hsl(' + campHueCreator9000(camp) + ',100%,50%)';
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
  var svg = '';
  // Paint the border.
  svg += '<rect stroke="#345" stroke-width="1" x="0" y="0" rx="3" ry="3" width="'
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
    svg += '<rect fill="' + 'hsl(' + campHueCreator9000(i) + ',80%,50%)' + '"'
        + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
        + ' height="' + (height - 2) + '" />';
    start += popWidth;
  }
  popWidth = innerWidth - allButLastWidth;
  svg += '<rect fill="' + 'hsl(' + campHueCreator9000(i) + ',80%,50%)' + '"'
      + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
      + ' height="' + (height - 2) + '" />';
  populationMonitor.innerHTML = svg;
}

// Tile Messages.
var surrenderMessages = [
  "We surrender!",
  "I, for one, welcome our new overlords."
];
var hungerMessages = [
  "Hungry!",
  "Is dinner ready?",
  "I can't feel my stomach!",
  "You're starving us!",
  "I could eat anything now. Rats. Babies.",
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
  "That wine tastes good. Wait—",
  "Tell my wife I loved her… meals…",
  "I do!",
  "Resistance is futile.",
  "I didn't expect the Spanish Inquisition!",
  "Whoop-de-doo!",
  "You'll never take me alive!",
  "Told you he wasn't immortal!",
  "Tu quoque, fili mi!",
  "Do not disturb my circles!",
  "This is no time to be making enemies.",
  "I owe a cock to Asclepius.",
  "More light!",
  "Life's too short!",
  "They couldn't hit an elephant at this dist…",
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
  var center = pixelFromTile(tileFromKey(tileKey), origin, size);
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
  var t = terrain(tile);
  var info = 'a ' + tileNames[t.type];
  var h = humanity(tile);
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
  for (var i = 0; i < buildingTypes.length; i++) {
    if (validConstruction(buildingTypes[i], currentTile, resources)) {
      buildSelectionButtons[i].classList.add('validSelection');
    } else {
      buildSelectionButtons[i].classList.remove('validSelection');
    }
  }
}
function hookBuildSelectionButtons() {
  for (var i = 0; i < buildingTypes.length; i++) {
    var hook = (function(b) { return function hookBuildSelectionButton() {
        sendBuild(currentTile, b);
        enterMode(selectionModes.normal);
      };
    }(buildingTypes[i]));
    buildSelectionButtons[i].addEventListener('click', hook);
  }
}
hookBuildSelectionButtons();

function updateCurrentTileInformation() {
  if (currentTile !== undefined) {
    // Tile information.
    showTileInformation(currentTile);
    // Accessible tiles.
    accessibleTiles = humanTravel(currentTile);
    // Valid constructions.
    indicateValidConstructions(currentTile);
  }
}





// Initialization and event management.
//

var selectionModes = {
  normal: 1,
  travel: 2,
  build:  3,
  split:  4,
  places: 5
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
  if (selectionMode === selectionModes.travel) {
    hidePanel(travelPanel, travelBut);
    targetTile = null;
    travelBut.removeEventListener('click', enterNormalMode);
    travelBut.addEventListener('click', enterTravelMode);
  } else if (selectionMode === selectionModes.build) {
    hidePanel(buildPanel, buildBut);
    buildBut.removeEventListener('click', enterNormalMode);
    buildBut.addEventListener('click', enterBuildMode);
  } else if (selectionMode === selectionModes.split) {
    hidePanel(splitPanel, splitBut);
    splitBut.removeEventListener('click', enterNormalMode);
    splitBut.addEventListener('click', enterSplitMode);
  } else if (selectionMode === selectionModes.places) {
    hidePanel(placesPanel, placesBut);
    placesBut.removeEventListener('click', enterNormalMode);
    placesBut.addEventListener('click', enterPlacesMode);
  }
  // Add things from the new mode.
  if (newMode === selectionModes.travel) {
    showPanel(travelPanel, travelBut);
    travelBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.build) {
    showPanel(buildPanel, buildBut);
    buildBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.split) {
    splitPanelSetMoveStay();
    showPanel(splitPanel, splitBut);
    splitBut.addEventListener('click', enterNormalMode);
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
function enterTravelMode() { enterMode(selectionModes.travel); }
function enterBuildMode() { enterMode(selectionModes.build); }
function enterSplitMode() { enterMode(selectionModes.split); }
function enterPlacesMode() { enterMode(selectionModes.places); }
travelBut.addEventListener('click', enterTravelMode);
buildBut.addEventListener('click', enterBuildMode);
splitBut.addEventListener('click', enterSplitMode);
placesBut.addEventListener('click', enterPlacesMode);

splitInputWidget.addEventListener('input', function changeSplitPortion() {
  splitPanelPortion.textContent = '' + splitInputWidget.value;
  splitPanelSetMoveStay();
});

// Update the number of people who move and stay in the split panel UI.
function splitPanelSetMoveStay() {
  var humanityTile = humanity(currentTile);
  var move = ((humanityTile.h * splitInputWidget.value / 100)|0);
  var stay = humanityTile.h - move;
  splitPanelPortionMove.textContent = '' + move;
  splitPanelPortionStay.textContent = '' + stay;
}


// Keyboard events.

var buildHotKeys = {
  48: tileTypes.airport,    // "0"
  49: tileTypes.wall,       // "1"
  50: tileTypes.road,       // "2"
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
    gs.hexSize *= 2;
    gs.origin.x0 = gs.origin.x0 * 2 + (gs.width / 2)|0;
    gs.origin.y0 = gs.origin.y0 * 2 + (gs.height / 2)|0;
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109 || event.keyCode === 219
          || event.keyCode === 169) {   // -
    // Unzoom.
    if (gs.hexSize > 2) {
      gs.hexSize = gs.hexSize / 2;
      gs.origin.x0 = (gs.origin.x0 / 2 - gs.width / 4)|0;
      gs.origin.y0 = (gs.origin.y0 / 2 - gs.height / 4)|0;
      voidCache = true;
      redraw = true;
    }
  } else if (event.keyCode === 84) {    // T
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 67) {    // C
    enterMode(selectionModes.build);
  } else if (event.keyCode === 70) {    // F
    enterMode(selectionModes.split);
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


function mouseSelection(event) {
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  var posTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        gs.origin, gs.hexSize);

  if ((selectionMode === selectionModes.travel
    || selectionMode === selectionModes.split)
    && currentTile !== undefined && humanity(currentTile) !== undefined) {
    var humanityTile = humanity(currentTile);
    var numberOfPeople = humanityTile.h;
    if (selectionMode === selectionModes.split) {
      numberOfPeople = (numberOfPeople * splitInputWidget.value / 100)|0;
    }
    // Send travel information.
    var startTile = posTile;
    if (humanTravelTo(currentTile, startTile).length > 1
        && humanityTile.c === playerCamp) {
      if (humanityTile.f > 0) {
        sendMove(currentTile, startTile, numberOfPeople);
      } else {
        var starveMessage = {};
        starveMessage[keyFromTile(currentTile)] = humanityTile;
        addStarveMessages(starveMessage);
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
  if (currentTile &&
      (selectionMode === selectionModes.travel ||
       selectionMode === selectionModes.split)) {
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
  } else if (event.button === 2) {
    enterTravelMode();
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

