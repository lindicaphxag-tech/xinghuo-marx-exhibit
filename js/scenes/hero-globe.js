/* hero-globe.js — 序章 3D 地球：点阵球体、城市点位、脉冲涟漪与思潮飞线 */
(function () {
  "use strict";
  var HS = window.HS;
  var canvas = document.getElementById("hero-globe");
  if (!canvas || typeof THREE === "undefined") return;

  var scene, camera, renderer, controls, globe, dots, ringGroup, lineGroup;
  var raf = null, running = false, active = true;
  var R = 2.2;

  /* 城市经纬度（粗略，仅用于球面点位示意） */
  var GEO = {
    london: [-0.13, 51.5], trier: [6.64, 49.75], paris: [2.35, 48.86],
    lyon: [4.83, 45.76], silesia: [17.0, 51.1], brussels: [4.35, 50.85],
    berlin: [13.4, 52.52], peterburg: [30.3, 59.93], geneva: [6.14, 46.2],
    hague: [4.3, 52.1], cologne: [6.96, 50.94]
  };

  function llToVec(lon, lat, r) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 6.2);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    resize();

    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 4.5; controls.maxDistance = 8;
      /* 地球不自行旋转；观众可主动拖动查看地理关系。 */
      controls.autoRotate = false;
    }

    /* 点阵球体 */
    var g = new THREE.BufferGeometry();
    var pts = [];
    var N = 1400;
    for (var i = 0; i < N; i++) {
      var u = Math.random(), v = Math.random();
      var theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      pts.push(R * Math.sin(phi) * Math.cos(theta), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(theta));
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    dots = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xa99f8a, size: 0.018, transparent: true, opacity: 0.55
    }));
    scene.add(dots);

    /* 经纬线骨架 */
    globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 36, 24),
      new THREE.MeshBasicMaterial({ color: 0x241f1b, wireframe: true, transparent: true, opacity: 0.18 })
    );
    scene.add(globe);

    ringGroup = new THREE.Group();
    lineGroup = new THREE.Group();
    scene.add(ringGroup, lineGroup);

    /* 城市点位 + 静态定位环；金线表示跨城联系。 */
    Object.keys(GEO).forEach(function (id) {
      var p = llToVec(GEO[id][0], GEO[id][1], R);
      var m = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xd9433f })
      );
      m.position.copy(p);
      scene.add(m);

      var ring = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.065, 28),
        new THREE.MeshBasicMaterial({ color: 0xb3202a, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      );
      ring.position.copy(p);
      ring.lookAt(p.clone().multiplyScalar(2));
      ringGroup.add(ring);
    });

    /* 城市间飞线（弧线） */
    var pairs = [["london", "paris"], ["paris", "lyon"], ["london", "berlin"], ["paris", "brussels"], ["london", "geneva"], ["berlin", "peterburg"], ["paris", "geneva"]];
    pairs.forEach(function (pair) {
      var a = llToVec(GEO[pair[0]][0], GEO[pair[0]][1], R);
      var b = llToVec(GEO[pair[1]][0], GEO[pair[1]][1], R);
      var mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.18);
      var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      var geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc89b5a, transparent: true, opacity: 0.22 }));
      lineGroup.add(line);
    });

    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!renderer) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  function start() { init(); running = true; loop(); }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); }
  function resume() { if (!running) { running = true; loop(); } }

  window.HS.registerScene("hero", {
    start: start, pause: pause, resume: resume,
    activate: function () { active = true; },
    deactivate: function () { active = false; }
  });
})();
