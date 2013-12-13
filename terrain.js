function tileType(e,i){return i?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var i=e.q,t=e.r;if(null!=memoizedTiles[i]&&null!=memoizedTiles[i][t])return memoizedTiles[i][t];var r=5*simplex2.noise2D(t/500,i/500),s=1-Math.abs((4*simplex1.noise2D(i/4/factor,t/4/factor)+2*simplex1.noise2D(i/2/factor,t/2/factor)+1*simplex1.noise2D(i/1/factor,t/1/factor)+.5*simplex1.noise2D(2*i/factor,2*t/factor))/7.5),a=Math.sin(-r*Math.abs(simplex1.noise2D(.25*i/factor,.25*t/factor))+simplex1.noise2D(i/factor,t/factor)-.5*simplex1.noise2D(2*i/factor,2*t/factor)+.25*simplex1.noise2D(4*i/factor,4*t/factor)-1/8*simplex1.noise2D(8*i/factor,8*t/factor)+1/16*simplex1.noise2D(16*i/factor,16*t/factor)),n=-simplex2.noise2D(t/factor/8,i/factor/8)+simplex2.noise2D(t/factor/4,i/factor/4)+a/2,o=r/5*simplex2.noise2D(i/factor,t/factor)+.5*simplex2.noise2D(2*i/factor,2*t/factor)+.25*simplex2.noise2D(4*i/factor,4*t/factor)+1/8*simplex2.noise2D(8*i/factor,8*t/factor)+1/16*simplex2.noise2D(16*i/factor,16*t/factor),l=s-(a>0?a/42:0)>.98||-.7>n?tileTypes.water:.1>a-s/2?tileTypes.steppe:.2>a-s?tileTypes.hill:tileTypes.mountain,p=o-(l===tileTypes.water?2*n:0)+Math.abs(a+.15)<0,m={steepness:l,vegetation:p,type:tileType(l,p),rain:-o/2};return null==memoizedTiles[i]&&(memoizedTiles[i]=[]),memoizedTiles[i][t]=m,m}function distance(e){var i=terrain(e),t=humanity(e),r=distances[t&&t.b?t.b:i.type];return void 0===r&&(r=distances[i.type]),r}function neighborFromTile(e,i){return 0===i?{q:e.q+1,r:e.r}:1===i?{q:e.q+1,r:e.r-1}:2===i?{q:e.q,r:e.r-1}:3===i?{q:e.q-1,r:e.r}:4===i?{q:e.q-1,r:e.r+1}:5===i?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var i=e.split(":");return{q:+i[0],r:+i[1]}}function travelFrom(e,i){var t=humanity(e).c,r={},s=keyFromTile(e),a={};a[s]=0;var n=[];for(n.push(s);n.length>0;){s=n.shift(),r[s]=!0;var o=humanity(tileFromKey(s));if(!o||null==o.c||o.c===t)for(var l=0;6>l;l++){var p=neighborFromTile(tileFromKey(s),l),m=a[s]+distance(p);if(i>=m){var u=keyFromTile(p);if(void 0!==a[u]&&m<a[u]&&delete a[u],void 0===a[u]&&void 0===r[u]){a[u]=m;for(var c=-1,y=0;y<n.length;y++)if(void 0!==a[n[y]]){if(a[u]<=a[n[y]]){c=y;break}}else n.splice(y,1),y--;-1===c?n.push(u):n.splice(c,0,u)}}}}return r}function travelTo(e,i,t){var r=humanity(e).c,s=keyFromTile(i),a={},n={},o={},l=[],p={},m=keyFromTile(e);for(n[m]=0,l.push(m);l.length>0&&s!==m;){m=l.shift(),a[m]=!0;var u=humanity(tileFromKey(m));if(!u||null==u.c||u.c===r)for(var c=0;6>c;c++){var y=neighborFromTile(tileFromKey(m),c),d=n[m]+distance(y);if(t>=d){var T=keyFromTile(y);if(void 0!==n[T]&&d<n[T]&&delete n[T],void 0===n[T]&&void 0===a[T]){n[T]=d,o[T]=d+(Math.abs(i.q-y.q)+Math.abs(i.r-y.r)+Math.abs(i.q+i.r-y.q-y.r))/2;for(var f=-1,h=0;h<l.length;h++)if(void 0!==o[l[h]]){if(o[T]<=o[l[h]]){f=h;break}}else l.splice(h,1),h--;-1===f?l.push(T):l.splice(f,0,T),p[T]=m}}}}var v=[];if(s!==m)return v;for(;void 0!==p[s];)v.push(s),s=p[s];return v.push(keyFromTile(e)),v.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravel(e){var i=humanity(e);if(!i||i.h<=0)return{};setDistancesForHuman(i);var t=travelFrom(e,speedFromHuman(i));return unsetDistancesForHuman(i),t}function humanTravelTo(e,i){var t=humanity(e);if(!t||t.h<=0)return[];setDistancesForHuman(t);var r=travelTo(e,i,speedFromHuman(t));return unsetDistancesForHuman(t),r}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,i){if(null===e)return!0;var t=humanity(i),r=terrain(i);if(!t||t.h<=0)return!1;if(r.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingDependencies[e]){for(var s=buildingDependencies[e],a=new Array(s.length),n=0;n<a.length;n++)a[n]=0;for(var n=0;6>n;n++)for(var o=neighborFromTile(i,n),l=humanity(o),p=terrain(o),m=0;m<s.length;m++)(l&&l.b===s[m][1]||p.type===s[m][1])&&a[m]++;for(var m=0;m<a.length;m++)if(a[m]<s[m][0])return!1;return e===tileTypes.lumber&&r.type!==tileTypes.forest?!1:!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var i in plans)e(plans[i])}function clearPlans(){plans={}}var SimplexNoise=require("simplex-noise"),MersenneTwister=require("./mersenne-twister"),humanity=require("./humanity"),prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20],tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var memoizedTiles=[],distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={car:1,plane:2,boat:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[1,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,[[1,tileTypes.road]],,,[[1,tileTypes.residence]]],planTypes={move:1,build:2},plans={};module.exports=terrain,module.exports.travel=humanTravelTo,module.exports.humanTravel=humanTravel,module.exports.tileTypes=tileTypes,module.exports.buildingTypes=buildingTypes,module.exports.buildingDependencies=buildingDependencies,module.exports.manufacture=manufacture,module.exports.validConstruction=validConstruction,module.exports.neighborFromTile=neighborFromTile,module.exports.tileFromKey=tileFromKey,module.exports.keyFromTile=keyFromTile,module.exports.planTypes=planTypes,module.exports.addPlan=addPlan,module.exports.eachPlan=eachPlan,module.exports.clearPlans=clearPlans;