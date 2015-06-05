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
  hospital:     24,
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

  pigments:     34,
  salt:         35,
  cattle:       36,
  poultry:      37,

  ivory:        38,
  granite:      39,
  wool:         40,
  wine:         41,

  fur:          42,
  glass:        43,
  rubber:       44,
  marble:       45,

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

  ruby:         58,
  gems:         59,
  pelt:         60,
  amber:        61
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 24,
    26 ];

var resourceTypes = {
  stock:      -1,
  production: -2,
  wealth:     -3
};
var listOfResourceTypes = [
  resourceTypes.stock,
  resourceTypes.production,
  resourceTypes.wealth
];

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
var normalWater = distances[tileTypes.water];
var normalSwamp = distances[tileTypes.swamp];

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
    [[3, tileTypes.residence], [2, tileTypes.road]],
    [[1, tileTypes.residence], [1, tileTypes.water], [1, resourceTypes.stock]],
    [[2, tileTypes.road]],
    [[1, tileTypes.gunsmith], [3, tileTypes.airland], [1, resourceTypes.stock]],
    [[1, tileTypes.skyscraper], [1, tileTypes.factory]],
    ,
    ,
    ,
    ,
    [[1, tileTypes.residence]],
    [[1, resourceTypes.stock], [1, tileTypes.factory]],
    [[10, resourceTypes.wealth], [1, tileTypes.mine], [5, tileTypes.road]],
    ,
    [[1, resourceTypes.production], [20, resourceTypes.wealth], [2, tileTypes.wall]],
    ,
    [[1, tileTypes.gunsmith], [1, resourceTypes.production]]
];

