/* monument.js — 终章：未闭合、持续向前延伸的历史光丝 */
(function () {
  "use strict";
  var HS = window.HS;
  var canvas = document.getElementById("monument-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  var scene, camera, renderer, points, cloud, raf = null, running = false;
  var N = 2600;

  /* Each strand begins in shared history and travels toward a different, open endpoint. */
  function strandPoint(i) {
    var strand = i % 26;
    var step = Math.floor(i / 26) / 99;
    var endX = 1.1 + (strand / 25) * 4.8;
    var endY = -1.45 + ((strand * 7) % 26) / 25 * 3.0;
    var x = -2.2 + (endX + 2.2) * step;
    var y = -0.25 + (endY + 0.25) * step + Math.sin(step * Math.PI * 2 + strand * 0.58) * 0.34 * step;
    var z = Math.sin(step * Math.PI * 3 + strand * 1.7) * 0.48 * step;
    return new THREE.Vector3(x, y, z);
  }

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0.4, 0.2, 8.3);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    resize();

    var positions = new Float32Array(N * 3);
    var starts = new Float32Array(N * 3);
    var targets = new Float32Array(N * 3);
    var colors = new Float32Array(N * 3);
    var col = new THREE.Color();
    for (var i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
      starts[i * 3] = positions[i * 3];
      starts[i * 3 + 1] = positions[i * 3 + 1];
      starts[i * 3 + 2] = positions[i * 3 + 2];
      var p = strandPoint(i);
      targets[i * 3] = p.x; targets[i * 3 + 1] = p.y; targets[i * 3 + 2] = p.z;
      var tone = Math.random();
      col.set(tone > 0.82 ? 0xd9433f : tone > 0.48 ? 0xc89b5a : 0xbeb5a6);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    cloud = { starts: starts, targets: targets };
    points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.032, vertexColors: true, transparent: true, opacity: 0.88
    }));
    scene.add(points);
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!renderer) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  var progress = 0;
  function loop() {
    if (!running) return;
    progress = Math.min(1, progress + 0.012);
    var eased = progress * progress * (3 - 2 * progress);
    var pos = points.geometry.attributes.position.array;
    for (var i = 0; i < N; i++) {
      var k = i * 3;
      pos[k] = cloud.starts[k] + (cloud.targets[k] - cloud.starts[k]) * eased;
      pos[k + 1] = cloud.starts[k + 1] + (cloud.targets[k + 1] - cloud.starts[k + 1]) * eased;
      pos[k + 2] = cloud.starts[k + 2] + (cloud.targets[k + 2] - cloud.starts[k + 2]) * eased;
    }
    points.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    if (progress < 1) raf = requestAnimationFrame(loop);
    else { running = false; raf = null; }
  }

  function start() {
    init();
    if (HS.reduced) {
      progress = 1;
      points.geometry.attributes.position.array.set(cloud.targets);
      points.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      return;
    }
    running = true; loop();
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); }
  function resume() { if (!running && progress < 1) { running = true; loop(); } }
  window.HS.registerScene("monument", { start: start, pause: pause, resume: resume });
})();
