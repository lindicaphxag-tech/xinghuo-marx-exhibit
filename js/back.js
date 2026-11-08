/* back.js —— 全站统一「返回」入口
 * 放在左下角，不遮挡内容；优先浏览器回退，其次回首页。
 */
(function () {
  "use strict";
  if (window.__backChip) return;
  window.__backChip = true;

  var file = location.pathname.split("/").pop() || "index.html";
  if (file === "index.html" || file === "hall.html") return;   // 首页/展厅不需要

  function build() {
    var s = document.createElement("style");
    s.textContent = [
      ".backchip{position:fixed;left:18px;bottom:18px;z-index:8200;display:inline-flex;align-items:center;gap:7px;",
      "padding:8px 14px;border-radius:999px;border:1px solid rgba(201,162,98,.28);",
      "background:rgba(12,10,9,.86);backdrop-filter:blur(8px);color:#c9bda8;text-decoration:none;",
      "font:12.5px/1 'Noto Sans SC','Microsoft YaHei',system-ui,sans-serif;letter-spacing:.04em;",
      "transition:color .18s,border-color .18s,transform .18s}",
      ".backchip:hover{color:#f2e9d8;border-color:#c9a262;transform:translateY(-1px)}",
      ".backchip b{font-weight:400;opacity:.65}",
      ".backchip{opacity:.55}",
      ".backchip:hover{opacity:1}",
      ".backchip.down{transform:translateY(72px);opacity:0;pointer-events:none}",
      "a.back,.back{display:none!important}",
      "@media print{.backchip{display:none}}"
    ].join("");
    document.head.appendChild(s);

    var a = document.createElement("a");
    a.className = "backchip";
    a.href = "index.html";
    a.innerHTML = "← 返回 <b>" + (document.referrer && document.referrer.indexOf(location.host) >= 0 ? "上一页" : "展馆") + "</b>";
    a.addEventListener("click", function (e) {
      if (history.length > 1 && document.referrer && document.referrer.indexOf(location.host) >= 0) {
        e.preventDefault();
        history.back();
      }
    });
    document.body.appendChild(a);

    /* 下滑时收起，上滑时回来：不压住内容 */
    var last = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (y > last + 6 && y > 140) a.classList.add("down");
      else if (y < last - 6 || y < 140) a.classList.remove("down");
      last = y;
    }, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
