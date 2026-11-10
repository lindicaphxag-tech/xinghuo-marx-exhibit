/* scene-block.js —— 历史空间独立窗口：本地 GLB 用 three.js 渲染，外部扫描用 iframe */
(function () {
  "use strict";

  var host = document.getElementById("scene-block");
  if (!host) return;

  var renderer = null, scene = null, camera = null, controls = null, modelRoot = null;
  var raf = null;

  fetch("assets/scenes/scenes.json?v=20261110k")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var items = d.items || d;
      /* 实景扫描的市政厅广场放最前，其次复原类，最后其他 */
      var PRIORITY = ["paris_commune_square"];
      var first = items.filter(function (i) { return PRIORITY.indexOf(i.id) >= 0; });
      var recon = items.filter(function (i) {
        return PRIORITY.indexOf(i.id) < 0 && i.representation === "historical-reconstruction";
      });
      var rest = items.filter(function (i) {
        return PRIORITY.indexOf(i.id) < 0 && i.representation !== "historical-reconstruction";
      });
      build(first.concat(recon).concat(rest).slice(0, 12));
    })
    .catch(function () { });

  function esc(s) { return String(s || "").replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; }); }

  function build(list) {
    host.innerHTML =
      '<div class="scene-block">' +
        '<div class="sb-view" id="sb-view"></div>' +
        '<aside class="sb-side">' +
          '<div class="sb-rail" id="sb-rail"></div>' +
          '<div class="sb-caption" id="sb-caption"></div>' +
        '</aside>' +
      '</div>';

    var view = document.getElementById("sb-view");
    var rail = document.getElementById("sb-rail");
    var cap = document.getElementById("sb-caption");

    function show(it, btn) {
      Array.prototype.forEach.call(rail.children, function (b) { b.classList.remove("on"); });
      if (btn) btn.classList.add("on");

      cap.innerHTML = "<h4>" + esc(it.name) + "</h4>" +
        "<p>" + esc(it.note || "") + "</p>" +
        (it.reference_url ? '<a href="' + it.reference_url + '" target="_blank" rel="noopener noreferrer">' +
          esc(it.reference_label || "查看来源") + " ↗</a>" : "") +
        (it.credit ? '<p style="margin-top:6px;color:#8a7c67">' + esc(it.credit) + "</p>" : "");

      if (it.file && window.THREE) {
        showLocal(view, it);
      } else if (it.embedUrl) {
        stopLoop();
        view.innerHTML = '<div class="sb-loading"><i></i>正在加载三维模型…</div>' +
          '<iframe src="' + esc(it.embedUrl) + '" title="' + esc(it.name) +
          '" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>';
        var fr = view.querySelector("iframe");
        var ld = view.querySelector(".sb-loading");
        if (fr && ld) {
          fr.addEventListener("load", function () { ld.classList.add("hide"); });
          setTimeout(function () { ld.classList.add("hide"); }, 9000);   /* 兜底：9 秒后撤提示 */
        }
      } else {
        stopLoop();
        view.innerHTML = '<div class="sb-poster"><span class="glyph">' + esc(it.glyph || "▦") + '</span><p>' +
          esc(it.name) + "</p></div>";
      }
    }

    list.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-card" + (i === 0 ? " on" : "");
      var kind = it.representation === "historical-reconstruction" ? "史料约束复原" :
        (it.representation && it.representation.indexOf("lidar") >= 0 ? "当代 LiDAR" : "实景扫描");
      b.innerHTML = "<b>" + esc(it.name) + "</b><span>" + kind + "</span>";
      b.addEventListener("click", function () { show(it, b); });
      rail.appendChild(b);
    });

    if (list.length) show(list[0], rail.firstChild);
    reorderArtifactRail();
  }

  /* ---------- 本地 GLB 渲染 ---------- */
  function initGL(view) {
    var cv = document.createElement("canvas");
    cv.style.cssText = "width:100%;height:100%;display:block;background:#141210";
    view.innerHTML = "";
    view.appendChild(cv);

    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x141210, 1);
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8172, 1.6));
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.7));
    var key = new THREE.DirectionalLight(0xfff6e8, 2.0); key.position.set(1.8, 2.4, 2.0); scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe9ff, 0.8); fill.position.set(-2, 1.2, -1.4); scene.add(fill);

    camera = new THREE.PerspectiveCamera(38, 1.6, 0.01, 200);
    controls = new THREE.OrbitControls(camera, cv);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = -1.2;
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function resize(view) {
    if (!renderer) return;
    var w = view.clientWidth || 800, h = view.clientHeight || 520;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop(view) {
    raf = requestAnimationFrame(function () { loop(view); });
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function showLocal(view, it) {
    stopLoop();
    if (!renderer) initGL(view);
    else if (!view.querySelector("canvas")) initGL(view);

    var url = "assets/scenes/" + it.file;
    new THREE.GLTFLoader().load(url, function (gltf) {
      if (modelRoot) { scene.remove(modelRoot); modelRoot = null; }
      var obj = gltf.scene;
      modelRoot = obj;
      scene.add(obj);
      obj.updateMatrixWorld(true);

      var box = new THREE.Box3().setFromObject(obj);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z) || 1;
      var k = 4.8 / maxDim;
      obj.scale.setScalar(k);
      obj.position.sub(center.clone().multiplyScalar(k));

      var fitted = new THREE.Box3().setFromObject(obj);
      var fs = fitted.getSize(new THREE.Vector3());
      var radius = fs.length() * 0.5;
      var dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 0.62;
      controls.target.set(0, fs.y * 0.06, 0);
      camera.position.set(dist * 0.9, dist * 0.66, dist * 1.0);
      camera.lookAt(controls.target);
      controls.update();

      resize(view);
      loop(view);
    }, undefined, function () {
      view.innerHTML = '<div class="sb-poster"><span class="glyph">' + esc(it.glyph || "▦") + "</span><p>" +
        esc(it.name) + "<br>模型未能加载，可查看右侧来源。</p></div>";
    });
  }

  function reorderArtifactRail() {
    var rail = document.getElementById("artifact-rail");
    if (!rail || rail.dataset.sorted) return;
    var btns = Array.prototype.slice.call(rail.children);
    if (btns.length < 3) return;
    var isFigure = function (b) { return /像|胸像|雕像|铜像|纪念碑/.test(b.textContent || ""); };
    var figures = btns.filter(isFigure);
    var others = btns.filter(function (b) { return !isFigure(b); });
    if (!figures.length) return;
    figures.concat(others).forEach(function (b) { rail.appendChild(b); });
    rail.dataset.sorted = "1";
  }

  var tries = 0;
  var t = setInterval(function () {
    reorderArtifactRail();
    if (++tries > 12) clearInterval(t);
  }, 700);
})();
