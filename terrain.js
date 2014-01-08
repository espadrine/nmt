function tileType(e,i){return i?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var i=e.q,r=e.r;if(null!=memoizedTiles[i]&&null!=memoizedTiles[i][r])return memoizedTiles[i][r];var t=5*simplex2.noise2D(r/500,i/500),s=1-Math.abs((4*simplex1.noise2D(i/4/factor,r/4/factor)+2*simplex1.noise2D(i/2/factor,r/2/factor)+1*simplex1.noise2D(i/1/factor,r/1/factor)+.5*simplex1.noise2D(2*i/factor,2*r/factor))/7.5),n=Math.sin(-t*Math.abs(simplex1.noise2D(.25*i/factor,.25*r/factor))+simplex1.noise2D(i/factor,r/factor)-.5*simplex1.noise2D(2*i/factor,2*r/factor)+.25*simplex1.noise2D(4*i/factor,4*r/factor)-1/8*simplex1.noise2D(8*i/factor,8*r/factor)+1/16*simplex1.noise2D(16*i/factor,16*r/factor)),a=-simplex2.noise2D(r/factor/8,i/factor/8)+simplex2.noise2D(r/factor/4,i/factor/4)+n/2,l=t/5*simplex2.noise2D(i/factor,r/factor)+.5*simplex2.noise2D(2*i/factor,2*r/factor)+.25*simplex2.noise2D(4*i/factor,4*r/factor)+1/8*simplex2.noise2D(8*i/factor,8*r/factor)+1/16*simplex2.noise2D(16*i/factor,16*r/factor),o=s-(n>0?n/42:0)>.98||-.7>a?tileTypes.water:.1>n-s/2?tileTypes.steppe:.2>n-s?tileTypes.hill:tileTypes.mountain,p=l-(o===tileTypes.water?2*a:0)+Math.abs(n+.15)<0,m={steepness:o,vegetation:p,type:tileType(o,p),rain:-l/2};return null==memoizedTiles[i]&&(memoizedTiles[i]=[]),memoizedTiles[i][r]=m,m}function distance(e){var i=terrain(e),r=humanity(e),t=distances[r&&r.b?r.b:i.type];return void 0===t&&(t=distances[i.type]),t}function neighborFromTile(e,i){return 0===i?{q:e.q+1,r:e.r}:1===i?{q:e.q+1,r:e.r-1}:2===i?{q:e.q,r:e.r-1}:3===i?{q:e.q-1,r:e.r}:4===i?{q:e.q-1,r:e.r+1}:5===i?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var i=e.split(":");return{q:+i[0],r:+i[1]}}function travelFrom(e,i){var r=humanity(e).c,t={},s=keyFromTile(e),n={};n[s]=0;var a=[];for(a.push(s);a.length>0;){s=a.shift(),t[s]=!0;var l=humanity(tileFromKey(s));if(!l||null==l.c||l.c===r)for(var o=0;6>o;o++){var p=neighborFromTile(tileFromKey(s),o),m=n[s]+distance(p);if(i>=m){var u=keyFromTile(p);if(void 0!==n[u]&&m<n[u]&&delete n[u],void 0===n[u]&&void 0===t[u]){n[u]=m;for(var c=-1,d=0;d<a.length;d++)if(void 0!==n[a[d]]){if(n[u]<=n[a[d]]){c=d;break}}else a.splice(d,1),d--;-1===c?a.push(u):a.splice(c,0,u)}}}}return t}function travelTo(e,i,r){var t=humanity(e).c,s=keyFromTile(i),n={},a={},l={},o=[],p={},m=keyFromTile(e);for(a[m]=0,o.push(m);o.length>0&&s!==m;){m=o.shift(),n[m]=!0;var u=humanity(tileFromKey(m));if(!u||null==u.c||u.c===t)for(var c=0;6>c;c++){var d=neighborFromTile(tileFromKey(m),c),y=a[m]+distance(d);if(r>=y){var T=keyFromTile(d);if(void 0!==a[T]&&y<a[T]&&delete a[T],void 0===a[T]&&void 0===n[T]){a[T]=y,l[T]=y+(Math.abs(i.q-d.q)+Math.abs(i.r-d.r)+Math.abs(i.q+i.r-d.q-d.r))/2;for(var f=-1,v=0;v<o.length;v++)if(void 0!==l[o[v]]){if(l[T]<=l[o[v]]){f=v;break}}else o.splice(v,1),v--;-1===f?o.push(T):o.splice(f,0,T),p[T]=m}}}}var h=[];if(s!==m)return h;for(;void 0!==p[s];)h.push(s),s=p[s];return h.push(keyFromTile(e)),h.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravel(e){var i=humanity(e);if(!i||i.h<=0)return{};setDistancesForHuman(i);var r=travelFrom(e,speedFromHuman(i));return unsetDistancesForHuman(i),r}function humanTravelTo(e,i){var r=humanity(e);if(!r||r.h<=0)return[];setDistancesForHuman(r);var t=travelTo(e,i,speedFromHuman(r));return unsetDistancesForHuman(r),t}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,i,r){if(null==e)return!0;var t=humanity(i),s=terrain(i),n=r.lumber-r.usedLumber,a=r.metal-r.usedMetal;if(!t||t.h<=0)return!1;if(s.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingTileDependency[e]){for(var l=!1,o=0;o<buildingTileDependency[e].length;o++)(buildingTileDependency[e][o]===s.type||buildingTileDependency[e][o]===t.b)&&(l=!0);if(!l)return console.log("current tile"),!1}if(void 0!==buildingDependencies[e]){for(var p=buildingDependencies[e],m=new Array(p.length),o=0;o<m.length;o++)m[o]=0;for(var o=0;6>o;o++)for(var u=neighborFromTile(i,o),c=humanity(u),d=terrain(u),y=0;y<p.length;y++)if(p[y][1]>=0&&c&&c.b===p[y][1]||d.type===p[y][1])m[y]++;else if(p[y][1]<0){if(p[y][1]===resourceTypes.lumber&&n<p[y][0])return console.log("spare lumber:",n,"required",p[y][0]),!1;if(p[y][1]===resourceTypes.metal&&a<p[y][0])return console.log("metal"),!1;m[y]=p[y][0]}for(var y=0;y<m.length;y++)if(m[y]<p[y][0])return console.log("dep",y,"is",m[y]),!1;return!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var i in plans)e(plans[i])}function clearPlans(){plans={}}var SimplexNoise=require("simplex-noise"),MersenneTwister=require("./mersenne-twister"),humanity=require("./humanity"),prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20,mine:21},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20,21],resourceTypes={lumber:-1,metal:-2},tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var memoizedTiles=[],distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={car:1,plane:2,boat:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[2,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water],[1,resourceTypes.lumber]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland],[1,resourceTypes.lumber]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,[[1,tileTypes.road]],,,[[1,tileTypes.residence]],[[1,resourceTypes.lumber]]],buildingTileDependency=[,,,,,,,,,,,,,,,,,,,,[tileTypes.forest,tileTypes.taiga],[tileTypes.metal]],planTypes={move:1,build:2},plans={};module.exports=terrain,module.exports.travel=humanTravelTo,module.exports.humanTravel=humanTravel,module.exports.tileTypes=tileTypes,module.exports.buildingTypes=buildingTypes,module.exports.buildingDependencies=buildingDependencies,module.exports.manufacture=manufacture,module.exports.validConstruction=validConstruction,module.exports.neighborFromTile=neighborFromTile,module.exports.tileFromKey=tileFromKey,module.exports.keyFromTile=keyFromTile,module.exports.planTypes=planTypes,module.exports.addPlan=addPlan,module.exports.eachPlan=eachPlan,module.exports.clearPlans=clearPlans;