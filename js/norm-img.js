/* norm-img.js —— 墙上陈列用规范化副本（4:5 暗底），详情页用原图。
   规范化只做：统一画布、不裁切、轻暗角、细颗粒；原图保留在 assets/images_full。 */
(function () {
  "use strict";

  var PREFIXES = [
    "assets/images_full/",
    "assets/models/preview/",
    "assets/models/sketchfab_preview/"
  ];

  function norm(src) {
    if (!src) return src;
    for (var i = 0; i < PREFIXES.length; i++) {
      var p = PREFIXES[i];
      if (src.indexOf(p) === 0) {
        var base = src.slice(p.length).replace(/\.[^.]+$/, "");
        return "assets/images_norm/" + base + ".jpg";
      }
    }
    return src;
  }

  window.HSNorm = norm;

  /* 图片加载失败时退回原图，避免规范化目录缺文件导致空白 */
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (!el || el.tagName !== "IMG") return;
    if (el.dataset.fallback === "1") return;
    var src = el.getAttribute("src") || "";
    if (src.indexOf("assets/images_norm/") !== 0) return;
    el.dataset.fallback = "1";
    var base = src.replace("assets/images_norm/", "").replace(/\.jpg$/, "");
    el.src = "assets/images_full/" + base + ".jpg";
  }, true);
})();
