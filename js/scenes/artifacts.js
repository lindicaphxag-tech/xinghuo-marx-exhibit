/* artifacts.js — 卷十 文物与历史空间三维厅
 * 文物条目标明单图推断质量；空间条目加载本地史料约束复原或外部实景扫描，并展示证据边界。
 * 清单见 assets/models/models.json 与 assets/scenes/scenes.json。
 */
(function () {
  "use strict";
  var loadSeq = 0;

  var canvas = document.getElementById("artifact-canvas");
  if (!canvas || typeof THREE === "undefined") return;
  var evidencePanel = document.getElementById("artifact-evidence");
  var externalViewer = document.getElementById("artifact-external-viewer");
  var viewHint = document.querySelector(".artifact-hint");
  var viewReset = document.getElementById("artifact-reset");
  var cameraTools = document.getElementById("artifact-camera-tools");
  var pairSwitch = document.getElementById("artifact-pair-switch");
  var wireToggle = document.getElementById("artifact-wire-toggle");

  var BASE = "assets/models/";
  var scene, camera, renderer, group = null, floor = null, loader, raf = null, running = false;
  var items = [], current = -1, inited = false, sceneView = null;
  var e4Wireframe = false;   /* 默认实体化，需要时再切线框 */
  var lidarViewerInstance = null, lidarViewerScriptPromise = null;
  var timePlaybackTimer = null, timePlaybackOn = false, timePlaybackPairId = null;
  var query = new URLSearchParams(window.location.search);
  var mode = query.get("mode") === "scenes" || query.has("scene") ? "scenes" : "artifacts";

  function destroyLidarViewer() {
    if (lidarViewerInstance && typeof lidarViewerInstance.destroy === "function") lidarViewerInstance.destroy();
    lidarViewerInstance = null;
  }

  function loadLidarViewer() {
    if (window.LidarViewer) return Promise.resolve(window.LidarViewer);
    if (lidarViewerScriptPromise) return lidarViewerScriptPromise;
    lidarViewerScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "assets/vendor/lidar-viewer-1.0.0/lidar-viewer.min.js";
      script.onload = function () { window.LidarViewer ? resolve(window.LidarViewer) : reject(new Error("点云查看器脚本未初始化")); };
      script.onerror = function () { reject(new Error("点云查看器脚本加载失败")); };
      document.head.appendChild(script);
    });
    return lidarViewerScriptPromise;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
    camera.position.set(0, 0.12, 2.6);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    /* Keep deep cutaways and interior bays readable without flattening their
     * form. The old single ambient source left factory and hall interiors
     * nearly black on displays with modest brightness. */
    if ("toneMapping" in renderer && THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
    }

    scene.add(new THREE.HemisphereLight(0xf5f4ed, 0x746858, 1.25));
    scene.add(new THREE.AmbientLight(0xffe9ce, 0.48));

    var key = new THREE.DirectionalLight(0xfff4e4, 2.05);
    key.position.set(2.8, 4.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0002;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xe2e8e1, 0.82);
    fill.position.set(-3.2, 2.2, 2.2);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0xd9b98b, 0.28);
    rim.position.set(-2.0, 1.2, -1.4);
    scene.add(rim);

    if (THREE.OrbitControls) {
      var controls = new THREE.OrbitControls(camera, canvas);
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.45;
      controls.maxDistance = 12;
      controls.autoRotate = true;          /* 进场景即缓慢环绕 */
      controls.autoRotateSpeed = 0.55;
      controls.addEventListener("start", function () { controls.autoRotate = false; });
      controls.target.set(0, 0, 0);
      scene.userData.controls = controls;
    }

    if (THREE.GLTFLoader) loader = new THREE.GLTFLoader();
    inited = true;
  }

  function clearModel() {
    if (!group) return;
    scene.remove(group);
    group.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    group = null;
  }

  function setE4Wireframe(obj, enabled) {
    if (!obj) return;
    obj.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (material) {
        if (!material.userData) material.userData = {};
        if (!material.userData.hsE4Original) {
          material.userData.hsE4Original = {
            wireframe: !!material.wireframe,
            transparent: !!material.transparent,
            opacity: material.opacity,
            depthWrite: material.depthWrite,
            color: material.color && material.color.clone()
          };
        }
        var original = material.userData.hsE4Original;
        if (enabled) {
          material.wireframe = true;
          material.transparent = true;
          material.opacity = 0.88;
          material.depthWrite = false;
          if (material.color) material.color.set(0x896d47);
        } else {
          material.wireframe = original.wireframe;
          material.transparent = original.transparent;
          material.opacity = original.opacity;
          material.depthWrite = original.depthWrite;
          if (material.color && original.color) material.color.copy(original.color);
        }
        material.needsUpdate = true;
      });
    });
  }

  function syncWireToggle() {
    if (!wireToggle) return;
    wireToggle.textContent = e4Wireframe ? "查看实体化复原 · E4" : "返回 E4 线框";
    wireToggle.setAttribute("aria-pressed", String(e4Wireframe));
  }

  if (wireToggle) wireToggle.addEventListener("click", function () {
    e4Wireframe = !e4Wireframe;
    if (items[current] && items[current].type !== "scene" && items[current].quality !== "flat" && items[current].quality !== "fail") {
      setE4Wireframe(group, e4Wireframe);
    }
    syncWireToggle();
  });

  /* 把一个模型扶正：最长轴转到 Y；再用“底部截面更宽”判断是否上下颠倒 */
  function upright(obj) {
    obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj);
    var s = box.getSize(new THREE.Vector3());
    if (s.y >= s.x * 1.02 && s.y >= s.z * 1.02) { verifyUp(obj); return; }

    if (s.x >= s.z) {
      obj.rotation.z += Math.PI / 2;      // X 最长 → 绕 Z 转 90°
    } else {
      obj.rotation.x -= Math.PI / 2;      // Z 最长 → 绕 X 转 -90°
    }
    obj.updateMatrixWorld(true);
    verifyUp(obj);
  }

  /* 若底部比顶部窄，说明头朝下，翻 180° */
  function verifyUp(obj) {
    var geoBox = new THREE.Box3().setFromObject(obj);
    var min = geoBox.min.y, max = geoBox.max.y, h = max - min;
    if (!(h > 0)) return;
    var lowC = 0, lowN = 0, highC = 0, highN = 0;
    var v = new THREE.Vector3();
    obj.updateMatrixWorld(true);
    obj.traverse(function (o) {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      var pos = o.geometry.attributes.position;
      var step = Math.max(1, Math.floor(pos.count / 2600));
      for (var i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        var d = Math.hypot(v.x, v.z);
        var rel = (v.y - min) / h;
        if (rel < 0.18) { lowC += d; lowN++; }
        else if (rel > 0.82) { highC += d; highN++; }
      }
    });
    if (!lowN || !highN) return;
    if (lowC / lowN < highC / highN * 0.86) {     // 底窄上宽 → 翻了
      obj.rotation.z += Math.PI;
      obj.updateMatrixWorld(true);
    }
  }

  function normalize(obj) {
    obj.traverse(function (o) {
      if (o.isMesh && o.geometry) {
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (m) {
            m.vertexColors = !!o.geometry.attributes.color;
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
          }
        });
      }
    });
    /* 自动扶正：任何单图重建模型都让最长边朝上，并按“底座更宽”判断正反 */
    var isArtifact = items[current] && items[current].type !== "scene";
    if (isArtifact) upright(obj);
    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z) || 1;
    obj.updateMatrixWorld(true);
    var centerLocal = obj.worldToLocal(center.clone());
    var fitScale = 1.25 / maxDim;
    /* Root translation is not affected by root scale. Scale the centering
     * offset too, otherwise long-site GLBs remain several metres off-screen. */
    obj.scale.setScalar(fitScale);
    obj.position.sub(centerLocal.multiplyScalar(fitScale));
    obj.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (m && "roughness" in m) m.roughness = Math.max(m.roughness || 0, 0.72);
      });
    });
    sceneView = null;
    if (items[current] && items[current].type === "scene") {
      /* Long façades should open on a human-scale section of the site. A
       * scene can request a shorter initial framing diameter while the orbit
       * controls still let visitors zoom out to the full footprint. */
      var focusDiameter = Number(items[current].camera_focus_diameter) || size.length();
      var radius = Math.max(Math.min(size.length(), focusDiameter) * fitScale * 0.5, 0.08);
      var distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.18;
      var view = items[current].camera_direction || [0.44, 0.32, -1];
      var direction = new THREE.Vector3(view[0], view[1], view[2]).normalize();
      sceneView = { x: direction.x * distance, y: direction.y * distance, z: direction.z * distance };
    }
    resetView(true);
    if (items[current] && items[current].type === "scene") {
      var fitted = new THREE.Box3().setFromObject(obj);
      var floorY = fitted.min.y - 0.012;
      if (!floor) {
        floor = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.92 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
      }
      floor.position.y = floorY;
      floor.visible = true;
    } else {
      if (floor) floor.visible = false;
    }
  }

  function caption(it) {
    var el = document.getElementById("artifact-caption");
    if (!el) return;
    var weakModel = it.type !== "scene" && (it.quality === "flat" || it.quality === "fail");
    var sceneStatus = {
      "present-day-archaeological-scan": "当代考古遗址摄影测量实扫：记录2017年仍存的遗址状态，不是1779年工厂原貌。",
      "present-day-scan": "这是现存建筑或纪念物的当代摄影测量扫描。请以本条对象说明核对扫描年代与历史事件地点；它不能代替事件发生时的现场。",
      "present-day-interior-360": "现存室内全景漫游：展示 1871 年火灾后重建的市政厅，不代表旧楼内部。",
      "present-day-lidar-terrain": "当代 1 米源数据 LiDAR 裸地地形网格：2 米采样、垂直夸张 5 倍；没有建筑和表面纹理，不代表1848年地貌。",
      "present-day-lidar-surface": "当代1米源数据 LiDAR DSM 表面网格：2米采样，显示建筑屋顶与树冠顶部；不含垂直立面或内部，不是历史扫描。",
      "present-day-lidar-point-cloud": "当代 IGN 航空 LiDAR 实测点云：可在展厅内按位置加载；不是1871年历史扫描，也不代表未改变的原墙。",
      "historical-3d-reference": "外部教学模型作参照；本地三维为依据史料搭建的可视化复原，不是现场扫描。",
      "historical-reconstruction": "史料约束的三维复原：可交互观察空间关系；推测部分与证据边界见说明，不是实景扫描。",
      "reconstruction-needed": "史料复原待补：当前仅展示可交互空间推演，不能当作现场扫描或精确测绘。",
      "concept": "地点与史料未核实：仅为主题空间概念模型，不作为历史现场复原。"
    };
    var warning = it.type === "scene"
      ? (sceneStatus[it.representation] || "现场数据性质未核实；当前几何体不作为真实历史证据。")
      : weakModel
        ? "该单图生成模型未通过几何质量检查，已停用三维展示。现在展示原始档案图像，避免将薄片或破损网格误当成文物实测模型。"
        : "推断性复原：单图生成，背面与结构为模型推测，不可作为实测尺寸依据。";
    var sceneCredits = {
      "present-day-archaeological-scan": "当代考古遗址摄影测量 · 非1779年现场",
      "present-day-scan": "现存建筑摄影测量 · 非历史时期原貌",
      "present-day-interior-360": "现存建筑 Street View 全景 · 1871年后重建",
      "present-day-lidar-terrain": "环境署 LiDAR 裸地地形 · 1米源数据 / 2米网格",
      "present-day-lidar-surface": "环境署 LiDAR DSM 表面 · 屋顶/树冠 / 2米网格",
      "present-day-lidar-point-cloud": "IGN LiDAR HD 点云 · 可交互加载 / 当代数据",
      "historical-3d-reference": "外部教学模型参照 + 本地史料复原",
      "historical-reconstruction": "史料约束的可交互三维复原 · 非实景扫描",
      "reconstruction-needed": "待补证据的空间推演 · 非实景扫描",
      "concept": "主题概念模型 · 非历史现场"
    };
    var credit = it.type === "scene" ? (it.credit || sceneCredits[it.representation] || "来源性质待核实") : (it.credit || "单图推断复原");
    var evidenceBadge = it.type !== "scene" ? "<span class='artifact-evidence-level'>E4 · 单图推断复原</span>" :
      (/^present-day/.test(it.representation || "") ? "<span class='artifact-evidence-level'>E1 · 当代实测，非历史原貌</span>" :
        it.representation === "historical-reconstruction" ? "<span class='artifact-evidence-level'>E3 · 史料约束复原</span>" :
          /^(concept|reconstruction-needed)$/.test(it.representation || "") ? "<span class='artifact-evidence-level'>E4 · 概念或推断模型</span>" : "");
    function esc(value) {
      return String(value || "").replace(/[&<>\"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
      });
    }
    var reconstructionNotes = it.type === "scene" ?
      (it.model_disclaimer ? "<p class='artifact-warn'>" + esc(it.model_disclaimer) + "</p>" : "") +
      (it.reconstruction_basis ? "<p><strong>史料约束：</strong>" + esc(it.reconstruction_basis) + "</p>" : "") +
      (it.reconstruction_uncertainty ? "<p><strong>仍待考：</strong>" + esc(it.reconstruction_uncertainty) + "</p>" : "") : "";
    var cameraNote = it.type === "scene" && it.camera_note
      ? "<p class='artifact-camera-note'><strong>当前视点：</strong>" + esc(it.camera_note) + "</p>"
      : "";
    el.innerHTML =
      evidenceBadge +
      "<h3>" + esc(it.name) + "</h3>" +
      "<p class='artifact-meta'>" + esc(credit) + "</p>" +
      "<p>" + esc(it.note) + "</p>" +
      "<p class='artifact-warn'>" + esc(warning) + "</p>" + reconstructionNotes + cameraNote +
      (it.reference_url ? "<p><a class='artifact-reference' href='" + esc(it.reference_url) + "' target='_blank' rel='noopener noreferrer'>" + esc(it.reference_label || "打开更可靠的数字参照") + " ↗</a><br><small>" + esc(it.reference_note || "外部参考资源；请遵守来源站许可。") + "</small></p>" : "") +
      (it.source_url ? "<p><a href='" + esc(it.source_url) + "' target='_blank' rel='noopener noreferrer'>核对原始来源与许可 ↗</a></p>" : "");
    if (it.type === "scene" && Array.isArray(it.historical_phases) && it.historical_phases.length) {
      var history = document.createElement("section");
      history.className = "scene-history-timeline";
      var historyHeading = document.createElement("h4");
      historyHeading.textContent = "历史阶段与空间用途";
      var historyNote = document.createElement("p");
      historyNote.className = "scene-history-note";
      historyNote.textContent = "点击年代查看该阶段的史料说明；本时间线切换文字，不替换三维模型。画面所代表的建筑年代见上方场景说明。";
      var phaseNav = document.createElement("div");
      phaseNav.className = "scene-history-phases";
      phaseNav.setAttribute("role", "group");
      phaseNav.setAttribute("aria-label", "选择历史阶段");
      var phaseDetail = document.createElement("div");
      phaseDetail.className = "scene-history-detail";
      function selectPhase(index) {
        var phase = it.historical_phases[index];
        phaseDetail.replaceChildren();
        var title = document.createElement("strong");
        title.textContent = phase.date + " · " + phase.title;
        var description = document.createElement("p");
        description.textContent = phase.description;
        phaseDetail.append(title, description);
        Array.prototype.forEach.call(phaseNav.querySelectorAll("button"), function (button, i) {
          button.setAttribute("aria-pressed", String(i === index));
        });
      }
      it.historical_phases.forEach(function (phase, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = phase.date;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function () { selectPhase(index); });
        phaseNav.appendChild(button);
      });
      history.append(historyHeading, historyNote, phaseNav, phaseDetail);
      el.appendChild(history);
      selectPhase(0);
    }
    if (it.type === "scene" && it.source_image) {
      var sourceFigure = document.createElement("figure");
      sourceFigure.className = "scene-inline-evidence";
      var sourceImage = document.createElement("img");
      sourceImage.src = it.source_image;
      sourceImage.alt = it.source_image_alt || (it.name + " · 同期史料图像");
      sourceImage.loading = "lazy";
      sourceImage.onerror = function () { sourceImage.replaceWith(document.createTextNode("史料图像暂不可用，请打开来源页核对。")); };
      var sourceCaption = document.createElement("figcaption");
      sourceCaption.textContent = it.source_image_caption || "同期影像仅用于约束可见部分，不代表完整空间扫描。";
      sourceFigure.append(sourceImage, sourceCaption);
      if (it.source_image_credit_url) {
        var sourceCredit = document.createElement("a");
        sourceCredit.href = it.source_image_credit_url;
        sourceCredit.target = "_blank"; sourceCredit.rel = "noopener noreferrer";
        sourceCredit.textContent = "核对影像馆藏记录与许可 ↗";
        sourceFigure.appendChild(sourceCredit);
      }
      el.appendChild(sourceFigure);
    }
    var pairedSceneId = it.paired_scene_id || it.related_context_id;
    var pairedScene = pairedSceneId && items.find(function (item) { return item.id === pairedSceneId; });
    if (it.type === "scene" && pairedScene) {
      var pairRow = document.createElement("div"); pairRow.className = "scene-pair-link";
      var pairLabel = document.createElement("span"); pairLabel.textContent = "同址/同主题对照";
      var pairButton = document.createElement("button"); pairButton.type = "button";
      pairButton.textContent = "切换查看：" + pairedScene.name;
      pairButton.addEventListener("click", function () { select(items.indexOf(pairedScene)); });
      pairRow.append(pairLabel, pairButton); el.appendChild(pairRow);
    }
    (it.related_sources || []).forEach(function (source) {
      var sourceRow = document.createElement("p");
      sourceRow.className = "scene-inline-source";
      var sourceLink = document.createElement("a");
      sourceLink.href = source.url; sourceLink.target = "_blank"; sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = source.label + " ↗";
      sourceRow.append(sourceLink);
      if (source.note) { var sourceNote = document.createElement("small"); sourceNote.textContent = source.note; sourceRow.appendChild(sourceNote); }
      el.appendChild(sourceRow);
    });
    var galleries = it.evidence_galleries || [];
    if (!galleries.length && it.id === "hotel_de_ville_pre1871") {
      var currentCityHall = items.find(function (item) { return item.id === "paris_commune_square"; });
      galleries = currentCityHall && currentCityHall.evidence_galleries || [];
    }
    if (it.type === "scene" && galleries.length) {
      var evidence = document.createElement("section"); evidence.className = "scene-inline-gallery";
      var toggle = document.createElement("button"); toggle.type = "button"; toggle.textContent = "展开现场与馆藏影像证据 · " + galleries.reduce(function (n, g) { return n + g.images.length; }, 0) + " 张";
      var body = document.createElement("div"); body.hidden = true;
      var tabs = document.createElement("div"); tabs.className = "scene-gallery-tabs";
      var image = document.createElement("img"); image.className = "scene-gallery-image"; image.loading = "lazy";
      var captionText = document.createElement("p"); captionText.className = "scene-gallery-caption";
      var attribution = document.createElement("p"); attribution.className = "scene-gallery-caption";
      var sourceLink = document.createElement("a"); sourceLink.className = "scene-gallery-source"; sourceLink.target = "_blank"; sourceLink.rel = "noopener noreferrer";
      var controlsRow = document.createElement("div"); controlsRow.className = "scene-gallery-nav";
      var previous = document.createElement("button"); previous.type = "button"; previous.textContent = "← 上一张";
      var next = document.createElement("button"); next.type = "button"; next.textContent = "下一张 →";
      controlsRow.append(previous, next);
      var groupIndex = 0, imageIndex = 0;
      function renderInlineEvidence() {
        var gallery = galleries[groupIndex], item = gallery.images[imageIndex];
        image.src = item.src; image.alt = item.label;
        captionText.textContent = item.label + " · " + (imageIndex + 1) + " / " + gallery.images.length;
        attribution.textContent = gallery.note + " · " + gallery.credit;
        sourceLink.href = item.source_url || gallery.source_url; sourceLink.textContent = "打开这张影像的来源与许可 ↗";
        previous.disabled = imageIndex === 0; next.disabled = imageIndex === gallery.images.length - 1;
        Array.prototype.forEach.call(tabs.querySelectorAll("button"), function (button, i) { button.classList.toggle("on", i === groupIndex); });
      }
      galleries.forEach(function (gallery, i) {
        var tab = document.createElement("button"); tab.type = "button";
        tab.textContent = gallery.title.split(" · ")[0] + " · " + gallery.images.length + " 张";
        tab.addEventListener("click", function () { groupIndex = i; imageIndex = 0; renderInlineEvidence(); });
        tabs.appendChild(tab);
      });
      previous.addEventListener("click", function () { if (imageIndex > 0) { imageIndex--; renderInlineEvidence(); } });
      next.addEventListener("click", function () { if (imageIndex < galleries[groupIndex].images.length - 1) { imageIndex++; renderInlineEvidence(); } });
      toggle.addEventListener("click", function () { body.hidden = !body.hidden; toggle.setAttribute("aria-expanded", String(!body.hidden)); if (!body.hidden) renderInlineEvidence(); });
      body.append(tabs, image, captionText, attribution, sourceLink, controlsRow);
      evidence.append(toggle, body); el.appendChild(evidence);
    }
    (it.related_3d_models || []).forEach(function (model) {
      if (model.viewer_url) {
        var sourceSection = document.createElement("section");
        sourceSection.className = "scene-related-source scene-related-model";
        if (model.representation_label) {
          var modelType = document.createElement("span");
          modelType.className = "scene-model-type";
          modelType.textContent = model.representation_label;
          sourceSection.appendChild(modelType);
        }
        var sourceLink = document.createElement(model.inline_lidar ? "button" : "a");
        sourceLink.className = "scene-related-model-open";
        if (model.inline_lidar) {
          sourceLink.type = "button";
          sourceLink.textContent = "在展厅内加载现状三维点云：" + model.name;
          sourceLink.addEventListener("click", function () {
            if (!externalViewer) return;
            destroyLidarViewer();
            externalViewer.replaceChildren();
            var panel = document.createElement("section");
            panel.className = "scene-lidar-panel";
            var bar = document.createElement("div"); bar.className = "scene-lidar-bar";
            var title = document.createElement("strong"); title.textContent = model.panel_title || model.name || "IGN LiDAR HD · 当代点云";
            var status = document.createElement("span"); status.setAttribute("aria-live", "polite"); status.textContent = "正在连接 IGN 开放点云…";
            var close = document.createElement("button"); close.type = "button"; close.textContent = "返回当前场景 ×";
            close.addEventListener("click", function () {
              select(items.indexOf(it));
            });
            bar.append(title, status, close);
            var scaleBar = document.createElement("div"); scaleBar.className = "scene-lidar-scale";
            var spanLabel = document.createElement("span"); spanLabel.textContent = "观察范围";
            var spanButtons = document.createElement("div"); spanButtons.className = "scene-lidar-scale-buttons";
            var spanChoices = [
              { label: "街区 240 m", span: model.inline_lidar.span },
              { label: "城区 600 m", span: Math.max(model.inline_lidar.span, 600) },
              { label: "区域 1.5 km", span: Math.max(model.inline_lidar.span, 1500) }
            ];
            var activeSpan = spanChoices[0].span, activeBudget = 300000, mountGeneration = 0;
            var viewport = document.createElement("div"); viewport.className = "scene-lidar-viewport";
            spanChoices.forEach(function (choice, index) {
              var button = document.createElement("button"); button.type = "button"; button.textContent = choice.label;
              button.setAttribute("aria-pressed", String(index === 0));
              button.addEventListener("click", function () {
                activeSpan = choice.span;
                Array.prototype.forEach.call(spanButtons.querySelectorAll("button"), function (item, i) { item.setAttribute("aria-pressed", String(i === index)); });
                mountLidar();
              });
              spanButtons.appendChild(button);
            });
            var densityLabel = document.createElement("span"); densityLabel.textContent = "细节预算";
            var densityButtons = document.createElement("div"); densityButtons.className = "scene-lidar-scale-buttons";
            [{ label: "标准 300k", points: 300000 }, { label: "精细 600k", points: 600000 }].forEach(function (choice) {
              var button = document.createElement("button"); button.type = "button"; button.textContent = choice.label;
              button.setAttribute("aria-pressed", String(choice.points === activeBudget));
              button.addEventListener("click", function () {
                activeBudget = choice.points;
                Array.prototype.forEach.call(densityButtons.querySelectorAll("button"), function (item) { item.setAttribute("aria-pressed", String(item === button)); });
                mountLidar();
              });
              densityButtons.appendChild(button);
            });
            scaleBar.append(spanLabel, spanButtons, densityLabel, densityButtons);
            var attribution = document.createElement("p"); attribution.className = "scene-lidar-attribution";
            attribution.textContent = "点云数据 © IGN · Licence Ouverte 2.0。查看器遵循其随附许可并保留可点击署名；这是当代地表/建筑点云，不是历史年代扫描。地点精度与适用边界见本场景说明。";
            var original = document.createElement("a"); original.href = model.viewer_url; original.target = "_blank"; original.rel = "noopener noreferrer";
            original.textContent = model.viewer_label || "打开外部 LiDAR HD 点云查看器 ↗";
            var data = document.createElement("a"); data.href = model.model_url; data.target = "_blank"; data.rel = "noopener noreferrer";
            data.textContent = "核对 LiDAR 数据与许可 ↗";
            var controls = document.createElement("div"); controls.className = "scene-lidar-links"; controls.append(original, data);
            panel.append(bar, scaleBar, viewport, attribution, controls); externalViewer.appendChild(panel);
            externalViewer.hidden = false; canvas.style.display = "none";
            if (viewHint) viewHint.hidden = true; if (viewReset) viewReset.hidden = true; if (cameraTools) cameraTools.hidden = true;
            var viewerStage = document.getElementById("artifact-view");
            if (viewerStage) {
              var viewerTop = viewerStage.getBoundingClientRect().top + window.pageYOffset - 80;
              window.scrollTo({ top: viewerTop, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            }
            function mountLidar() {
              var generation = ++mountGeneration;
              destroyLidarViewer();
              status.textContent = "正在读取 " + activeSpan.toLocaleString("zh-CN") + " 米范围 · 最多 " + (activeBudget / 1000) + "k 点…";
              loadLidarViewer().then(function (api) {
              if (!externalViewer.contains(viewport) || generation !== mountGeneration) return;
              lidarViewerInstance = api.create({
                container: viewport,
                center: model.inline_lidar.center,
                span: activeSpan,
                height: Math.min(520, Math.max(320, Math.floor(window.innerHeight * 0.54))),
                couleur: "#625747",
                fond: "#e9e5dc",
                maxPoints: activeBudget,
                credit: true,
                wasmUrl: "assets/vendor/lidar-viewer-1.0.0/laz-perf.wasm",
                onStatus: function (message) { status.textContent = message; },
                onReady: function (info) { status.textContent = "已加载 " + Number(info.points || 0).toLocaleString("zh-CN") + " 个实测点 · " + activeSpan.toLocaleString("zh-CN") + " 米范围 · " + (info.epsg || "IGN LiDAR HD"); },
                onError: function (error) { status.textContent = "此位置的在线点云暂不可用：" + (error && error.message ? error.message : "数据服务错误"); }
              });
              if (lidarViewerInstance.ready && typeof lidarViewerInstance.ready.catch === "function") lidarViewerInstance.ready.catch(function () {});
              }).catch(function (error) { status.textContent = error.message + "；可使用下方第三方地址搜索查看器。"; });
            }
            mountLidar();
          });
        } else {
          sourceLink.href = model.viewer_url;
          sourceLink.target = "_blank";
          sourceLink.rel = "noopener noreferrer";
          sourceLink.textContent = (model.viewer_label || "打开现状三维资料") + "：" + model.name + " ↗";
        }
        sourceSection.appendChild(sourceLink);
        var sourceNote = document.createElement("p");
        sourceNote.textContent = model.note + " · " + model.credit + (model.license_status ? " · 许可边界：" + model.license_status : "");
        sourceSection.appendChild(sourceNote);
        if (model.model_url) {
          var dataLink = document.createElement("a");
          dataLink.href = model.model_url;
          dataLink.target = "_blank";
          dataLink.rel = "noopener noreferrer";
          dataLink.textContent = model.data_label || "核对点云数据与开放许可 ↗";
          sourceSection.appendChild(dataLink);
        }
        el.appendChild(sourceSection);
        return;
      }
      var section = document.createElement("section");
      section.className = "scene-related-source scene-related-model";
      if (model.representation_label) {
        var modelType = document.createElement("span");
        modelType.className = "scene-model-type";
        modelType.textContent = model.representation_label;
        section.appendChild(modelType);
      }
      var button = document.createElement("button");
      button.type = "button";
      button.className = "scene-related-model-open";
      button.textContent = (model.action_label || "切换查看来源站三维模型") + "：" + model.name;
      button.addEventListener("click", function () {
        if (!externalViewer) return;
        externalViewer.replaceChildren();
        var frame = document.createElement("iframe");
        frame.src = model.embed_url;
        frame.title = model.name;
        frame.allow = "autoplay; fullscreen; xr-spatial-tracking";
        frame.allowFullscreen = true;
        var details = document.createElement("div");
        details.className = "scene-model-attribution";
        var note = document.createElement("p"); note.textContent = model.note;
        var credit = document.createElement("p"); credit.textContent = model.credit;
        var source = document.createElement("a");
        source.href = model.model_url; source.target = "_blank"; source.rel = "noopener noreferrer";
        source.textContent = "打开模型来源与许可 ↗";
        var back = document.createElement("button");
        back.type = "button"; back.textContent = "返回历史复原模型";
        back.addEventListener("click", function () {
          select(items.indexOf(it));
        });
        details.append(note, credit);
        if (model.license_status) { var license = document.createElement("p"); license.textContent = "许可边界：" + model.license_status; details.appendChild(license); }
        details.append(source, back);
        externalViewer.append(frame, details);
        externalViewer.hidden = false;
        canvas.style.display = "none";
        if (viewHint) viewHint.hidden = true;
        if (viewReset) viewReset.hidden = true;
        if (cameraTools) cameraTools.hidden = true;
      });
      section.appendChild(button);
      var explanation = document.createElement("p"); explanation.textContent = model.note;
      section.appendChild(explanation);
      el.appendChild(section);
    });
  }

  function appendTimeControls(it) {
    var captionEl = document.getElementById("artifact-caption");
    if (!captionEl) return;
    if (!it || it.type !== "scene") {
      if (timePlaybackTimer) window.clearInterval(timePlaybackTimer);
      timePlaybackTimer = null;
      timePlaybackOn = false;
      timePlaybackPairId = null;
      return;
    }
    var pairId = it.paired_scene_id || it.related_context_id;
    var paired = pairId && items.find(function (candidate) { return candidate.id === pairId; });
    if (!paired) {
      if (timePlaybackTimer) window.clearInterval(timePlaybackTimer);
      timePlaybackTimer = null;
      timePlaybackOn = false;
      timePlaybackPairId = null;
      return;
    }
    var stablePairId = [it.id, paired.id].sort().join("|");
    if (timePlaybackPairId && timePlaybackPairId !== stablePairId) {
      if (timePlaybackTimer) window.clearInterval(timePlaybackTimer);
      timePlaybackTimer = null;
      timePlaybackOn = false;
    }
    timePlaybackPairId = stablePairId;
    var states = [it, paired];
    var isHistorical = function (entry) { return /historical-reconstruction|historical-3d-reference/.test(entry.representation || ""); };
    function stateRank(entry) {
      if (isHistorical(entry)) return 0;
      if (/present-day-archaeological-scan/.test(entry.representation || "")) return 1;
      if (/present-day/.test(entry.representation || "")) return 2;
      return 1;
    }
    states.sort(function (a, b) { return stateRank(a) - stateRank(b) || a.id.localeCompare(b.id); });
    var panel = document.createElement("section"); panel.className = "scene-temporal-control";
    panel.setAttribute("aria-label", "关联空间证据时间切片");
    var heading = document.createElement("div"); heading.className = "scene-temporal-heading";
    var title = document.createElement("strong"); title.textContent = "关联空间 · 证据切片";
    var currentLabel = document.createElement("span"); currentLabel.setAttribute("aria-live", "polite");
    heading.append(title, currentLabel);
    var track = document.createElement("input"); track.type = "range"; track.min = "0"; track.max = "1"; track.step = "1";
    track.setAttribute("aria-label", "在历史复原与现状测绘之间切换");
    var choices = document.createElement("div"); choices.className = "scene-temporal-choices";
    states.forEach(function (state, index) {
      var button = document.createElement("button"); button.type = "button";
      var kind = isHistorical(state) ? "史料复原" : (/lidar/.test(state.representation || "") ? "当代测绘" : "现场记录");
      button.textContent = kind + " · " + state.name;
      button.addEventListener("click", function () { if (state.id !== items[current].id) select(items.indexOf(state)); });
      choices.appendChild(button);
    });
    var play = document.createElement("button"); play.type = "button"; play.className = "scene-temporal-play";
    function sync() {
      var selected = states[0].id === items[current].id ? 0 : 1;
      track.value = String(selected);
      currentLabel.textContent = (selected + 1) + " / 2 · 分别加载原始模型";
      Array.prototype.forEach.call(choices.querySelectorAll("button"), function (button, index) {
        button.setAttribute("aria-pressed", String(index === selected));
      });
      play.textContent = timePlaybackOn ? "暂停自动浏览" : "自动浏览切片";
      play.setAttribute("aria-pressed", String(timePlaybackOn));
    }
    track.addEventListener("input", function () {
      var next = states[Number(track.value)];
      if (next && next.id !== items[current].id) select(items.indexOf(next));
    });
    play.addEventListener("click", function () {
      timePlaybackOn = !timePlaybackOn;
      if (timePlaybackTimer) window.clearInterval(timePlaybackTimer);
      timePlaybackTimer = timePlaybackOn ? window.setInterval(function () {
        var next = states[states[0].id === items[current].id ? 1 : 0];
        if (next) select(items.indexOf(next));
      }, 5000) : null;
      sync();
    });
    var caveat = document.createElement("p");
    caveat.textContent = "自动浏览只在有来源的模型状态间切换，不对缺失年代做连续形变。每个切片均保留其来源、模型性质与不确定性说明。";
    panel.append(heading, track, choices, play, caveat);
    captionEl.appendChild(panel);
    sync();
  }

  function showEvidence(it) {
    var weak = it.type !== "scene" && (it.quality === "flat" || it.quality === "fail");
    if (!evidencePanel || !weak) {
      if (evidencePanel) { evidencePanel.hidden = true; evidencePanel.replaceChildren(); }
      canvas.style.display = "block";
      if (viewHint) viewHint.hidden = false;
      if (viewReset) viewReset.hidden = false;
      return false;
    }
    canvas.style.display = "none";
    if (viewHint) viewHint.hidden = true;
    if (viewReset) viewReset.hidden = true;
    evidencePanel.hidden = false;
    var figure = document.createElement("figure");
    if (it.source_image) {
      var image = document.createElement("img");
      image.src = it.source_image;
      image.alt = it.name + " 原始档案图像";
      image.onerror = function () { image.replaceWith(document.createTextNode("原始图像暂不可用，请使用下方来源页核对。")); };
      figure.appendChild(image);
    }
    var caption = document.createElement("figcaption");
    caption.appendChild(document.createTextNode(it.reference_note || "此图像为来源记录中的原始二维材料；不代表实测三维模型。"));
    if (it.source_image) {
      var local = document.createElement("a");
      local.href = it.source_image;
      local.target = "_blank";
      local.rel = "noopener noreferrer";
      local.textContent = "原图放大 ↗";
      caption.appendChild(local);
    }
    figure.appendChild(caption);
    evidencePanel.replaceChildren(figure);
    return true;
  }

  function showSceneEvidence(it) {
    if (!evidencePanel) return;
    canvas.style.display = "none";
    destroyLidarViewer();
    if (externalViewer) { externalViewer.hidden = true; externalViewer.replaceChildren(); }
    if (viewHint) viewHint.hidden = true;
    if (viewReset) viewReset.hidden = true;
    evidencePanel.hidden = false;
    var card = document.createElement("section");
    card.className = "scene-evidence-card";
    var label = document.createElement("span");
    label.className = "scene-evidence-status";
    var statusText = {
      "present-day-scan": "现存建筑有摄影测量来源；可在馆内加载公开 LiDAR 现状点云",
      "present-day-interior-360": "真实室内全景漫游 · 1871年后重建；不代表公社时期房间",
      "present-day-lidar-point-cloud": "可加载当代同址点云 · 历史墙体扫描未发现",
      "historical-3d-reference": "找到外部 3D 教学模型，尚无可合法内嵌的模型文件",
      "reconstruction-needed": "历史场景已消失或地点未定位 · 史料复原尚未完成",
      "concept": "概念场景已从三维视窗撤下 · 尚无可核实的实景模型"
    };
    label.textContent = statusText[it.representation] || "暂无可核实的本地现场模型";
    var heading = document.createElement("h3"); heading.textContent = it.name;
    var body = document.createElement("p"); body.textContent = it.note;
    card.append(label, heading, body);
    if (it.source_image) {
      var figure = document.createElement("figure");
      figure.className = "scene-evidence-figure";
      var image = document.createElement("img");
      image.src = it.source_image;
      image.alt = it.source_image_alt || (it.name + " · 同期史料图像");
      image.loading = "lazy";
      image.onerror = function () { figure.replaceWith(document.createTextNode("史料图像暂不可用，请打开来源页核对。")); };
      var figcaption = document.createElement("figcaption");
      figcaption.textContent = it.source_image_caption || "来源图像；仅用于约束历史空间复原，不代表已完成的三维扫描。";
      figure.append(image, figcaption);
      if (it.source_image_credit_url) {
        var imageCredit = document.createElement("a");
        imageCredit.href = it.source_image_credit_url;
        imageCredit.target = "_blank";
        imageCredit.rel = "noopener noreferrer";
        imageCredit.className = "scene-image-credit";
        imageCredit.textContent = "查看馆藏记录、署名与许可 ↗";
        figure.appendChild(imageCredit);
      }
      card.appendChild(figure);
    }
    if (it.reference_url) {
      var link = document.createElement("a");
      link.href = it.reference_url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = (it.reference_label || "打开史料来源") + " ↗";
      card.appendChild(link);
    } else if (!(it.related_3d_models || []).some(function (model) { return !!model.inline_lidar; })) {
      var missing = document.createElement("p");
      missing.className = "scene-evidence-missing";
      missing.textContent = "尚未找到可核验的地点级三维扫描或足以约束复原的同期图纸；这件占位 GLB 不在此处冒充现场。";
      card.appendChild(missing);
    }
    (it.related_sources || []).forEach(function (source) {
      var related = document.createElement("section");
      related.className = "scene-related-source";
      var relatedLink = document.createElement("a");
      relatedLink.href = source.url;
      relatedLink.target = "_blank";
      relatedLink.rel = "noopener noreferrer";
      relatedLink.textContent = source.label + " ↗";
      var relatedNote = document.createElement("p");
      relatedNote.textContent = source.note || "";
      related.append(relatedLink, relatedNote);
      card.appendChild(related);
    });
    var status = document.createElement("p");
    status.className = "scene-evidence-footnote";
    status.textContent = it.reference_note || (it.representation === "present-day-lidar-point-cloud"
      ? "下方按钮可直接加载当代同址 LiDAR 点云；它用于观察现状地形，不是1871年现场扫描。"
      : "取得场地扫描或完成带来源标记的历史复原后，才能重新开放三维漫游。");
    card.appendChild(status);
    evidencePanel.replaceChildren(card);
  }

  function resetView(animate) {
    var controls = scene && scene.userData.controls;
    if (!controls) return;
    var isScene = items[current] && items[current].type === "scene";
    var position = isScene
      ? (sceneView || { x: 1.05, y: 1.15, z: 2.38 })     /* 历史空间：略俯视 */
      : { x: 0.0, y: -0.42, z: 2.42 };                    /* 雕像：略仰视 */
    var aim = isScene ? { x: 0, y: 0.02, z: 0 } : { x: 0, y: 0.16, z: 0 };
    camera.up.set(0, 1, 0);
    if (cameraTools) Array.prototype.forEach.call(cameraTools.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-camera-preset") === "default"));
    });
    if (animate && window.gsap && !(window.HS && window.HS.reduced)) {
      window.gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration: 0.62, ease: "power2.inOut", overwrite: true, onUpdate: function () { controls.update(); } });
      window.gsap.to(controls.target, { x: aim.x, y: aim.y, z: aim.z, duration: 0.62, ease: "power2.inOut", overwrite: true, onUpdate: function () { controls.update(); } });
    } else {
      controls.target.set(aim.x, aim.y, aim.z);
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(controls.target);
      controls.update();
    }
  }
  function setCameraPreset(preset) {
    if (!camera || !scene || !scene.userData.controls || !sceneView) return;
    var base = new THREE.Vector3(sceneView.x, sceneView.y, sceneView.z);
    var distance = base.length();
    var position = base.clone();
    camera.up.set(0, 1, 0);
    if (preset === "top") { position.set(0, distance, 0.001); camera.up.set(0, 0, -1); }
    else if (preset === "close") position.multiplyScalar(0.68);
    else if (preset === "default") position.copy(base);
    var controls = scene.userData.controls;
    if (window.gsap && !(window.HS && window.HS.reduced)) {
      window.gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration: 0.5, ease: "power2.inOut", overwrite: true, onUpdate: function () { controls.update(); } });
    } else {
      camera.position.copy(position);
      camera.lookAt(controls.target);
      controls.update();
    }
    Array.prototype.forEach.call(cameraTools.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-camera-preset") === preset));
    });
  }
  if (cameraTools) cameraTools.addEventListener("click", function (event) {
    var button = event.target.closest("[data-camera-preset]");
    if (button) setCameraPreset(button.getAttribute("data-camera-preset"));
  });
  if (pairSwitch) pairSwitch.addEventListener("click", function () {
    var paired = items[current] && (items[current].paired_scene_id || items[current].related_context_id);
    var next = paired && items.find(function (item) { return item.id === paired; });
    if (next) select(items.indexOf(next));
  });
  var resetButton = document.getElementById("artifact-reset");
  if (resetButton) resetButton.addEventListener("click", resetView);

  function select(idx) {
    if (!items.length) return;
    current = idx;
    var it = items[idx];
    /* 默认实体化；如需线框，点左上角按钮切换 */
    if (typeof e4Wireframe === "undefined") e4Wireframe = false;
    if (wireToggle) {
      wireToggle.hidden = it.type === "scene" || it.quality === "flat" || it.quality === "fail";
      syncWireToggle();
    }
    if (cameraTools) cameraTools.hidden = !(it.type === "scene" && it.file);
    if (pairSwitch) {
      var pairedId = it.type === "scene" && (it.paired_scene_id || it.related_context_id);
      var pairedItem = pairedId && items.find(function (item) { return item.id === pairedId; });
      pairSwitch.hidden = !pairedItem;
      pairSwitch.classList.toggle("with-camera-tools", !!(pairedItem && it.file));
      pairSwitch.textContent = pairedItem ? "同址证据对照 · 切换到：" + pairedItem.name : "";
    }
    if (cameraTools) Array.prototype.forEach.call(cameraTools.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-camera-preset") === "default"));
    });
    var stage = document.getElementById("artifact-view");
    if (stage) stage.classList.toggle("model-loading", it.quality !== "flat" && it.quality !== "fail");
    caption(it);
    appendTimeControls(it);
    Array.prototype.forEach.call(document.querySelectorAll("#artifact-rail button"), function (b, i) {
      b.classList.toggle("on", i === idx);
    });
    clearModel();
    destroyLidarViewer();
    if (externalViewer) { externalViewer.hidden = true; externalViewer.replaceChildren(); }
    canvas.style.display = "block";
    if (viewHint) viewHint.hidden = false;
    if (viewReset) viewReset.hidden = false;
    if (showEvidence(it)) { stop(); if (stage) stage.classList.remove("model-loading"); return; }
    if (it.type === "scene" && !it.file && !(it.embedUrl && externalViewer)) {
      showSceneEvidence(Object.assign({}, it, {
        note: it.note + (it.representation === "present-day-lidar-point-cloud" ? "" : " 来源未提供可本地再分发的模型文件；此处不会使用其他年代的几何体替代。")
      }));
      stop();
      if (stage) stage.classList.remove("model-loading");
      return;
    }
    if (it.type === "scene" && it.embedUrl && externalViewer) {
      canvas.style.display = "none";
      if (viewHint) viewHint.hidden = true;
      if (viewReset) viewReset.hidden = true;
      externalViewer.hidden = false;
      var frame = document.createElement("iframe");
      frame.src = it.embedUrl;
      frame.title = it.name + " · 外部三维现场模型";
      frame.loading = "lazy";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allow = "autoplay; fullscreen; xr-spatial-tracking";
      frame.allowFullscreen = true;
      externalViewer.appendChild(frame);
      if (it.evidence_galleries && it.evidence_galleries.length) {
        var galleryToggle = document.createElement("button");
        galleryToggle.type = "button";
        galleryToggle.className = "scene-gallery-toggle";
        galleryToggle.textContent = "查看现场与馆藏影像证据 · " + it.evidence_galleries.reduce(function (n, g) { return n + g.images.length; }, 0) + " 张";
        var gallery = document.createElement("section");
        gallery.className = "scene-model-gallery";
        gallery.hidden = true;
        var galleryTitle = document.createElement("div");
        galleryTitle.className = "scene-gallery-title";
        var galleryTabs = document.createElement("div");
        galleryTabs.className = "scene-gallery-tabs";
        var galleryDisclaimer = document.createElement("p");
        var gallerySource = document.createElement("a");
        gallerySource.target = "_blank"; gallerySource.rel = "noopener noreferrer";
        gallerySource.className = "scene-gallery-source";
        var galleryImage = document.createElement("img");
        galleryImage.className = "scene-gallery-image";
        galleryImage.alt = "巴黎市政厅历史比例模型馆藏照片";
        galleryImage.loading = "lazy";
        var galleryCaption = document.createElement("p");
        galleryCaption.className = "scene-gallery-caption";
        var galleryNav = document.createElement("div");
        galleryNav.className = "scene-gallery-nav";
        var prevImage = document.createElement("button");
        prevImage.type = "button"; prevImage.textContent = "← 上一张";
        var nextImage = document.createElement("button");
        nextImage.type = "button"; nextImage.textContent = "下一张 →";
        galleryNav.append(prevImage, nextImage);
        var galleryIndex = 0, galleryGroup = 0;
        function showGalleryImage() {
          var data = it.evidence_galleries[galleryGroup];
          var image = data.images[galleryIndex];
          galleryTitle.textContent = data.title;
          galleryDisclaimer.textContent = data.note + " · " + data.credit;
          gallerySource.href = image.source_url || data.source_url;
          gallerySource.textContent = "打开这张影像的来源与许可 ↗";
          galleryImage.src = image.src;
          galleryCaption.textContent = image.label + " · " + (galleryIndex + 1) + " / " + data.images.length;
          prevImage.disabled = galleryIndex === 0;
          nextImage.disabled = galleryIndex === data.images.length - 1;
          Array.prototype.forEach.call(galleryTabs.querySelectorAll("button"), function (b, i) { b.classList.toggle("on", i === galleryGroup); });
        }
        it.evidence_galleries.forEach(function (data, i) {
          var tab = document.createElement("button");
          tab.type = "button";
          tab.textContent = data.title.split(" · ")[0] + " · " + data.images.length + " 张";
          tab.addEventListener("click", function () { galleryGroup = i; galleryIndex = 0; showGalleryImage(); });
          galleryTabs.appendChild(tab);
        });
        gallery.append(galleryTitle, galleryTabs, galleryDisclaimer, gallerySource, galleryImage, galleryCaption, galleryNav);
        showGalleryImage();
        prevImage.addEventListener("click", function () { if (galleryIndex > 0) { galleryIndex--; showGalleryImage(); } });
        nextImage.addEventListener("click", function () { var data = it.evidence_galleries[galleryGroup]; if (galleryIndex < data.images.length - 1) { galleryIndex++; showGalleryImage(); } });
        galleryToggle.addEventListener("click", function () {
          gallery.hidden = !gallery.hidden;
          galleryToggle.setAttribute("aria-expanded", String(!gallery.hidden));
          if (!gallery.hidden) frame.hidden = true;
          else frame.hidden = false;
        });
        externalViewer.appendChild(galleryToggle);
        externalViewer.appendChild(gallery);
      }
      if (it.model_url || it.reference_url) {
        var sourceLink = document.createElement("a");
        sourceLink.className = "scene-viewer-source";
        sourceLink.href = it.model_url || it.reference_url;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        sourceLink.textContent = "模型显示异常？在来源站打开 ↗";
        externalViewer.appendChild(sourceLink);
      }
      if (stage) stage.classList.remove("model-loading");
      stop();
      return;
    }
    if (!loader) {
      if (stage) stage.classList.remove("model-loading");
      if (evidencePanel && it.type === "scene") {
        showSceneEvidence(Object.assign({}, it, {
          note: it.note + " 当前浏览器未能初始化 GLTFLoader，已切换到来源与史料说明。"
        }));
      }
      return;
    }
    var modelUrl = (it.type === "scene" ? "assets/scenes/" : BASE) + it.file;
    if (it.type === "scene") modelUrl += "?v=historical-site-5cd";
    var seq = ++loadSeq;
    loader.load(modelUrl, function (gltf) {
      if (seq !== loadSeq) { return; }
      clearModel();
      group = gltf.scene;
      normalize(group);
      if (it.type !== "scene") setE4Wireframe(group, e4Wireframe);
      scene.add(group);
      if (stage) stage.classList.remove("model-loading");
      start();
    }, undefined, function (error) {
      if (seq !== loadSeq) { return; }
      if (stage) stage.classList.remove("model-loading");
      var c = document.getElementById("artifact-caption");
      if (c) {
        var warning = document.createElement("p");
        warning.className = "artifact-warn";
        warning.textContent = "三维模型加载失败：" + String(error && error.message || error || "未知错误");
        c.appendChild(warning);
      }
    });
  }

  function buildRail() {
    var rail = document.getElementById("artifact-rail");
    if (!rail) return;
    rail.innerHTML = "";
    items.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.title = it.name;
      if (it.type === "scene") {
        var thumb = document.createElement("span");
        thumb.className = "scene-thumb " + it.previewClass;
        thumb.setAttribute("aria-hidden", "true");
        thumb.textContent = it.glyph;
        b.appendChild(thumb);
      } else {
        var img = document.createElement("img");
        img.loading = "lazy";
        img.src = BASE + it.thumb;
        img.alt = it.name;
        b.appendChild(img);
      }
      var label = document.createElement("span");
      label.textContent = it.name;
      b.appendChild(label);
      if (it.type === "scene") {
        var sceneBadge = document.createElement("small");
        sceneBadge.className = "artifact-item-quality";
        var sceneLabels = {
      "present-day-archaeological-scan": "2017年现存遗址实扫 · 非1779年原貌",
          "present-day-scan": "现存建筑/纪念物实景扫描",
          "present-day-interior-360": "现存室内全景 · 1871年后重建",
          "present-day-lidar-terrain": "当代 LiDAR 地形网格 · 非历史地貌",
          "present-day-lidar-surface": "现状 LiDAR DSM 表面 · 非建筑立面扫描",
          "present-day-lidar-point-cloud": "当代 LiDAR 点云可交互加载 · 非历史扫描",
          "historical-3d-reference": "外部三维参照 + 本地复原",
          "historical-reconstruction": "史料约束复原 · 非实景扫描",
          "reconstruction-needed": "证据有限的空间推演",
          "concept": "主题概念 · 非历史现场"
        };
        sceneBadge.textContent = sceneLabels[it.representation] || "来源待核实";
        b.appendChild(sceneBadge);
      }
      if (it.type !== "scene" && (it.quality === "flat" || it.quality === "fail")) {
        var status = document.createElement("small");
        status.className = "artifact-item-quality";
        status.textContent = it.quality === "fail" ? "档案图 · 三维重建停用" : "档案图 · 不作三维物件";
        b.appendChild(status);
      } else if (it.type !== "scene") {
        var modelGrade = document.createElement("small");
        modelGrade.className = "artifact-item-quality";
        modelGrade.textContent = "E4 · 单图推断";
        b.appendChild(modelGrade);
      }
      b.addEventListener("click", function () { select(i); });
      rail.appendChild(b);
    });
  }

  function resize() {
    if (!renderer) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    var c = scene.userData.controls;
    if (c) c.update();
    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; tick(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  /* ---------- 启动 ---------- */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    /* 先取清单，保证左侧轨道一定有内容；三维初始化失败也不影响列表 */
    loadItems(mode);
    try { init(); } catch (e) { /* 无 WebGL 时只保留清单与文字说明 */ }
  }

  function loadItems(nextMode) {
    mode = nextMode;
    current = -1;
    clearModel();
    var path = mode === "scenes" ? "assets/scenes/scenes.json?v=scene-audit-paris-lidar-v8" : BASE + "models.json";
    fetch(path)
      .then(function (r) { if (!r.ok) throw new Error("manifest " + r.status); return r.json(); })
      .then(function (data) {
        items = (data.items || []).filter(function (it) {
          /* 只把几何完整的模型放进主展厅；flat（薄片）与 fail（破损）不展示 */
          if (mode === "scenes") return true;
          return it.quality !== "flat" && it.quality !== "fail";
        });
        var sceneMode = document.querySelector('[data-artifact-mode="scenes"] span');
        if (sceneMode) sceneMode.textContent = String(mode === "scenes" ? items.length : sceneMode.textContent);
        buildRail();
        Array.prototype.forEach.call(document.querySelectorAll("[data-artifact-mode]"), function (button) {
          var on = button.getAttribute("data-artifact-mode") === mode;
          button.classList.toggle("on", on);
          button.setAttribute("aria-selected", on ? "true" : "false");
        });
        resize();
        /* 对外接口：让时空穿梭、目录页等外部模块在原位切换展品，而不是重新加载整页 */
        window.HS = window.HS || {};
        window.HS.artifacts = {
          list: function () { return items.map(function (it) { return { id: it.id, name: it.name, type: it.type }; }); },
          selectById: function (id) {
            var k = items.findIndex(function (it) { return it.id === id; });
            if (k < 0) return false;
            select(k);
            var rail = document.getElementById("artifact-rail");
            if (rail && rail.children[k]) rail.children[k].scrollIntoView({ block: "nearest", inline: "center" });
            return true;
          },
          currentId: function () { return (items[current] && items[current].id) || ""; }
        };

        var requestedId = mode === "scenes" ? query.get("scene") : query.get("artifact");
        var requestedIndex = requestedId ? items.findIndex(function (it) { return it.id === requestedId; }) : -1;
        if (items.length) select(requestedIndex >= 0 ? requestedIndex : 0);
      })
      .catch(function () {
        var rail = document.getElementById("artifact-rail");
        if (rail) rail.innerHTML = "<p style='color:#c9a227'>展品清单未能加载，刷新页面即可重试。</p>";
      });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-artifact-mode]"), function (button) {
    button.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll("[data-artifact-mode]"), function (b) {
        var on = b === button;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      loadItems(button.getAttribute("data-artifact-mode"));
    });
  });

  /* Deep links should open the requested gallery directly, not strand visitors
   * at the hero while the lazy viewer waits for an intersection. */
  if (mode === "scenes") {
    Array.prototype.forEach.call(document.querySelectorAll("[data-artifact-mode]"), function (button) {
      var selected = button.getAttribute("data-artifact-mode") === "scenes";
      button.classList.toggle("on", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    if (query.has("scene") && window.location.hash === "#artifacts") {
      var requestedStage = document.getElementById("artifacts");
      /* A deep link may be restored while the browser is still at scrollY=0.
       * In that state IntersectionObserver can miss the scene before the
       * scroll restoration finishes, leaving the rail empty and the canvas
       * on its placeholder. Boot eagerly for explicit scene links; boot() is
       * idempotent and the observer can still handle ordinary navigation. */
      boot();
      if (requestedStage) {
        if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
        var jumpToRequestedStage = function () { requestAnimationFrame(function () { requestedStage.scrollIntoView({ behavior: "instant", block: "start" }); }); };
        if (document.readyState === "complete") jumpToRequestedStage();
        else window.addEventListener("load", jumpToRequestedStage, { once: true });
      }
    }
  }

  window.addEventListener("resize", function () { if (inited) resize(); });
  if ("ResizeObserver" in window) {
    var stage = document.getElementById("artifact-view");
    if (stage) new ResizeObserver(function () { if (inited) resize(); }).observe(stage);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { boot(); resize(); start(); }
        else if (inited) { stop(); }
      });
    }, { threshold: 0.15 });
    io.observe(canvas);
    /* 整段可见时就预热：画布往往在折叠线以下，等它自己露出 15% 才初始化，
     * 用户会先看到一条空轨道。boot() 幂等，重复调用无副作用。 */
    var section = document.getElementById("artifacts");
    if (section) {
      var ioSection = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !inited) { boot(); } });
      }, { threshold: 0.01 });
      ioSection.observe(section);
    }
  } else {
    boot();
  }
})();
