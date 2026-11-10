/* scene-block.js —— 历史空间独立窗口（iframe / 占位）+ 雕塑轨道重排 */
(function () {
  "use strict";

  var host = document.getElementById("scene-block");
  if (!host) return;

  fetch("assets/scenes/scenes.json?v=20261110h")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var items = d.items || d;
      /* 复原类（无实景扫描）优先前置，其余按原名顺序 */
      var recon = items.filter(function (i) { return i.representation === "historical-reconstruction"; });
      var rest = items.filter(function (i) { return i.representation !== "historical-reconstruction"; });
      var list = recon.concat(rest).slice(0, 12);
      build(list);
    })
    .catch(function () { host.innerHTML = ""; });

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

      if (it.embedUrl) {
        view.innerHTML = '<iframe src="' + it.embedUrl + '" title="' + esc(it.name) +
          '" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen loading="lazy"></iframe>';
      } else {
        view.innerHTML = '<div class="sb-poster"><span class="glyph">' + esc(it.glyph || "▦") + '</span>' +
          '<p>' + esc(it.name) + '<br>此项为史料约束复原，没有实景扫描可直接嵌入；来源与依据见右侧。</p></div>';
      }
      cap.innerHTML = "<h4>" + esc(it.name) + "</h4>" +
        "<p>" + esc(it.note || "") + "</p>" +
        (it.reference_url ? '<a href="' + it.reference_url + '" target="_blank" rel="noopener noreferrer">' +
          esc(it.reference_label || "查看来源") + " ↗</a>" : "") +
        (it.credit ? '<p style="margin-top:6px;color:#8a7c67">' + esc(it.credit) + "</p>" : "");
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

    /* 雕塑轨道：人像前置 */
    reorderArtifactRail();
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

  /* 轨道是异步生成的，稍后再排一次 */
  var tries = 0;
  var t = setInterval(function () {
    reorderArtifactRail();
    if (++tries > 12) clearInterval(t);
  }, 700);
})();
