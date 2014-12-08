(function WebGLRender() {

// Hide the 2D canvas
canvas.style.display = 'none';

// Set up THREE.js.

var scene, camera, renderer, light, cube;

var planeXVertex, planeYVertex, geometry;

window.addEventListener('load', function pageLoaded() {
  var width = window.innerWidth/4; // orthographic
  var height = window.innerHeight/4; // orghographic
  scene = new THREE.Scene();
  //camera = new THREE.PerspectiveCamera(95, width / height, 0.1, 500);
  camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, -500, 500);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('maincanvas');
  document.body.appendChild(renderer.domElement);

  // Plane
  var planeWidth = width;
  var planeHeight = ((height*7/4)|0);
  planeXVertex = ((window.innerWidth/6)|0);
  planeYVertex = planeXVertex;
  geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, planeXVertex, planeYVertex);

  // Water
  var waterGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, planeXVertex, planeYVertex);
  var waterMaterial = new THREE.MeshPhongMaterial( { ambient: 0x030303, color: 0x6666aa, specular: 0x5555ff, shininess: 30, emissive: 0x000030 } );
  waterGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,.4));
  water = new THREE.Mesh(waterGeometry, waterMaterial);
  //scene.add(water);

  // Light
  light = new THREE.DirectionalLight(0xf0f0a0, 1);
  light.position.set(.5, -.2, 1);
  scene.add(light);

  camera.position.z = 20;
  camera.position.y = 0;
  camera.position.x = 0;
  camera.rotation.x = Math.PI / 4;

  computeGeometry();
  var threeTexture = new THREE.Texture(canvas);
  threeTexture.needsUpdate = true;
  groundMaterial = new THREE.MeshLambertMaterial({ map:threeTexture });
  var plane = new THREE.Mesh(geometry, groundMaterial);
  scene.add(plane);
  render();
  //updateSun();
});

// Canvas
var texture = document.createElement('canvas');
var textureContext = texture.getContext('2d');
texture.width = canvas.width;
texture.height = canvas.height;
var textureImage = textureContext.getImageData(0, 0, canvas.width, canvas.height);

var worker = new Worker('webgl-render-worker-gen.js');
var groundMaterial;
worker.addEventListener('message', function workerSend(e) {
  if (e.data.texture) {
    //var region = regionFromPixel(gs.origin.x0, gs.origin.y0, gs.width, gs.height);
    //var cachePos = gs.hexSize + ':' + region;
    //console.log('webgl cachePos:', cachePos);
    //if (cachedTerrainPaint[cachePos]) {
      //cachedTerrainPaint[cachePos].getContext('2d').putImageData(e.data.texture, 0, 0);
    //}
  }
  if (e.data.heightmap) {
    updateGeometry(e.data.heightmap);
  }
});

function computeGeometry() {
  // Get worker information
  worker.postMessage({
    hexSize: gs.hexSize,
    origin: gs.origin,
    canvasWidth: gs.width,
    canvasHeight: gs.height,
    width: planeXVertex,
    height: planeYVertex,
    textureImage: textureImage
  });
}

function updateGeometry(heightmap) {
  for (var i = 0; i < geometry.vertices.length; i++) {
    geometry.vertices[i].z = heightmap[i] * 10;
  }
  geometry.verticesNeedUpdate = true;
  geometry.normalsNeedUpdate = true;
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
}

var time = 0;
function updateSun() {
  setTimeout(updateSun, 100);
  time += 0.01;
  light.position.x = Math.sin(time);
}

var previousOrigin = {x0:0, y0:0};

function render() {
  requestAnimationFrame(render);
  groundMaterial.map = new THREE.Texture(canvas);
  groundMaterial.map.needsUpdate = true;
  if (previousOrigin.x0 !== gs.origin.x0 || previousOrigin.y0 !== gs.origin.y0) {
    previousOrigin.x0 = gs.origin.x0;
    previousOrigin.y0 = gs.origin.y0;
    computeGeometry();
  }
  renderer.render(scene, camera);
}

// Send the center tile to workers, etc.
// This was set in input.js.
sendCenterTile = function(centerTile) {
  for (var i = 0; i < workerPool.length; i++) {
    workerPool[i].postMessage({centerTile: centerTile});
  }
  worker.postMessage({centerTile: centerTile});
};

}());
