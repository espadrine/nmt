function tileType(e,t){return t?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var t=e.q,i=e.r;if(null!=memoizedTiles[t]&&null!=memoizedTiles[t][i])return memoizedTiles[t][i];var r=5*simplex2.noise2D(i/500,t/500),a=Math.sin(-r*Math.abs(simplex1.noise2D(.25*t/factor,.25*i/factor))+simplex1.noise2D(t/factor,i/factor)-.5*Math.abs(simplex1.noise2D(2*t/factor,2*i/factor))+.25*Math.abs(simplex1.noise2D(4*t/factor,4*i/factor))-1/8*Math.abs(simplex1.noise2D(8*t/factor,8*i/factor))+1/16*Math.abs(simplex1.noise2D(16*t/factor,16*i/factor))),s=Math.sin(-16*Math.abs(simplex1.noise2D(t/16/factor,i/16/factor))+8*Math.abs(simplex1.noise2D(t/8/factor,i/8/factor))-4*Math.abs(simplex1.noise2D(t/4/factor,i/4/factor))+2*Math.abs(simplex1.noise2D(t/2/factor,i/2/factor))-.5*Math.abs(simplex1.noise2D(2*t/factor,2*i/factor))+.25*Math.abs(simplex1.noise2D(4*t/factor,4*i/factor))-1/8*Math.abs(simplex1.noise2D(8*t/factor,8*i/factor))),n=r/2*simplex1.noise2D(i/factor/8,t/factor/8)+.5*simplex1.noise2D(2*i/factor/8,2*t/factor/8),o=r/5*simplex2.noise2D(t/factor,i/factor)+.5*simplex2.noise2D(2*t/factor,2*i/factor)+.25*simplex2.noise2D(4*t/factor,4*i/factor)+1/8*simplex2.noise2D(8*t/factor,8*i/factor)+1/16*simplex2.noise2D(16*t/factor,16*i/factor),l=-.99-.013*a>s||-1>a+n?tileTypes.water:.1>a?tileTypes.steppe:1-.42*s>a?tileTypes.hill:tileTypes.mountain,p=o-(l===tileTypes.water?2*n:0)+Math.abs(a+.15)<0,m={steepness:l,vegetation:p,type:tileType(l,p),rain:-o/2};return null==memoizedTiles[t]&&(memoizedTiles[t]=[]),memoizedTiles[t][i]=m,m}function distance(e){var t=terrain(e),i=humanity(e),r=distances[i&&i.b?i.b:t.type];return void 0===r&&(r=distances[t.type]),r}function neighborFromTile(e,t){return 0===t?{q:e.q+1,r:e.r}:1===t?{q:e.q+1,r:e.r-1}:2===t?{q:e.q,r:e.r-1}:3===t?{q:e.q-1,r:e.r}:4===t?{q:e.q-1,r:e.r+1}:5===t?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var t=e.split(":");return{q:+t[0],r:+t[1]}}function travelFrom(e,t){var i=humanity(e).c,r={},a=keyFromTile(e),s={};s[a]=0;var n=[];for(n.push(a);n.length>0;){a=n.shift(),r[a]=!0;var o=humanity(tileFromKey(a));if(!o||null==o.c||o.c===i)for(var l=0;6>l;l++){var p=neighborFromTile(tileFromKey(a),l),m=s[a]+distance(p);if(t>=m){var c=keyFromTile(p);if(void 0!==s[c]&&m<s[c]&&delete s[c],void 0===s[c]&&void 0===r[c]){s[c]=m;for(var u=-1,d=0;d<n.length;d++)if(void 0!==s[n[d]]){if(s[c]<=s[n[d]]){u=d;break}}else n.splice(d,1),d--;-1===u?n.push(c):n.splice(u,0,c)}}}}return r}function travelTo(e,t,i){var r=humanity(e).c,a=keyFromTile(t),s={},n={},o={},l=[],p={},m=keyFromTile(e);for(n[m]=0,l.push(m);l.length>0&&a!==m;){m=l.shift(),s[m]=!0;var c=humanity(tileFromKey(m));if(!c||null==c.c||c.c===r)for(var u=0;6>u;u++){var d=neighborFromTile(tileFromKey(m),u),f=n[m]+distance(d);if(i>=f){var y=keyFromTile(d);if(void 0!==n[y]&&f<n[y]&&delete n[y],void 0===n[y]&&void 0===s[y]){n[y]=f,o[y]=f+(Math.abs(t.q-d.q)+Math.abs(t.r-d.r)+Math.abs(t.q+t.r-d.q-d.r))/2;for(var T=-1,h=0;h<l.length;h++)if(void 0!==o[l[h]]){if(o[y]<=o[l[h]]){T=h;break}}else l.splice(h,1),h--;-1===T?l.push(y):l.splice(T,0,y),p[y]=m}}}}var v=[];if(a!==m)return v;for(;void 0!==p[a];)v.push(a),a=p[a];return v.push(keyFromTile(e)),v.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravel(e){var t=humanity(e);if(!t||t.h<=0)return{};setDistancesForHuman(t);var i=travelFrom(e,speedFromHuman(t));return unsetDistancesForHuman(t),i}function humanTravelTo(e,t){var i=humanity(e);if(!i||i.h<=0)return[];setDistancesForHuman(i);var r=travelTo(e,t,speedFromHuman(i));return unsetDistancesForHuman(i),r}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,t){if(null===e)return!0;var i=humanity(t),r=terrain(t);if(!i||i.h<=0)return!1;if(r.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingDependencies[e]){for(var a=buildingDependencies[e],s=new Array(a.length),n=0;n<s.length;n++)s[n]=0;for(var n=0;6>n;n++)for(var o=neighborFromTile(t,n),l=humanity(o),p=terrain(o),m=0;m<a.length;m++)(l&&l.b===a[m][1]||p.type===a[m][1])&&s[m]++;for(var m=0;m<s.length;m++)if(s[m]<a[m][0])return!1;return!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var t in plans)e(plans[t])}function clearPlans(){plans={}}var SimplexNoise=require("simplex-noise"),MersenneTwister=require("./mersenne-twister"),humanity=require("./humanity"),prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18},buildingTypes=[8,9,10,11,12,13,14,15,16,17],tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var memoizedTiles=[],distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={car:1,plane:2,boat:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[1,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,[[1,tileTypes.residence]]],planTypes={move:1,build:2},plans={};module.exports=terrain,module.exports.travel=humanTravelTo,module.exports.humanTravel=humanTravel,module.exports.tileTypes=tileTypes,module.exports.buildingTypes=buildingTypes,module.exports.buildingDependencies=buildingDependencies,module.exports.manufacture=manufacture,module.exports.validConstruction=validConstruction,module.exports.neighborFromTile=neighborFromTile,module.exports.tileFromKey=tileFromKey,module.exports.keyFromTile=keyFromTile,module.exports.planTypes=planTypes,module.exports.addPlan=addPlan,module.exports.eachPlan=eachPlan,module.exports.clearPlans=clearPlans;