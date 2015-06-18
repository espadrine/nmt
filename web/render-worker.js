function tileType(e,t){return t?tileVegetationTypeFromSteepness[e]:e}function heatmap(e,t,i,r,s){for(var n=0,a=0,o=0;s>o;o++){var l=Math.pow(2,o);n+=i.noise2D(e/r*l,t/r*l)/l,a+=1/l}return n/a}function Terrain(e){this.humanity=e,this.plans={}}function intPointFromReal(e){var t=e.q,i=e.r,r=-t-i,s=Math.round(t),n=Math.round(r),a=Math.round(i),o=Math.abs(s-t),l=Math.abs(n-r),p=Math.abs(a-i);return o>l&&o>p?s=-n-a:l>p?n=-s-a:a=-s-n,{q:s,r:a}}function tileFromPixel(e,t,i){var r=e.x+t.x0,s=e.y+t.y0;return intPointFromReal({q:(Math.sqrt(3)*r-s)/3/i,r:2*s/3/i})}function paintTilesRaw(e,t,i){var r=e.width,s=e.height,n=r*s*4,a=t+":"+i.x0+":"+i.y0;if(void 0===cachedTerrainPaint[a]){for(var o=new Uint8ClampedArray(n),l=0;s>l;l++)for(var p=!1,h=0;r>h;h++){var u=terrain.tile({x:(h+i.x0)/t,y:(l+i.y0)/t}),c=[0,0,0],m=0,f=0,y=0,d=0,T=-1,v=1;u.steepness===tileTypes.water?(c[2]=180,m=0,y=0,f=80,d=80,T=-2,v=-1.5):u.steepness===tileTypes.steppe?(m=100,y=160,f=85,d=140,T=-1.5,v=-.2,p&&(m=170,y=170,f=170,d=170)):u.steepness===tileTypes.hill?(m=100,y=140,f=150,d=110,T=-.2,v=.2):(m=150,y=100,f=40,d=10,T=.2,v=1),p=u.steepness===tileTypes.water,u.type===tileTypes.forest&&(m=20,y=100,f=50,d=100);var g=(u.height-T)/(v-T);c[0]=g*f+(1-g)*m,c[1]=g*d+(1-g)*y;var M=Math.min(Math.abs(c[0]-c[1])/2*u.rain,255);c[1]-=M,c[2]-=Math.min(20*u.rain,255),u.vegetation&&(c[0]-=50,c[1]-=25,c[2]-=50);var w=4*(h+l*r);o[w+0]=c[0],o[w+1]=c[1],o[w+2]=c[2],o[w+3]=255}cachedTerrainPaint[a]=o}e.data.set(cachedTerrainPaint[a])}function paintRainfall(e,t,i){for(var r=e.width,s=e.height,n=r*s*4,a=new Uint8ClampedArray(n),o=0;s>o;o++)for(var l=0;r>l;l++){var p=tileFromPixel({x:l,y:o},i,t),h=terrain.tile(p),u=(1-h.rain)/2,c=10,m=157,f=m/2|0;u=u*m+c|0;var y=u,d=u;if(h.type===tileTypes.water);else{var T=0|Math.abs(u-f);f>u?(y-=T,d+=T):u>f&&(y+=2*T,d+=T)}var v=4*(l+o*r);a[v+0]=y,a[v+1]=d,a[v+2]=u,a[v+3]=60}e.data.set(a)}!function(){function e(e){e||(e=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;256>t;t++)this.p[t]=256*e();for(t=0;512>t;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}var t=.5*(Math.sqrt(3)-1),i=(3-Math.sqrt(3))/6,r=1/3,s=1/6,n=(Math.sqrt(5)-1)/4,a=(5-Math.sqrt(5))/20;e.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(e,r){var s,n,a=this.permMod12,o=this.perm,l=this.grad3,p=0,h=0,u=0,c=(e+r)*t,m=Math.floor(e+c),f=Math.floor(r+c),y=(m+f)*i,d=m-y,T=f-y,v=e-d,g=r-T;v>g?(s=1,n=0):(s=0,n=1);var M=v-s+i,w=g-n+i,b=v-1+2*i,x=g-1+2*i,D=255&m,F=255&f,q=.5-v*v-g*g;if(q>=0){var P=3*a[D+o[F]];q*=q,p=q*q*(l[P]*v+l[P+1]*g)}var _=.5-M*M-w*w;if(_>=0){var k=3*a[D+s+o[F+n]];_*=_,h=_*_*(l[k]*M+l[k+1]*w)}var A=.5-b*b-x*x;if(A>=0){var N=3*a[D+1+o[F+1]];A*=A,u=A*A*(l[N]*b+l[N+1]*x)}return 70*(p+h+u)},noise3D:function(e,t,i){var n,a,o,l,p,h,u,c,m,f,y=this.permMod12,d=this.perm,T=this.grad3,v=(e+t+i)*r,g=Math.floor(e+v),M=Math.floor(t+v),w=Math.floor(i+v),b=(g+M+w)*s,x=g-b,D=M-b,F=w-b,q=e-x,P=t-D,_=i-F;q>=P?P>=_?(p=1,h=0,u=0,c=1,m=1,f=0):q>=_?(p=1,h=0,u=0,c=1,m=0,f=1):(p=0,h=0,u=1,c=1,m=0,f=1):_>P?(p=0,h=0,u=1,c=0,m=1,f=1):_>q?(p=0,h=1,u=0,c=0,m=1,f=1):(p=0,h=1,u=0,c=1,m=1,f=0);var k=q-p+s,A=P-h+s,N=_-u+s,S=q-c+2*s,R=P-m+2*s,K=_-f+2*s,H=q-1+3*s,U=P-1+3*s,E=_-1+3*s,L=255&g,O=255&M,W=255&w,V=.6-q*q-P*P-_*_;if(0>V)n=0;else{var C=3*y[L+d[O+d[W]]];V*=V,n=V*V*(T[C]*q+T[C+1]*P+T[C+2]*_)}var z=.6-k*k-A*A-N*N;if(0>z)a=0;else{var I=3*y[L+p+d[O+h+d[W+u]]];z*=z,a=z*z*(T[I]*k+T[I+1]*A+T[I+2]*N)}var X=.6-S*S-R*R-K*K;if(0>X)o=0;else{var B=3*y[L+c+d[O+m+d[W+f]]];X*=X,o=X*X*(T[B]*S+T[B+1]*R+T[B+2]*K)}var j=.6-H*H-U*U-E*E;if(0>j)l=0;else{var G=3*y[L+1+d[O+1+d[W+1]]];j*=j,l=j*j*(T[G]*H+T[G+1]*U+T[G+2]*E)}return 32*(n+a+o+l)},noise4D:function(e,t,i,r){var s,o,l,p,h,u=(this.permMod12,this.perm),c=this.grad4,m=(e+t+i+r)*n,f=Math.floor(e+m),y=Math.floor(t+m),d=Math.floor(i+m),T=Math.floor(r+m),v=(f+y+d+T)*a,g=f-v,M=y-v,w=d-v,b=T-v,x=e-g,D=t-M,F=i-w,q=r-b,P=0,_=0,k=0,A=0;x>D?P++:_++,x>F?P++:k++,x>q?P++:A++,D>F?_++:k++,D>q?_++:A++,F>q?k++:A++;var N,S,R,K,H,U,E,L,O,W,V,C;N=P>=3?1:0,S=_>=3?1:0,R=k>=3?1:0,K=A>=3?1:0,H=P>=2?1:0,U=_>=2?1:0,E=k>=2?1:0,L=A>=2?1:0,O=P>=1?1:0,W=_>=1?1:0,V=k>=1?1:0,C=A>=1?1:0;var z=x-N+a,I=D-S+a,X=F-R+a,B=q-K+a,j=x-H+2*a,G=D-U+2*a,J=F-E+2*a,Q=q-L+2*a,Y=x-O+3*a,Z=D-W+3*a,$=F-V+3*a,et=q-C+3*a,tt=x-1+4*a,it=D-1+4*a,rt=F-1+4*a,st=q-1+4*a,nt=255&f,at=255&y,ot=255&d,lt=255&T,pt=.6-x*x-D*D-F*F-q*q;if(0>pt)s=0;else{var ht=u[nt+u[at+u[ot+u[lt]]]]%32*4;pt*=pt,s=pt*pt*(c[ht]*x+c[ht+1]*D+c[ht+2]*F+c[ht+3]*q)}var ut=.6-z*z-I*I-X*X-B*B;if(0>ut)o=0;else{var ct=u[nt+N+u[at+S+u[ot+R+u[lt+K]]]]%32*4;ut*=ut,o=ut*ut*(c[ct]*z+c[ct+1]*I+c[ct+2]*X+c[ct+3]*B)}var mt=.6-j*j-G*G-J*J-Q*Q;if(0>mt)l=0;else{var ft=u[nt+H+u[at+U+u[ot+E+u[lt+L]]]]%32*4;mt*=mt,l=mt*mt*(c[ft]*j+c[ft+1]*G+c[ft+2]*J+c[ft+3]*Q)}var yt=.6-Y*Y-Z*Z-$*$-et*et;if(0>yt)p=0;else{var dt=u[nt+O+u[at+W+u[ot+V+u[lt+C]]]]%32*4;yt*=yt,p=yt*yt*(c[dt]*Y+c[dt+1]*Z+c[dt+2]*$+c[dt+3]*et)}var Tt=.6-tt*tt-it*it-rt*rt-st*st;if(0>Tt)h=0;else{var vt=u[nt+1+u[at+1+u[ot+1+u[lt+1]]]]%32*4;Tt*=Tt,h=Tt*Tt*(c[vt]*tt+c[vt+1]*it+c[vt+2]*rt+c[vt+3]*st)}return 27*(s+o+l+p+h)}},"undefined"!=typeof define&&define.amd&&define(function(){return e}),"undefined"!=typeof exports?exports.SimplexNoise=e:"undefined"!=typeof navigator&&(this.SimplexNoise=e),"undefined"!=typeof module&&(module.exports=e)}();var MersenneTwister=function(e){void 0==e&&(e=(new Date).getTime()),this.N=624,this.M=397,this.MATRIX_A=2567483615,this.UPPER_MASK=2147483648,this.LOWER_MASK=2147483647,this.mt=new Array(this.N),this.mti=this.N+1,this.init_genrand(e)};MersenneTwister.prototype.init_genrand=function(e){for(this.mt[0]=e>>>0,this.mti=1;this.mti<this.N;this.mti++){var e=this.mt[this.mti-1]^this.mt[this.mti-1]>>>30;this.mt[this.mti]=(1812433253*((4294901760&e)>>>16)<<16)+1812433253*(65535&e)+this.mti,this.mt[this.mti]>>>=0}},MersenneTwister.prototype.init_by_array=function(e,t){var i,r,s;for(this.init_genrand(19650218),i=1,r=0,s=this.N>t?this.N:t;s;s--){var n=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1664525*((4294901760&n)>>>16)<<16)+1664525*(65535&n))+e[r]+r,this.mt[i]>>>=0,i++,r++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1),r>=t&&(r=0)}for(s=this.N-1;s;s--){var n=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1566083941*((4294901760&n)>>>16)<<16)+1566083941*(65535&n))-i,this.mt[i]>>>=0,i++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1)}this.mt[0]=2147483648},MersenneTwister.prototype.genrand_int32=function(){var e,t=new Array(0,this.MATRIX_A);if(this.mti>=this.N){var i;for(this.mti==this.N+1&&this.init_genrand(5489),i=0;i<this.N-this.M;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+this.M]^e>>>1^t[1&e];for(;i<this.N-1;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+(this.M-this.N)]^e>>>1^t[1&e];e=this.mt[this.N-1]&this.UPPER_MASK|this.mt[0]&this.LOWER_MASK,this.mt[this.N-1]=this.mt[this.M-1]^e>>>1^t[1&e],this.mti=0}return e=this.mt[this.mti++],e^=e>>>11,e^=e<<7&2636928640,e^=e<<15&4022730752,e^=e>>>18,e>>>0},MersenneTwister.prototype.genrand_int31=function(){return this.genrand_int32()>>>1},MersenneTwister.prototype.genrand_real1=function(){return this.genrand_int32()*(1/4294967295)},MersenneTwister.prototype.random=function(){return this.genrand_int32()*(1/4294967296)},MersenneTwister.prototype.genrand_real3=function(){return(this.genrand_int32()+.5)*(1/4294967296)},MersenneTwister.prototype.genrand_res53=function(){var e=this.genrand_int32()>>>5,t=this.genrand_int32()>>>6;return(67108864*e+t)*(1/9007199254740992)};var prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20,mine:21,industry:22,citrus:23,hospital:24,beach:25,arsenal:26,smoke:27,impact:28,curvedRoad:29,whales:30,pearls:31,fish:32,algae:33,pigments:34,salt:35,cattle:36,poultry:37,ivory:38,granite:39,wool:40,wine:41,fur:42,glass:43,rubber:44,marble:45,crocodile:46,petroleum:47,shrimp:48,clay:49,spices:50,cotton:51,coffee:52,tea:53,resin:54,cocoa:55,honey:56,silk:57,ruby:58,gems:59,pelt:60,amber:61},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20,21,22,24,26],resourceTypes={stock:-1,production:-2,wealth:-3},listOfResourceTypes=[resourceTypes.stock,resourceTypes.production,resourceTypes.wealth],tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],MAX_INT=9007199254740992,manufacture={boat:1,car:2,plane:4,artillery:8,gun:16},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[2,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water],[1,resourceTypes.stock]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland],[1,resourceTypes.stock]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,,,,[[1,tileTypes.residence]],[[1,resourceTypes.stock],[1,tileTypes.factory]],[[10,resourceTypes.wealth],[1,tileTypes.mine],[5,tileTypes.road]],,[[1,resourceTypes.production],[20,resourceTypes.wealth],[2,tileTypes.wall]],,[[1,tileTypes.gunsmith],[1,resourceTypes.production]]],buildingTileDependency=[,,,,,,,,,,,,,,,,,,,,[tileTypes.forest,tileTypes.taiga],[tileTypes.metal],,,[tileTypes.citrus],[tileTypes.steppe]],planTypes={move:1,build:2};Terrain.prototype={humanity:null,centerTile:{q:0,r:0},centerPoint:{x:0,y:0},tileTypes:tileTypes,buildingTypes:buildingTypes,resourceTypes:resourceTypes,listOfResourceTypes:listOfResourceTypes,tileType:tileType,heatmap:heatmap,setCenterTile:function(e){this.centerTile=e,this.centerPoint.x=Math.sqrt(3)*(e.q+e.r/2)|0,this.centerPoint.y=1.5*e.r},continent:function(e,t){var i=512,r=heatmap(e,t,simplex1,i,8),s=this.centerPoint,n=(e-s.x)*(e-s.x)+(t-s.y)*(t-s.y),a=heatmap(e,t,simplex1,4*i,8),o=+(r+.7)*Math.exp(-n/(i*i));return a>o&&(o=a),o=Math.min(1,o)},continentLimit:.42,tile:function e(t){var i,r;void 0===t.x?(i=Math.sqrt(3)*(t.q+t.r/2)|0,r=1.5*t.r):(i=t.x,r=t.y);var s=simplex2.noise2D(r/500,i/500),n=1-Math.abs((4*simplex1.noise2D(i/4/factor,r/4/factor)+2*simplex1.noise2D(i/2/factor,r/2/factor)+1*simplex1.noise2D(i/1/factor,r/1/factor)+.5*simplex1.noise2D(2*i/factor,2*r/factor))/7.5),a=Math.sin(-(5*s)*Math.abs(simplex1.noise2D(.25*i/factor,.25*r/factor))+simplex1.noise2D(i/factor,r/factor)-.5*simplex1.noise2D(2*i/factor,2*r/factor)+.25*simplex1.noise2D(4*i/factor,4*r/factor)-1/8*simplex1.noise2D(8*i/factor,8*r/factor)+1/16*simplex1.noise2D(16*i/factor,16*r/factor)),o=-simplex2.noise2D(r/factor/8,i/factor/8)+simplex2.noise2D(r/factor/4,i/factor/4)+a/2,l=s*simplex2.noise2D(i/factor,r/factor)+.5*simplex2.noise2D(2*i/factor,2*r/factor)+.25*simplex2.noise2D(4*i/factor,4*r/factor)+1/8*simplex2.noise2D(8*i/factor,8*r/factor)+1/16*simplex2.noise2D(16*i/factor,16*r/factor),p=a-n,h=this.continent(i,r);if(h>this.continentLimit)var u,c=-1.3,m=(a>.6?!1:n>.98)||-1>3*o/4+a/4?(u=(-1.5-c)/(this.continentLimit-1),p=h*u+c-u,tileTypes.water):-1>l?tileTypes.hill:-.2>p?tileTypes.steppe:.2>p?tileTypes.hill:tileTypes.mountain,f=l-(m===tileTypes.water?2*o:0)+Math.abs(a+.15)<0;else{var m=tileTypes.water,f=!1,y=h-1.92;p=y}var e={steepness:m,vegetation:f,type:this.tileType(m,f),height:p,rain:-l/2};return e},commodity:function(e,t){var i,r=e.q,s=e.r,n=(-simplex1.noise2D(r/60,s/60)/8+1)/2,a=(simplex1.noise2D(r/60,s/60)/8+1)/2,o=(-simplex2.noise2D(r/60,s/60)/8+1)/2,l=(simplex2.noise2D(r/60,s/60)/8+1)/2,p=n*simplex1.noise2D(r/4,s/4),h=a*simplex1.noise2D(r/16,s/16),u=o*simplex2.noise2D(r/2,s/2),c=l*simplex2.noise2D(r/8,s/8);if(p>.49)i=0;else if(h>.49)i=1;else if(u>.45)i=2;else{if(!(c>.45))return-1;i=3}var m;return m=null!=t?t.type:this.tile(e).type,tileTypes.whales+(m<<2)+i},distances:distances,distance:function(e){var t=this.tile(e),i=this.humanity.tile(e),r=distances[i&&i.b?i.b:t.type];return void 0===r&&(r=distances[t.type]),r},distanceBetweenTiles:function(e,t){return(Math.abs(e.q-t.q)+Math.abs(e.r-t.r)+Math.abs(e.q+e.r-t.q-t.r))/2},neighborFromTile:function(e,t){return 0===t?{q:e.q+1,r:e.r}:1===t?{q:e.q+1,r:e.r-1}:2===t?{q:e.q,r:e.r-1}:3===t?{q:e.q-1,r:e.r}:4===t?{q:e.q-1,r:e.r+1}:5===t?{q:e.q,r:e.r+1}:void 0},keyFromTile:function(e){return e.q+":"+e.r},tileFromKey:function(e){var t=e.split(":");return{q:0|t[0],r:0|t[1]}},manufacture:manufacture,manufactureFromBuilding:function(e){return e===tileTypes.dock?manufacture.boat:e===tileTypes.factory?manufacture.car:e===tileTypes.airport?manufacture.plane:e===tileTypes.gunsmith?manufacture.gun:null},speedFromHuman:function(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8},travelFrom:function(e,t){var i=this.humanity.tile(e).c,r={},s=this.keyFromTile(e);r[s]=null;var n={};n[s]=0;var a=[];for(a.push(s);a.length>0;){s=a.shift();var o=this.humanity.tile(this.tileFromKey(s));if(!o||null==o.c||o.c===i)for(var l=0;6>l;l++){var p=this.neighborFromTile(this.tileFromKey(s),l),h=n[s]+this.distance(p);if(t>=h){var u=this.keyFromTile(p);if(void 0!==n[u]&&h<n[u]&&delete n[u],void 0===n[u]&&void 0===r[u]){n[u]=h,r[u]=s;for(var c=-1,m=0;m<a.length;m++)if(void 0!==n[a[m]]){if(n[u]<=n[a[m]]){c=m;break}}else a.splice(m,1),m--;-1===c?a.push(u):a.splice(c,0,u)}}}}return r},travelTo:function(e,t,i,r,s,n){null==s&&(s=MAX_INT),null==n&&(n=this.humanity.tile(e));var a=n.c,o=this.keyFromTile(t),l={},p={},h={},u=[],c={},m=this.keyFromTile(e);for(c[m]=null,p[m]=0,u.push(m);u.length>0&&o!==m;){m=u.shift(),l[m]=!0;var f=this.humanity.tile(this.tileFromKey(m));if(!f||null==f.c||f.c===a)for(var y=0;6>y;y++){var d=this.neighborFromTile(this.tileFromKey(m),y),T=this.distance(d);if(!(T>i)){if(0>=s)return null;s--;var v=p[m]+T;if(!(r&&v>i)){var g=this.keyFromTile(d);if(void 0!==p[g]&&v<p[g]&&delete p[g],void 0===p[g]&&void 0===l[g]){p[g]=v,h[g]=v+(Math.abs(t.q-d.q)+Math.abs(t.r-d.r)+Math.abs(t.q+t.r-d.q-d.r))/2;for(var M=-1,w=0;w<u.length;w++)if(void 0!==h[u[w]]){if(h[g]<=h[u[w]]){M=w;break}}else u.splice(w,1),w--;-1===M?u.push(g):u.splice(M,0,g),c[g]=m}}}}}return o!==m?null:{endKey:o,parents:c,costs:p}},pathFromParents:function(e,t){var i=[];if(null==t[e])return[];for(;null!==t[e];)i.push(e),e=t[e];return i.push(e),i.reverse()},setDistancesForHuman:function(e){0!==(e.o&manufacture.boat)?(this.distances[tileTypes.water]=1,this.distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(this.distances[tileTypes.water]=2,this.distances[tileTypes.swamp]=2)},unsetDistancesForHuman:function(){this.distances[tileTypes.water]=normalWater,this.distances[tileTypes.swamp]=normalSwamp},humanTravelFrom:function(e){var t=this.humanity.tile(e);if(!t||t.h<=0)return{};this.setDistancesForHuman(t);var i=this.travelFrom(e,this.speedFromHuman(t));return this.unsetDistancesForHuman(t),i},humanTravelTo:function(e,t,i,r,s){if(null==s&&(s=this.humanity.tile(e)),!s||s.h<=0)return null;this.setDistancesForHuman(s);var n=this.travelTo(e,t,this.speedFromHuman(s),i,r,s);return this.unsetDistancesForHuman(s),n},humanTravelPath:function(e,t){var i=this.humanTravelTo(e,t);return null==i?[]:this.pathFromParents(i.endKey,i.parents)},humanTravelSpeedPath:function(e,t){var i=this.humanTravelTo(e,t,!0);return null==i?[]:this.pathFromParents(i.endKey,i.parents)},buildingDependencies:buildingDependencies,buildingTileDependency:buildingTileDependency,validConstruction:function(e,t,i){if(null==e)return!0;var r=this.humanity.tile(t),s=this.tile(t),n=i.stock-i.usedStock,a=i.production-i.usedProduction,o=i.wealth-i.usedWealth;if(!r||r.h<=0)return!1;if(s.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingTileDependency[e]){for(var l=!1,p=0;p<buildingTileDependency[e].length;p++)(buildingTileDependency[e][p]===s.type||buildingTileDependency[e][p]===r.b)&&(l=!0);if(!l)return!1}if(void 0!==buildingDependencies[e]){for(var h=buildingDependencies[e],u=new Array(h.length),p=0;p<u.length;p++)u[p]=0;for(var p=0;6>p;p++)for(var c=this.neighborFromTile(t,p),m=this.humanity.tile(c),f=this.tile(c),y=0;y<h.length;y++)if(h[y][1]>=0&&m&&m.b===h[y][1]||f.type===h[y][1])u[y]++;else if(h[y][1]<0){if(h[y][1]===resourceTypes.stock&&n<h[y][0])return!1;if(h[y][1]===resourceTypes.production&&a<h[y][0])return!1;if(h[y][1]===resourceTypes.wealth&&o<h[y][0])return!1;u[y]=h[y][0]}for(var y=0;y<u.length;y++)if(u[y]<h[y][0])return!1;return!0}return!0},planTypes:planTypes,plans:{},addPlan:function(e){plans[e.at]=e},eachPlan:function(e){for(var t in plans)e(plans[t])},clearPlans:function(){plans={}}};var terrain=new Terrain;onmessage=function(e){return e.data.centerTile?(terrain.setCenterTile(e.data.centerTile),void 0):("raw"===e.data.type?paintTilesRaw(e.data.image,e.data.size,e.data.origin):"rainfall"===e.data.type&&paintRainfall(e.data.image,e.data.size,e.data.origin),postMessage({image:e.data.image,size:e.data.size,origin:e.data.origin}),void 0)};var cachedTerrainPaint={};