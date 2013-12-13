function tileType(e,t){return t?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var t=e.q,i=e.r;if(null!=memoizedTiles[t]&&null!=memoizedTiles[t][i])return memoizedTiles[t][i];var r=5*simplex2.noise2D(i/500,t/500),s=1-Math.abs((4*simplex1.noise2D(t/4/factor,i/4/factor)+2*simplex1.noise2D(t/2/factor,i/2/factor)+1*simplex1.noise2D(t/1/factor,i/1/factor)+.5*simplex1.noise2D(2*t/factor,2*i/factor))/7.5),n=Math.sin(-r*Math.abs(simplex1.noise2D(.25*t/factor,.25*i/factor))+simplex1.noise2D(t/factor,i/factor)-.5*simplex1.noise2D(2*t/factor,2*i/factor)+.25*simplex1.noise2D(4*t/factor,4*i/factor)-1/8*simplex1.noise2D(8*t/factor,8*i/factor)+1/16*simplex1.noise2D(16*t/factor,16*i/factor)),a=-simplex2.noise2D(i/factor/8,t/factor/8)+simplex2.noise2D(i/factor/4,t/factor/4)+n/2,o=r/5*simplex2.noise2D(t/factor,i/factor)+.5*simplex2.noise2D(2*t/factor,2*i/factor)+.25*simplex2.noise2D(4*t/factor,4*i/factor)+1/8*simplex2.noise2D(8*t/factor,8*i/factor)+1/16*simplex2.noise2D(16*t/factor,16*i/factor),l=s-(n>0?n/42:0)>.98||-.7>a?tileTypes.water:.1>n-s/2?tileTypes.steppe:.2>n-s?tileTypes.hill:tileTypes.mountain,p=o-(l===tileTypes.water?2*a:0)+Math.abs(n+.15)<0,m={steepness:l,vegetation:p,type:tileType(l,p),rain:-o/2};return null==memoizedTiles[t]&&(memoizedTiles[t]=[]),memoizedTiles[t][i]=m,m}function distance(e){var t=terrain(e),i=humanity(e),r=distances[i&&i.b?i.b:t.type];return void 0===r&&(r=distances[t.type]),r}function neighborFromTile(e,t){return 0===t?{q:e.q+1,r:e.r}:1===t?{q:e.q+1,r:e.r-1}:2===t?{q:e.q,r:e.r-1}:3===t?{q:e.q-1,r:e.r}:4===t?{q:e.q-1,r:e.r+1}:5===t?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var t=e.split(":");return{q:+t[0],r:+t[1]}}function travelFrom(e,t){var i=humanity(e).c,r={},s=keyFromTile(e),n={};n[s]=0;var a=[];for(a.push(s);a.length>0;){s=a.shift(),r[s]=!0;var o=humanity(tileFromKey(s));if(!o||null==o.c||o.c===i)for(var l=0;6>l;l++){var p=neighborFromTile(tileFromKey(s),l),m=n[s]+distance(p);if(t>=m){var h=keyFromTile(p);if(void 0!==n[h]&&m<n[h]&&delete n[h],void 0===n[h]&&void 0===r[h]){n[h]=m;for(var f=-1,u=0;u<a.length;u++)if(void 0!==n[a[u]]){if(n[h]<=n[a[u]]){f=u;break}}else a.splice(u,1),u--;-1===f?a.push(h):a.splice(f,0,h)}}}}return r}function travelTo(e,t,i){var r=humanity(e).c,s=keyFromTile(t),n={},a={},o={},l=[],p={},m=keyFromTile(e);for(a[m]=0,l.push(m);l.length>0&&s!==m;){m=l.shift(),n[m]=!0;var h=humanity(tileFromKey(m));if(!h||null==h.c||h.c===r)for(var f=0;6>f;f++){var u=neighborFromTile(tileFromKey(m),f),c=a[m]+distance(u);if(i>=c){var d=keyFromTile(u);if(void 0!==a[d]&&c<a[d]&&delete a[d],void 0===a[d]&&void 0===n[d]){a[d]=c,o[d]=c+(Math.abs(t.q-u.q)+Math.abs(t.r-u.r)+Math.abs(t.q+t.r-u.q-u.r))/2;for(var y=-1,T=0;T<l.length;T++)if(void 0!==o[l[T]]){if(o[d]<=o[l[T]]){y=T;break}}else l.splice(T,1),T--;-1===y?l.push(d):l.splice(y,0,d),p[d]=m}}}}var v=[];if(s!==m)return v;for(;void 0!==p[s];)v.push(s),s=p[s];return v.push(keyFromTile(e)),v.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravel(e){var t=humanity(e);if(!t||t.h<=0)return{};setDistancesForHuman(t);var i=travelFrom(e,speedFromHuman(t));return unsetDistancesForHuman(t),i}function humanTravelTo(e,t){var i=humanity(e);if(!i||i.h<=0)return[];setDistancesForHuman(i);var r=travelTo(e,t,speedFromHuman(i));return unsetDistancesForHuman(i),r}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,t){if(null===e)return!0;var i=humanity(t),r=terrain(t);if(!i||i.h<=0)return!1;if(r.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingDependencies[e]){for(var s=buildingDependencies[e],n=new Array(s.length),a=0;a<n.length;a++)n[a]=0;for(var a=0;6>a;a++)for(var o=neighborFromTile(t,a),l=humanity(o),p=terrain(o),m=0;m<s.length;m++)(l&&l.b===s[m][1]||p.type===s[m][1])&&n[m]++;for(var m=0;m<n.length;m++)if(n[m]<s[m][0])return!1;return e===tileTypes.lumber&&r.type!==tileTypes.forest?!1:!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var t in plans)e(plans[t])}function clearPlans(){plans={}}function intPointFromReal(e){var t=e.q,i=e.r,r=-t-i,s=Math.round(t),n=Math.round(r),a=Math.round(i),o=Math.abs(s-t),l=Math.abs(n-r),p=Math.abs(a-i);return o>l&&o>p?s=-n-a:l>p?n=-s-a:a=-s-n,{q:s,r:a}}function tileFromPixel(e,t,i){var r=e.x+t.x0,s=e.y+t.y0;return intPointFromReal({q:(Math.sqrt(3)*r-s)/3/i,r:2*s/3/i})}function paintTilesRaw(e,t,i){for(var r=e.width,s=e.height,n=e.data,a=0;s>a;a++)for(var o=0;r>o;o++){var l=tileFromPixel({x:o,y:a},i,t),p=terrain(l),m=[180,0,0];p.steepness==tileTypes.water?m=[50,50,180]:p.steepness==tileTypes.steppe?m=[0,180,0]:p.steepness==tileTypes.hill&&(m=[180,100,0]);var h=Math.min(Math.abs(m[0]-m[1])/2*p.rain,255);m[0]-=h,m[1]-=h,m[2]-=Math.min(50*p.rain,255),p.vegetation&&(m[0]-=100,m[1]-=50,m[2]-=100);var f=4*(o+a*r);n[f+0]=m[0],n[f+1]=m[1],n[f+2]=m[2],n[f+3]=255}}!function(){function e(e){e||(e=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;256>t;t++)this.p[t]=256*e();for(t=0;512>t;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}var t=.5*(Math.sqrt(3)-1),i=(3-Math.sqrt(3))/6,r=1/3,s=1/6,n=(Math.sqrt(5)-1)/4,a=(5-Math.sqrt(5))/20;e.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(e,r){var s,n,a=this.permMod12,o=this.perm,l=this.grad3,p=0,m=0,h=0,f=(e+r)*t,u=Math.floor(e+f),c=Math.floor(r+f),d=(u+c)*i,y=u-d,T=c-d,v=e-y,g=r-T;v>g?(s=1,n=0):(s=0,n=1);var M=v-s+i,w=g-n+i,F=v-1+2*i,b=g-1+2*i,x=255&u,D=255&c,q=.5-v*v-g*g;if(q>=0){var _=3*a[x+o[D]];q*=q,p=q*q*(l[_]*v+l[_+1]*g)}var N=.5-M*M-w*w;if(N>=0){var A=3*a[x+s+o[D+n]];N*=N,m=N*N*(l[A]*M+l[A+1]*w)}var S=.5-F*F-b*b;if(S>=0){var P=3*a[x+1+o[D+1]];S*=S,h=S*S*(l[P]*F+l[P+1]*b)}return 70*(p+m+h)},noise3D:function(e,t,i){var n,a,o,l,p,m,h,f,u,c,d=this.permMod12,y=this.perm,T=this.grad3,v=(e+t+i)*r,g=Math.floor(e+v),M=Math.floor(t+v),w=Math.floor(i+v),F=(g+M+w)*s,b=g-F,x=M-F,D=w-F,q=e-b,_=t-x,N=i-D;q>=_?_>=N?(p=1,m=0,h=0,f=1,u=1,c=0):q>=N?(p=1,m=0,h=0,f=1,u=0,c=1):(p=0,m=0,h=1,f=1,u=0,c=1):N>_?(p=0,m=0,h=1,f=0,u=1,c=1):N>q?(p=0,m=1,h=0,f=0,u=1,c=1):(p=0,m=1,h=0,f=1,u=1,c=0);var A=q-p+s,S=_-m+s,P=N-h+s,k=q-f+2*s,R=_-u+2*s,K=N-c+2*s,H=q-1+3*s,z=_-1+3*s,E=N-1+3*s,U=255&g,V=255&M,W=255&w,L=.6-q*q-_*_-N*N;if(0>L)n=0;else{var O=3*d[U+y[V+y[W]]];L*=L,n=L*L*(T[O]*q+T[O+1]*_+T[O+2]*N)}var I=.6-A*A-S*S-P*P;if(0>I)a=0;else{var X=3*d[U+p+y[V+m+y[W+h]]];I*=I,a=I*I*(T[X]*A+T[X+1]*S+T[X+2]*P)}var C=.6-k*k-R*R-K*K;if(0>C)o=0;else{var j=3*d[U+f+y[V+u+y[W+c]]];C*=C,o=C*C*(T[j]*k+T[j+1]*R+T[j+2]*K)}var B=.6-H*H-z*z-E*E;if(0>B)l=0;else{var G=3*d[U+1+y[V+1+y[W+1]]];B*=B,l=B*B*(T[G]*H+T[G+1]*z+T[G+2]*E)}return 32*(n+a+o+l)},noise4D:function(e,t,i,r){var s,o,l,p,m,h=(this.permMod12,this.perm),f=this.grad4,u=(e+t+i+r)*n,c=Math.floor(e+u),d=Math.floor(t+u),y=Math.floor(i+u),T=Math.floor(r+u),v=(c+d+y+T)*a,g=c-v,M=d-v,w=y-v,F=T-v,b=e-g,x=t-M,D=i-w,q=r-F,_=0,N=0,A=0,S=0;b>x?_++:N++,b>D?_++:A++,b>q?_++:S++,x>D?N++:A++,x>q?N++:S++,D>q?A++:S++;var P,k,R,K,H,z,E,U,V,W,L,O;P=_>=3?1:0,k=N>=3?1:0,R=A>=3?1:0,K=S>=3?1:0,H=_>=2?1:0,z=N>=2?1:0,E=A>=2?1:0,U=S>=2?1:0,V=_>=1?1:0,W=N>=1?1:0,L=A>=1?1:0,O=S>=1?1:0;var I=b-P+a,X=x-k+a,C=D-R+a,j=q-K+a,B=b-H+2*a,G=x-z+2*a,J=D-E+2*a,Q=q-U+2*a,Y=b-V+3*a,Z=x-W+3*a,$=D-L+3*a,et=q-O+3*a,tt=b-1+4*a,it=x-1+4*a,rt=D-1+4*a,st=q-1+4*a,nt=255&c,at=255&d,ot=255&y,lt=255&T,pt=.6-b*b-x*x-D*D-q*q;if(0>pt)s=0;else{var mt=h[nt+h[at+h[ot+h[lt]]]]%32*4;pt*=pt,s=pt*pt*(f[mt]*b+f[mt+1]*x+f[mt+2]*D+f[mt+3]*q)}var ht=.6-I*I-X*X-C*C-j*j;if(0>ht)o=0;else{var ft=h[nt+P+h[at+k+h[ot+R+h[lt+K]]]]%32*4;ht*=ht,o=ht*ht*(f[ft]*I+f[ft+1]*X+f[ft+2]*C+f[ft+3]*j)}var ut=.6-B*B-G*G-J*J-Q*Q;if(0>ut)l=0;else{var ct=h[nt+H+h[at+z+h[ot+E+h[lt+U]]]]%32*4;ut*=ut,l=ut*ut*(f[ct]*B+f[ct+1]*G+f[ct+2]*J+f[ct+3]*Q)}var dt=.6-Y*Y-Z*Z-$*$-et*et;if(0>dt)p=0;else{var yt=h[nt+V+h[at+W+h[ot+L+h[lt+O]]]]%32*4;dt*=dt,p=dt*dt*(f[yt]*Y+f[yt+1]*Z+f[yt+2]*$+f[yt+3]*et)}var Tt=.6-tt*tt-it*it-rt*rt-st*st;if(0>Tt)m=0;else{var vt=h[nt+1+h[at+1+h[ot+1+h[lt+1]]]]%32*4;Tt*=Tt,m=Tt*Tt*(f[vt]*tt+f[vt+1]*it+f[vt+2]*rt+f[vt+3]*st)}return 27*(s+o+l+p+m)}},"undefined"!=typeof define&&define.amd&&define(function(){return e}),"undefined"!=typeof exports?exports.SimplexNoise=e:"undefined"!=typeof navigator&&(this.SimplexNoise=e),"undefined"!=typeof module&&(module.exports=e)}();var MersenneTwister=function(e){void 0==e&&(e=(new Date).getTime()),this.N=624,this.M=397,this.MATRIX_A=2567483615,this.UPPER_MASK=2147483648,this.LOWER_MASK=2147483647,this.mt=new Array(this.N),this.mti=this.N+1,this.init_genrand(e)};MersenneTwister.prototype.init_genrand=function(e){for(this.mt[0]=e>>>0,this.mti=1;this.mti<this.N;this.mti++){var e=this.mt[this.mti-1]^this.mt[this.mti-1]>>>30;this.mt[this.mti]=(1812433253*((4294901760&e)>>>16)<<16)+1812433253*(65535&e)+this.mti,this.mt[this.mti]>>>=0}},MersenneTwister.prototype.init_by_array=function(e,t){var i,r,s;for(this.init_genrand(19650218),i=1,r=0,s=this.N>t?this.N:t;s;s--){var n=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1664525*((4294901760&n)>>>16)<<16)+1664525*(65535&n))+e[r]+r,this.mt[i]>>>=0,i++,r++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1),r>=t&&(r=0)}for(s=this.N-1;s;s--){var n=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1566083941*((4294901760&n)>>>16)<<16)+1566083941*(65535&n))-i,this.mt[i]>>>=0,i++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1)}this.mt[0]=2147483648},MersenneTwister.prototype.genrand_int32=function(){var e,t=new Array(0,this.MATRIX_A);if(this.mti>=this.N){var i;for(this.mti==this.N+1&&this.init_genrand(5489),i=0;i<this.N-this.M;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+this.M]^e>>>1^t[1&e];for(;i<this.N-1;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+(this.M-this.N)]^e>>>1^t[1&e];e=this.mt[this.N-1]&this.UPPER_MASK|this.mt[0]&this.LOWER_MASK,this.mt[this.N-1]=this.mt[this.M-1]^e>>>1^t[1&e],this.mti=0}return e=this.mt[this.mti++],e^=e>>>11,e^=e<<7&2636928640,e^=e<<15&4022730752,e^=e>>>18,e>>>0},MersenneTwister.prototype.genrand_int31=function(){return this.genrand_int32()>>>1},MersenneTwister.prototype.genrand_real1=function(){return this.genrand_int32()*(1/4294967295)},MersenneTwister.prototype.random=function(){return this.genrand_int32()*(1/4294967296)},MersenneTwister.prototype.genrand_real3=function(){return(this.genrand_int32()+.5)*(1/4294967296)},MersenneTwister.prototype.genrand_res53=function(){var e=this.genrand_int32()>>>5,t=this.genrand_int32()>>>6;return(67108864*e+t)*(1/9007199254740992)};var prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20],tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var memoizedTiles=[],distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={car:1,plane:2,boat:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[2,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,[[1,tileTypes.road]],,,[[1,tileTypes.residence]]],planTypes={move:1,build:2},plans={};onmessage=function(e){paintTilesRaw(e.data.image,e.data.size,e.data.origin),postMessage(e.data.image)};