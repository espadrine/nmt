function tileType(e,t){return t?tileVegetationTypeFromSteepness[e]:e}function terrain(e){var t=e.q,i=e.r;if(null!=memoizedTiles[t]&&null!=memoizedTiles[t][i])return memoizedTiles[t][i];var n=5*simplex2.noise2D(i/500,t/500),a=1-Math.abs((4*simplex1.noise2D(t/4/factor,i/4/factor)+2*simplex1.noise2D(t/2/factor,i/2/factor)+1*simplex1.noise2D(t/1/factor,i/1/factor)+.5*simplex1.noise2D(2*t/factor,2*i/factor))/7.5),r=Math.sin(-n*Math.abs(simplex1.noise2D(.25*t/factor,.25*i/factor))+simplex1.noise2D(t/factor,i/factor)-.5*simplex1.noise2D(2*t/factor,2*i/factor)+.25*simplex1.noise2D(4*t/factor,4*i/factor)-1/8*simplex1.noise2D(8*t/factor,8*i/factor)+1/16*simplex1.noise2D(16*t/factor,16*i/factor)),o=-simplex2.noise2D(i/factor/8,t/factor/8)+simplex2.noise2D(i/factor/4,t/factor/4)+r/2,s=n/5*simplex2.noise2D(t/factor,i/factor)+.5*simplex2.noise2D(2*t/factor,2*i/factor)+.25*simplex2.noise2D(4*t/factor,4*i/factor)+1/8*simplex2.noise2D(8*t/factor,8*i/factor)+1/16*simplex2.noise2D(16*t/factor,16*i/factor),l=a-(r>0?r/42:0)>.98||-.7>o?tileTypes.water:.1>r-a/2?tileTypes.steppe:.2>r-a?tileTypes.hill:tileTypes.mountain,c=s-(l===tileTypes.water?2*o:0)+Math.abs(r+.15)<0,d={steepness:l,vegetation:c,type:tileType(l,c),rain:-s/2};return null==memoizedTiles[t]&&(memoizedTiles[t]=[]),memoizedTiles[t][i]=d,d}function distance(e){var t=terrain(e),i=humanity(e),n=distances[i&&i.b?i.b:t.type];return void 0===n&&(n=distances[t.type]),n}function neighborFromTile(e,t){return 0===t?{q:e.q+1,r:e.r}:1===t?{q:e.q+1,r:e.r-1}:2===t?{q:e.q,r:e.r-1}:3===t?{q:e.q-1,r:e.r}:4===t?{q:e.q-1,r:e.r+1}:5===t?{q:e.q,r:e.r+1}:void 0}function keyFromTile(e){return e.q+":"+e.r}function tileFromKey(e){var t=e.split(":");return{q:+t[0],r:+t[1]}}function travelFrom(e,t){var i=humanity(e).c,n={},a=keyFromTile(e),r={};r[a]=0;var o=[];for(o.push(a);o.length>0;){a=o.shift(),n[a]=!0;var s=humanity(tileFromKey(a));if(!s||null==s.c||s.c===i)for(var l=0;6>l;l++){var c=neighborFromTile(tileFromKey(a),l),d=r[a]+distance(c);if(t>=d){var u=keyFromTile(c);if(void 0!==r[u]&&d<r[u]&&delete r[u],void 0===r[u]&&void 0===n[u]){r[u]=d;for(var m=-1,p=0;p<o.length;p++)if(void 0!==r[o[p]]){if(r[u]<=r[o[p]]){m=p;break}}else o.splice(p,1),p--;-1===m?o.push(u):o.splice(m,0,u)}}}}return n}function travelTo(e,t,i){var n=humanity(e).c,a=keyFromTile(t),r={},o={},s={},l=[],c={},d=keyFromTile(e);for(o[d]=0,l.push(d);l.length>0&&a!==d;){d=l.shift(),r[d]=!0;var u=humanity(tileFromKey(d));if(!u||null==u.c||u.c===n)for(var m=0;6>m;m++){var p=neighborFromTile(tileFromKey(d),m),h=o[d]+distance(p);if(i>=h){var v=keyFromTile(p);if(void 0!==o[v]&&h<o[v]&&delete o[v],void 0===o[v]&&void 0===r[v]){o[v]=h,s[v]=h+(Math.abs(t.q-p.q)+Math.abs(t.r-p.r)+Math.abs(t.q+t.r-p.q-p.r))/2;for(var y=-1,g=0;g<l.length;g++)if(void 0!==s[l[g]]){if(s[v]<=s[l[g]]){y=g;break}}else l.splice(g,1),g--;-1===y?l.push(v):l.splice(y,0,v),c[v]=d}}}}var f=[];if(a!==d)return f;for(;void 0!==c[a];)f.push(a),a=c[a];return f.push(keyFromTile(e)),f.reverse()}function setDistancesForHuman(e){0!==(e.o&manufacture.boat)?(distances[tileTypes.water]=1,distances[tileTypes.swamp]=1):0!==(e.o&manufacture.plane)&&(distances[tileTypes.water]=2,distances[tileTypes.swamp]=2)}function unsetDistancesForHuman(){distances[tileTypes.water]=normalWater,distances[tileTypes.swamp]=normalSwamp}function humanTravel(e){var t=humanity(e);if(!t||t.h<=0)return{};setDistancesForHuman(t);var i=travelFrom(e,speedFromHuman(t));return unsetDistancesForHuman(t),i}function humanTravelTo(e,t){var i=humanity(e);if(!i||i.h<=0)return[];setDistancesForHuman(i);var n=travelTo(e,t,speedFromHuman(i));return unsetDistancesForHuman(i),n}function speedFromHuman(e){return 0!==(e.o&manufacture.plane)?32:0!==(e.o&manufacture.car)?16:8}function validConstruction(e,t,i){if(null==e)return!0;var n=humanity(t),a=terrain(t),r=i.lumber-i.usedLumber,o=i.metal-i.usedMetal;if(!n||n.h<=0)return!1;if(a.type===tileTypes.water&&(e===tileTypes.farm||e===tileTypes.residence||e===tileTypes.skyscraper||e===tileTypes.factory||e===tileTypes.airland||e===tileTypes.airport||e===tileTypes.gunsmith))return!1;if(void 0!==buildingTileDependency[e]){for(var s=!1,l=0;l<buildingTileDependency[e].length;l++)(buildingTileDependency[e][l]===a.type||buildingTileDependency[e][l]===n.b)&&(s=!0);if(!s)return!1}if(void 0!==buildingDependencies[e]){for(var c=buildingDependencies[e],d=new Array(c.length),l=0;l<d.length;l++)d[l]=0;for(var l=0;6>l;l++)for(var u=neighborFromTile(t,l),m=humanity(u),p=terrain(u),h=0;h<c.length;h++)if(c[h][1]>=0&&m&&m.b===c[h][1]||p.type===c[h][1])d[h]++;else if(c[h][1]<0){if(c[h][1]===resourceTypes.lumber&&r<c[h][0])return!1;if(c[h][1]===resourceTypes.metal&&o<c[h][0])return!1;d[h]=c[h][0]}for(var h=0;h<d.length;h++)if(d[h]<c[h][0])return!1;return!0}return!0}function addPlan(e){plans[e.at]=e}function eachPlan(e){for(var t in plans)e(plans[t])}function clearPlans(){plans={}}function connectSocket(e){e=e||function(){},socket=new WebSocket("ws"+window.location.protocol.slice(4)+"//"+window.location.hostname+(window.location.port.length>0?":"+window.location.port:"")+"/$websocket:act"),socket.onmessage=socketMessage,socket.onclose=socket.onerror=socketError,socket.onopen=function(){retries=0,e()}}function socketMessage(e){var t=JSON.parse(e.data);t.plans||(t.winners?(gameOver=t.winners[0],gameOver===playerCamp&&(localStorage.getItem("gamesWon")||localStorage.setItem("gamesWon",0),localStorage.setItem("gamesWon",+localStorage.getItem("gamesWon")+1)),paint(ctx,hexaSize,origin)):(void 0!==t.camp&&(playerCamp=t.camp,delete t.camp),void 0!==t.resources&&(resources=t.resources[playerCamp],delete t.resources),void 0!==t.population&&(humanityPopulation=t.population,delete t.population),void 0!==t.war&&(addHumanMessages(warTiles,t.war,warMessages),delete t.war),void 0!==t.surrender&&(addHumanMessages(surrenderTiles,t.surrender,surrenderMessages),delete t.surrender),void 0!==t.goto&&(gotoPlace(t.goto),delete t.goto),void 0!==t.places&&(insertPlaces(t.places),delete t.places),addStarveMessages(t),changeHumanity(humanityData,t),updateCurrentTileInformation(),updateCachedPaint(hexaSize,origin,t),paint(ctx,hexaSize,origin),paintHumans(ctx,hexaSize,origin,humanityData)))}function socketError(){retries++,1>retries?setTimeout(connectSocket,50):1===retries&&alert("You are disconnected.\nPlease reload the page.")}function sendMove(e,t,i){e&&t&&(1===socket.readyState?socket.send(JSON.stringify({at:keyFromTile(e),"do":planTypes.move,to:keyFromTile(t),h:i})):connectSocket(function(){sendMove(e,t,i)}))}function sendPos(e,t){e&&socket.send(JSON.stringify({at:keyFromTile(e),to:keyFromTile(t)}))}function sendBuild(e,t){e&&(1===socket.readyState?socket.send(JSON.stringify({at:keyFromTile(e),"do":planTypes.build,b:t})):connectSocket(function(){sendBuild(e,t)}))}function insertPlaces(e){placesPanel.innerHTML=defaultPlacesPanelHTML;for(var t in e){var i=document.createElement("p");i.classList.add("buildSelection"),i.classList.add("validSelection");var n=document.createElement("hr");n.classList.add("separator"),placesPanel.appendChild(n);var a=tileFromKey(t);i.setAttribute("data-tilekey",t),i.innerHTML="<div>→</div> "+e[t],i.addEventListener("click",function(e){return function(){gotoPlace(e),paint(ctx,hexaSize,origin)}}(a)),placesPanel.appendChild(i)}}function gotoPlace(e){var t=pixelFromTile(e,{x0:0,y0:0},hexaSize);origin.x0=t.x-(canvas.width/2|0),origin.y0=t.y-(canvas.height/2|0)}function orientPlacesArrow(){for(var e=1;e<placesPanel.childNodes.length;e++){var t=placesPanel.childNodes[e];if(t.getAttribute&&null!=t.getAttribute("data-tilekey")){var i=-orientation({x:origin.x0+(canvas.width/2|0),y:origin.y0+(canvas.height/2|0)},pixelFromTile(tileFromKey(t.getAttribute("data-tilekey")),{x0:0,y0:0},hexaSize));t.firstChild.style.transform="rotate("+i+"rad)",t.firstChild.style.WebkitTransform="rotate("+i+"rad)"}}}function orientation(e,t){var i=Math.atan((e.y-t.y)/Math.abs(t.x-e.x));return t.x<e.x&&(i=Math.PI-i),i}function humanity(e){return humanityData[e.q+":"+e.r]}function changeHumanity(e,t){for(var i in t)e[i]=t[i]}function intPointFromReal(e){var t=e.q,i=e.r,n=-t-i,a=Math.round(t),r=Math.round(n),o=Math.round(i),s=Math.abs(a-t),l=Math.abs(r-n),c=Math.abs(o-i);return s>l&&s>c?a=-r-o:l>c?r=-a-o:o=-a-r,{q:a,r:o}}function tileFromPixel(e,t,i){var n=e.x+t.x0,a=e.y+t.y0;return intPointFromReal({q:(Math.sqrt(3)*n-a)/3/i,r:2*a/3/i})}function pixelFromTile(e,t,i){return{x:(i*Math.sqrt(3)*(e.q+e.r/2)|0)-t.x0,y:3*i/2*e.r-t.y0}}function showHelp(e){helpPane.src="help/"+e+".html",helpPane.onload=function(){helpPane.style.display="block",helpPane.style.height=helpPane.contentWindow.document.body.clientHeight+40+"px",addEventListener("click",hideHelp)}}function hideHelp(){helpPane.style.display="none",removeEventListener("click",hideHelp)}function loadSprites(){var e=new Image;return e.src="sprites.png",e}function pathAlongTiles(e,t,i,n){if(e.beginPath(),!(n.length<2)){{var a,r=pixelFromTile(tileFromKey(n[0]),i,t);0|r.x,0|r.y}e.moveTo(0|r.x,0|r.y);for(var o=0;o<n.length-1;o++)r=pixelFromTile(tileFromKey(n[o]),i,t),e.lineTo(0|r.x,0|r.y),o===n.length-2&&(a=r);r=pixelFromTile(tileFromKey(n[n.length-1]),i,t);var s=(a.x-r.x)/10,l=(a.y-r.y)/10;e.lineTo(r.x+s,r.y+l),e.lineTo(r.x+s-2*l/3,r.y+l+2*s/3),e.lineTo(r.x,r.y),e.lineTo(r.x+s+2*l/3,r.y+l-2*s/3),e.lineTo(r.x+s,r.y+l)}}function paintAlongTiles(e,t,i,n){var a=t*Math.sqrt(3),r=3*t/2;pathAlongTiles(e,t,i,n,a,r),e.strokeStyle="#ccf",e.lineWidth="5",e.stroke(),e.strokeStyle="red",e.lineWidth="3",e.stroke(),e.lineWidth="1"}function pathFromTiles(e,t,i,n,a,r){e.beginPath();for(var o in n){for(var s=tileFromKey(o),l=pixelFromTile(s,i,t),c=(l.x,l.y,0),d=0;6>d;d++){var u=neighborFromTile(s,d);c|=(void 0!==n[keyFromTile(u)]|0)<<d}partialPathFromHex(e,t,l,c,a,r)}}function partialPathFromHex(e,t,i,n,a){n=0|n;var r=0|i.x,o=0|i.y,s=a/2,l=t/2;e.moveTo(r,o-t),0===(4&n)?e.lineTo(r-s,o-l):e.moveTo(r-s,o-l),0===(8&n)?e.lineTo(r-s,o+l):e.moveTo(r-s,o+l),0===(16&n)?e.lineTo(r,o+t):e.moveTo(r,o+t),0===(32&n)?e.lineTo(r+s,o+l):e.moveTo(r+s,o+l),0===(1&n)?e.lineTo(r+s,o-l):e.moveTo(r+s,o-l),0===(2&n)?e.lineTo(r,o-t):e.moveTo(r,o-t)}function pathFromHex(e,t,i,n,a){e.beginPath(),partialPathFromHex(e,t,i,0,n,a)}function paintAroundTiles(e,t,i,n,a){var r=t*Math.sqrt(3),o=3*t/2;pathFromTiles(e,t,i,n,r,o),e.strokeStyle=a||"white",e.stroke()}function paintTileHexagon(e,t,i,n,a){var r=(t*Math.sqrt(3),3*t/2),o=pixelFromTile(n,i,t),s=r;e.beginPath(),e.arc(o.x,o.y,s,0,2*Math.PI,!0),e.closePath(),e.strokeStyle=a,e.lineWidth=3,e.stroke(),e.lineWidth=1}function paintSprite(e,t,i,n,a,r){e.save(),e.translate(i,n),e.rotate(r*mπd3),e.drawImage(sprites,0,spritesWidth*a|0,spritesWidth,spritesWidth,0|-t,0|-t,2*t|0,2*t|0),e.restore()}function paintBuilding(e,t,i,n,a,r){var o=humanity(a);if(null!=o&&null!=o.b)if(o.b===tileTypes.road||o.b===tileTypes.wall||o.b===tileTypes.airland){for(var s=!1,l=0;6>l;l++){var c=humanity(neighborFromTile(a,l));c&&((o.b===tileTypes.road||o.b===tileTypes.wall)&&c.b===o.b||o.b===tileTypes.airland&&c.b===tileTypes.airport)&&(paintSprite(e,t,i,n,o.b,l),s=!0)}s||paintSprite(e,t,i,n,o.b,0)}else o.b===tileTypes.airport||o.b===tileTypes.factory||o.b>tileTypes.wall?paintSprite(e,t,i,n,o.b,0):paintSprite(e,t,i,n,o.b,r)}function paintBuildingsSprited(e,t,i){for(var n=e.canvas.width,a=e.canvas.height,r=tileFromPixel({x:0,y:0},i,t),o=pixelFromTile({q:r.q,r:r.r-1},i,t),s=o.x,l=o.y,c=t*Math.sqrt(3),d=3*t/2,u=!0;a>l-d;){for(;n>s-c;){r=tileFromPixel({x:s,y:l},i,t);var m=terrain(r),p=(r.q^r.r^(128*m.rain|0))%6;paintBuilding(e,t,s,l,r,p),s+=c}l+=d,s=o.x,u?(s-=c/2,u=!1):u=!0,s=Math.floor(s),l=Math.floor(l)}}function paintTerrain(e,t,i,n,a,r,o){var s=terrain(o),l=(o.q^o.r^(128*s.rain|0))%6;paintSprite(e,t,i,n,s.type,l),pathFromHex(e,t,{x:i,y:n},a,r);var c=0|Math.floor((1-s.rain)/2*127);if(s.type===tileTypes.water){for(var d=!1,u=0;6>u;u++)terrain(neighborFromTile(o,u)).type!==tileTypes.water&&(d=!0);d&&(c+=20),e.fillStyle="rgba("+c+","+c+","+c+",0.3)"}else{var m=Math.abs(c-63.5)/1|0,p=c,h=c;if(63.5>c?(p-=m,h+=m):c>63.5&&(p+=2*m,h+=m),s.type===tileTypes.steppe){var v=neighborFromTile(o,0),y=neighborFromTile(o,3);(terrain(v).type===tileTypes.water||terrain(y).type===tileTypes.water)&&(p+=(127-c)/2|0,h+=(127-c)/4|0)}e.fillStyle="rgba("+p+","+h+","+c+",0.3)"}e.fill()}function paintTilesSprited(e,t,i){var n=e.canvas.width,a=e.canvas.height,r=tileFromPixel({x:0,y:0},i,t),o=pixelFromTile({q:r.q,r:r.r-1},i,t),s=o.x,l=o.y,c=t*Math.sqrt(3),d=3*t/2,u=t+":"+i.x0+":"+i.y0;if(void 0===cachedTerrainPaint[u]){var m=document.createElement("canvas");m.width=canvas.width,m.height=canvas.height;for(var p=m.getContext("2d"),h=!0;a>l-d;){for(;n>s-c;)r=tileFromPixel({x:s,y:l},i,t),paintTerrain(p,t,s,l,c,d,r),s+=c;l+=d,s=o.x,h?(s-=c/2,h=!1):h=!0,s=Math.floor(s),l=Math.floor(l)}cachedTerrainPaint[u]=m}e.drawImage(cachedTerrainPaint[u],0,0)}function paintTilesRaw(e,t,i){for(var n=e.canvas.width,a=e.canvas.height,r=e.getImageData(0,0,n,a),o=r.data,s=0;a>s;s++)for(var l=0;n>l;l++){var c=tileFromPixel({x:l,y:s},i,t),d=terrain(c),u=[180,0,0];d.steepness==tileTypes.water?u=[50,50,180]:d.steepness==tileTypes.steppe?u=[0,180,0]:d.steepness==tileTypes.hill&&(u=[180,100,0]);var m=Math.min(Math.abs(u[0]-u[1])/2*d.rain,255);u[0]-=m,u[1]-=m,u[2]-=Math.min(50*d.rain,255),d.vegetation&&(u[0]-=100,u[1]-=50,u[2]-=100);var p=4*(l+s*n);o[p+0]=u[0],o[p+1]=u[1],o[p+2]=u[2],o[p+3]=255}e.putImageData(r,0,0)}function paintTiles(e,t,i,n){5>t?(renderWorker.addEventListener("message",function a(r){r.data.origin.x0===i.x0&&r.data.origin.y0===i.y0&&r.data.size===t&&(e.putImageData(r.data.image,0,0),renderWorker.removeEventListener("message",a),n())}),workerMessage.image=imageBuffer,workerMessage.size=t,workerMessage.origin=i,renderWorker.postMessage(workerMessage)):(paintTilesSprited(e,t,i),paintBuildingsSprited(e,t,i),n())}function getCachedPaint(e,t,i,n,a){var r=i+":"+n,o=cachedPaint[r];if(void 0===o){var s=document.createElement("canvas");s.width=canvas.width,s.height=canvas.height;var l=s.getContext("2d");void 0===cachePending[r]?(cachePending[r]=a,paintTiles(l,e,{x0:i,y0:n},function(){o=cachedPaint[i+":"+n]=s,cachePending[r](o),delete cachePending[r]})):cachePending[r]=a}else a(o)}function updateCachedRegion(e,t,i,n){var a,r,a=i%e;0>a&&(a+=e);var r=n%t;0>r&&(r+=t);var o=i-a,s=n-r;delete cachedPaint[o+":"+s]}function updateCachedPaint(e,t,i,n){e*Math.sqrt(3);for(var a in i){var r=tileFromKey(a),o=pixelFromTile(r,t,e),s=canvas.width,l=canvas.height,c=o.x+t.x0-e/2,d=o.y+t.y0-e/2;updateCachedRegion(s,l,c,d,n),updateCachedRegion(s,l,c+e,d,n),updateCachedRegion(s,l,c,d+e,n),updateCachedRegion(s,l,c+e,d+e,n)}}function paintTilesFromCache(e,t,i,n){function a(t,i){return function(a){e.drawImage(a,t,i),p++,p>=4&&n()}}var r=canvas.width,o=canvas.height,s=i.x0%r;0>s&&(s+=r);var l=i.y0%o;0>l&&(l+=o);var c=i.x0-s,d=i.x0+r-s,u=i.y0-l,m=i.y0+o-l,p=0;e.fillStyle="black",e.fillRect(0,0,r,o),getCachedPaint(t,i,c,u,a(-s,-l)),getCachedPaint(t,i,d,u,a(r-s,-l)),getCachedPaint(t,i,c,m,a(-s,o-l)),getCachedPaint(t,i,d,m,a(r-s,o-l))}function paint(e,t,i){selectionMode===selectionModes.places&&orientPlacesArrow(),spritesLoaded&&(paintTilesFromCache(e,t,i,function(){paintIntermediateUI(e,t,i)}),paintIntermediateUI(e,t,i))}function paintIntermediateUI(e,t,i){null!=currentTile&&null!=playerCamp&&paintTileHexagon(e,t,i,currentTile,campHsl(playerCamp)),paintCamps(e,t,i),paintAroundTiles(e,t,i,accessibleTiles),null==currentTile||null==targetTile||selectionMode!==selectionModes.travel&&selectionMode!==selectionModes.split||paintAlongTiles(e,t,i,humanTravelTo(currentTile,targetTile)),paintTileMessages(e,t,i),paintPopulation(e),void 0!==gameOver&&drawTitle(e,["The winner is #"+gameOver+".",gameOver===playerCamp?"YOU WON! ("+nth(localStorage.getItem("gamesWon"))+" win!)":"YOU NEARLY WON!","You can reload to engage in the next game!"],campHsl(gameOver)),showTitleScreen&&drawTitle(e,["Welcome to Thaddée Tyl's…","NOT MY TERRITORY","(YET)"]),displayedPaintContext.drawImage(canvas,0,0)}function nth(e){var t=e%10;return 1===t?e+"th":2===t?e+"nd":3===t?e+"rd":e+"th"}function drawTitle(e,t,i){var n,a=canvas.width,r=canvas.height,o=t[0],s=t[1],l=t[2];e.fillStyle=i||"black",e.strokeStyle="black",e.textAlign="center",e.font=r/16+'px "Linux Biolinum", sans-serif',n=e.measureText(o).width,e.fillText(o,a/2,1*r/3),e.strokeText(o,a/2,1*r/3),e.font=r/8+'px "Linux Biolinum", sans-serif',n=e.measureText(s).width,e.fillText(s,a/2,13*r/24),e.strokeText(s,a/2,13*r/24),e.font=r/16+'px "Linux Biolinum", sans-serif',n=e.measureText(l).width,e.fillText(l,a/2,2*r/3),e.strokeText(l,a/2,2*r/3),e.textAlign="start"}function initHumans(){for(var e=0;numberOfHumanAnimations>e;e++)humanAnimation[e]={x:Math.random(),y:Math.random(),targetx:Math.random(),targety:Math.random(),period:20*Math.random()+3|0,tick:0}}function updateHumans(){for(var e=0;e<humanAnimation.length;e++){var t=humanAnimation[e];t.x+=(t.targetx-t.x)/t.period,t.y+=(t.targety-t.y)/t.period,t.tick++,t.tick>t.period&&(t.targetx=Math.random(),t.targety=Math.random(),t.tick=0)}}function paintHumans(e,t,i,n){if(!(20>t)){e.drawImage(displayedPaint,0,0);{t*Math.sqrt(3)}for(var a in n){var r=a.split(":"),o=+r[0],s=+r[1],l=n[a],c=pixelFromTile({q:o,r:s},i,t),d=c.x,u=c.y,m=l.h;m>humanAnimation.length&&(m=humanAnimation.length);for(var p=0;m>p;p++){var h=humanAnimation[Math.abs(p+o^s^l.f)%humanAnimation.length];e.fillStyle="black",e.fillRect(d-t+2*h.x*t,u-t+2*h.y*t,t/20,t/10)}}}}function animateHumans(){paintHumans(ctx,hexaSize,origin,humanityData),updateHumans()}function listVisibleHumans(e,t,i){var n,a,r,o,s;s=tileFromPixel({x:0,y:e.canvas.height},i,t),a=s.q-1,r=s.r+1,s=tileFromPixel({x:e.canvas.width,y:0},i,t),n=s.q+1,o=s.r-1;var l=[];for(var c in humanityData)tile=tileFromKey(c),tile.q>=a&&tile.q<=n&&tile.r>=o&&tile.r<=r&&humanityData[c].h>0&&l.push(c);return l}function paintCamps(e,t,i){for(var n=listVisibleHumans(e,t,i),a=new Array(numberOfCamps),r=0;numberOfCamps>r;r++)a[r]={};for(var r=0;r<n.length;r++){var o=humanityData[n[r]];a[o.c][n[r]]=!0}for(var r=0;numberOfCamps>r;r++)e.lineWidth=1.5,paintAroundTiles(e,t,i,a[r],campHsl(r)),e.lineWidth=1}function campHsl(e){return"hsl("+campHueCreator9000(e)+",100%,50%)"}function campHueCreator9000(e){return void 0!==campHue[e]?campColors[e]:0===e?270:(campHueCreator9000(e-1)+60)%360}function paintPopulation(e){if(humanityPopulation){var t=55,i=8,n=185,a=10;e.beginPath(),e.moveTo(i,t-.5),e.lineTo(n+i,t-.5),e.moveTo(n+i+.5,t),e.lineTo(n+i+.5,t+a),e.moveTo(n+i,t+a+.5),e.lineTo(i,t+a+.5),e.moveTo(i-.5,t+a),e.lineTo(i-.5,t),e.strokeStyle="#345",e.lineWidth=1,e.stroke(),e.lineWidth=1;for(var r=0,o=0;o<humanityPopulation.length;o++)r+=humanityPopulation[o];for(var s,l=i,c=0,o=0;o<humanityPopulation.length-1;o++)s=n*humanityPopulation[o]/r|0,c+=s,e.fillStyle="hsl("+campHueCreator9000(o)+",80%,50%)",e.fillRect(0|l,t,0|s,a),l+=s;s=n-c-1,e.fillStyle="hsl("+campHueCreator9000(o)+",80%,50%)",e.fillRect(0|l,t,(0|s)+1,a)}}function addHumanMessages(e,t,i){for(var n=0;n<t.length;n++){var a=t[n];e[a]&&clearTimeout(e[a].timeout);var r=i[i.length*Math.random()|0];e[a]={message:r,timeout:setTimeout(function(t){return function(){delete e[t],paint(ctx,hexaSize,origin)}}(a),2e3)}}}function addStarveMessages(e){var t=[];for(var i in e)e[i].h>0&&e[i].f<4&&t.push(i);addHumanMessages(starvedTiles,t,hungerMessages)}function paintMessage(e,t,i,n,a){e.font='14px "Linux Biolinum", sans-serif';var r=e.measureText(a).width,o=pixelFromTile(tileFromKey(n),i,t),s=o.x+t/4,l=o.y-t/4;e.beginPath(),e.moveTo(s,l),e.lineTo(s+2,l-10),e.lineTo(s-12,l-10),e.lineTo(s-10,l-40),e.lineTo(s+r+10,l-35),e.lineTo(s+r,l-10),e.lineTo(s+12,l-10),e.closePath(),e.fillStyle="rgba(0,0,0,0.8)",e.fill(),e.strokeStyle="white",e.strokeText(a,s-4,l-20)}function paintTileMessages(e,t,i){for(var n in warTiles)paintMessage(e,t,i,n,warTiles[n].message);for(var n in surrenderTiles)paintMessage(e,t,i,n,surrenderTiles[n].message);for(var n in starvedTiles)paintMessage(e,t,i,n,starvedTiles[n].message)}function attributeNameFromTile(){var e=[],t=0;for(var i in tileTypes)e[t++]=i;return e}function showTileInformation(e){var t=terrain(e),i="a "+tileNames[t.type],n=humanity(e);if(null!=n&&(null!=n.b&&(i=("a"===tileNames[n.b][0]?"an ":"a ")+tileNames[n.b]+" built in "+i),n.h>0)){var a="",r=!1;0!==(n.o&manufacture.plane)&&(a+="on a plane ",r=!0),0!==(n.o&manufacture.boat)&&(a+=(t.type!==tileTypes.water||r?"with":(r=!0,"in"))+" a boat "),0!==(n.o&manufacture.car)&&(a+=(r?"with":"in")+" a car "),i=n.h+(0!==(n.o&manufacture.gun)?" armed":"")+" folk"+(1===n.h?"":"s")+" "+a+"in "+i}tileInfo.value=i}function indicateValidConstructions(e){for(var t=0;t<buildingTypes.length;t++)validConstruction(buildingTypes[t],e,resources)?buildSelectionButtons[t].classList.add("validSelection"):buildSelectionButtons[t].classList.remove("validSelection")}function hookBuildSelectionButtons(){for(var e=0;e<buildingTypes.length;e++){var t=function(e){return function(){sendBuild(currentTile,e),enterMode(selectionModes.normal)}}(buildingTypes[e]);buildSelectionButtons[e].addEventListener("click",t)}}function updateCurrentTileInformation(){void 0!==currentTile&&(showTileInformation(currentTile),accessibleTiles=humanTravel(currentTile),indicateValidConstructions(currentTile))}function hidePanel(e,t){e.style.display="none",t.style.fill="black",t.firstElementChild.style.display="block",t.firstElementChild.nextElementSibling.style.display="none"}function showPanel(e,t){e.style.display="block",t.style.fill="#800080",t.firstElementChild.style.display="none",t.firstElementChild.nextElementSibling.style.display="block"}function enterMode(e){selectionMode!==e&&(selectionMode===selectionModes.travel?(hidePanel(travelPanel,travelBut),targetTile=null,travelBut.removeEventListener("click",enterNormalMode),travelBut.addEventListener("click",enterTravelMode)):selectionMode===selectionModes.build?(hidePanel(buildPanel,buildBut),buildBut.removeEventListener("click",enterNormalMode),buildBut.addEventListener("click",enterBuildMode)):selectionMode===selectionModes.split?(hidePanel(splitPanel,splitBut),splitBut.removeEventListener("click",enterNormalMode),splitBut.addEventListener("click",enterSplitMode)):selectionMode===selectionModes.places&&(hidePanel(placesPanel,placesBut),placesBut.removeEventListener("click",enterNormalMode),placesBut.addEventListener("click",enterPlacesMode)),e===selectionModes.travel?(showPanel(travelPanel,travelBut),travelBut.addEventListener("click",enterNormalMode)):e===selectionModes.build?(showPanel(buildPanel,buildBut),buildBut.addEventListener("click",enterNormalMode)):e===selectionModes.split?(showPanel(splitPanel,splitBut),splitBut.addEventListener("click",enterNormalMode)):e===selectionModes.places&&(orientPlacesArrow(),showPanel(placesPanel,placesBut),placesBut.addEventListener("click",enterNormalMode)),selectionMode=e,mousePosition&&showPath({clientX:mousePosition.x,clientY:mousePosition.y}),e===selectionModes.normal&&paint(ctx,hexaSize,origin))}function enterNormalMode(){enterMode(selectionModes.normal)}function enterTravelMode(){enterMode(selectionModes.travel)}function enterBuildMode(){enterMode(selectionModes.build)}function enterSplitMode(){enterMode(selectionModes.split)}function enterPlacesMode(){enterMode(selectionModes.places)}function mouseSelection(e){canvas.removeEventListener("mousemove",mouseDrag),canvas.removeEventListener("mouseup",mouseSelection);var t=tileFromPixel({x:e.clientX,y:e.clientY},origin,hexaSize);if(selectionMode!==selectionModes.travel&&selectionMode!==selectionModes.split||void 0===currentTile||void 0===humanity(currentTile))sendPos(currentTile,t);else{var i=humanity(currentTile).h;selectionMode===selectionModes.split&&(i=i*splitInputWidget.value/100|0);var n=t;humanTravelTo(currentTile,n).length>1&&sendMove(currentTile,n,i),enterMode(selectionModes.normal)}currentTile=t,updateCurrentTileInformation(),paint(ctx,hexaSize,origin)}function showPath(e){mousePosition={x:e.clientX,y:e.clientY},!currentTile||selectionMode!==selectionModes.travel&&selectionMode!==selectionModes.split||(targetTile=tileFromPixel(mousePosition,origin,hexaSize),paint(ctx,hexaSize,origin),paintHumans(ctx,hexaSize,origin,humanityData))}function mouseDrag(){canvas.style.cursor="move",canvas.removeEventListener("mousemove",mouseDrag),canvas.removeEventListener("mouseup",mouseSelection),canvas.addEventListener("mouseup",mouseEndDrag),canvas.addEventListener("mousemove",dragMap),clearInterval(humanAnimationTimeout),currentlyDragging=!0,resetDragVector(),dragVelTo=setInterval(resetDragVector,dragVelInterval)}function mouseEndDrag(){canvas.style.cursor="",canvas.removeEventListener("mousemove",dragMap),canvas.removeEventListener("mouseup",mouseEndDrag),humanAnimationTimeout=setInterval(animateHumans,100),currentlyDragging=!1,paint(ctx,hexaSize,origin),clearInterval(dragVelTo),computeDragVelocity(),inertiaDragMap()}function dragMap(e){if(!drawingWhileDragging){drawingWhileDragging=!0;var t=lastMousePosition.clientX-e.clientX,i=lastMousePosition.clientY-e.clientY;origin.x0+=t,origin.y0+=i,lastMousePosition.clientX=e.clientX,lastMousePosition.clientY=e.clientY,paint(ctx,hexaSize,origin),requestAnimationFrame(function(){drawingWhileDragging=!1})}}function resetDragVector(){dragTime=Date.now(),dragVector[0]=origin.x0,dragVector[1]=origin.y0}function computeDragVelocity(){dragTime=Date.now()-dragTime,dragVector[0]=origin.x0-dragVector[0],dragVector[1]=origin.y0-dragVector[1];var e=.03*dragTime;dragVelocity[0]=dragVector[0]/e|0,dragVelocity[1]=dragVector[1]/e|0}function inertiaDragMap(){origin.x0+=dragVelocity[0],origin.y0+=dragVelocity[1],dragVelocity[0]=dragVelocity[0]/1.1|0,dragVelocity[1]=dragVelocity[1]/1.1|0,paint(ctx,hexaSize,origin),requestAnimationFrame(function(){(0!==dragVelocity[0]||0!==dragVelocity[1])&&inertiaDragMap()})}!function(){function e(e){e||(e=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;256>t;t++)this.p[t]=256*e();for(t=0;512>t;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}var t=.5*(Math.sqrt(3)-1),i=(3-Math.sqrt(3))/6,n=1/3,a=1/6,r=(Math.sqrt(5)-1)/4,o=(5-Math.sqrt(5))/20;e.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(e,n){var a,r,o=this.permMod12,s=this.perm,l=this.grad3,c=0,d=0,u=0,m=(e+n)*t,p=Math.floor(e+m),h=Math.floor(n+m),v=(p+h)*i,y=p-v,g=h-v,f=e-y,T=n-g;f>T?(a=1,r=0):(a=0,r=1);var M=f-a+i,x=T-r+i,w=f-1+2*i,b=T-1+2*i,P=255&p,k=255&h,S=.5-f*f-T*T;if(S>=0){var F=3*o[P+s[k]];S*=S,c=S*S*(l[F]*f+l[F+1]*T)}var C=.5-M*M-x*x;if(C>=0){var D=3*o[P+a+s[k+r]];C*=C,d=C*C*(l[D]*M+l[D+1]*x)}var E=.5-w*w-b*b;if(E>=0){var H=3*o[P+1+s[k+1]];E*=E,u=E*E*(l[H]*w+l[H+1]*b)}return 70*(c+d+u)},noise3D:function(e,t,i){var r,o,s,l,c,d,u,m,p,h,v=this.permMod12,y=this.perm,g=this.grad3,f=(e+t+i)*n,T=Math.floor(e+f),M=Math.floor(t+f),x=Math.floor(i+f),w=(T+M+x)*a,b=T-w,P=M-w,k=x-w,S=e-b,F=t-P,C=i-k;S>=F?F>=C?(c=1,d=0,u=0,m=1,p=1,h=0):S>=C?(c=1,d=0,u=0,m=1,p=0,h=1):(c=0,d=0,u=1,m=1,p=0,h=1):C>F?(c=0,d=0,u=1,m=0,p=1,h=1):C>S?(c=0,d=1,u=0,m=0,p=1,h=1):(c=0,d=1,u=0,m=1,p=1,h=0);var D=S-c+a,E=F-d+a,H=C-u+a,A=S-m+2*a,q=F-p+2*a,I=C-h+2*a,L=S-1+3*a,B=F-1+3*a,N=C-1+3*a,W=255&T,V=255&M,z=255&x,R=.6-S*S-F*F-C*C;if(0>R)r=0;else{var O=3*v[W+y[V+y[z]]];R*=R,r=R*R*(g[O]*S+g[O+1]*F+g[O+2]*C)}var _=.6-D*D-E*E-H*H;if(0>_)o=0;else{var K=3*v[W+c+y[V+d+y[z+u]]];_*=_,o=_*_*(g[K]*D+g[K+1]*E+g[K+2]*H)}var Y=.6-A*A-q*q-I*I;if(0>Y)s=0;else{var U=3*v[W+m+y[V+p+y[z+h]]];Y*=Y,s=Y*Y*(g[U]*A+g[U+1]*q+g[U+2]*I)}var X=.6-L*L-B*B-N*N;if(0>X)l=0;else{var J=3*v[W+1+y[V+1+y[z+1]]];X*=X,l=X*X*(g[J]*L+g[J+1]*B+g[J+2]*N)}return 32*(r+o+s+l)},noise4D:function(e,t,i,n){var a,s,l,c,d,u=(this.permMod12,this.perm),m=this.grad4,p=(e+t+i+n)*r,h=Math.floor(e+p),v=Math.floor(t+p),y=Math.floor(i+p),g=Math.floor(n+p),f=(h+v+y+g)*o,T=h-f,M=v-f,x=y-f,w=g-f,b=e-T,P=t-M,k=i-x,S=n-w,F=0,C=0,D=0,E=0;b>P?F++:C++,b>k?F++:D++,b>S?F++:E++,P>k?C++:D++,P>S?C++:E++,k>S?D++:E++;var H,A,q,I,L,B,N,W,V,z,R,O;H=F>=3?1:0,A=C>=3?1:0,q=D>=3?1:0,I=E>=3?1:0,L=F>=2?1:0,B=C>=2?1:0,N=D>=2?1:0,W=E>=2?1:0,V=F>=1?1:0,z=C>=1?1:0,R=D>=1?1:0,O=E>=1?1:0;var _=b-H+o,K=P-A+o,Y=k-q+o,U=S-I+o,X=b-L+2*o,J=P-B+2*o,j=k-N+2*o,$=S-W+2*o,G=b-V+3*o,Q=P-z+3*o,Z=k-R+3*o,et=S-O+3*o,tt=b-1+4*o,it=P-1+4*o,nt=k-1+4*o,at=S-1+4*o,rt=255&h,ot=255&v,st=255&y,lt=255&g,ct=.6-b*b-P*P-k*k-S*S;if(0>ct)a=0;else{var dt=u[rt+u[ot+u[st+u[lt]]]]%32*4;ct*=ct,a=ct*ct*(m[dt]*b+m[dt+1]*P+m[dt+2]*k+m[dt+3]*S)}var ut=.6-_*_-K*K-Y*Y-U*U;if(0>ut)s=0;else{var mt=u[rt+H+u[ot+A+u[st+q+u[lt+I]]]]%32*4;ut*=ut,s=ut*ut*(m[mt]*_+m[mt+1]*K+m[mt+2]*Y+m[mt+3]*U)}var pt=.6-X*X-J*J-j*j-$*$;if(0>pt)l=0;else{var ht=u[rt+L+u[ot+B+u[st+N+u[lt+W]]]]%32*4;pt*=pt,l=pt*pt*(m[ht]*X+m[ht+1]*J+m[ht+2]*j+m[ht+3]*$)}var vt=.6-G*G-Q*Q-Z*Z-et*et;if(0>vt)c=0;else{var yt=u[rt+V+u[ot+z+u[st+R+u[lt+O]]]]%32*4;vt*=vt,c=vt*vt*(m[yt]*G+m[yt+1]*Q+m[yt+2]*Z+m[yt+3]*et)}var gt=.6-tt*tt-it*it-nt*nt-at*at;if(0>gt)d=0;else{var ft=u[rt+1+u[ot+1+u[st+1+u[lt+1]]]]%32*4;gt*=gt,d=gt*gt*(m[ft]*tt+m[ft+1]*it+m[ft+2]*nt+m[ft+3]*at)}return 27*(a+s+l+c+d)}},"undefined"!=typeof define&&define.amd&&define(function(){return e}),"undefined"!=typeof exports?exports.SimplexNoise=e:"undefined"!=typeof navigator&&(this.SimplexNoise=e),"undefined"!=typeof module&&(module.exports=e)}();var MersenneTwister=function(e){void 0==e&&(e=(new Date).getTime()),this.N=624,this.M=397,this.MATRIX_A=2567483615,this.UPPER_MASK=2147483648,this.LOWER_MASK=2147483647,this.mt=new Array(this.N),this.mti=this.N+1,this.init_genrand(e)};MersenneTwister.prototype.init_genrand=function(e){for(this.mt[0]=e>>>0,this.mti=1;this.mti<this.N;this.mti++){var e=this.mt[this.mti-1]^this.mt[this.mti-1]>>>30;this.mt[this.mti]=(1812433253*((4294901760&e)>>>16)<<16)+1812433253*(65535&e)+this.mti,this.mt[this.mti]>>>=0}},MersenneTwister.prototype.init_by_array=function(e,t){var i,n,a;for(this.init_genrand(19650218),i=1,n=0,a=this.N>t?this.N:t;a;a--){var r=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1664525*((4294901760&r)>>>16)<<16)+1664525*(65535&r))+e[n]+n,this.mt[i]>>>=0,i++,n++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1),n>=t&&(n=0)}for(a=this.N-1;a;a--){var r=this.mt[i-1]^this.mt[i-1]>>>30;this.mt[i]=(this.mt[i]^(1566083941*((4294901760&r)>>>16)<<16)+1566083941*(65535&r))-i,this.mt[i]>>>=0,i++,i>=this.N&&(this.mt[0]=this.mt[this.N-1],i=1)}this.mt[0]=2147483648},MersenneTwister.prototype.genrand_int32=function(){var e,t=new Array(0,this.MATRIX_A);if(this.mti>=this.N){var i;for(this.mti==this.N+1&&this.init_genrand(5489),i=0;i<this.N-this.M;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+this.M]^e>>>1^t[1&e];for(;i<this.N-1;i++)e=this.mt[i]&this.UPPER_MASK|this.mt[i+1]&this.LOWER_MASK,this.mt[i]=this.mt[i+(this.M-this.N)]^e>>>1^t[1&e];e=this.mt[this.N-1]&this.UPPER_MASK|this.mt[0]&this.LOWER_MASK,this.mt[this.N-1]=this.mt[this.M-1]^e>>>1^t[1&e],this.mti=0}return e=this.mt[this.mti++],e^=e>>>11,e^=e<<7&2636928640,e^=e<<15&4022730752,e^=e>>>18,e>>>0},MersenneTwister.prototype.genrand_int31=function(){return this.genrand_int32()>>>1},MersenneTwister.prototype.genrand_real1=function(){return this.genrand_int32()*(1/4294967295)},MersenneTwister.prototype.random=function(){return this.genrand_int32()*(1/4294967296)},MersenneTwister.prototype.genrand_real3=function(){return(this.genrand_int32()+.5)*(1/4294967296)},MersenneTwister.prototype.genrand_res53=function(){var e=this.genrand_int32()>>>5,t=this.genrand_int32()>>>6;return(67108864*e+t)*(1/9007199254740992)};var prng=new MersenneTwister(0),simplex1=new SimplexNoise(prng.random.bind(prng)),simplex2=new SimplexNoise(prng.random.bind(prng)),factor=50,tileTypes={water:0,steppe:1,hill:2,mountain:3,swamp:4,meadow:5,forest:6,taiga:7,farm:8,residence:9,skyscraper:10,factory:11,dock:12,airland:13,airport:14,gunsmith:15,road:16,wall:17,blackdeath:18,metal:19,lumber:20,mine:21},buildingTypes=[8,9,10,11,12,13,14,15,16,17,20,21],resourceTypes={lumber:-1,metal:-2},tileVegetationTypeFromSteepness=[];
tileVegetationTypeFromSteepness[tileTypes.water]=tileTypes.swamp,tileVegetationTypeFromSteepness[tileTypes.steppe]=tileTypes.meadow,tileVegetationTypeFromSteepness[tileTypes.hill]=tileTypes.forest,tileVegetationTypeFromSteepness[tileTypes.mountain]=tileTypes.taiga;var memoizedTiles=[],distances=[];distances[tileTypes.water]=2989,distances[tileTypes.steppe]=2,distances[tileTypes.hill]=4,distances[tileTypes.mountain]=16,distances[tileTypes.swamp]=8,distances[tileTypes.meadow]=3,distances[tileTypes.forest]=8,distances[tileTypes.taiga]=24,distances[tileTypes.road]=1,distances[tileTypes.wall]=32;var normalWater=distances[tileTypes.water],normalSwamp=distances[tileTypes.swamp],manufacture={car:1,plane:2,boat:4,gun:8},buildingDependencies=[,,,,,,,,,[[2,tileTypes.farm]],[[6,tileTypes.residence]],[[3,tileTypes.residence],[2,tileTypes.road]],[[1,tileTypes.residence],[1,tileTypes.water],[1,resourceTypes.lumber]],[[2,tileTypes.road]],[[1,tileTypes.gunsmith],[3,tileTypes.airland],[1,resourceTypes.lumber]],[[1,tileTypes.skyscraper],[1,tileTypes.factory]],,[[1,tileTypes.road]],,,[[1,tileTypes.residence]],[[1,resourceTypes.lumber]]],buildingTileDependency=[,,,,,,,,,,,,,,,,,,,,[tileTypes.forest,tileTypes.taiga],[tileTypes.metal]],planTypes={move:1,build:2},plans={},gameOver,socket,retries=0;connectSocket();var defaultPlacesPanelHTML=placesPanel.innerHTML,humanityData={},humanityPopulation,playerCamp,resources={lumber:0,usedLumber:0,metal:0,usedMetal:0},hexaSize=20,origin={x0:0,y0:0},canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");canvas.width=document.documentElement.clientWidth,canvas.height=document.documentElement.clientHeight,document.styleSheets[0].insertRule("div.controlPanel { max-height:"+(canvas.height-16-58)+"px; }",0);var helpPane=document.getElementById("helpPane");addEventListener("load",function(){localStorage.getItem("firstRun")?Math.random()<.5&&localStorage.getItem("paid")!==""+(new Date).getFullYear()&&showHelp("intro"):localStorage.setItem("firstRun","no")}),travelPanel.onclick=function(){showHelp("welcome")},buildPanel.firstElementChild.onclick=function(){showHelp("build")};var sprites=loadSprites(),spritesWidth=2*hexaSize,spritesLoaded=!1;sprites.onload=function(){spritesLoaded=!0,paint(ctx,hexaSize,origin)};var mπd3=-Math.PI/3,cachedTerrainPaint={},canvasBuffer=document.createElement("canvas");canvasBuffer.width=canvas.width,canvasBuffer.height=canvas.height;var imageBuffer=canvasBuffer.getContext("2d").getImageData(0,0,canvas.width,canvas.height),workerMessage={image:null,size:hexaSize,origin:origin},renderWorker=new Worker("render-worker.js"),cachedPaint={},cachePending={},displayedPaint=document.createElement("canvas");displayedPaint.width=canvas.width,displayedPaint.height=canvas.height;var displayedPaintContext=displayedPaint.getContext("2d"),showTitleScreen=!0;setTimeout(function(){showTitleScreen=!1},2e3);var numberOfHumanAnimations=20,humanAnimation=new Array(numberOfHumanAnimations);initHumans();var humanAnimationTimeout=setInterval(animateHumans,100),numberOfCamps=3,campHue=[],surrenderMessages=["We surrender!","I, for one, welcome our new overlords."],hungerMessages=["Hungry!","Is dinner ready?","I can't feel my stomach!","You're starving us!","I could eat anything now. Rats. Babies.","You look like a sandwich to me."],warMessages=["You've got red on you.","Silence will fall!","Silence! I kill you!","Boy, that escalated quickly.","Sorry Mommy!","New legs, please!","Have you seen my head?","That wine tastes good. Wait—","Tell my wife I loved her… meals…","I do!","Resistance is futile.","I didn't expect the Spanish Inquisition!","Whoop-de-doo!","You'll never take me alive!","Told you he wasn't immortal!","Tu quoque, fili mi!","Do not disturb my circles!","This is no time to be making enemies.","I owe a cock to Asclepius.","More light!","Life's too short!","They couldn't hit an elephant at this dist…","Drink to me!"],warTiles={},surrenderTiles={},starvedTiles={},tileNames=attributeNameFromTile(),tileInfo=document.getElementById("info"),accessibleTiles,currentTile,buildSelectionButtons=document.querySelectorAll("p.buildSelection");hookBuildSelectionButtons();var selectionModes={normal:1,travel:2,build:3,split:4,places:5},selectionMode=selectionModes.normal;travelBut.addEventListener("click",enterTravelMode),buildBut.addEventListener("click",enterBuildMode),splitBut.addEventListener("click",enterSplitMode),placesBut.addEventListener("click",enterPlacesMode),splitInputWidget.addEventListener("input",function(){splitPanelPortion.textContent=""+splitInputWidget.value});var buildHotKeys={48:tileTypes.airport,49:tileTypes.wall,50:tileTypes.road,51:tileTypes.farm,52:tileTypes.residence,53:tileTypes.skyscraper,54:tileTypes.factory,55:tileTypes.dock,56:tileTypes.gunsmith,57:tileTypes.airland};window.onkeydown=function(e){var t=!1,i=!1;39===e.keyCode||68===e.keyCode?(origin.x0+=canvas.width/2|0,i=!0):38===e.keyCode||87===e.keyCode?(origin.y0-=canvas.height/2|0,i=!0):37===e.keyCode||65===e.keyCode?(origin.x0-=canvas.width/2|0,i=!0):40===e.keyCode||83===e.keyCode?(origin.y0+=canvas.height/2|0,i=!0):187===e.keyCode||61===e.keyCode?(hexaSize*=2,origin.x0=2*origin.x0+canvas.width/2|0,origin.y0=2*origin.y0+canvas.height/2|0,t=!0,i=!0):173===e.keyCode||189===e.keyCode||109===e.keyCode||219===e.keyCode||169===e.keyCode?hexaSize>2&&(hexaSize/=2,origin.x0=origin.x0/2-canvas.width/4|0,origin.y0=origin.y0/2-canvas.height/4|0,t=!0,i=!0):84===e.keyCode?enterMode(selectionModes.travel):67===e.keyCode?enterMode(selectionModes.build):70===e.keyCode?enterMode(selectionModes.split):192===e.keyCode?sendBuild(currentTile,null):27===e.keyCode?(enterMode(selectionModes.normal),helpPane.style.display="none"):48<=e.keyCode&&e.keyCode<=57&&sendBuild(currentTile,buildHotKeys[e.keyCode]),t&&(cachedPaint={}),i&&paint(ctx,hexaSize,origin)};var mousePosition,targetTile;canvas.addEventListener("mousemove",showPath),canvas.onmousedown=function(e){0===e.button?(canvas.addEventListener("mouseup",mouseSelection),canvas.addEventListener("mousemove",mouseDrag),lastMousePosition.clientX=e.clientX,lastMousePosition.clientY=e.clientY):2===e.button&&(enterTravelMode(),mouseSelection(e),enterNormalMode())},canvas.oncontextmenu=function(e){e.preventDefault()},function(){var e=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame||function(e){setTimeout(e,0)};window.requestAnimationFrame=e}();var lastMousePosition={clientX:0,clientY:0},drawingWhileDragging=!1,currentlyDragging=!1;canvas.onselectstart=function(){return!1};var dragVelocity=[0,0],dragVector=[0,0],dragTime=0,dragVelTo,dragVelInterval=200;