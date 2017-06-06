function setupStringFromTileType(){var e=Object.create(null);for(var t in tileTypes)e[tileTypes[t]]=t;for(var t in resourceTypes)e[resourceTypes[t]]=t;return e}function tileType(e,t){return t?tileVegetationTypeFromSteepness[e]:e}function heatmap(e,t,i,r,s){for(var n=0,a=0,l=0;s>l;l++){var o=Math.pow(2,l);n+=i.noise2D(e/r*o,t/r*o)/o,a+=1/o}return n/a}function Terrain(e){this.humanity=e,this.plans={}}var SimplexNoise=require("simplex-noise"),MersenneTwister=require("./mersenne-twister"),prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20,mine:21,industry:22,citrus:23,university:24,beach:25,arsenal:26,smoke:27,impact:28,curvedRoad:29,whales:30,pearls:31,fish:32,algae:33,glass:34,salt:35,cattle:36,poultry:37,ivory:38,limestone:39,wool:40,grapes:41,fur:42,pigments:43,rubber:44,coal:45,crocodile:46,petroleum:47,shrimp:48,clay:49,spices:50,cotton:51,coffee:52,tea:53,resin:54,cocoa:55,honey:56,silk:57,gems:58,fungus:59,pelt:60,amber:61,field:62,market:63,"space mission":64,"stock exchange":65,monument:66},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20,21,22,24,26,62,63,64,65,66],resourceTypes={fuel:-1,metal:-2,wealth:-3},listOfResourceTypes=[resourceTypes.fuel,resourceTypes.metal,resourceTypes.wealth],stringFromTileType=setupStringFromTileType(),tileVegetationTypeFromSteepness=[];tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var distancesNormal=[17,2,4,16,8,3,8,24,,,,,,,,,1,32],distancesBoat=[1,4,8,16,1,8,16,24,,,,,,,,,1,32],distancesPlane=[1,1,2,2,1,1,2,2,,,,,,,,,1,8],MAX_INT=9007199254740992,manufacture={boat:1,car:2,plane:4,artillery:8,gun:16},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence]],[[1,tileTypes.residence],[1,tileTypes.water],[1,resourceTypes.fuel]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland],[1,resourceTypes.fuel]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,,,,[[1,tileTypes.residence]],[[1,resourceTypes.fuel],[1,tileTypes.factory]],[[10,resourceTypes.wealth],[1,tileTypes.mine],[5,tileTypes.road]],,[[1,tileTypes.meadow],[1,tileTypes.water],[2,tileTypes.residence]],,[[1,tileTypes.gunsmith],[1,resourceTypes.metal]],,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,[],[[1,tileTypes.dock],[1,tileTypes.skyscraper],[4,resourceTypes.metal]],[[2,tileTypes.airport],[20,resourceTypes.metal],[20,resourceTypes.fuel]],[[1,tileTypes.market],[1,tileTypes.university],[200,resourceTypes.wealth],[20,resourceTypes.metal]],[[3,tileTypes.skyscraper],[200,resourceTypes.wealth],[20,resourceTypes.fuel]]],buildingTileDependency=[,,,,,,,,,,,,,,,,,,,,[tileTypes.forest,tileTypes.taiga],[tileTypes.metal],,,,,[tileTypes.steppe]],planTypes={move:1,build:2};Terrain.prototype={humanity:null,centerTile:{q:0,r:0},centerPoint:{x:0,y:0},tileTypes:tileTypes,buildingTypes:buildingTypes,resourceTypes:resourceTypes,listOfResourceTypes:listOfResourceTypes,stringFromTileType:function(e){return stringFromTileType[e]},tileType:tileType,heatmap:heatmap,setCenterTile:function(e){this.centerTile=e,this.centerPoint.x=Math.sqrt(3)*(e.q+e.r/2)|0,this.centerPoint.y=1.5*e.r},continent:function(e,t){var i=512,r=heatmap(e,t,simplex1,i,8),s=this.centerPoint,n=(e-s.x)*(e-s.x)+(t-s.y)*(t-s.y),a=heatmap(e,t,simplex1,4*i,8),l=+(r+.7)*Math.exp(-n/(i*i));return a>l&&(l=a),l=Math.min(1,l)},continentLimit:.42,tile:function e(t){var i,r;void 0===t.x?(i=Math.sqrt(3)*(t.q+t.r/2)|0,r=1.5*t.r):(i=t.x,r=t.y);var s=simplex2.noise2D(r/4/factor,i/4/factor),n=1-Math.abs((4*simplex1.noise2D(i/4/factor,r/4/factor)+2*simplex1.noise2D(i/2/factor,r/2/factor)+1*simplex1.noise2D(i/1/factor,r/1/factor)+.5*simplex1.noise2D(2*i/factor,2*r/factor))/7.5),a=Math.sin(-(5*s)*Math.abs(simplex1.noise2D(1/8*i/factor,1/8*r/factor))+simplex1.noise2D(i/factor,r/factor)-.5*simplex1.noise2D(2*i/factor,2*r/factor)+.25*simplex1.noise2D(4*i/factor,4*r/factor)-1/8*simplex1.noise2D(8*i/factor,8*r/factor)+1/16*simplex1.noise2D(16*i/factor,16*r/factor)),l=-simplex2.noise2D(r/factor/8,i/factor/8)+simplex2.noise2D(r/factor/4,i/factor/4)+a/2,o=s*simplex2.noise2D(i/factor,r/factor)+.5*simplex2.noise2D(2*i/factor,2*r/factor)+.25*simplex2.noise2D(4*i/factor,4*r/factor)+1/8*simplex2.noise2D(8*i/factor,8*r/factor)+1/16*simplex2.noise2D(16*i/factor,16*r/factor),p=a-n,u=this.continent(i,r);if(u>this.continentLimit)var c,y=-1.3,m=(a>.6?!1:n>.98)||-1>3*l/4+a/4?(c=(-1.5-y)/(this.continentLimit-1),p=u*c+y-c,tileTypes.water):-1>o?tileTypes.hill:-.2>p?tileTypes.steppe:.2>p?tileTypes.hill:tileTypes.mountain,f=o-(m===tileTypes.water?2*l:0)+Math.abs(a+.15)<0;else{var m=tileTypes.water,f=!1,T=u-1.92;p=T}var e={steepness:m,vegetation:f,type:this.tileType(m,f),height:p,rain:-o/2};return e},commodity:function(e,t){var i,r=e.q,s=e.r,n=(-simplex1.noise2D(r/60,s/60)/8+1)/2,a=(simplex1.noise2D(r/60,s/60)/8+1)/2,l=(-simplex2.noise2D(r/60,s/60)/8+1)/2,o=(simplex2.noise2D(r/60,s/60)/8+1)/2,p=n*simplex1.noise2D(r/4,s/4),u=a*simplex1.noise2D(r/16,s/16),c=l*simplex2.noise2D(r/2,s/2),y=o*simplex2.noise2D(r/8,s/8);if(p>.49)i=0;else if(u>.49)i=1;else if(c>.45)i=2;else{if(!(y>.45))return-1;i=3}var m;return m=null!=t?t.type:this.tile(e).type,tileTypes.whales+(m<<2)+i},distances:distancesNormal,distance:function(e){var t=this.tile(e),i=this.humanity.tile(e),r=this.distances[i&&i.b?i.b:t.type];return void 0===r&&(r=this.distances[t.type]),r},distanceBetweenTiles:function(e,t){return(Math.abs(e.q-t.q)+Math.abs(e.r-t.r)+Math.abs(e.q+e.r-t.q-t.r))/2},neighborFromTile:function(e,t){return 0===t?{q:e.q+1,r:e.r}:1===t?{q:e.q+1,r:e.r-1}:2===t?{q:e.q,r:e.r-1}:3===t?{q:e.q-1,r:e.r}:4===t?{q:e.q-1,r:e.r+1}:5===t?{q:e.q,r:e.r+1}:void 0},keyFromTile:function(e){return e.q+":"+e.r},tileFromKey:function(e){var t=e.split(":");return{q:0|t[0],r:0|t[1]}},manufacture:manufacture,manufactureFromBuilding:function(e){return e===tileTypes.dock?manufacture.boat:e===tileTypes.factory?manufacture.car:e===tileTypes.airport?manufacture.plane:e===tileTypes.gunsmith?manufacture.gun:null},speedFromHuman:function(e){var t=8;return 0!==(e.o&manufacture.car)&&(t+=8),t},travelFrom:function(e,t){var i=this.humanity.tile(e).c,r={},s=this.keyFromTile(e);r[s]=null;var n={};n[s]=0;var a=[];for(a.push(s);a.length>0;){s=a.shift();var l=this.humanity.tile(this.tileFromKey(s));if(!l||null==l.c||l.c===i)for(var o=0;6>o;o++){var p=this.neighborFromTile(this.tileFromKey(s),o),u=n[s]+this.distance(p);if(t>=u){var c=this.keyFromTile(p);if(void 0!==n[c]&&u<n[c]&&delete n[c],void 0===n[c]&&void 0===r[c]){n[c]=u,r[c]=s;for(var y=-1,m=0;m<a.length;m++)if(void 0!==n[a[m]]){if(n[c]<=n[a[m]]){y=m;break}}else a.splice(m,1),m--;-1===y?a.push(c):a.splice(y,0,c)}}}}return r},travelTo:function(e,t,i,r,s,n){null==s&&(s=MAX_INT),null==n&&(n=this.humanity.tile(e));var a=n.c,l=this.keyFromTile(t),o={},p={},u={},c=[],y={},m=this.keyFromTile(e);for(y[m]=null,p[m]=0,c.push(m);c.length>0&&l!==m;){m=c.shift(),o[m]=!0;var f=this.humanity.tile(this.tileFromKey(m));if(!f||null==f.c||f.c===a)for(var T=0;6>T;T++){var h=this.neighborFromTile(this.tileFromKey(m),T),d=this.distance(h);if(!(d>i)){if(0>=s)return null;s--;var v=p[m]+d;if(!(r&&v>i)){var g=this.keyFromTile(h);if(void 0!==p[g]&&v<p[g]&&delete p[g],void 0===p[g]&&void 0===o[g]){p[g]=v,u[g]=v+(Math.abs(t.q-h.q)+Math.abs(t.r-h.r)+Math.abs(t.q+t.r-h.q-h.r))/2;for(var b=-1,D=0;D<c.length;D++)if(void 0!==u[c[D]]){if(u[g]<=u[c[D]]){b=D;break}}else c.splice(D,1),D--;-1===b?c.push(g):c.splice(b,0,g),y[g]=m}}}}}return l!==m?null:{endKey:l,parents:y,costs:p}},pathFromParents:function(e,t){var i=[];if(null==t[e])return[];for(;null!==t[e];)i.push(e),e=t[e];return i.push(e),i.reverse()},setDistancesForHuman:function(e){0!==(e.o&manufacture.plane)?this.distances=distancesPlane:0!==(e.o&manufacture.boat)&&(this.distances=distancesBoat)},unsetDistancesForHuman:function(){this.distances=distancesNormal},humanTravelFrom:function(e){var t=this.humanity.tile(e);if(!t||t.h<=0)return{};this.setDistancesForHuman(t);var i=this.travelFrom(e,this.speedFromHuman(t));return this.unsetDistancesForHuman(t),i},humanTravelTo:function(e,t,i,r,s){if(null==s&&(s=this.humanity.tile(e)),!s||s.h<=0)return null;this.setDistancesForHuman(s);var n=this.travelTo(e,t,this.speedFromHuman(s),i,r,s);return this.unsetDistancesForHuman(s),n},humanTravelPath:function(e,t){var i=this.humanTravelTo(e,t);return null==i?[]:this.pathFromParents(i.endKey,i.parents)},humanTravelSpeedPath:function(e,t){var i=this.humanTravelTo(e,t,!0);return null==i?[]:this.pathFromParents(i.endKey,i.parents)},buildingDependencies:buildingDependencies,buildingTileDependency:buildingTileDependency,validConstruction:function(e,t,i){if(null==e)return!0;var r=this.humanity.tile(t),s=this.tile(t),n=i.fuel-i.usedFuel,a=i.metal-i.usedMetal,l=i.wealth-i.usedWealth;if(!r||r.h<=0)return!1;if(e===tileTypes.field)return this.commodity(t,s)>=0;if(s.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingTileDependency[e]){for(var o=!1,p=0;p<buildingTileDependency[e].length;p++)(buildingTileDependency[e][p]===s.type||buildingTileDependency[e][p]===r.b)&&(o=!0);if(!o)return!1}if(void 0!==buildingDependencies[e]){for(var u=buildingDependencies[e],c=new Array(u.length),p=0;p<c.length;p++)c[p]=0;for(var p=0;6>p;p++)for(var y=this.neighborFromTile(t,p),m=this.humanity.tile(y),f=this.tile(y),T=0;T<u.length;T++)if(u[T][1]>=0&&m&&m.b===u[T][1]||f.type===u[T][1])c[T]++;else if(u[T][1]<0){if(u[T][1]===resourceTypes.fuel&&n<u[T][0])return!1;if(u[T][1]===resourceTypes.metal&&a<u[T][0])return!1;if(u[T][1]===resourceTypes.wealth&&l<u[T][0])return!1;c[T]=u[T][0]}for(var T=0;T<c.length;T++)if(c[T]<u[T][0])return!1;return!0}return!0},planTypes:planTypes,plans:{},addPlan:function(e){plans[e.at]=e},eachPlan:function(e){for(var t in plans)e(plans[t])},clearPlans:function(){plans={}}},module.exports=Terrain;