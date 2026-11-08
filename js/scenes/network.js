/* network.js — 卷三 运动神经网络：力导向 Canvas 图 · 年代过滤 · 节点档案 */
(function () {
  "use strict";
  var HS = window.HS;
  var N = window.HS_DATA.network;
  var canvas = document.getElementById("network-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var cityMap = {};
  window.HS_DATA.cities.forEach(function (c) { cityMap[c.id] = c; });

  var nodes = N.nodes.map(function (n) {
    var c = cityMap[n.city];
    return {
      id: n.id, label: n.label, group: n.group, era: n.era, city: n.city, desc: n.desc,
      x: c ? c.x : 500, y: c ? c.y : 400,
      vx: 0, vy: 0, r: n.group === "person" ? 7 : n.group === "org" ? 9 : 6
    };
  });
  var nodeMap = {};
  nodes.forEach(function (n) { nodeMap[n.id] = n; });
  var edges = N.edges.map(function (e) { return { a: nodeMap[e.a], b: nodeMap[e.b], type: e.type }; });

  var GROUP_COLOR = { person: "#d9433f", org: "#c89b5a", press: "#5e7180" };
  var activeYear = 1917;
  var hover = null, selected = null, hoverEdge = null, selectedEdge = null;
  var camera = { x: 0, y: 0, scale: 1 }, gesture = null;
  var suppressClickUntil = 0;
  var clusterEl = document.getElementById("net-cluster");
  var layoutMode = clusterEl ? clusterEl.value : "community";

  /* ---------- 真实地理底图：按城市经纬度摆放节点 ---------- */
  var GEO = null;

  function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)); }

  function geoToWorld(lon, lat) {
    var b = GEO.bbox, y0 = mercY(b[1]), y1 = mercY(b[3]);
    return {
      x: ((lon - b[0]) / (b[2] - b[0])) * 1000,
      y: ((y1 - mercY(lat)) / (y1 - y0)) * 1000
    };
  }

  /* 地理模式的视图变换：把节点覆盖范围铺满画布，而不是整块欧洲 */
  var geoView = null;

  function computeGeoView() {
    var xs = [], ys = [];
    nodes.forEach(function (n) {
      var ll = GEO && GEO.cities && GEO.cities[n.city];
      if (!ll) return;
      var w = geoToWorld(ll[0], ll[1]);
      xs.push(w.x); ys.push(w.y);
    });
    if (!xs.length) return null;
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var spanX = Math.max(x1 - x0, 22), spanY = Math.max(y1 - y0, 22);
    var k = Math.min((W * 0.86) / spanX, (H * 0.86) / spanY);
    geoView = {
      k: k,
      ox: (W - spanX * k) / 2 - x0 * k,
      oy: (H - spanY * k) / 2 - y0 * k
    };
    return geoView;
  }

  function geoProject(lon, lat) {
    if (!geoView) computeGeoView();
    var w = geoToWorld(lon, lat);
    return { x: w.x * geoView.k + geoView.ox, y: w.y * geoView.k + geoView.oy };
  }

  fetch("assets/geo/europe.json").then(function (r) { return r.json(); }).then(function (g) {
    GEO = g;
    if (layoutMode === "geo") { applyLayout("geo", false); draw(); }
  }).catch(function () {});

  var scaleEl = document.getElementById("net-scale");
  if (scaleEl) scaleEl.textContent = nodes.length + " 个节点 · " + edges.length + " 条关系";
  var searchEl = document.getElementById("net-search"), directory = document.getElementById("net-directory");
  var relationList = document.getElementById("net-relations");

  var W = 0, H = 0, physicsFrames = 0;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * Math.min(window.devicePixelRatio, 2);
    canvas.height = H * Math.min(window.devicePixelRatio, 2);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
  }

  function visible(n) { return n.era <= activeYear; }

  /* ---------- 图例 ---------- */
  var legend = document.getElementById("net-legend");
  if (legend) {
    var gHtml = "";
    Object.keys(N.groupLabel).forEach(function (g) {
      gHtml += '<div class="row"><span class="swatch" style="background:' + GROUP_COLOR[g] + '"></span>' + N.groupLabel[g] + "</div>";
    });
    gHtml += '<div class="row" style="margin-top:10px;color:var(--paper-faint)">关系：' +
      Object.keys(N.edgeLabel).map(function (k) { return N.edgeLabel[k]; }).join(" · ") + "</div>";
    legend.innerHTML = gHtml;
  }

  /* ---------- 年代滑块 ---------- */
  function renderDirectory() {
    if (!directory) return;
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    directory.innerHTML = "";
    nodes.filter(function (n) { return visible(n) && (!q || (n.label + n.desc).toLowerCase().indexOf(q) >= 0); }).forEach(function (n) {
      var b = document.createElement("button"); b.type = "button"; b.className = "net-person"; b.textContent = n.label;
      b.classList.toggle("active", selected === n);
      b.addEventListener("click", function () { showNode(n, true); }); directory.appendChild(b);
    });
  }
  if (searchEl) searchEl.addEventListener("input", renderDirectory);
  if (clusterEl) clusterEl.addEventListener("change", function () {
    layoutMode = clusterEl.value;
    applyLayout(layoutMode, true);
    camera = { x: 0, y: 0, scale: 1 };
    renderDirectory();
    draw();
    if (layoutMode === "community" && !HS.reduced) { physicsFrames = 100; running = true; loop(); }
  });
  function zoomBy(factor) {
    var cx=W/2, cy=H/2, old=camera.scale;
    camera.scale=HS.clamp(old*factor,0.55,2.8);
    camera.x=cx-(cx-camera.x)*camera.scale/old;
    camera.y=cy-(cy-camera.y)*camera.scale/old;
    draw();
  }
  var zoomIn=document.getElementById("net-zoom-in"), zoomOut=document.getElementById("net-zoom-out"), fit=document.getElementById("net-fit");
  if(zoomIn) zoomIn.addEventListener("click",function(){zoomBy(1.2);});
  if(zoomOut) zoomOut.addEventListener("click",function(){zoomBy(0.83);});
  if(fit) fit.addEventListener("click",function(){camera={x:0,y:0,scale:1};draw();});
  var slider = document.getElementById("net-year");
  var yearLabel = document.getElementById("net-year-label");
  if (slider) {
    slider.addEventListener("input", function () {
      activeYear = Number(slider.value);
      if (selected && !visible(selected)) selected = null;
      yearLabel.textContent = activeYear;
      slider.setAttribute("aria-valuetext", "显示至 " + activeYear + " 年的节点");
      renderDirectory();
      draw();
    });
  }

  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", "可交互的人物、组织与报刊关系图。使用方向键沿关联节点移动，或从右侧目录选择节点。按 Tab 可前往聚类、搜索和年代控制。节点关系为项目整理的历史关联，不是穷尽性社会网络。靠近节点可查看名称，选择后查看关系说明。");

  /* ---------- 档案卡 ---------- */
  function showNode(n, focus) {
    selected = n;
    selectedEdge = null;
    if (focus) { camera.x = W / 2 - n.x * camera.scale; camera.y = H / 2 - n.y * camera.scale; }
    var title = document.getElementById("net-node-title");
    var desc = document.getElementById("net-node-desc");
    title.textContent = n.label + " · " + N.groupLabel[n.group];
    var c = cityMap[n.city];
    var related = edges.filter(function (e) { return visible(e.a) && visible(e.b) && (e.a === n || e.b === n); });
    desc.textContent = n.desc + (c ? "（对应城市：" + c.name + "）" : "") +
      (related.length ? " 以下仅列出网络中编码的直接关联；未出现连线不代表历史上毫无联系。" : " 当前年份筛选下没有显示直接关联。");
    renderRelations(n, related);
    canvas.setAttribute("aria-label", n.label + "，" + N.groupLabel[n.group] + "。" + desc.textContent + " 使用方向键查看相邻节点。");
    renderDirectory();
    draw();
  }

  function showEdge(e) {
    if (!e) return;
    selected = null;
    selectedEdge = e;
    var title = document.getElementById("net-node-title");
    var desc = document.getElementById("net-node-desc");
    var cityA = cityMap[e.a.city], cityB = cityMap[e.b.city];
    title.textContent = e.a.label + " ↔ " + e.b.label;
    desc.textContent = (N.edgeLabel[e.type] || e.type) + "。" + e.a.desc + (cityA ? "（" + cityA.name + "）" : "") + " " + e.b.desc + (cityB ? "（" + cityB.name + "）" : "");
    if (relationList) {
      relationList.replaceChildren();
      [e.a, e.b].forEach(function (node) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "net-relation";
        button.textContent = "查看节点：" + node.label;
        button.addEventListener("click", function () { showNode(node, true); });
        relationList.appendChild(button);
      });
    }
    canvas.setAttribute("aria-label", title.textContent + "。" + desc.textContent);
    renderDirectory();
    draw();
  }

  canvas.addEventListener("click", function (ev) {
    if (Date.now() < suppressClickUntil) { ev.preventDefault(); return; }
    var p = toWorld(toLocal(ev));
    var hit = pick(p.x, p.y);
    if (hit) showNode(hit);
    else showEdge(pickEdge(p.x, p.y));
  });
  canvas.addEventListener("pointermove", function (ev) {
    var p = toLocal(ev);
    if (gesture) {
      var dx = p.x - gesture.lastX, dy = p.y - gesture.lastY;
      if (Math.abs(p.x - gesture.startX) + Math.abs(p.y - gesture.startY) > 5) gesture.moved = true;
      if (gesture.node) {
        gesture.node.x += dx / camera.scale; gesture.node.y += dy / camera.scale;
        gesture.node.vx = gesture.node.vy = 0;
      } else { camera.x += dx; camera.y += dy; }
      gesture.lastX = p.x; gesture.lastY = p.y;
      draw(); return;
    }
    var world = toWorld(p);
    hover = pick(world.x, world.y);
    hoverEdge = hover ? null : pickEdge(world.x, world.y);
    canvas.style.cursor = hover ? "pointer" : "grab";
    draw();
  });
  canvas.addEventListener("pointerdown", function (ev) {
    var p = toLocal(ev), w = toWorld(p), hit = pick(w.x, w.y);
    gesture = { node: hit, lastX: p.x, lastY: p.y, startX: p.x, startY: p.y, moved: false };
    canvas.setPointerCapture(ev.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", function () { if (gesture && gesture.moved) suppressClickUntil = Date.now() + 400; gesture = null; canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointercancel", function () { gesture = null; canvas.style.cursor = "grab"; });
  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var p = toLocal(ev), old = camera.scale;
    camera.scale = HS.clamp(old * (ev.deltaY < 0 ? 1.12 : 0.89), 0.55, 2.8);
    camera.x = p.x - (p.x - camera.x) * camera.scale / old;
    camera.y = p.y - (p.y - camera.y) * camera.scale / old;
    draw();
  }, { passive: false });
  canvas.addEventListener("pointerleave", function () { if (!gesture) { hover = null; hoverEdge = null; draw(); } });

  function renderRelations(origin, related) {
    if (!relationList) return;
    relationList.replaceChildren();
    related.forEach(function (edge) {
      var other = edge.a === origin ? edge.b : edge.a;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "net-relation";
      button.setAttribute("aria-label", (N.edgeLabel[edge.type] || edge.type) + "：查看" + other.label);
      var relation = document.createElement("span");
      relation.textContent = N.edgeLabel[edge.type] || edge.type;
      var name = document.createElement("strong");
      name.textContent = other.label;
      button.append(relation, name);
      button.addEventListener("click", function () { showNode(other, true); });
      relationList.appendChild(button);
    });
  }

  canvas.addEventListener("keydown", function (event) {
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].indexOf(event.key) < 0) return;
    event.preventDefault();
    var current = selected || nodes.filter(visible).sort(function (a, b) { return a.era - b.era; })[0];
    if (!current) return;
    var adjacent = edges.filter(function (edge) { return visible(edge.a) && visible(edge.b) && (edge.a === current || edge.b === current); })
      .map(function (edge) { return edge.a === current ? edge.b : edge.a; })
      .sort(function (a, b) { return a.label.localeCompare(b.label, "zh-CN"); });
    if (!adjacent.length) { showNode(current, true); return; }
    var next = event.key === "ArrowRight" || event.key === "ArrowDown" ? adjacent[0] : adjacent[adjacent.length - 1];
    showNode(next, true);
  });

  function toWorld(p) { return { x: (p.x - camera.x) / camera.scale, y: (p.y - camera.y) / camera.scale }; }

  function toLocal(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function pick(x, y) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i];
      if (!visible(n)) continue;
      if ((n.x - x) * (n.x - x) + (n.y - y) * (n.y - y) < (n.r + 6) * (n.r + 6)) return n;
    }
    return null;
  }
  function pickEdge(x, y) {
    var best = null, bestD = 10 / camera.scale;
    edges.forEach(function (e) {
      if (!visible(e.a) || !visible(e.b)) return;
      var dx=e.b.x-e.a.x, dy=e.b.y-e.a.y, len=dx*dx+dy*dy||1;
      var t=HS.clamp(((x-e.a.x)*dx+(y-e.a.y)*dy)/len,0,1);
      var d=Math.hypot(x-(e.a.x+t*dx),y-(e.a.y+t*dy));
      if(d<bestD){best=e;bestD=d;}
    });
    return best;
  }

  /* ---------- 力导向 ---------- */
  function physics() {
    var cooling = Math.max(.08, physicsFrames / 100);
    nodes.forEach(function (n) {
      if (!visible(n)) return;
      nodes.forEach(function (m) {
        if (m === n || !visible(m)) return;
        var dx = n.x - m.x, dy = n.y - m.y;
        var d2 = dx * dx + dy * dy || 1;
        var f = 1800 / d2 * cooling;
        n.vx += dx / Math.sqrt(d2) * f;
        n.vy += dy / Math.sqrt(d2) * f;
      });
    });
    edges.forEach(function (e) {
      if (!visible(e.a) || !visible(e.b)) return;
      var dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var target = 150, f = (d - target) * 0.01 * cooling;
      e.a.vx += dx / d * f; e.a.vy += dy / d * f;
      e.b.vx -= dx / d * f; e.b.vy -= dy / d * f;
    });
    nodes.forEach(function (n) {
      if (!visible(n)) return;
      n.vx *= 0.78; n.vy *= 0.78;
      n.x += n.vx; n.y += n.vy;
      n.x = HS.clamp(n.x, 40, W - 40);
      n.y = HS.clamp(n.y, 40, H - 40);
    });
  }

  function drawGeoBackdrop() {
    if (layoutMode !== "geo" || !GEO || !GEO.countries) return;
    computeGeoView();
    ctx.save();
    GEO.countries.forEach(function (country) {
      country.rings.forEach(function (ring) {
        if (!ring || ring.length < 3) return;
        ctx.beginPath();
        for (var i = 0; i < ring.length; i++) {
          var q = geoProject(ring[i][0], ring[i][1]);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255,246,228,0.035)";
        ctx.fill();
        ctx.strokeStyle = "rgba(201,162,98,0.20)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.scale, camera.scale);
    drawGeoBackdrop();
    drawLayoutHeadings();
    edges.forEach(function (e) {
      if (!visible(e.a) || !visible(e.b)) return;
      var related = selectedEdge === e || (selected && (e.a === selected || e.b === selected));
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y);
      ctx.strokeStyle = related ? "rgba(255,207,120,0.9)" : (hoverEdge === e ? "rgba(255,245,223,0.95)" : "rgba(200,155,90,0.22)");
      ctx.lineWidth = related ? 2.2 : 1; ctx.stroke();
      if (related || hoverEdge === e) {
        ctx.font = "11px 'Noto Sans SC', sans-serif"; ctx.fillStyle = "#fff5df"; ctx.textAlign = "center";
        ctx.fillText(N.edgeLabel[e.type] || e.type, (e.a.x+e.b.x)/2, (e.a.y+e.b.y)/2-5);
      }
    });
    nodes.forEach(function (n) {
      if (!visible(n)) return;
      var connected = !selected || n === selected || edges.some(function(e){return (e.a===selected&&e.b===n)||(e.b===selected&&e.a===n);});
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = GROUP_COLOR[n.group];
      ctx.globalAlpha = connected && (n === selected || n === hover) ? 1 : connected ? 0.85 : 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    drawNodeLabels();
    ctx.restore();
  }

  function drawNodeLabels() {
    var s=camera.scale, labelNodes=nodes.filter(visible).slice();
    labelNodes.sort(function(a,b){
      if(a===selected)return -1;if(b===selected)return 1;
      if(a===hover)return -1;if(b===hover)return 1;
      return edges.filter(function(e){return e.a===b||e.b===b;}).length-edges.filter(function(e){return e.a===a||e.b===a;}).length;
    });
    ctx.font="600 "+(11/s)+"px 'Noto Sans SC', sans-serif";
    var placed=[];
    labelNodes.forEach(function(n){
      var w=ctx.measureText(n.label).width,h=15/s,pad=4/s;
      var r=n.r+pad;
      var candidates=[
        {x:n.x+r,base:n.y+4/s},{x:n.x-r-w,base:n.y+4/s},
        {x:n.x-w/2,base:n.y+r+h},{x:n.x-w/2,base:n.y-r},
        {x:n.x+r,base:n.y-r},{x:n.x-r-w,base:n.y-r},
        {x:n.x+r,base:n.y+r+h},{x:n.x-r-w,base:n.y+r+h}
      ];
      var chosen=null;
      for(var i=0;i<candidates.length;i++){
        var c=candidates[i], top=c.base-h+2/s;
        var sx=camera.x+c.x*s, sy=camera.y+top*s, sw=w*s, sh=h*s;
        if(sx<2||sy<2||sx+sw>W-2||sy+sh>H-2)continue;
        var collision=placed.some(function(b){return !(sx+sw+3<b.x||b.x+b.w+3<sx||sy+sh+2<b.y||b.y+b.h+2<sy);});
        if(!collision){chosen={x:c.x,base:c.base,top:top,sx:sx,sy:sy,sw:sw,sh:sh};break;}
      }
      if(!chosen){
        var fallback=candidates[0], topFallback=fallback.base-h+2/s;
        chosen={x:fallback.x,base:fallback.base,top:topFallback,sx:camera.x+fallback.x*s,sy:camera.y+topFallback*s,sw:w*s,sh:h*s};
      }
      placed.push({x:chosen.sx,y:chosen.sy,w:chosen.sw,h:chosen.sh});
      ctx.textAlign="left";
      ctx.fillStyle="rgba(48,43,36,0.9)";
      ctx.fillRect(chosen.x-3/s,chosen.top,w+6/s,h);
      ctx.fillStyle=n===selected||n===hover?"#fff4d8":"rgba(255,247,231,0.94)";
      ctx.fillText(n.label,chosen.x,chosen.base);
    });
  }

  function drawLayoutHeadings() {
    var y=24/camera.scale;
    ctx.font="600 "+(12/camera.scale)+"px 'Noto Sans SC', sans-serif";
    ctx.fillStyle="rgba(255,232,190,.85)";
    ctx.textAlign="center";
    if(layoutMode==="type"){
      ctx.fillText("人物",W*.16,y);ctx.fillText("组织",W*.50,y);ctx.fillText("报刊",W*.84,y);
    }else if(layoutMode==="era"){
      ["1848 前 · 思想与城市运动","1848–1871 · 革命与国际","1872–1889 · 政党形成","1890 后 · 分化与革命"].forEach(function(t,i){ctx.fillText(t,W*(.10+i*.255),y);});
    }else if(layoutMode==="community"){
      ctx.textAlign="left";ctx.fillText("关系社区 · 节点按关联力导向聚合",12/camera.scale,y);
    }else{
      ctx.textAlign="left";ctx.fillText("活动城市 · 欧洲地理位置为叙事示意",12/camera.scale,y);
    }
  }

  var raf = null, running = false;
  function loop() {
    if (!running || layoutMode !== "community" || physicsFrames <= 0) { running = false; raf = null; draw(); return; }
    physics();
    physicsFrames--;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function moveNode(n, x, y, animate) {
    if (n._layoutTween) { n._layoutTween.kill(); n._layoutTween = null; }
    n.vx = n.vy = 0;
    if (animate && window.gsap && !HS.reduced && layoutMode !== "community") {
      n._layoutTween = window.gsap.to(n, { x: x, y: y, duration: 0.58, ease: "power2.out", overwrite: true, onUpdate: draw });
    } else {
      n.x = x; n.y = y;
    }
  }

  function applyLayout(mode, animate) {
    var order = nodes.slice().sort(function(a,b){return a.era-b.era || a.label.localeCompare(b.label,"zh-CN");});
    if (mode === "type") {
      ["person","org","press"].forEach(function(group, col){
        var list=order.filter(function(n){return n.group===group;}), gap=(H-100)/Math.max(1,list.length-1);
        list.forEach(function(n,i){moveNode(n,W*(0.16+col*0.34),50+i*gap,animate);});
      });
    } else if (mode === "era") {
      var bins=[[],[],[],[]];
      order.forEach(function(n){var k=n.era<1848?0:n.era<=1871?1:n.era<=1889?2:3;bins[k].push(n);});
      bins.forEach(function(list,col){var gap=(H-100)/Math.max(1,list.length-1);list.forEach(function(n,i){moveNode(n,W*(0.10+col*0.255),50+i*gap,animate);});});
    } else if (mode === "geo") {
      /* 真实经纬度定位：按节点覆盖范围铺满画布，同城节点环形错开 */
      computeGeoView();
      var byCity = {};
      order.forEach(function (n) { (byCity[n.city] || (byCity[n.city] = [])).push(n); });
      Object.keys(byCity).forEach(function (city) {
        var list = byCity[city];
        var ll = GEO && GEO.cities && GEO.cities[city];
        var c0 = ll ? geoProject(ll[0], ll[1]) : { x: W / 2, y: H / 2 };
        list.forEach(function (n, i) {
          var a = i * 2.399963, r = i === 0 ? 0 : 26 + Math.floor(i / 5) * 26;
          moveNode(n, c0.x + Math.cos(a) * r, c0.y + Math.sin(a) * r, animate);
        });
      });
    } else if (mode === "city") {
      var groups={}; order.forEach(function(n){(groups[n.city]||(groups[n.city]=[])).push(n);});
      Object.keys(groups).forEach(function(city){var list=groups[city], c=cityMap[city], cx=W*(0.12+(c?c.x/1000:0.5)*0.76), cy=H*(0.12+(c?c.y/1000:0.5)*0.76);list.forEach(function(n,i){var a=i*2.399963,r=18+Math.floor(i/6)*18;moveNode(n,cx+Math.cos(a)*r,cy+Math.sin(a)*r,animate);});});
    } else {
      order.forEach(function(n,i){var c=cityMap[n.city],a=i*2.399963,r=12+(i%8)*5;moveNode(n,W*0.15+(c?c.x/1000:0.5)*W*0.7+Math.cos(a)*r,H*0.15+(c?c.y/1000:0.5)*H*0.7+Math.sin(a)*r,animate);});
    }
  }

  function start() { resize(); applyLayout(layoutMode); renderDirectory(); draw(); if (layoutMode === "community" && !HS.reduced) { physicsFrames = 100; running = true; loop(); } }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function resume() { if (!running) { resize(); if (layoutMode === "community" && physicsFrames > 0) { running = true; loop(); } else draw(); } }
  window.addEventListener("resize", function(){resize();if(W&&H)applyLayout(layoutMode);draw();});

  window.HS.registerScene("network", {
    start: start, pause: pause, resume: resume,
    /* 时空穿梭：按年份筛选 + 选中与该事件相关的人物/组织/报刊 */
    setYear: function (year) {
      var slider = document.getElementById("net-year");
      if (slider) {
        slider.value = String(year);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        activeYear = year;
        renderDirectory();
        draw();
      }
      return year;
    },
    selectById: function (id) {
      var n = nodeMap[id];
      if (!n) return false;
      showNode(n, true);
      renderDirectory();
      draw();
      return true;
    },
    focusEvent: function (year, nodeIds) {
      var api = this;
      if (year) api.setYear(year);
      var hit = (nodeIds || []).filter(function (id) { return !!nodeMap[id]; });
      if (hit.length) { api.selectById(hit[0]); return hit; }
      return [];
    }
  });
})();
