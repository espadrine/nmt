function tileType(e,r){return r?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var r,t;void 0===e.x?(r=Math.sqrt(3)*(e.q+e.r/2)|0,t=1.5*e.r):(r=e.x,t=e.y);var i=simplex2.noise2D(t/500,r/500),s=1-Math.abs((4*simplex1.noise2D(r/4/factor,t/4/factor)+2*simplex1.noise2D(r/2/factor,t/2/factor)+1*simplex1.noise2D(r/1/factor,t/1/factor)+.5*simplex1.noise2D(2*r/factor,2*t/factor))/7.5),n=Math.sin(-(5*i)*Math.abs(simplex1.noise2D(.25*r/factor,.25*t/factor))+simplex1.noise2D(r/factor,t/factor)-.5*simplex1.noise2D(2*r/factor,2*t/factor)+.25*simplex1.noise2D(4*r/factor,4*t/factor)-1/8*simplex1.noise2D(8*r/factor,8*t/factor)+1/16*simplex1.noise2D(16*r/factor,16*t/factor)),a=-simplex2.noise2D(t/factor/8,r/factor/8)+simplex2.noise2D(t/factor/4,r/factor/4)+n/2,l=i*simplex2.noise2D(r/factor,t/factor)+.5*simplex2.noise2D(2*r/factor,2*t/factor)+.25*simplex2.noise2D(4*r/factor,4*t/factor)+1/8*simplex2.noise2D(8*r/factor,8*t/factor)+1/16*simplex2.noise2D(16*r/factor,16*t/factor),o=s-(n>.6?s:0)>.98||-.7>3*a/4+n/4?tileTypes.water:-1>l?tileTypes.hill:.1>n-s/2?tileTypes.steppe:.2>n-s?tileTypes.hill:tileTypes.mountain,p=l-(o===tileTypes.water?2*a:0)+Math.abs(n+.15)<0,u={steepness:o,vegetation:p,type:tileType(o,p),height:n-s,rain:-l/2};return u}function distance(e){var r=terrain(e),t=humanity(e),i=distances[t&&t.b?t.b:r.type];return void 0===i&&(i=distances[r.type]),i}function neighborFromTile(e,r){return 0===r?{q:e.q+1,r:e.r}:1===r?{q:e.q+1,r:e.r-1}:2===r?{q:e.q,r:e.r-1}:3===r?{q:e.q-1,r:e.r}:4===r?{q:e.q-1,r:e.r+1}:5===r?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var r=e.split(":");return{q:+r[0],r:+r[1]}}function travelFrom(e,r){var t=humanity(e).c,i={},s=keyFromTile(e);i[s]=null;var n={};n[s]=0;var a=[];for(a.push(s);a.length>0;){s=a.shift();var l=humanity(tileFromKey(s));if(!l||null==l.c||l.c===t)for(var o=0;6>o;o++){var p=neighborFromTile(tileFromKey(s),o),u=n[s]+distance(p);if(r>=u){var m=keyFromTile(p);if(void 0!==n[m]&&u<n[m]&&delete n[m],void 0===n[m]&&void 0===i[m]){n[m]=u,i[m]=s;for(var c=-1,y=0;y<a.length;y++)if(void 0!==n[a[y]]){if(n[m]<=n[a[y]]){c=y;break}}else a.splice(y,1),y--;-1===c?a.push(m):a.splice(c,0,m)}}}}return i}function travelTo(e,r,t,i,s){null==i&&(i=MAX_INT),null==s&&(s=humanity(e));var n=s.c,a=keyFromTile(r),l={},o={},p={},u=[],m={},c=keyFromTile(e);for(m[c]=null,o[c]=0,u.push(c);u.length>0&&a!==c;){c=u.shift(),l[c]=!0;var y=humanity(tileFromKey(c));if(!y||null==y.c||y.c===n)for(var T=0;6>T;T++){var d=neighborFromTile(tileFromKey(c),T),f=distance(d);if(!(f>t)){if(0>=i)return null;i--;var h=o[c]+f,v=keyFromTile(d);if(void 0!==o[v]&&h<o[v]&&delete o[v],void 0===o[v]&&void 0===l[v]){o[v]=h,p[v]=h+(Math.abs(r.q-d.q)+Math.abs(r.r-d.r)+Math.abs(r.q+r.r-d.q-d.r))/2;for(var g=-1,b=0;b<u.length;b++)if(void 0!==p[u[b]]){if(p[v]<=p[u[b]]){g=b;break}}else u.splice(b,1),b--;-1===g?u.push(v):u.splice(g,0,v),m[v]=c}}}}return a!==c?null:{endKey:a,parents:m,costs:o}}function pathFromParents(e,r){var t=[];if(null==r[e])return[];for(;null!==r[e];)t.push(e),e=r[e];return t.push(e),t.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravelFrom(e){var r=humanity(e);if(!r||r.h<=0)return{};setDistancesForHuman(r);var t=travelFrom(e,speedFromHuman(r));return unsetDistancesForHuman(r),t}function humanTravelTo(e,r,t,i){if(null==i&&(i=humanity(e)),!i||i.h<=0)return null;setDistancesForHuman(i);var s=travelTo(e,r,speedFromHuman(i),t,i);return unsetDistancesForHuman(i),s}function humanTravelPath(e,r){var t=humanTravelTo(e,r);return null==t?[]:pathFromParents(t.endKey,t.parents)}function manufactureFromBuilding(e){return e===tileTypes.dock?manufacture.boat:e===tileTypes.factory?manufacture.car:e===tileTypes.airport?manufacture.plane:e===tileTypes.gunsmith?manufacture.gun:null}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,r,t){if(null==e)return!0;var i=humanity(r),s=terrain(r),n=t.lumber-t.usedLumber,a=t.metal-t.usedMetal,l=t.farm-t.usedFarm;if(!i||i.h<=0)return!1;if(s.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingTileDependency[e]){for(var o=!1,p=0;p<buildingTileDependency[e].length;p++)(buildingTileDependency[e][p]===s.type||buildingTileDependency[e][p]===i.b)&&(o=!0);if(!o)return!1}if(void 0!==buildingDependencies[e]){for(var u=buildingDependencies[e],m=new Array(u.length),p=0;p<m.length;p++)m[p]=0;for(var p=0;6>p;p++)for(var c=neighborFromTile(r,p),y=humanity(c),T=terrain(c),d=0;d<u.length;d++)if(u[d][1]>=0&&y&&y.b===u[d][1]||T.type===u[d][1])m[d]++;else if(u[d][1]<0){if(u[d][1]===resourceTypes.lumber&&n<u[d][0])return!1;if(u[d][1]===resourceTypes.metal&&a<u[d][0])return!1;if(u[d][1]===resourceTypes.farm&&l<u[d][0])return!1;m[d]=u[d][0]}for(var d=0;d<m.length;d++)if(m[d]<u[d][0])return!1;return!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var r in plans)e(plans[r])}function clearPlans(){plans={}}var SimplexNoise=require("simplex-noise"),MersenneTwister=require("./mersenne-twister"),humanity=require("./humanity"),prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20,mine:21,industry:22,citrus:23,university:24},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20,21,22,24],resourceTypes={lumber:-1,metal:-2,farm:-3},listOfResourceTypes=[resourceTypes.lumber,resourceTypes.metal,resourceTypes.farm],tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var MAX_INT=9007199254740992,normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={boat:1,car:2,plane:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[2,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water],[1,resourceTypes.lumber]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland],[1,resourceTypes.lumber]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,,,,[[1,tileTypes.residence]],[[1,resourceTypes.lumber],[1,tileTypes.factory]],[[10,resourceTypes.farm],[1,tileTypes.mine],[5,tileTypes.road]],,[[1,resourceTypes.metal],[20,resourceTypes.farm],[2,tileTypes.wall]]],buildingTileDependency=[,,,,,,,,,,,,,,,,,,,,[tileTypes.forest,tileTypes.taiga],[tileTypes.metal],,,[tileTypes.citrus]],planTypes={move:1,build:2},plans={};module.exports=terrain,module.exports.travel=humanTravelPath,module.exports.humanTravelTo=humanTravelTo,module.exports.humanTravel=humanTravelFrom,module.exports.speedFromHuman=speedFromHuman,module.exports.tileTypes=tileTypes,module.exports.resourceTypes=resourceTypes,module.exports.listOfResourceTypes=listOfResourceTypes,module.exports.buildingTypes=buildingTypes,module.exports.buildingDependencies=buildingDependencies,module.exports.buildingTileDependency=buildingTileDependency,module.exports.manufacture=manufacture,module.exports.manufactureFromBuilding=manufactureFromBuilding,module.exports.validConstruction=validConstruction,module.exports.neighborFromTile=neighborFromTile,module.exports.tileFromKey=tileFromKey,module.exports.keyFromTile=keyFromTile,module.exports.planTypes=planTypes,module.exports.addPlan=addPlan,module.exports.eachPlan=eachPlan,module.exports.clearPlans=clearPlans;