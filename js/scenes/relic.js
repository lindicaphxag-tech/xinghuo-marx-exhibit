/* relic.js — 卷二 文本遗迹：手稿三层切换 · 多语种对照 · 年代词云 */
(function () {
  "use strict";
  var HS = window.HS;
  var R = window.HS_DATA.relic;

  /* ---------- 手稿层 ---------- */
  var tabsEl = document.getElementById("ms-tabs");
  var bodyEl = document.getElementById("ms-body");
  if (tabsEl && bodyEl) {
    R.manuscriptLayers.forEach(function (layer, i) {
      var b = document.createElement("button");
      b.className = "ms-tab" + (i === 0 ? " active" : "");
      b.textContent = layer.layer;
      b.addEventListener("click", function () {
        tabsEl.querySelectorAll(".ms-tab").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        renderLayer(layer);
      });
      tabsEl.appendChild(b);
    });
    function renderLayer(layer) {
      bodyEl.innerHTML =
        '<div class="ms-layer-label">' + layer.label + "</div>" +
        '<p class="ms-desc">' + layer.desc + "</p>" +
        '<div class="ms-hot' + (layer.layer === "删改层" ? " struck" : "") + '">' + layer.hot + "</div>";
      var hotText = bodyEl.querySelector(".ms-hot");
      if (hotText && window.gsap && !window.HS.reduced) window.gsap.fromTo(hotText,
        { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)", duration: .68, ease: "power2.out", overwrite: true });
    }
    renderLayer(R.manuscriptLayers[0]);
  }

  /* ---------- 多语种对照 ---------- */
  var poly = document.getElementById("polyglot");
  if (poly) {
    var html = '<div class="quote-big">“' + R.polyglot.quote + '”</div>';
    R.polyglot.lines.forEach(function (ln) {
      html +=
        '<div class="lang-row"><div class="lang">' + ln.lang + "</div>" +
        '<div><div class="text">' + ln.text + "</div><div class=\"note\">" + ln.note + "</div></div></div>";
    });
    poly.innerHTML = html;
  }

  /* ---------- 在线阅读：原文 + 自译 + 批注 ---------- */
  (function renderReader() {
    var tabs = document.getElementById("rr-tabs");
    var pane = document.getElementById("rr-pane");
    var note = document.getElementById("rr-note");
    var secs = R.readerSections || [];
    if (!tabs || !pane || !secs.length) return;
    if (note) note.textContent = R.readerNote || "";

    function paint(sec) {
      pane.innerHTML =
        '<div class="rr-pair">' +
          '<div class="rr-de"><span class="rr-lang">DEUTSCH · 1848</span>' +
            '<p>' + sec.de + "</p></div>" +
          '<div class="rr-zh"><span class="rr-lang">中文 · 本项目自译</span>' +
            '<p>' + sec.zh + "</p></div>" +
        "</div>" +
        '<div class="rr-notes">' + (sec.notes || []).map(function (n) {
          return '<div class="rr-note-item kind-' + (n.kind === "存疑" ? "doubt" : n.kind === "对照" ? "cmp" : "clue") + '">' +
            '<span class="rr-note-kind">' + n.kind + "</span><span>" + n.text + "</span></div>";
        }).join("") + "</div>";
    }

    secs.forEach(function (sec, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rr-tab" + (i === 0 ? " active" : "");
      b.textContent = sec.label;
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs.querySelectorAll(".rr-tab"), function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        paint(sec);
      });
      tabs.appendChild(b);
    });
    paint(secs[0]);
  })();

  /* ---------- 词云 ---------- */
  var wc = document.getElementById("wordcloud");
  var erasEl = document.getElementById("wc-eras");
  if (!wc || !erasEl) return;
  var ctx = wc.getContext("2d");
  var activeEra = 0;

  R.wordCloudByEra.forEach(function (era, i) {
    var b = document.createElement("button");
    b.className = "wc-era" + (i === 0 ? " active" : "");
    b.textContent = era.era;
    b.addEventListener("click", function () {
      erasEl.querySelectorAll(".wc-era").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      activeEra = i;
      drawWc();
    });
    erasEl.appendChild(b);
  });

  function resize() {
    wc.width = wc.clientWidth * Math.min(window.devicePixelRatio, 2);
    wc.height = wc.clientHeight * Math.min(window.devicePixelRatio, 2);
    ctx.setTransform(wc.width / wc.clientWidth, 0, 0, wc.width / wc.clientWidth, 0, 0);
  }

  function drawWc() {
    var W = wc.clientWidth, H = wc.clientHeight;
    ctx.clearRect(0, 0, W, H);
    var words = R.wordCloudByEra[activeEra].words;
    var maxW = words[0][1], minW = words[words.length - 1][1];
    /* 三行按实测字宽分配；超宽行整体收缩并居中，避免关键词相互覆盖。 */
    var rows = [[], [], []];
    words.forEach(function (w, i) { rows[i % rows.length].push(w); });
    var top = Math.max(34, (H - 3 * 44) / 2 + 25);
    rows.forEach(function (row, ri) {
      var entries = row.map(function (w) {
        var ratio = (w[1] - minW) / (maxW - minW || 1);
        var size = 13 + ratio * 21;
        ctx.font = "600 " + size + "px 'Noto Serif SC', serif";
        return { name: w[0], ratio: ratio, size: size, width: ctx.measureText(w[0]).width };
      });
      var gap = 14, total = entries.reduce(function (s, e) { return s + e.width; }, 0) + gap * Math.max(0, entries.length - 1);
      var factor = Math.min(1, (W - 36) / Math.max(total, 1));
      total *= factor;
      var x = (W - total) / 2;
      entries.forEach(function (e) {
        var width = e.width * factor;
        ctx.save(); ctx.translate(x + width / 2, top + ri * 44);
        ctx.scale(factor, factor);
        ctx.font = "600 " + e.size + "px 'Noto Serif SC', serif";
        ctx.fillStyle = e.ratio > 0.66 ? "#d9433f" : e.ratio > 0.33 ? "#c89b5a" : "#716957";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.name, 0, 0); ctx.restore();
        x += width + gap * factor;
      });
    });
  }

  var started = false;
  function start() { resize(); drawWc(); started = true; }
  function resume() { if (started) { resize(); drawWc(); } }
  window.addEventListener("resize", function () { if (started) { resize(); drawWc(); } });
  window.HS.registerScene("relic", { start: start, pause: function () {}, resume: resume });
})();
