/* font-theme.js —— 正文黑体/宋体切换，插在右上角导航里，选择记在本地 */
(function () {
  "use strict";

  var KEY = "xinghuo.type";
  var root = document.documentElement;

  function apply(mode) {
    root.setAttribute("data-type", mode);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    var btn = document.querySelector(".type-toggle");
    if (btn) {
      var label = { sans: "黑", serif: "宋", kai: "楷" }[mode] || "黑";
      btn.innerHTML = "字体 · <b>" + label + "</b>";
      btn.setAttribute("aria-label", "当前" + label + "体，点击切换");
    }
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    var order0 = ["sans", "serif", "kai"];
    apply(order0.indexOf(saved) >= 0 ? saved : "sans");

    /* 找右上角导航容器：优先 .uibar nav，其次 .uibar */
    var host = document.querySelector(".uibar nav") || document.querySelector(".uibar");
    if (!host) return;
    if (host.querySelector(".type-toggle")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "type-toggle";
    btn.addEventListener("click", function () {
      var order = ["sans", "serif", "kai"];
      var cur = root.getAttribute("data-type") || "sans";
      apply(order[(order.indexOf(cur) + 1) % order.length]);
    });
    host.insertBefore(btn, host.firstChild);
    apply(root.getAttribute("data-type") || "sans");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
