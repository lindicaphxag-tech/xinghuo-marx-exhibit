/* model-fallback.js —— 没有 WebGL 的机器上，把三维窗口换成原始照片
   独立于三维模块，避免初始化异常时整块空白。 */
(function () {
  "use strict";

  function webglOK() {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl");
      return !!gl;
    } catch (e) { return false; }
  }

  if (webglOK()) { window.HSFallback = { active: false }; return; }

  var MAP = null;   /* id → 原始照片 */

  function loadMap() {
    return fetch("assets/models/models.json?v=20261110h")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        MAP = {};
        window.__MODELS = (d.items || d);
        (d.items || d).forEach(function (it) {
          if (it.id) MAP[it.id] = it.source_image || (it.thumb ? "assets/models/" + it.thumb : "");
        });
        (d.scenes || []).forEach(function (sc) {});
      })
      .catch(function () { MAP = {}; });
  }

  function ensureBox() {
    var stage = document.getElementById("artifact-view");
    if (!stage) return null;
    var box = document.getElementById("artifact-fallback");
    if (!box) {
      box = document.createElement("div");
      box.id = "artifact-fallback";
      box.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "flex-direction:column;gap:10px;background:#141210;z-index:5;padding:18px;text-align:center";
      stage.appendChild(box);
    }
    var cv = document.getElementById("artifact-canvas");
    if (cv) cv.style.display = "none";
    return box;
  }

  function show(src, name) {
    var box = ensureBox();
    if (!box) return;
    box.innerHTML =
      (src ? '<img src="' + src + '" alt="' + (name || "") + '" ' +
        'style="max-width:88%;max-height:78%;object-fit:contain;border:1px solid rgba(120,85,47,.25)">' : "") +
      '<p style="margin:0;font-size:12.5px;color:#b3a795;line-height:1.75;max-width:520px">' +
      "这台设备没有启用 WebGL，三维视图无法运行，已显示该件的原始照片。" +
      "（在浏览器设置里开启「使用图形加速」后刷新即可看到三维）</p>";
  }

  function currentIndex() {
    var rail = document.getElementById("artifact-rail");
    if (!rail) return 0;
    var kids = Array.prototype.slice.call(rail.children);
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].classList.contains("is-selected") || kids[i].classList.contains("on") ||
          kids[i].getAttribute("aria-current") === "true") return i;
    }
    return 0;
  }

  function refresh() {
    var rail = document.getElementById("artifact-rail");
    if (!rail || !rail.children.length) return;
    var btn = rail.children[currentIndex()] || rail.children[0];
    var img = btn.querySelector("img");
    var name = (btn.textContent || "").trim().slice(0, 40);
    var src = img ? img.getAttribute("src") : "";
    show(src, name);
  }

  /* 若三维模块本身没起来（轨道为空），自己搭一个照片列表 */
  function buildOwnRail() {
    if (!window.__MODELS) return false;
    var rail = document.getElementById("artifact-rail");
    if (!rail) return false;
    if (rail.children.length) return true;
    rail.innerHTML = "";
    window.__MODELS.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.style.cssText = "display:block;width:100%;padding:6px;margin-bottom:6px;border:1px solid rgba(120,85,47,.2);" +
        "background:#fffdf8;cursor:pointer;text-align:left;border-radius:3px";
      var img = it.thumb ? '<img src="assets/models/' + it.thumb + '" alt="" style="width:52px;height:64px;object-fit:cover;float:left;margin-right:8px">' : "";
      b.innerHTML = img + '<b style="font-size:11.5px;line-height:1.4">' + (it.name || it.id) + "</b>" +
        '<span style="display:block;font-size:10px;color:#8a7c67;margin-top:2px">E4 · 单图推断</span>';
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(rail.children, function (x) { x.style.outline = ""; });
        b.style.outline = "2px solid #8a5b2c";
        show(it.source_image || (it.thumb ? "assets/models/" + it.thumb : ""), it.name);
      });
      rail.appendChild(b);
    });
    if (rail.children[0]) rail.children[0].click();
    return true;
  }

  window.addEventListener("load", function () {
    loadMap().then(function () {
      setTimeout(function () {
        if (!buildOwnRail()) { setTimeout(buildOwnRail, 1200); }
        refresh();
      }, 1500);
      var rail = document.getElementById("artifact-rail");
      if (rail) {
        rail.addEventListener("click", function () { setTimeout(refresh, 400); }, true);
        new MutationObserver(function () { setTimeout(refresh, 300); })
          .observe(rail, { childList: true });
      }
    });
  });

  window.HSFallback = { active: true, refresh: refresh };
})();