// What the current tile must hold to allow a building to be constructed.
var buildingTileDependency = [,,,,,,,, ,,,,,,,,,,,,
    [tileTypes.forest, tileTypes.taiga],         // Stock [20]
    [tileTypes.metal],,,
    [tileTypes.citrus],
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
  distances: distances,

  distance: function distance(tpos) {
    var t = this.tile(tpos);
    var h = this.humanity.tile(tpos);
    var d = distances[(h && h.b)? h.b: t.type];
    if (d === undefined) { d = distances[t.type]; }
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
    if ((human.o & manufacture.plane) !== 0) {
      return 32;
    } else if ((human.o & manufacture.car) !== 0) {
      return 16;
    } else { return 8; }
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
    if ((h.o & manufacture.boat) !== 0) {
      this.distances[tileTypes.water] = 1;
      this.distances[tileTypes.swamp] = 1;
    } else if ((h.o & manufacture.plane) !== 0) {
      this.distances[tileTypes.water] = 2;
      this.distances[tileTypes.swamp] = 2;
    }
  },
  unsetDistancesForHuman: function unsetDistancesForHuman(h) {
    this.distances[tileTypes.water] = normalWater;
    this.distances[tileTypes.swamp] = normalSwamp;
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
  // resources = {stock, usedStock, production, usedProduction, wealth,
  // usedWealth}
  // is the resources available for use in the current camp.
  validConstruction: function validConstruction(building, tile, resources) {
    if (building == null) { return true; }   // Destruction is always valid.
    var humanityTile = this.humanity.tile(tile);
    var tileInfo = this.tile(tile);
    var spareStock = resources.stock - resources.usedStock;
    var spareProduction = resources.production - resources.usedProduction;
    var spareFarm = resources.wealth - resources.usedWealth;
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
            if (requiredDependencies[j][1] === resourceTypes.stock
                && spareStock < requiredDependencies[j][0]) {
              return false;
            } else if (requiredDependencies[j][1] === resourceTypes.production
                && spareProduction < requiredDependencies[j][0]) {
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
var terrain = new Terrain();

onmessage = function workerRecv(e) {
  if (e.data.centerTile) { terrain.setCenterTile(e.data.centerTile); return; }
  if (e.data.type === 'raw') {
    paintTilesRaw(e.data.image, e.data.size, e.data.origin);
  } else if (e.data.type === 'rainfall') {
    paintRainfall(e.data.image, e.data.size, e.data.origin);
  }
  postMessage({image:e.data.image,size:e.data.size,origin:e.data.origin});
};

// Rendering primitives.


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

// From 'size:x:y' to cached terrain, centered on the map origin.
var cachedTerrainPaint = {};

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTilesRaw(imgdata, size, origin) {
  var width = imgdata.width;
  var height = imgdata.height;
  var arraySize = width * height * 4;
  var pos = size + ':' + origin.x0 + ':' + origin.y0;
  if (cachedTerrainPaint[pos] === undefined) {
    var data = new Uint8ClampedArray(arraySize);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var t = terrain.tile({
          x: (x + origin.x0)/size,
          y: (y + origin.y0)/size
        });
        var color = [0,0,0];
        var fromRed = 0, toRed = 0, fromGreen = 0, toGreen = 0;
        var heightMin = -1, heightMax = 1;
        if (t.steepness == tileTypes.water) {
          color[2] = 180;
          fromRed = 0;
          fromGreen = 0;
          toRed = 80;
          toGreen = 80;
          heightMin = -2;
          heightMax = -1.5;
        } else if (t.steepness == tileTypes.steppe) {
          fromRed = 10;
          fromGreen = 190;
          toRed = 85;
          toGreen = 170;
          heightMin = -1.5;
          heightMax = -0.2;
        } else if (t.steepness == tileTypes.hill) {
          fromRed = 100;
          fromGreen = 160;
          toRed = 150;
          toGreen = 110;
          heightMin = -0.2;
          heightMax = 0.2;
        } else {
          fromRed = 150;
          fromGreen = 100;
          toRed = 40;
          toGreen = 10;
          heightMin = 0.2;
          heightMax = 1;
        }
        if (t.type == tileTypes.forest) {
          fromRed = 20;
          fromGreen = 100;
          toRed = 50;
          toGreen = 100;
        }
        var grey = (t.height - heightMin) / (heightMax - heightMin);
        var inverseGrey = 1 - grey;
        color[0] = grey * toRed + (1 - grey) * fromRed;
        color[1] = grey * toGreen + (1 - grey) * fromGreen;
        // Rainfall
        var rain = Math.min(Math.abs(color[0] - color[1]) / 2 * t.rain, 255);
        color[1] -= rain; // darker green
        color[2] -= Math.min(t.rain * 20, 255);   // darker blue
        // Vegetation
        if (t.vegetation) {
          color[0] -= 50;
          color[1] -= 25;
          color[2] -= 50;
        }
        var position = (x + y * width) * 4;
        data[position + 0] = color[0];
        data[position + 1] = color[1];
        data[position + 2] = color[2];
        data[position + 3] = 255;
      }
    }
    cachedTerrainPaint[pos] = data;
  }
  // Set the contents of imgdata.data.
  imgdata.data.set(cachedTerrainPaint[pos]);
}

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintRainfall(imgdata, size, origin) {
  var width = imgdata.width;
  var height = imgdata.height;
  var arraySize = width * height * 4;
  var data = new Uint8ClampedArray(arraySize);
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tile = tileFromPixel({ x: x , y: y }, origin, size);
      var t = terrain.tile(tile);
      var grey = (1 - t.rain) / 2;
      var greyMin = 10;
      var greySpan = 157;
      var halfGreySpan = (greySpan / 2)|0;
      grey = (grey * greySpan + greyMin)|0;
      var red = grey;
      var green = grey;
      if (t.type === tileTypes.water) {
      } else {
        var delta = (Math.abs(grey - halfGreySpan))|0;
        if (grey < halfGreySpan) { red -= delta; green += delta; }
        else if (grey > halfGreySpan) { red += 2*delta; green += delta; }
      }
      var position = (x + y * width) * 4;
      data[position + 0] = red;
      data[position + 1] = green;
      data[position + 2] = grey;
      data[position + 3] = 60;
    }
  }
  imgdata.data.set(data);
}
