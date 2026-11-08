/* commune.js — 卷六 巴黎公社时序剧场：街区点亮 + 日期切片 + 法令标签 */
(function () {
  "use strict";
  var HS = window.HS;
  var D = window.HS_DATA.commune;
  var canvas = document.getElementById("commune-canvas");
  var slicesEl = document.getElementById("commune-slices");
  if (!canvas || !slicesEl) return;
  var ctx = canvas.getContext("2d");
  var questions = [
    "城市中的武装力量转移，为何会迅速改变巴黎的政治权力？",
    "工人、手工业者与记者共同进入公社，代表性会带来哪些新议题？",
    "以国民自卫军取代常备军，如何重新定义军队与市民的关系？",
    "政教分离如何影响学校、公共财政和市民生活？",
    "取消面包工人夜班，改变的是一项工时安排，还是工人参与治理的边界？",
    "由工人协会经营废弃作坊，需要哪些合作规则，也会面对什么困难？",
    "公社的改革实践与战争失败同时发生；我们如何区分制度经验与军事结局？"
  ];

  document.getElementById("commune-range").textContent = D.dateRange;

  var active = 0;
  var playbackTimer = null;
  var mapReveal = 1, revealStart = 0, revealRaf = null;
  var playButton = document.getElementById("commune-play");
  var stepLabel = document.getElementById("commune-step");
  var progressFill = document.getElementById("commune-progress");

  function updatePlaybackPosition() {
    if (stepLabel) stepLabel.textContent = (active + 1) + " / " + D.slices.length;
    if (progressFill) progressFill.style.width = ((active + 1) / D.slices.length * 100) + "%";
  }
  function stopPlayback() {
    if (playbackTimer) window.clearInterval(playbackTimer);
    playbackTimer = null;
    if (playButton) { playButton.textContent = "按时间顺序播放"; playButton.setAttribute("aria-pressed", "false"); }
  }

  /* ---------- 切片列表 ---------- */
  function renderSlices() {
    slicesEl.innerHTML = "";
    D.slices.forEach(function (s, i) {
      var el = document.createElement("div");
      el.className = "cs-item" + (i === 0 ? " active" : "");
      el.innerHTML =
        '<div class="date">' + s.date + "</div><h4>" + s.title + "</h4>" +
        '<p class="body">' + s.body + "</p>" +
        '<p class="commune-place-tags">地点：' + (s.places || []).map(function (id) {
          var site = D.sites.find(function (x) { return x.id === id; }); return site ? site.name : id;
        }).join(" · ") + "</p>" +
        (s.laws.length ? '<div class="law-tags">' + s.laws.map(function (l) { return "<span>" + l + "</span>"; }).join("") + "</div>" : "");
      el.addEventListener("click", function () { stopPlayback(); setActive(i); });
      slicesEl.appendChild(el);
    });
  }

  function setActive(i) {
    active = Math.max(0, Math.min(D.slices.length - 1, i));
    slicesEl.querySelectorAll(".cs-item").forEach(function (el, k) { el.classList.toggle("active", k === active); });
    updatePlaybackPosition();
    updateMapNote();
    if (revealRaf) cancelAnimationFrame(revealRaf);
    if (!window.HS.reduced) { mapReveal = 0; revealStart = 0; revealRaf = requestAnimationFrame(revealPlaces); }
    else { mapReveal = 1; draw(); }
  }

  function revealPlaces(now) {
    if (!revealStart) revealStart = now;
    mapReveal = Math.min(1, (now - revealStart) / 760);
    draw();
    if (mapReveal < 1) revealRaf = requestAnimationFrame(revealPlaces);
    else { revealRaf = null; draw(); }
  }

  function stepBy(amount) {
    var next = Math.max(0, Math.min(D.slices.length - 1, active + amount));
    setActive(next);
    if (next === D.slices.length - 1 && playbackTimer) stopPlayback();
  }

  if (playButton) playButton.addEventListener("click", function () {
    if (playbackTimer) { stopPlayback(); return; }
    if (active === D.slices.length - 1) setActive(0);
    playButton.textContent = "暂停时间推进";
    playButton.setAttribute("aria-pressed", "true");
    playbackTimer = window.setInterval(function () {
      if (active >= D.slices.length - 1) { stopPlayback(); return; }
      stepBy(1);
    }, 5000);
  });
  var prevButton = document.getElementById("commune-prev");
  var nextButton = document.getElementById("commune-next");
  if (prevButton) prevButton.addEventListener("click", function () { stopPlayback(); stepBy(-1); });
  if (nextButton) nextButton.addEventListener("click", function () { stopPlayback(); stepBy(1); });

  var W = 0, H = 0;
  var hoveredSite = null;
  function siteAt(x, y) {
    var best = null, dist = 24 * 24;
    D.sites.forEach(function (site) {
      var sx = 38 + site.x * (W - 76), sy = 62 + site.y * (H - 124);
      var d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
      if (d < dist) { dist = d; best = site; }
    });
    return best;
  }
  function updateMapNote(site) {
    var note = document.getElementById("commune-map-note");
    if (!note) return;
    if (site) { note.innerHTML = "<strong>" + site.name + "</strong> · " + site.desc + "<p class='commune-question'><b>思考：</b>" + questions[active] + "</p>"; return; }
    var cur = D.slices[active];
    note.innerHTML = "<strong>" + cur.date + " · " + cur.title + "</strong><br>亮起地点：" + (cur.places || []).map(function (id) {
      var loc = D.sites.find(function (x) { return x.id === id; }); return loc ? loc.name : id;
    }).join("、") + "。地图为巴黎行动地点关系示意，不按比例测绘。<p class='commune-question'><b>思考：</b>" + questions[active] + "</p>";
  }
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * Math.min(window.devicePixelRatio, 2);
    canvas.height = H * Math.min(window.devicePixelRatio, 2);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ded5c1"; ctx.fillRect(0, 0, W, H);
    /* Named sites sit on a schematic street grid; route is illustrative, not surveyed. */
    ctx.strokeStyle = "rgba(86,78,63,.18)"; ctx.lineWidth = 1;
    for (var gx = 26; gx < W; gx += 46) { ctx.beginPath(); ctx.moveTo(gx, 42); ctx.lineTo(gx + Math.sin(gx) * 24, H - 36); ctx.stroke(); }
    for (var gy = 56; gy < H; gy += 44) { ctx.beginPath(); ctx.moveTo(24, gy); ctx.lineTo(W - 24, gy + Math.cos(gy) * 14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, H * .63); ctx.bezierCurveTo(W * .22, H * .53, W * .4, H * .71, W * .63, H * .57); ctx.bezierCurveTo(W * .82, H * .46, W * .9, H * .58, W, H * .49);
    ctx.strokeStyle = "rgba(86,133,151,.65)"; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = "rgba(226,239,233,.72)"; ctx.lineWidth = 1.4; ctx.stroke();
    var current = D.slices[active];
    var activeSites = (current.places || []).map(function (id) { return D.sites.find(function (x) { return x.id === id; }); }).filter(Boolean);
    if (activeSites.length > 1) {
      ctx.beginPath(); activeSites.forEach(function (s, i) {
        var x = 38 + s.x * (W - 76), y = 62 + s.y * (H - 124); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }); ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(178,50,43,.75)"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    }
    D.sites.forEach(function (site) {
      var x = 38 + site.x * (W - 76), y = 62 + site.y * (H - 124);
      var lit = activeSites.some(function (s) { return s.id === site.id; });
      var radius = lit ? 9 : 6;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = lit ? "#b8322c" : "#5f6d67"; ctx.fill();
      ctx.strokeStyle = "#fff8e9"; ctx.lineWidth = 1.5; ctx.stroke();
      if (lit && mapReveal < 1) { ctx.beginPath(); ctx.arc(x, y, radius + 3 + mapReveal * 25, 0, Math.PI * 2); ctx.strokeStyle = "rgba(184,50,44," + (1-mapReveal) * .72 + ")"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.font = (lit ? "600 13px " : "12px ") + "'Noto Sans SC',sans-serif";
      ctx.fillStyle = "#2d2922"; ctx.textAlign = x > W * .72 ? "right" : "left";
      ctx.fillText(site.name, x + (x > W * .72 ? -11 : 11), y - 8);
    });
    ctx.textAlign = "left"; ctx.fillStyle = "#332d25"; ctx.font = "600 14px 'Noto Sans SC',sans-serif";
    ctx.fillText("巴黎行动地点示意 · 塞纳河、公共机构与街垒现场", 18, 22);
    /* Current slice */
    var cur = D.slices[active];
    ctx.font = "12px 'Noto Sans Mono', monospace";
    ctx.fillStyle = "#8f2925";
    ctx.fillText(cur.date + " · " + cur.title, 24, 43);
    if (cur.laws.length) {
      ctx.font = "13px 'Noto Sans SC', sans-serif";
      ctx.fillStyle = "#443a2e";
      ctx.fillText(cur.laws.join("  /  "), 24, H - 24);
    }
  }

  canvas.addEventListener("mousemove", function (ev) {
    var r = canvas.getBoundingClientRect(); hoveredSite = siteAt(ev.clientX - r.left, ev.clientY - r.top);
    canvas.style.cursor = hoveredSite ? "pointer" : "default";
    updateMapNote(hoveredSite);
  });
  canvas.addEventListener("mouseleave", function () { hoveredSite = null; updateMapNote(); });
  canvas.addEventListener("click", function (ev) {
    var r = canvas.getBoundingClientRect(), site = siteAt(ev.clientX - r.left, ev.clientY - r.top);
    if (site) updateMapNote(site);
  });

  /* 日期切片改变时重绘；红点表示该时段有史料记录的行动地点。 */
  function start() { renderSlices(); resize(); updateMapNote(); updatePlaybackPosition(); draw(); }
  function pause(){stopPlayback();if(revealRaf){cancelAnimationFrame(revealRaf);revealRaf=null;}mapReveal=1;draw();}
  function resume(){draw();}
  window.addEventListener("resize", resize);

  window.HS.registerScene("commune", { start: start, pause: pause, resume: resume });
})();
