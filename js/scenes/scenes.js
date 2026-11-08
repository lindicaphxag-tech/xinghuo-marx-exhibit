/* scenes.js — 三个程序化历史场景 + 文献墙
 * 场景全部由 three.js 几何体 + Canvas 程序纹理生成，不依赖外部 GLB。
 * 文献墙用真实封面贴图（assets/documents/covers）。
 */
(function () {
  "use strict";

  var canvas = document.getElementById("scene-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  var renderer, scene, camera, controls, raf = null;
  var current = 0, currentName = "";
  var booksData = null;
  var requestedScene = new URLSearchParams(window.location.search).get("scene");

  function initialSceneIndex() {
    var index = SCENES.findIndex(function (item) { return item.id === requestedScene; });
    return index >= 0 ? index : 0;
  }

  /* ============ 程序纹理 ============ */
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    else if ("encoding" in t) t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function brickTex(repeat) {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = "#2a2320"; g.fillRect(0, 0, w, h);
      var rows = 8, bh = h / rows;
      for (var r = 0; r < rows; r++) {
        var off = (r % 2) * 32;
        for (var x = -32; x < w; x += 64) {
          var v = 28 + Math.random() * 18;
          g.fillStyle = "rgb(" + (v + 18) + "," + (v + 10) + "," + (v + 4) + ")";
          g.fillRect(x + off + 2, r * bh + 2, 60, bh - 4);
        }
      }
    });
  }

  function cobbleTex() {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = "#1d1a17"; g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 24) {
        for (var x = 0; x < w; x += 24) {
          var v = 30 + Math.random() * 26;
          g.fillStyle = "rgb(" + v + "," + (v - 4) + "," + (v - 8) + ")";
          g.beginPath();
          g.ellipse(x + 12 + Math.random() * 3, y + 12 + Math.random() * 3, 10, 8, 0, 0, 6.283);
          g.fill();
        }
      }
    });
  }

  function metalTex() {
    return canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = "#4a423c"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 400; i++) {
        var v = 45 + Math.random() * 40;
        g.fillStyle = "rgba(" + v + "," + (v - 6) + "," + (v - 12) + ",0.6)";
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
  }

  /* ============ 通用构件 ============ */
  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /* ============ 场景 A：工业革命工厂 ============ */
  function buildFactory(root) {
    var floorMat = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.95 });
    floorMat.map.repeat.set(8, 8);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var wallMat = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 1 });
    wallMat.map.repeat.set(6, 3);
    root.add(box(60, 14, 1, wallMat, 0, 7, -30));
    root.add(box(1, 14, 60, wallMat, -30, 7, 0));
    root.add(box(1, 14, 60, wallMat, 30, 7, 0));

    for (var i = 0; i < 6; i++) {
      var p = box(1.2, 14, 1.2, new THREE.MeshStandardMaterial({ color: 0x3a332d, roughness: 0.9 }), -20 + i * 8, 7, -14);
      root.add(p);
    }

    var metal = new THREE.MeshStandardMaterial({ map: metalTex(), roughness: 0.6, metalness: 0.7 });
    for (var m = 0; m < 5; m++) {
      var g = new THREE.Group();
      g.add(box(5, 1.2, 3, metal, 0, 0.6, 0));
      g.add(box(3.4, 3.2, 2.2, metal, 0, 2.8, 0));
      var wheel = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 10, 24), metal);
      wheel.position.set(0, 3.0, 1.3);
      g.add(wheel);
      g.add(box(0.4, 4.5, 0.4, metal, 1.6, 4.6, 0));
      var lampMat = new THREE.MeshStandardMaterial({ color: 0xff7733, emissive: 0xff5511, emissiveIntensity: 2 });
      g.add(box(0.5, 0.5, 0.5, lampMat, 1.6, 6.9, 0));
      g.position.set(-14 + m * 7, 0, 4 + (m % 2) * 7);
      g.rotation.y = Math.random() * 0.4 - 0.2;
      root.add(g);
    }

    /* 记忆点：横贯车间的传动天轴（蒸汽机统一驱动，节奏由机器给出） */
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 52, 12), metal);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0, 8.6, 2);
    root.add(shaft);
    for (var q = 0; q < 5; q++) {
      var pulley = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.16, 8, 20), metal);
      pulley.position.set(-16 + q * 8, 8.6, 2);
      root.add(pulley);
      var belt = box(0.12, 8.4, 0.5, new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 1 }),
        -16 + q * 8, 4.4, 2.2);
      root.add(belt);
    }

    var boxMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3e, roughness: 0.95 });
    for (var b = 0; b < 14; b++) {
      root.add(box(1.4, 1.1, 1.4, boxMat, -18 + Math.random() * 36, 0.55, -18 + Math.random() * 8));
    }

    var smokeGeo = new THREE.BufferGeometry();
    var pts = [];
    for (var s = 0; s < 420; s++) {
      pts.push((Math.random() - 0.5) * 40, Math.random() * 12, (Math.random() - 0.5) * 40);
    }
    smokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    var smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
      color: 0x9a8f84, size: 0.32, transparent: true, opacity: 0.28, depthWrite: false
    }));
    root.add(smoke);
    return {
      pos: [0, 6, 26], target: [0, 3, 0],
      lights: [
        { type: "ambient", color: 0x2a2420, intensity: 0.8 },
        { type: "dir", color: 0xffb070, intensity: 1.1, pos: [10, 14, 8] },
        { type: "point", color: 0xff5522, intensity: 12, pos: [-8, 3, 6] }
      ],
      fog: [0x120f0d, 18, 70]
    };
  }

  /* ============ 场景 B：巴黎公社广场 ============ */
  function buildPlaza(root) {
    var groundMat = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 1 });
    groundMat.map.repeat.set(10, 10);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), groundMat);
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    // 市政厅体块
    var stone = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.9 });
    var hall = box(24, 14, 10, stone, 0, 7, -16);
    root.add(hall);
    for (var i = -5; i <= 5; i++) {
      root.add(box(1.2, 12, 1, new THREE.MeshStandardMaterial({ color: 0x5c5245 }), i * 2, 7, -10.6));
    }
    var roof = new THREE.Mesh(new THREE.ConeGeometry(16, 6, 4), new THREE.MeshStandardMaterial({ color: 0x2f2a24 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 17, -16);
    root.add(roof);

    // 周边楼体
    for (var b = 0; b < 10; b++) {
      var ang = (b / 10) * Math.PI * 2;
      var r = 26;
      var bh = 8 + Math.random() * 8;
      var blk = box(6 + Math.random() * 4, bh, 6, new THREE.MeshStandardMaterial({ color: 0x332c26, roughness: 1 }),
        Math.cos(ang) * r, bh / 2, Math.sin(ang) * r);
      blk.rotation.y = -ang;
      root.add(blk);
    }

    // 街垒
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    for (var k = 0; k < 24; k++) {
      var w = box(1.6, 0.28, 0.9, woodMat, -8 + Math.random() * 16, 0.3 + Math.random() * 1.2, 8 + Math.random() * 2);
      w.rotation.set(Math.random() * 0.3, Math.random() * 0.6, Math.random() * 0.4);
      root.add(w);
    }
    for (var s = 0; s < 12; s++) {
      root.add(box(1.2, 1.2, 1.2, new THREE.MeshStandardMaterial({ color: 0x3d372f }), -7 + Math.random() * 14, 0.6, 7 + Math.random() * 3));
    }

    // 红旗
    for (var f = 0; f < 5; f++) {
      var pole = box(0.12, 5, 0.12, new THREE.MeshStandardMaterial({ color: 0x2a2420 }), -10 + f * 5, 2.5, 5);
      root.add(pole);
      var flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5, 8, 1),
        new THREE.MeshStandardMaterial({ color: 0xb02020, side: THREE.DoubleSide, roughness: 0.85 }));
      flag.position.set(-10 + f * 5 + 1.2, 4.2, 5);
      root.add(flag);
    }

    return {
      pos: [0, 5, 30], target: [0, 5, -8],
      lights: [
        { type: "ambient", color: 0x1e2430, intensity: 1.0 },
        { type: "dir", color: 0x9fb4d8, intensity: 0.9, pos: [-12, 18, 10] },
        { type: "point", color: 0xd9433f, intensity: 8, pos: [0, 3, 9] }
      ],
      fog: [0x0d0f14, 25, 80]
    };
  }

  /* ============ 场景 C：数字历史档案厅（文献墙）============ */
  function buildArchive(root, books) {
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.95 });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var shelfMat = new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.9 });
    var loader = new THREE.TextureLoader();

    var cols = 7, i = 0;
    var rows = Math.max(1, Math.ceil(books.length / cols));
    books.forEach(function (b, idx) {
      var col = idx % cols, row = Math.floor(idx / cols) % rows;
      var x = (col - (cols - 1) / 2) * 3.0;
      var y = 2.5 + row * 2.15;

      var shelf = box(3.2, 0.16, 1.2, shelfMat, x, y - 1.1, -6);
      root.add(shelf);

      var geo = new THREE.BoxGeometry(1.5, 2.0, 0.28);
      var mat = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 0.9 });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, -6);
      mesh.rotation.y = (idx % 2 === 0) ? 0.12 : -0.12;
      loader.load(b.cover, function (tex) {
        if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
        var face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
        face.position.set(0, 0, 0.145);
        mesh.add(face);
        var back = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
        back.position.set(0, 0, -0.145);
        back.rotation.y = Math.PI;
        mesh.add(back);
      });
      root.add(mesh);
      i++;
    });

    /* 记忆点：桌上摊开的一本书 + 一盏阅读灯 */
    var bookMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d2, roughness: 0.95 });
    var half1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.05), bookMat);
    half1.position.set(-0.78, 1.13, 3);
    half1.rotation.z = 0.12;
    root.add(half1);
    var half2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.05), bookMat);
    half2.position.set(0.78, 1.13, 3);
    half2.rotation.z = -0.12;
    root.add(half2);
    var lampMetal = new THREE.MeshStandardMaterial({ color: 0x4a423c, metalness: 0.6, roughness: 0.5 });
    var lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 10), lampMetal);
    lampPole.position.set(-2.4, 1.75, 2.2);
    root.add(lampPole);
    var shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2f6b4f, side: THREE.DoubleSide, roughness: 0.8 }));
    shade.position.set(-2.4, 2.6, 2.2);
    shade.rotation.x = Math.PI;
    root.add(shade);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffcc77, emissiveIntensity: 2.4 }));
    bulb.position.set(-2.4, 2.42, 2.2);
    root.add(bulb);

    // 阅读桌
    var tableMat = new THREE.MeshStandardMaterial({ color: 0x2e2419, roughness: 0.85 });
    root.add(box(6, 0.18, 3, tableMat, 0, 1.0, 3));
    [[-2.6, -1.2], [2.6, -1.2], [-2.6, 1.2], [2.6, 1.2]].forEach(function (p) {
      root.add(box(0.16, 1.0, 0.16, tableMat, p[0], 0.5, 3 + p[1]));
    });

    return {
      pos: [0, 6.2, 27], target: [0, 5.2, -6],
      lights: [
        { type: "ambient", color: 0x2a2620, intensity: 1.2 },
        { type: "dir", color: 0xffe9c8, intensity: 1.0, pos: [4, 12, 8] },
        { type: "point", color: 0xffcc88, intensity: 6, pos: [0, 4, 6] }
      ],
      fog: [0x0a0908, 12, 45]
    };
  }

  /* ============ 场景 D：上海工人街区（石库门） ============ */
  function buildShikumen(root) {
    var groundMat = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 1 });
    groundMat.map.repeat.set(6, 14);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 46), groundMat);
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    var plaster = new THREE.MeshStandardMaterial({ color: 0x6d6156, roughness: 1 });
    var brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 1 });
    brick.map.repeat.set(4, 4);
    var wood = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.9 });
    var tile = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.95 });

    // 两侧联排石库门
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 5; i++) {
        var z = -16 + i * 8;
        var h = 8 + (i % 3);
        root.add(box(1.2, h, 7, i % 2 ? plaster : brick, side * 6, h / 2, z));
        // 门洞
        root.add(box(0.3, 3.2, 1.8, wood, side * 5.4, 1.6, z));
        // 二楼木窗
        root.add(box(0.2, 1.6, 2.2, wood, side * 5.45, 5.2, z - 1.6));
        // 瓦檐
        var eave = box(1.9, 0.24, 7.4, tile, side * 5.6, h + 0.1, z);
        eave.rotation.z = side * 0.06;
        root.add(eave);
      }
    }

    // 弄堂口的牌坊
    root.add(box(12, 0.9, 0.6, wood, 0, 7.6, 2));
    root.add(box(0.5, 7.2, 0.5, wood, -5.6, 3.6, 2));
    root.add(box(0.5, 7.2, 0.5, wood, 5.6, 3.6, 2));

    // 晾衣绳与衣物
    var cloth = [0x8a3a2a, 0x2a4a6a, 0xd8cfc0, 0x3a4a32];
    for (var c = 0; c < 8; c++) {
      var g = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4),
        new THREE.MeshStandardMaterial({ color: cloth[c % 4], side: THREE.DoubleSide, roughness: 1 }));
      g.position.set(-3 + (c % 4) * 2.2, 6.4 - Math.floor(c / 4) * 0.4, -12 + Math.floor(c / 4) * 12);
      g.rotation.y = Math.PI / 2;
      root.add(g);
    }

    // 黄包车（简化为两轮 + 车厢）
    var cart = new THREE.Group();
    cart.add(box(1.6, 1.0, 2.4, wood, 0, 1.1, 0));
    var wheelGeo = new THREE.TorusGeometry(0.7, 0.08, 8, 20);
    var w1 = new THREE.Mesh(wheelGeo, wood); w1.rotation.y = Math.PI / 2; w1.position.set(-0.9, 0.7, -0.4);
    var w2 = new THREE.Mesh(wheelGeo, wood); w2.rotation.y = Math.PI / 2; w2.position.set(0.9, 0.7, -0.4);
    cart.add(w1, w2);
    cart.add(box(0.1, 0.1, 2.2, wood, -0.7, 1.0, 1.6));
    cart.add(box(0.1, 0.1, 2.2, wood, 0.7, 1.0, 1.6));
    cart.position.set(3.2, 0, -4);
    cart.rotation.y = -0.4;
    root.add(cart);

    // 路灯
    for (var L = 0; L < 2; L++) {
      root.add(box(0.14, 4.4, 0.14, wood, -4.6, 2.2, -8 + L * 14));
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xffaa55, emissiveIntensity: 2.4 }));
      lamp.position.set(-4.6, 4.5, -8 + L * 14);
      root.add(lamp);
    }

    return {
      pos: [0, 4.5, 17], target: [0, 3, -4],
      lights: [
        { type: "ambient", color: 0x2a2620, intensity: 0.9 },
        { type: "dir", color: 0xffd8a8, intensity: 0.7, pos: [-8, 12, 6] },
        { type: "point", color: 0xffaa55, intensity: 9, pos: [-4.6, 4.4, -8] }
      ],
      fog: [0x121110, 14, 45]
    };
  }

  /* ============ 场景 E：经典文献印刷工坊 ============ */
  function buildPress(root) {
    var floorMat = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 1 });
    floorMat.map.repeat.set(6, 6);
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 1 });
    brick.map.repeat.set(5, 3);
    root.add(box(34, 12, 1, brick, 0, 6, -16));
    root.add(box(1, 12, 34, brick, -16, 6, 0));
    root.add(box(1, 12, 34, brick, 16, 6, 0));

    var iron = new THREE.MeshStandardMaterial({ map: metalTex(), roughness: 0.55, metalness: 0.75 });
    // 印刷机主体
    var press = new THREE.Group();
    press.add(box(4.4, 0.6, 2.6, iron, 0, 0.3, 0));
    press.add(box(1.0, 3.6, 1.0, iron, -1.7, 2.1, 0));
    press.add(box(1.0, 3.6, 1.0, iron, 1.7, 2.1, 0));
    press.add(box(4.2, 0.7, 2.2, iron, 0, 3.9, 0));
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.4, 24), iron);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.set(0, 2.9, 0.2);
    press.add(cyl);
    var handle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 18), iron);
    handle.position.set(2.6, 1.6, 0);
    press.add(handle);
    // 压印台
    press.add(box(3.0, 0.14, 1.8, new THREE.MeshStandardMaterial({ color: 0x23201c }), 0, 2.0, 0));
    press.position.set(-2, 0, -3);
    press.rotation.y = 0.3;
    root.add(press);

    // 铅字盘（网格）
    var typeBox = new THREE.Group();
    typeBox.add(box(3.2, 0.3, 2.2, new THREE.MeshStandardMaterial({ color: 0x4a3a28 }), 0, 0.9, 0));
    for (var r = 0; r < 6; r++) {
      for (var c2 = 0; c2 < 9; c2++) {
        typeBox.add(box(0.28, 0.16, 0.24, new THREE.MeshStandardMaterial({ color: 0x6e6257, metalness: 0.6, roughness: 0.5 }),
          -1.35 + c2 * 0.34, 1.12, -0.85 + r * 0.34));
      }
    }
    [[-1.5, 0], [1.5, 0], [-1.5, 2], [1.5, 2]].forEach(function (p) {
      typeBox.add(box(0.1, 0.9, 0.1, new THREE.MeshStandardMaterial({ color: 0x3b2a1d }), p[0], 0.45, p[1] - 1));
    });
    typeBox.position.set(5.5, 0, -4);
    root.add(typeBox);

    // 纸张堆
    for (var s = 0; s < 5; s++) {
      root.add(box(1.6, 0.12 + s * 0.1, 1.2, new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.95 }),
        -8 + (s % 3) * 1.2, 0.06 + s * 0.05, 4 + Math.floor(s / 3) * 1.4));
    }

    // 晾纸绳
    for (var line = 0; line < 3; line++) {
      var y = 6.5 + line * 0.1;
      root.add(box(20, 0.03, 0.03, new THREE.MeshStandardMaterial({ color: 0x8a7f72 }), 0, y, -8 + line * 5));
      for (var p2 = 0; p2 < 9; p2++) {
        var sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6),
          new THREE.MeshStandardMaterial({ color: 0xe8e0d2, side: THREE.DoubleSide, roughness: 1 }));
        sheet.position.set(-9 + p2 * 2.2, y - 0.9, -8 + line * 5);
        sheet.rotation.y = Math.PI / 2;
        sheet.userData.swing = Math.random() * 6.28;
        root.add(sheet);
      }
    }

    return {
      pos: [0, 6, 16], target: [0, 3, -3],
      lights: [
        { type: "ambient", color: 0x2f2a24, intensity: 1.0 },
        { type: "dir", color: 0xffe8c0, intensity: 0.9, pos: [6, 12, 8] },
        { type: "point", color: 0xffbb66, intensity: 7, pos: [-2, 4, 0] }
      ],
      fog: [0x14110e, 16, 55]
    };
  }

  /* ============ 场景 F：工人集会大厅 ============ */
  function buildHall(root) {
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 0.7 });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var plaster = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 1 });
    root.add(box(26, 10, 0.8, plaster, 0, 5, -20));
    root.add(box(0.8, 10, 40, plaster, -13, 5, 0));
    root.add(box(0.8, 10, 40, plaster, 13, 5, 0));

    // 讲台
    var wood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 });
    var stage = new THREE.Group();
    stage.add(box(9, 0.5, 4, wood, 0, 0.25, -16));
    stage.add(box(2.6, 1.2, 1.2, wood, 0, 1.1, -16));
    stage.add(box(0.16, 1.0, 0.16, wood, 0, 1.6, -15.4));
    root.add(stage);

    // 长椅（实例化摆放）
    var bench = new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.9 });
    for (var row = 0; row < 7; row++) {
      for (var col = 0; col < 3; col++) {
        var x = -7 + col * 7;
        var z = -6 + row * 2.6;
        root.add(box(5.4, 0.16, 0.7, bench, x, 0.75, z));
        root.add(box(5.4, 0.5, 0.14, bench, x, 1.1, z - 0.35));
        root.add(box(0.14, 0.75, 0.6, bench, x - 2.5, 0.38, z));
        root.add(box(0.14, 0.75, 0.6, bench, x + 2.5, 0.38, z));
      }
    }

    // 横幅
    var bannerMat = new THREE.MeshStandardMaterial({ color: 0xa81c1c, side: THREE.DoubleSide, roughness: 0.9 });
    root.add(box(0.1, 6, 0.1, wood, -8, 3, -19.4));
    root.add(box(0.1, 6, 0.1, wood, 8, 3, -19.4));
    var banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4, 12, 1), bannerMat);
    banner.position.set(0, 4.6, -19.3);
    root.add(banner);

    // 吊灯
    for (var l = 0; l < 3; l++) {
      var z2 = -12 + l * 10;
      root.add(box(0.06, 2.6, 0.06, wood, 0, 8.7, z2));
      var shade = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.6, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2a2018, side: THREE.DoubleSide }));
      shade.position.set(0, 7.4, z2);
      root.add(shade);
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffcc77, emissiveIntensity: 2.2 }));
      bulb.position.set(0, 7.2, z2);
      root.add(bulb);
    }

    return {
      pos: [0, 5.5, 12], target: [0, 3.4, -12],
      lights: [
        { type: "ambient", color: 0x2c2620, intensity: 1.1 },
        { type: "dir", color: 0xffe0b8, intensity: 0.6, pos: [0, 14, 4] },
        { type: "point", color: 0xffcc88, intensity: 8, pos: [0, 7, -12] },
        { type: "point", color: 0xffcc88, intensity: 6, pos: [0, 7, 0] }
      ],
      fog: [0x100e0c, 18, 55]
    };
  }

  /* ============ 场景 G：革命街垒街区 ============ */
  function buildStreet(root) {
    var groundMat = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 1 });
    groundMat.map.repeat.set(10, 12);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), groundMat);
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    var stone = new THREE.MeshStandardMaterial({ color: 0x453c33, roughness: 1 });
    var stone2 = new THREE.MeshStandardMaterial({ color: 0x3a322a, roughness: 1 });

    // 街两侧连续立面
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 6; i++) {
        var z = -22 + i * 8.5;
        var h = 10 + ((i * 3) % 5);
        root.add(box(1.6, h, 8, i % 2 ? stone : stone2, side * 9, h / 2, z));
        // 窗
        for (var wy = 0; wy < 3; wy++) {
          for (var wx = 0; wx < 2; wx++) {
            root.add(box(0.2, 1.5, 1.2, new THREE.MeshStandardMaterial({ color: 0x15120f }),
              side * 8.15, 3.4 + wy * 2.6, z - 2 + wx * 3.2));
          }
        }
      }
    }

    // 街垒
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x4e3a26, roughness: 1 });
    var barrelMat = new THREE.MeshStandardMaterial({ color: 0x3f2f20, roughness: 0.95 });
    for (var k = 0; k < 34; k++) {
      var w = box(2.0, 0.26, 1.0, woodMat, -5 + Math.random() * 10, 0.3 + Math.random() * 1.6, 2 + Math.random() * 2.4);
      w.rotation.set(Math.random() * 0.4, Math.random() * 0.8, Math.random() * 0.5);
      root.add(w);
    }
    for (var b = 0; b < 9; b++) {
      var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 14), barrelMat);
      barrel.position.set(-4.5 + Math.random() * 9, 0.45, 3 + Math.random() * 2);
      root.add(barrel);
    }
    // 翻倒的手推车
    var cart = new THREE.Group();
    cart.add(box(1.8, 0.14, 1.1, woodMat, 0, 0, 0));
    cart.add(box(0.14, 0.7, 1.1, woodMat, -0.85, 0.35, 0));
    cart.add(box(0.14, 0.7, 1.1, woodMat, 0.85, 0.35, 0));
    var cw1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 16), woodMat);
    cw1.position.set(-0.6, -0.3, 0.55); cart.add(cw1);
    var cw2 = cw1.clone(); cw2.position.set(0.6, -0.3, 0.55); cart.add(cw2);
    cart.position.set(2.4, 1.0, 4);
    cart.rotation.set(0.5, 0.4, 0.2);
    root.add(cart);

    // 街灯
    for (var L = 0; L < 2; L++) {
      var lx = L ? 7 : -7;
      root.add(box(0.16, 5.2, 0.16, stone, lx, 2.6, -6 + L * 12));
      var arm = box(1.2, 0.1, 0.1, stone, lx + (L ? -0.6 : 0.6), 5.1, -6 + L * 12);
      root.add(arm);
      var glow = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xffdca0, emissive: 0xffbb66, emissiveIntensity: 2.6 }));
      glow.position.set(lx + (L ? -1.2 : 1.2), 5.0, -6 + L * 12);
      root.add(glow);
    }

    return {
      pos: [0, 4, 20], target: [0, 3, -4],
      lights: [
        { type: "ambient", color: 0x1e222c, intensity: 0.9 },
        { type: "dir", color: 0x8fa6c8, intensity: 0.7, pos: [-10, 16, 10] },
        { type: "point", color: 0xffbb66, intensity: 10, pos: [-7, 5, -6] },
        { type: "point", color: 0xd9433f, intensity: 5, pos: [4, 2, 3] }
      ],
      fog: [0x0d0f13, 20, 62]
    };
  }

  /* ============ 场景 H：历史人物书房 ============ */
  function buildStudy(root) {
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.75 });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var wallMat = new THREE.MeshStandardMaterial({ color: 0x34281e, roughness: 1 });
    root.add(box(18, 9, 0.5, wallMat, 0, 4.5, -9));
    root.add(box(0.5, 9, 18, wallMat, -9, 4.5, 0));

    var wood = new THREE.MeshStandardMaterial({ color: 0x3d2a1b, roughness: 0.7 });
    // 书桌
    var desk = new THREE.Group();
    desk.add(box(4.2, 0.16, 2.0, wood, 0, 1.5, 0));
    [[-1.9, -0.85], [1.9, -0.85], [-1.9, 0.85], [1.9, 0.85]].forEach(function (p) {
      desk.add(box(0.16, 1.5, 0.16, wood, p[0], 0.75, p[1]));
    });
    desk.add(box(4.0, 0.6, 0.1, wood, 0, 1.9, -0.9));
    // 桌上：纸、墨水瓶、蜡烛
    desk.add(box(0.9, 0.02, 1.2, new THREE.MeshStandardMaterial({ color: 0xe8e0d0 }), -0.6, 1.6, 0.1));
    desk.add(box(0.7, 0.02, 1.0, new THREE.MeshStandardMaterial({ color: 0xe8e0d0 }), 0.5, 1.6, -0.1));
    var ink = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x14100c }));
    ink.position.set(1.4, 1.66, 0.4); desk.add(ink);
    var candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }));
    candle.position.set(1.7, 1.79, -0.5); desk.add(candle);
    var flame = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffaa44, emissiveIntensity: 3 }));
    flame.position.set(1.7, 2.06, -0.5); desk.add(flame);
    desk.position.set(-1, 0, -2.5);
    root.add(desk);

    // 书架
    var shelfMat = new THREE.MeshStandardMaterial({ color: 0x2f2116, roughness: 0.85 });
    for (var r = 0; r < 4; r++) {
      root.add(box(5.6, 0.12, 1.0, shelfMat, 5.6, 1.2 + r * 1.5, -8.2));
      for (var b = 0; b < 16; b++) {
        var bh = 0.7 + Math.random() * 0.5;
        var bw = 0.12 + Math.random() * 0.1;
        var bc = [0x6b2a22, 0x2a3f5c, 0x3f4a2a, 0x584a2a, 0x2a2a2a][b % 5];
        root.add(box(bw, bh, 0.7, new THREE.MeshStandardMaterial({ color: bc, roughness: 0.9 }),
          3.2 + b * 0.31, 1.26 + r * 1.5 + bh / 2, -8.2));
      }
    }

    // 扶手椅
    var fabric = new THREE.MeshStandardMaterial({ color: 0x4a2f28, roughness: 1 });
    var chair = new THREE.Group();
    chair.add(box(1.5, 0.4, 1.4, fabric, 0, 0.6, 0));
    chair.add(box(1.5, 1.2, 0.3, fabric, 0, 1.3, -0.55));
    chair.add(box(0.25, 0.7, 1.3, fabric, -0.85, 0.95, 0));
    chair.add(box(0.25, 0.7, 1.3, fabric, 0.85, 0.95, 0));
    chair.position.set(-5, 0, -4);
    chair.rotation.y = 0.7;
    root.add(chair);

    // 窗与光
    var winMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, emissive: 0x556677, emissiveIntensity: 0.6 });
    root.add(box(0.2, 4.2, 3.4, winMat, -8.7, 4.4, 1));
    root.add(box(0.16, 4.2, 0.12, wood, -8.6, 4.4, 1));
    root.add(box(0.16, 0.12, 3.4, wood, -8.6, 4.4, 1));

    return {
      pos: [2.5, 3.2, 6.5], target: [-1, 1.9, -3],
      lights: [
        { type: "ambient", color: 0x2a231c, intensity: 0.8 },
        { type: "dir", color: 0xbfd4e8, intensity: 0.85, pos: [-12, 8, 4] },
        { type: "point", color: 0xffaa55, intensity: 3.2, pos: [0.7, 2.2, -3] }
      ],
      fog: [0x0d0b09, 10, 34]
    };
  }

  /* ============ 场景 I：历史纪念空间 ============ */
  function buildMemorial(root) {
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1917, roughness: 0.8 });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    var black = new THREE.MeshStandardMaterial({ color: 0x22201d, roughness: 0.95 });
    root.add(box(30, 12, 0.6, black, 0, 6, -12));
    root.add(box(0.6, 12, 24, black, -15, 6, 0));

    // 纪念墙（带浮雕块）
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x3a352e, roughness: 1 });
    root.add(box(18, 7, 0.8, wallMat, 0, 3.5, -11.4));
    for (var i = 0; i < 40; i++) {
      var bw = 0.5 + Math.random() * 1.2;
      var bh = 0.4 + Math.random() * 0.9;
      var rel = box(bw, bh, 0.12 + Math.random() * 0.12,
        new THREE.MeshStandardMaterial({ color: 0x4a443b, roughness: 0.95 }),
        -8 + Math.random() * 16, 1.2 + Math.random() * 4.6, -10.95);
      root.add(rel);
    }

    // 台座与雕像剪影
    var plinth = box(3.2, 1.4, 3.2, new THREE.MeshStandardMaterial({ color: 0x2e2a25, roughness: 0.9 }), 0, 0.7, -4);
    root.add(plinth);
    var figMat = new THREE.MeshStandardMaterial({ color: 0x4b453c, roughness: 0.85 });
    var fig = new THREE.Group();
    fig.add(box(1.2, 2.4, 0.9, figMat, 0, 1.2, 0));
    fig.add(box(1.5, 0.5, 1.0, figMat, 0, 2.5, 0));
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), figMat);
    head.position.set(0, 3.0, 0);
    fig.add(head);
    fig.position.set(0, 1.4, -4);
    root.add(fig);

    // 烛光
    for (var c = 0; c < 8; c++) {
      var x = -6 + c * 1.7;
      var cy = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }));
      cy.position.set(x, 0.15, -8.5);
      root.add(cy);
      var fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffaa44, emissiveIntensity: 3 }));
      fl.position.set(x, 0.36, -8.5);
      root.add(fl);
    }

    // 射灯光柱（半透明锥）
    for (var s = -1; s <= 1; s += 2) {
      var beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 12, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.set(s * 3.2, 6, -4);
      beam.rotation.x = Math.PI;
      root.add(beam);
    }

    return {
      pos: [0, 4.2, 12], target: [0, 3, -5],
      lights: [
        { type: "ambient", color: 0x1c1a17, intensity: 0.9 },
        { type: "dir", color: 0xd8e0ea, intensity: 0.5, pos: [0, 16, 6] },
        { type: "point", color: 0xffcc88, intensity: 5, pos: [0, 2.4, -8] },
        { type: "point", color: 0xd9433f, intensity: 2.4, pos: [0, 1.2, -4] }
      ],
      fog: [0x080807, 12, 40]
    };
  }

  /* ============ 交互热点 ============ */
  var HOTSPOTS = {
    factory: [
      { pos: [-7, 5.2, 7], title: "传动天轴", text: "横贯车间的天轴由蒸汽机统一驱动，皮带把动力分给每台机器。工人无法决定转速——节奏由机器给出，不由人给出。" },
      { pos: [3, 2.0, 9], title: "铸件与机床", text: "车床与刨床旁的工人按件计酬。19 世纪上半叶的工厂立法争论，核心正是「工时由谁定」。" },
      { pos: [-16, 1.0, -10], title: "煤堆与锅炉", text: "锅炉房是车间的心脏。煤炭、蒸汽、工时共同构成生产成本，也构成工人每天面对的环境。" }
    ],
    street: [
      { pos: [0, 2.2, 4], title: "街垒", text: "石板、木料、酒桶、翻倒的马车——街垒不是武器，是把街道暂时变成另一种空间的办法。1871 年 5 月的巴黎，这样的结构出现在数百个路口。" },
      { pos: [-7, 5.2, -6], title: "街灯", text: "煤气街灯既是照明也是坐标。战斗记录常用「某盏灯下」定位冲突，城市本身成了地图。" },
      { pos: [7, 3.0, 6], title: "墙面与招贴", text: "墙上的公告、报纸与传单是 19 世纪的城市媒介。谁能在墙上说话，决定了谁能组织起人。" }
    ],
    archive: [
      { pos: [0, 3.9, -6], title: "书架", text: "这里的每一本书都来自可追溯的扫描件：Internet Archive 的公版书页。书脊上的编号对应来源记录。" },
      { pos: [0, 1.3, 3], title: "阅读桌", text: "档案不是结论，是材料。桌子留给出入于版本、译本与批注之间的读者。" },
      { pos: [-5.5, 3.4, -6], title: "版本谱系", text: "同一份文本在不同年份、不同语言的版本并排时，差异本身就是史料。" }
    ]
  };

  var hotspotMeshes = [], hotspotRay = null, hotspotCard = null;

  /* ---------- 史料墙：把真实档案照片挂进三维场景 ---------- */
  /* 九个场景各自的取图规则；按顺序匹配，第一条命中即用 */
  var PHOTO_TOPICS = {
    factory: [/工厂|童工/, /罢工|工会/],
    plaza: [/罢工|街垒/, /纪念物|场地/, /1850|1871/],
    shikumen: [/场地|旧址/, /组织|媒介/, /罢工/],
    press: [/文献|书籍/, /报刊|组织|媒介/],
    hall: [/组织|媒介/, /宣讲场景|绘画/],
    street: [/罢工|街垒/, /1848|革命/, /场地|旧址/],
    study: [/文献|书籍/, /形象|雕像/, /绘画/],
    memorial: [/纪念物|纪念|传播/, /形象|雕像/],
    archive: [/文献|书籍/, /档案馆/]
  };
  var photoPool = null, photoGroup = null, photoLoader = new THREE.TextureLoader();
  var photoMeshes = [];

  fetch("assets/manifests/images.json?v=e3").then(function (r) { return r.json(); }).then(function (d) {
    photoPool = d.items || [];
    window.__photoPoolLen = photoPool.length;
    if (current >= 0) attachPhotoWall();
  }).catch(function () {});

  function clearPhotoWall() {
    if (!photoGroup) return;
    photoGroup.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    if (photoGroup.parent) photoGroup.parent.remove(photoGroup);
    photoGroup = null;
    photoMeshes = [];
  }

  function attachPhotoWall() {
    if (!photoPool || !photoPool.length || !scene) return;
    var def = SCENES[current];
    if (!def) return;
    var rules = PHOTO_TOPICS[def.id];
    if (!rules) return;

    /* 依次尝试各条规则，凑满 6 张；都不中就用通用池兜底 */
    var picks = [];
    (Array.isArray(rules) ? rules : [rules]).forEach(function (re) {
      if (picks.length >= 6) return;
      photoPool.forEach(function (it) {
        if (picks.length >= 6) return;
        if (picks.indexOf(it) >= 0) return;
        if (re.test(it.folder || "")) picks.push(it);
      });
    });
    if (picks.length < 6) {
      photoPool.forEach(function (it) {
        if (picks.length >= 6) return;
        if (picks.indexOf(it) < 0) picks.push(it);
      });
    }
    if (!picks.length) return;

    clearPhotoWall();
    photoGroup = new THREE.Group();

    picks.forEach(function (it, i) {
      var w = 4.4, h = 2.9;
      var geo = new THREE.PlaneGeometry(w, h);
      var mat = new THREE.MeshBasicMaterial({ color: 0x1a1714, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(geo, mat);
      var col = i % 3, row = Math.floor(i / 3);
      var ang = -0.66 + col * 0.44 + row * 0.09;
      var r = 17 + row * 1.6;
      mesh.position.set(Math.sin(ang) * r, 6.6 + row * -3.0, Math.cos(ang) * r - 12);
      mesh.lookAt(0, 5.0, -10);
      mesh.rotation.z = (i % 2 ? -1 : 1) * 0.02;
      mesh.userData.photo = it;
      photoMeshes.push(mesh);
      photoGroup.add(mesh);

      /* 画框 */
      var frame = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 0.18, h + 0.18),
        new THREE.MeshBasicMaterial({ color: 0xc9a262, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      frame.position.copy(mesh.position);
      frame.position.z += 0.01;
      frame.quaternion.copy(mesh.quaternion);
      photoGroup.add(frame);

      photoLoader.load(it.src, function (tex) {
        if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        mesh.material.map = tex;
        mesh.material.color.setHex(0xffffff);
        mesh.material.needsUpdate = true;
      }, undefined, function () {});
    });

    scene.add(photoGroup);
    window.__photoGroup = photoGroup;
  }

  function clearHotspots() {
    hotspotMeshes.forEach(function (m) {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    });
    hotspotMeshes = [];
    if (hotspotCard && hotspotCard.parentNode) hotspotCard.parentNode.removeChild(hotspotCard);
    hotspotCard = null;
  }

  function showHotspotCard(def) {
    var stage = canvas.parentNode;
    if (!stage) return;
    if (hotspotCard && hotspotCard.parentNode) hotspotCard.parentNode.removeChild(hotspotCard);
    var card = document.createElement("aside");
    card.className = "hotspot-card";
    card.innerHTML = '<button type="button" class="hotspot-close" aria-label="关闭">×</button>' +
      "<h4></h4><p></p>";
    card.querySelector("h4").textContent = def.title;
    card.querySelector("p").textContent = def.text;
    card.querySelector(".hotspot-close").onclick = function () {
      if (card.parentNode) card.parentNode.removeChild(card);
      hotspotCard = null;
    };
    stage.appendChild(card);
    hotspotCard = card;
  }

  function showPhotoCard(item) {
    var stage = canvas.parentNode;
    if (!stage) return;
    if (hotspotCard && hotspotCard.parentNode) hotspotCard.parentNode.removeChild(hotspotCard);
    var card = document.createElement("aside");
    card.className = "hotspot-card";
    var title = (item.title || "档案图像").slice(0, 90);
    var meta = (item.desc ? item.desc + "　｜　" : "") + "© " + (item.author || "未署名") + " · " + (item.license || "");
    card.innerHTML = '<button type="button" class="hotspot-close" aria-label="关闭">×</button>' +
      "<h4></h4><p></p>" + (item.page ? '<a class="hotspot-link" target="_blank" rel="noopener noreferrer">核对原始页面 ↗</a>' : "");
    card.querySelector("h4").textContent = title;
    card.querySelector("p").textContent = meta + "　｜　这是真实档案图像，场景建筑为程序化示意。";
    var a = card.querySelector(".hotspot-link");
    if (a) a.href = item.page;
    card.querySelector(".hotspot-close").onclick = function () {
      if (card.parentNode) card.parentNode.removeChild(card);
      hotspotCard = null;
    };
    stage.appendChild(card);
    hotspotCard = card;
  }

  function pickPhoto(clientX, clientY) {
    if (!hotspotRay || !photoMeshes.length || !camera) return null;
    var rect = canvas.getBoundingClientRect();
    var ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    hotspotRay.setFromCamera(ndc, camera);
    var hits = hotspotRay.intersectObjects(photoMeshes, false);
    return hits.length ? hits[0].object.userData.photo : null;
  }

  function makeHotspots(root, defs) {
    if (!defs || !defs.length) return;
    var geo = new THREE.OctahedronGeometry(0.42, 0);
    defs.forEach(function (d) {
      var mat = new THREE.MeshStandardMaterial({
        color: 0xc9a262, emissive: 0xc9a262, emissiveIntensity: 1.4,
        metalness: 0.3, roughness: 0.5
      });
      var mesh = new THREE.Mesh(geo.clone(), mat);
      mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
      mesh.userData.hotspot = d;
      root.add(mesh);
      hotspotMeshes.push(mesh);
    });
    hotspotRay = hotspotRay || new THREE.Raycaster();
    window.__hotspots = hotspotMeshes;          // 调试/验证用
    window.__hsProject = function (mesh) {
      var v = new THREE.Vector3().copy(mesh.position);
      mesh.parent.localToWorld(v);
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5), y: (-v.y * 0.5 + 0.5), z: v.z };
    };
  }

  function pickHotspot(clientX, clientY) {
    if (!hotspotRay || !hotspotMeshes.length || !camera) return null;
    var rect = canvas.getBoundingClientRect();
    var ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    hotspotRay.setFromCamera(ndc, camera);
    var hits = hotspotRay.intersectObjects(hotspotMeshes, false);
    return hits.length ? hits[0].object.userData.hotspot : null;
  }

  /* ============ 场景装配与切换 ============ */
  var SCENES = [
    { id: "factory", name: "01 工业革命工厂", build: buildFactory,
      desc: "砖墙、立柱、五台机械与烟尘。机械为体块示意，非实物扫描。" },
    { id: "plaza", name: "02 巴黎公社广场", build: buildPlaza,
      desc: "市政厅体块、周边楼群、街垒与飘扬的红旗。全部为程序化建模。" },
    { id: "shikumen", name: "03 上海工人街区", build: buildShikumen,
      desc: "石库门联排、弄堂牌坊、晾衣绳与黄包车。以旧上海工人聚居区为原型的空间示意。" },
    { id: "press", name: "04 经典文献印刷工坊", build: buildPress,
      desc: "铁制印刷机、铅字盘、纸张堆与晾纸绳。机械按 19 世纪手摇印刷机简化。" },
    { id: "hall", name: "05 工人集会大厅", build: buildHall,
      desc: "讲台、七排长椅、巨幅横幅与三盏吊灯。用于演讲与集会场景。" },
    { id: "street", name: "06 革命街垒街区", build: buildStreet,
      desc: "连续石造立面、街垒木料与酒桶、翻倒的手推车、两盏街灯。" },
    { id: "study", name: "07 历史人物书房", build: buildStudy,
      desc: "书桌、墨水瓶与烛台、四层书架、扶手椅与窗光。用于写作与阅读场景。" },
    { id: "memorial", name: "08 历史纪念空间", build: buildMemorial,
      desc: "纪念墙浮雕、台座与雕像剪影、八支烛光与两道光柱。用于收束章节。" },
    { id: "archive", name: "09 数字档案厅", build: buildArchive,
      desc: "十份真实封面的三维文献，可旋转查看；封面来自公有领域与 CC 授权扫描。" }
  ];

  function disposeScene() {
    if (!scene) return;
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  function load(i) {
    current = i;
    var def = SCENES[i];
    currentName = def.name;
    disposeScene();
    scene = new THREE.Scene();
    var root = new THREE.Group();
    scene.add(root);

    clearHotspots();
    clearPhotoWall();
    var cfg = def.build(root, booksData || []);
    window.__scene = scene;
    makeHotspots(root, HOTSPOTS[def.id]);
    attachPhotoWall();

    if (cfg.fog) scene.fog = new THREE.Fog(cfg.fog[0], cfg.fog[1], cfg.fog[2]);
    (cfg.lights || []).forEach(function (L) {
      var light;
      if (L.type === "ambient") light = new THREE.AmbientLight(L.color, L.intensity);
      else if (L.type === "dir") light = new THREE.DirectionalLight(L.color, L.intensity);
      else light = new THREE.PointLight(L.color, L.intensity, 60);
      if (L.pos) light.position.set(L.pos[0], L.pos[1], L.pos[2]);
      scene.add(light);
    });

    camera.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    if (controls) {
      controls.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
      controls.update();
    }

    var info = document.getElementById("scene-info");
    if (info) {
      info.innerHTML = "<h3>" + def.name + "</h3><p>" + def.desc + "</p>";
    }
    Array.prototype.forEach.call(document.querySelectorAll("#scene-tabs button"), function (b, k) {
      b.classList.toggle("on", k === i);
    });
  }

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x211e19, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    window.__camera = camera;

    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.minDistance = 4;
      controls.maxDistance = 70;
      controls.enablePan = false;
    }

    fetch("assets/manifests/books.json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        booksData = d.items;
        load(initialSceneIndex());
        tick();
      })
      .catch(function () {
        booksData = [];
        load(initialSceneIndex());
        tick();
      });

    var tabs = document.getElementById("scene-tabs");
    if (tabs) {
      SCENES.forEach(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = s.name;
        if (i === 0) b.classList.add("on");
        b.addEventListener("click", function () { load(i); });
        tabs.appendChild(b);
      });
    }

    canvas.addEventListener("pointerdown", function (ev) {
      var hit = pickHotspot(ev.clientX, ev.clientY);
      if (hit) {
        ev.preventDefault();
        showHotspotCard(hit);
        return;
      }
      var photo = pickPhoto(ev.clientX, ev.clientY);
      if (photo) {
        ev.preventDefault();
        showPhotoCard(photo);
      }
    });

    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!renderer) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  init();
})();
