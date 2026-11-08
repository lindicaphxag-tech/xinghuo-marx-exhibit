/* map-story.js — 卷一 滚动叙事历史地图：手绘示意欧洲 + 章节镜头飞行 */
(function () {
  "use strict";
  var HS = window.HS;
  var D = window.HS_DATA;
  /* Present the entire arc in chronological order, including Marx's 1818–1844 formation. */
  D.storyChapters.sort(function (a, b) {
    var ya = Number((a.year.match(/\d{4}/) || [0])[0]);
    var yb = Number((b.year.match(/\d{4}/) || [0])[0]);
    return ya - yb;
  });
  var canvas = document.getElementById("map-canvas");
  var side = document.getElementById("map-side");
  var legend = document.getElementById("map-legend");
  var parisDetail = document.getElementById("paris-detail");
  if (!canvas || !side) return;
  var ctx = canvas.getContext("2d");

  var cityMap = {};
  D.cities.forEach(function (c) { cityMap[c.id] = c; });

  /* ---------- 右侧章节卡片 ---------- */
  var cards = [];
  function renderChapters() {
    /* 只渲染一次：主站调度与自启动可能都调用，重复渲染会让观察器指向已删除的节点 */
    if (cards.length) return;
    D.storyChapters.forEach(function (ch, i) {
      var el = document.createElement("div");
      el.className = "map-chapter" + (i === activeIdx ? " active" : "");
      el.dataset.idx = i;
      el.innerHTML =
        '<div class="yr">' + ch.year + "</div>" +
        "<h3>" + ch.title + "</h3>" +
        '<p class="lead">' + ch.lead + "</p>" +
        "<ul>" + ch.points.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>" +
        '<div class="note">' + ch.note + "</div>" +
        '<div class="chapter-hard" data-hard="' + ch.id + '"></div>' +
        renderLinks(ch.id);
      side.appendChild(el);
      cards.push(el);
    });
    legend.innerHTML =
      '<span class="dot" style="background:#d9433f"></span>当前章节城市<br>' +
      '<span class="dot" style="background:#c89b5a"></span>历史现场点位<br>' +
      '<span class="dot" style="background:#f2be75"></span>行进点：本章新增路段<br>' +
      '<span class="dot" style="background:#5e7180"></span>真实海岸线与国界 · Natural Earth 110m';
    side.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-story-destination]");
      if (b && HS.scrollToId) HS.scrollToId(b.getAttribute("data-story-destination"));
    });
  }

  /* ---------- 硬内容：日期、数字、原文、文献链接 + 按地点匹配的档案图 ---------- */
  var HARD = null, IMG_BY_PLACE = {};

  function loadHardFacts() {
    fetch("assets/manifests/story-facts.json?v=1").then(function (r) { return r.json(); })
      .then(function (d) {
        HARD = d.chapters || {};
        return fetch("assets/manifests/images.json?v=e3").then(function (r) { return r.json(); });
      })
      .then(function (d) {
        (d.items || []).forEach(function (it) {
          var k = it.place || "";
          if (!k) return;
          (IMG_BY_PLACE[k] = IMG_BY_PLACE[k] || []).push(it);
        });
        fillHardFacts();
      })
      .catch(function () {});
  }

  function fillHardFacts() {
    if (!HARD) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-hard]"), function (box) {
      var id = box.getAttribute("data-hard");
      var f = HARD[id];
      if (!f) return;
      var imgs = [];
      (f.imgs || []).forEach(function (place) {
        (IMG_BY_PLACE[place] || []).slice(0, 2).forEach(function (it) { imgs.push(it); });
      });
      imgs = imgs.slice(0, 3);
      box.innerHTML =
        '<p class="hard-head">硬内容 · ' + (f.hard || []).length + " 条</p>" +
        '<dl class="hard-list">' +
        (f.hard || []).map(function (h) {
          return "<dt>" + h.k + "</dt><dd>" + h.v + "</dd>";
        }).join("") + "</dl>" +
        (imgs.length ? '<div class="hard-imgs">' + imgs.map(function (it) {
          return '<figure><img src="' + (it.ring || it.src) + '" alt="' + (it.title || "") +
            '" loading="lazy"><figcaption>' + (it.title || "") + "</figcaption></figure>";
        }).join("") + "</div>" : "") +
        ((f.sources || []).length ? '<div class="hard-src">来源：' + f.sources.map(function (s) {
          return '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer">' + s.label + " ↗</a>";
        }).join("　") + "</div>" : "");
    });
  }

  function renderLinks(id) {
    var links = {
      "ch-marx-origin": [["network", "人物与组织网络"], ["press", "历史报刊"]],
      "ch-manifesto": [["relic", "宣言原文"], ["press", "历史报刊"]],
      "ch-1848": [["press", "革命报刊"], ["network", "人物与组织网络"]],
      "ch-first-international": [["network", "第一国际关系网"], ["river", "时间河流"]],
      "ch-commune": [["commune", "巴黎公社时序"], ["artifacts", "历史空间"]],
      "ch-second-international": [["network", "政党关系网络"], ["river", "时间河流"]]
    }[id] || [];
    if (!links.length) return "";
    return '<div class="map-crosslinks" aria-label="沿线索继续探索">继续查看 ' + links.map(function (x) {
      return '<button type="button" data-story-destination="' + x[0] + '">' + x[1] + '</button>';
    }).join("") + "</div>";
  }

  /* ---------- 镜头状态 ---------- */
  var cam = { x: 500, y: 380, zoom: 1 };
  var target = { x: 500, y: 380, zoom: 1 };
  var activeIdx = 0;
  var prevCity = null;

  var parisSites = {
    montmartre: { date: "1871年3月18日", title: "蒙马特高地", copy: "政府军试图收缴国民自卫军火炮。士兵与居民发生接触，收炮行动失败，起义由此爆发。这里解释的是事件起点，不绘制未经核实的行军路线。", source: "法国国民议会：巴黎公社", url: "https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/troisieme-republique/la-commune-de-paris" },
    hotel: { date: "1871年3月18日—5月28日", title: "市政厅", copy: "国民自卫军中央委员会在此办公；3月26日选举后，公社委员会在市政厅开展治理。1871年5月24日建筑在流血周期间被焚毁。", source: "巴黎市政府：公社起源与市政厅史", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-l-origine-1-5-16961" },
    tuileries: { date: "1871年5月23日", title: "杜伊勒里宫", copy: "流血周期间，杜伊勒里宫遭焚毁。遗址提醒我们：城市冲突不仅改变政权，也会永久改变城市建筑与公共记忆。", source: "巴黎市政府：流血周与建筑损毁", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-la-fin-sanglante-et-les-consequences-5-5-17210" },
    pere: { date: "1871年5月末", title: "拉雪兹神父公墓", copy: "流血周末期，战斗集中到公墓一带。公墓北侧的联邦社员墙成为处决与纪念地点，说明失败后的镇压也构成这段历史的一部分。", source: "巴黎市政府：公社标志地点", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-les-lieux-emblematiques-2-5-16972" },
    buttes: { date: "1871年5月27—28日", title: "肖蒙山丘公园", copy: "肖蒙山丘与拉雪兹神父公墓一带是公社末期的抵抗和镇压现场。将这处地点标出，是为了呈现战事在城市东部的集中，而不是把全部冲突压成一条虚构路线。", source: "巴黎市政府：公社标志地点", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-les-lieux-emblematiques-2-5-16972" },
    fontaine: { date: "1871年5月28日", title: "芳丹欧鲁瓦街", copy: "这里设有纪念最后街垒的牌匾。关于“最后一座街垒”的具体位置，纪念叙述存在不同说法，因此地图展示为纪念地点，不将争议处理成唯一确定坐标。", source: "巴黎市政府：公社标志地点", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-les-lieux-emblematiques-2-5-16972" },
    cailles: { date: "1871年5月", title: "比耶夫尔山丘（Butte-aux-Cailles）", copy: "比耶夫尔山丘是重要防守据点之一。巴黎市政府的历史专题记述了此处持续约三十六小时的抵抗，展示战斗如何沿街区和高地展开。", source: "巴黎市政府：公社标志地点", url: "https://www.paris.fr/pages/les-150-ans-de-la-commune-les-lieux-emblematiques-2-5-16972" }
  };
  var phaseSites = {
    uprising: ["montmartre", "hotel"],
    commune: ["hotel", "cailles"],
    week: ["hotel", "tuileries", "pere", "buttes", "fontaine", "cailles"]
  };
  function showParisSite(id) {
    var item = parisSites[id];
    if (!item || !parisDetail) return;
    document.getElementById("paris-site-date").textContent = item.date;
    document.getElementById("paris-site-title").textContent = item.title;
    document.getElementById("paris-site-copy").textContent = item.copy;
    var source = document.getElementById("paris-site-source");
    source.textContent = "史料依据：" + item.source + " ↗";
    source.href = item.url;
    parisDetail.querySelectorAll(".paris-point").forEach(function (p) { p.classList.toggle("selected", p.dataset.site === id); });
  }
  function setParisPhase(phase) {
    if (!parisDetail || !phaseSites[phase]) return;
    parisDetail.querySelectorAll("[data-map-phase]").forEach(function (button) {
      var selected = button.dataset.mapPhase === phase;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    parisDetail.querySelectorAll(".paris-point").forEach(function (point) {
      point.classList.toggle("is-muted", phaseSites[phase].indexOf(point.dataset.site) < 0);
    });
    var first = phaseSites[phase][0];
    showParisSite(first);
  }
  /* ---------- 巴黎细节图：真实市界 + 真实点位 ---------- */
  var PARIS = null;

  function parisProject(lon, lat) {
    var b = PARIS.bbox;
    var x0 = 40, y0 = 30, x1 = 720, y1 = 440;   // viewBox 760×470 内留白
    var sx = (x1 - x0) / (b[2] - b[0]);
    var sy = (y1 - y0) / (b[3] - b[1]);
    var s = Math.min(sx, sy);
    var ox = x0 + ((x1 - x0) - (b[2] - b[0]) * s) / 2;
    var oy = y0 + ((y1 - y0) - (b[3] - b[1]) * s) / 2;
    return { x: ox + (lon - b[0]) * s, y: oy + (b[3] - lat) * s };
  }

  function applyParisGeo() {
    if (!parisDetail || !PARIS) return;
    var svg = parisDetail.querySelector("svg.paris-schematic");
    if (!svg) return;

    /* 1) 真实市界替换手绘多边形 */
    var shape = svg.querySelector(".paris-city-shape");
    if (shape) {
      var d = PARIS.rings.map(function (ring) {
        return ring.map(function (pt, i) {
          var q = parisProject(pt[0], pt[1]);
          return (i ? "L" : "M") + q.x.toFixed(1) + " " + q.y.toFixed(1);
        }).join(" ") + "Z";
      }).join(" ");
      shape.setAttribute("d", d);
    }
    svg.setAttribute("aria-label", "巴黎市界（真实行政边界）与 1871 年公社事件点位");

    /* 2) 七个点位按真实经纬度重排 */
    Array.prototype.forEach.call(svg.querySelectorAll(".paris-point"), function (g) {
      var site = g.getAttribute("data-site");
      var ll = PARIS.sites[site];
      if (!ll) return;
      var q = parisProject(ll[0], ll[1]);
      var circle = g.querySelector("circle");
      if (circle) { circle.setAttribute("cx", q.x.toFixed(1)); circle.setAttribute("cy", q.y.toFixed(1)); }
      var label = g.querySelector("text");
      if (label) { label.setAttribute("x", (q.x + 12).toFixed(1)); label.setAttribute("y", (q.y + 4).toFixed(1)); }
    });

    /* 3) 塞纳河用真实控制点重绘（近似河道，非测绘） */
    var seine = svg.querySelector(".paris-seine");
    if (seine) {
      /* 塞纳河穿城段：按真实河道走向取点，用二次贝塞尔平滑 */
      var pts = [
        [2.2280, 48.8390], [2.2560, 48.8455], [2.2870, 48.8510],
        [2.3010, 48.8590], [2.3220, 48.8615], [2.3400, 48.8590],
        [2.3520, 48.8538], [2.3660, 48.8470], [2.3830, 48.8385],
        [2.4020, 48.8300]
      ].map(function (pt) { return parisProject(pt[0], pt[1]); });
      var d2 = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        d2 += " Q" + pts[i].x.toFixed(1) + " " + pts[i].y.toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1);
      }
      var last = pts[pts.length - 1];
      d2 += " L" + last.x.toFixed(1) + " " + last.y.toFixed(1);
      seine.setAttribute("d", d2);
    }

    var note = parisDetail.querySelector(".map-detail-note");
    if (note) note.innerHTML = "真实市界 · 事件点位按史料推定<br>窄屏可横向浏览地图";
  }

  function initParisDetail() {
    if (!parisDetail || parisDetail.dataset.ready) return;
    parisDetail.dataset.ready = "true";
    if (!PARIS) {
      fetch("assets/geo/paris.json").then(function (r) { return r.json(); }).then(function (g) {
        PARIS = g;
        applyParisGeo();
      }).catch(function () {});
    }
    parisDetail.querySelectorAll("[data-map-phase]").forEach(function (button) {
      button.addEventListener("click", function () { setParisPhase(button.dataset.mapPhase); });
    });
    parisDetail.querySelectorAll(".paris-point").forEach(function (point) {
      point.addEventListener("click", function () { showParisSite(point.dataset.site); });
      point.addEventListener("mouseenter", function () { showParisSite(point.dataset.site); });
      point.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showParisSite(point.dataset.site); }
      });
    });
    setParisPhase("uprising");
  }

  function setActive(i) {
    var changed = i !== activeIdx;
    activeIdx = i;
    cards.forEach(function (c, k) { c.classList.toggle("active", k === i); });
    var ch = D.storyChapters[i];
    if (parisDetail) parisDetail.hidden = !ch || ch.id !== "ch-commune";
    if (ch && ch.id === "ch-commune") initParisDetail();
    if (ch && ch.focus) {
      target.x = ch.focus.x; target.y = ch.focus.y; target.zoom = ch.focus.zoom;
      prevCity = ch.city;
    }
    if (changed && !HS.reduced) { routeProgress = 0; routeStarted = 0; }
    draw();
    requestCameraMotion();
  }

  /* ---------- 章节观察器 ---------- */
  var io = null;
  /* 章节跟随：直接按「卡片中心离视口中心最近」判定，
     不依赖 IntersectionObserver 的阈值（卡片高度变化时阈值会失效）。 */
  var trackRAF = 0;
  function trackActive() {
    trackRAF = 0;
    if (!cards.length) return;
    var mid = window.innerHeight * 0.5;
    var best = -1, bestD = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0 && best !== activeIdx) setActive(best);
  }
  function onScrollTrack() {
    if (trackRAF) return;
    trackRAF = requestAnimationFrame(trackActive);
  }

  function observeCards() {
    if (io && io.disconnect) io.disconnect();
    window.removeEventListener("scroll", onScrollTrack);
    window.addEventListener("scroll", onScrollTrack, { passive: true });
    window.addEventListener("resize", onScrollTrack);
    trackActive();
  }

  /* ---------- 坐标映射 ---------- */
  var W = 0, H = 0;
  var routeProgress = 1, routeStarted = 0;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * Math.min(window.devicePixelRatio, 2);
    canvas.height = H * Math.min(window.devicePixelRatio, 2);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
  }

  function project(x, y) {
    /* 0–1000 空间 → 屏幕，以镜头中心为原点 */
    var scale = Math.min(W, H) / 1000 * cam.zoom;
    return {
      x: W / 2 + (x - cam.x) * scale,
      y: H / 2 + (y - cam.y) * scale
    };
  }

  /* ---------- 真实地理底图（assets/geo/europe.json，来自 Natural Earth 110m） ---------- */
  var GEO = null;

  function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)); }

  function geoToWorld(lon, lat) {
    if (!GEO) return { x: 500, y: 500 };
    var b = GEO.bbox;
    var y0 = mercY(b[1]), y1 = mercY(b[3]);
    return {
      x: ((lon - b[0]) / (b[2] - b[0])) * 1000,
      y: ((y1 - mercY(lat)) / (y1 - y0)) * 1000
    };
  }

  function applyGeo() {
    if (!GEO) return;
    /* 用真实经纬度重算城市坐标（覆盖示意坐标） */
    D.cities.forEach(function (c) {
      var ll = GEO.cities && GEO.cities[c.id];
      if (ll) { var w = geoToWorld(ll[0], ll[1]); c.x = w.x; c.y = w.y; }
    });
    /* 章节焦点跟着城市走，保留原有 zoom */
    D.storyChapters.forEach(function (ch) {
      var c = ch.city && cityMap[ch.city];
      if (c && ch.focus) { ch.focus.x = c.x; ch.focus.y = c.y; }
    });
    if (running) { draw(); requestCameraMotion(); }
  }

  fetch("assets/geo/europe.json").then(function (r) { return r.json(); }).then(function (g) {
    GEO = g;
    applyGeo();
  }).catch(function () { /* 拿不到就用下面的示意轮廓兜底 */ });

  /* 简化欧洲示意轮廓（0–1000 坐标折线） */
  var COAST = [
    [560, 250], [548, 300], [548, 330], [516, 356], [504, 408],
    [526, 482], [500, 456], [470, 470], [486, 540], [560, 548],
    [600, 500], [640, 430], [700, 380], [760, 330], [822, 148],
    [720, 200], [646, 304], [648, 356], [562, 300], [560, 250]
  ];
  var BRITAIN = [[586, 196], [612, 248], [596, 286], [574, 262], [578, 214]];

  function drawCoast() {
    if (GEO && GEO.countries && GEO.countries.length) {
      /* 陆地填充 + 海岸线 */
      GEO.countries.forEach(function (country) {
        country.rings.forEach(function (ring) {
          if (!ring || ring.length < 3) return;
          ctx.beginPath();
          for (var i = 0; i < ring.length; i++) {
            var w = geoToWorld(ring[i][0], ring[i][1]);
            var q = project(w.x, w.y);
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(58,54,46,0.55)";
          ctx.fill();
          ctx.strokeStyle = "rgba(169,159,138,0.42)";
          ctx.lineWidth = 0.9;
          ctx.stroke();
        });
      });
      return;
    }
    ctx.strokeStyle = "rgba(169,159,138,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    COAST.forEach(function (p, i) {
      var q = project(p[0], p[1]);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.beginPath();
    BRITAIN.forEach(function (p, i) {
      var q = project(p[0], p[1]);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  function drawRoute() {
    var route = [];
    D.storyChapters.slice(0, activeIdx + 1).forEach(function (chapter) {
      [chapter.city].concat(chapter.multi || []).forEach(function (id) {
        var city = cityMap[id];
        if (city && (!route.length || route[route.length - 1].id !== id)) route.push({ id: id, city: city });
      });
    });
    if (route.length < 2) return;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    route.forEach(function (point, i) {
      var p = project(point.city.x, point.city.y);
      if (!i) ctx.moveTo(p.x, p.y);
      else {
        var prev = project(route[i - 1].city.x, route[i - 1].city.y);
        var mx = (prev.x + p.x) / 2, my = (prev.y + p.y) / 2 - Math.min(42, Math.abs(p.x - prev.x) * .16);
        ctx.quadraticCurveTo(mx, my, p.x, p.y);
      }
    });
    ctx.strokeStyle = "rgba(196,151,91,.55)"; ctx.lineWidth = 2.4; ctx.stroke();
    /* 新增的历史路段随章节推进显影，行进点停在当前章节城市。 */
    var from = project(route[route.length - 2].city.x, route[route.length - 2].city.y);
    var to = project(route[route.length - 1].city.x, route[route.length - 1].city.y);
    var mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2 - Math.min(42, Math.abs(to.x - from.x) * .16);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.setLineDash([5, 8]); ctx.lineDashOffset = -(routeProgress * 13);
    ctx.strokeStyle = "rgba(242,190,117,.96)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
    var p = routeProgress, inv = 1 - p;
    var fx = inv * inv * from.x + 2 * inv * p * mx + p * p * to.x;
    var fy = inv * inv * from.y + 2 * inv * p * my + p * p * to.y;
    ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, Math.PI * 2); ctx.fillStyle = "#ffe0a0"; ctx.fill();
    ctx.beginPath(); ctx.arc(fx, fy, 9, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,224,160,.62)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    /* 网格发丝线 */
    ctx.strokeStyle = "rgba(232,223,200,0.05)";
    for (var gx = 0; gx <= 1000; gx += 100) {
      var a = project(gx, 0), b = project(gx, 1000);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    drawCoast();
    drawRoute();

    /* 先绘制城市点与活动波纹，再给文字避让标签位。 */
    var chapter = D.storyChapters[activeIdx], cityPoints = [];
    D.cities.forEach(function (c) {
      var p = project(c.x, c.y);
      var isActive = chapter && (chapter.city === c.id || (chapter.multi && chapter.multi.indexOf(c.id) >= 0));
      cityPoints.push({ city: c, point: p, active: isActive });
      ctx.beginPath();
      ctx.arc(p.x, p.y, isActive ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#d9433f" : "#c89b5a";
      ctx.fill();
      if (isActive) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(217,67,63,.72)"; ctx.lineWidth = 1.5; ctx.stroke();
      }
    });
    var focusCity = chapter && cityMap[chapter.city];
    cityPoints.sort(function (a, b) {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (!focusCity) return 0;
      return Math.hypot(a.city.x - focusCity.x, a.city.y - focusCity.y) - Math.hypot(b.city.x - focusCity.x, b.city.y - focusCity.y);
    });
    ctx.font = "11px 'Noto Sans Mono', monospace";
    var labelBoxes = [];
    cityPoints.forEach(function (entry) {
      var c = entry.city, p = entry.point, textWidth = ctx.measureText(c.name).width, pad = 3, h = 15;
      var candidates = [
        { x: p.x + 8, y: p.y - 8 }, { x: p.x - textWidth - 8, y: p.y - 8 },
        { x: p.x - textWidth / 2, y: p.y - 15 }, { x: p.x - textWidth / 2, y: p.y + 17 }
      ];
      var chosen = candidates.find(function (b) {
        return b.x >= 3 && b.x + textWidth <= W - 3 && b.y >= 16 && b.y + h <= H - 3 &&
          !labelBoxes.some(function (old) { return !(b.x + textWidth + pad < old.x || old.x + old.w + pad < b.x || b.y + h + 2 < old.y || old.y + old.h + 2 < b.y); });
      });
      if (!chosen) return;
      labelBoxes.push({ x: chosen.x, y: chosen.y, w: textWidth, h: h });
      ctx.fillStyle = entry.active ? "#f3e7cf" : "rgba(224,213,191,.88)";
      ctx.textAlign = "left"; ctx.fillText(c.name, chosen.x, chosen.y + 11);
    });

    /* 章节标题浮层 */
    var ch = D.storyChapters[activeIdx];
    if (ch) {
      var fp = project(ch.focus.x, ch.focus.y);
      ctx.font = "600 12px 'Noto Sans SC', sans-serif";
      ctx.fillStyle = "rgba(255,241,213,0.96)";
      ctx.fillText(ch.year + " · " + ch.city, 24, 24);
      ctx.font = "600 13px 'Noto Sans SC', sans-serif";
      ctx.fillText(ch.title, 24, 48, Math.max(120, W - 48));
    }
  }

  var raf = null, running = false;
  function loop(now) {
    if (!running) { raf = null; return; }
    if (routeProgress < 1) {
      if (!routeStarted) routeStarted = now || performance.now();
      routeProgress = Math.min(1, ((now || performance.now()) - routeStarted) / 720);
    }
    cam.x = HS.lerp(cam.x, target.x, 0.06);
    cam.y = HS.lerp(cam.y, target.y, 0.06);
    cam.zoom = HS.lerp(cam.zoom, target.zoom, 0.06);
    draw();
    var moving = routeProgress < 1 || Math.abs(cam.x-target.x) > .2 || Math.abs(cam.y-target.y) > .2 || Math.abs(cam.zoom-target.zoom) > .002;
    if (moving) raf = requestAnimationFrame(loop);
    else { cam.x=target.x; cam.y=target.y; cam.zoom=target.zoom; draw(); raf=null; }
  }
  function requestCameraMotion() {
    if (!running) { resize(); running = true; }
    if (HS.reduced) { cam.x=target.x; cam.y=target.y; cam.zoom=target.zoom; draw(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function start() {
    renderChapters(); loadHardFacts(); observeCards(); resize();
    running = true;
    /* 首次进入：以「离视口中心最近」的卡片作为当前章，避免一上来就停在末章 */
    var mid = window.innerHeight / 2, bestI = 0, bestD = Infinity;
    cards.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; bestI = i; }
    });
    setActive(bestI);
    draw();
    requestCameraMotion();
  }

  /* 进入视口就自启动，不依赖主站调度 */
  (function autoStart() {
    var sec = document.getElementById("mapstory");
    if (!sec) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !running) start(); });
      }, { threshold: 0.01 }).observe(sec);
    } else { start(); }
  })();
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function resume() { if (!running) { running = true; draw(); requestCameraMotion(); } }

  window.addEventListener("resize", function () { resize(); draw(); requestCameraMotion(); });

  function chapterYear(ch) {
    var m = (ch.year || "").match(/\d{4}/);
    return m ? Number(m[0]) : null;
  }

  window.HS.registerScene("mapstory", {
    start: start, pause: pause, resume: resume,
    focusCity: function (cityId) {
      var i = D.storyChapters.findIndex(function (chapter) { return chapter.city === cityId || (chapter.multi || []).indexOf(cityId) >= 0; });
      if (i < 0) return;
      setActive(i);
      if (cards[i]) cards[i].scrollIntoView({ behavior: HS.reduced ? "auto" : "smooth", block: "center" });
      else if (HS.scrollToId) HS.scrollToId("mapstory");
    },
    /* 时空穿梭用：按年份定位到最接近的故事章节（返回命中的年份，便于外部提示） */
    setYear: function (year) {
      if (!D.storyChapters.length) return null;
      var best = 0, bestDiff = Infinity;
      D.storyChapters.forEach(function (ch, i) {
        var y = chapterYear(ch);
        if (y == null) return;
        var d = Math.abs(y - year);
        if (d < bestDiff) { bestDiff = d; best = i; }
      });
      setActive(best);
      /* 只同步画面，不搬动页面：卷四切换报刊期号时不应该把用户拽回卷一定位 */
      if (arguments[1] && arguments[1].scroll && cards[best]) {
        cards[best].scrollIntoView({ behavior: HS.reduced ? "auto" : "smooth", block: "center" });
      }
      return chapterYear(D.storyChapters[best]);
    }
  });
})();
