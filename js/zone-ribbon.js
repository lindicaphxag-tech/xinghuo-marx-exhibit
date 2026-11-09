/* zone-ribbon.js —— 首页右侧六个展区的进度轨
   作用：让人随时知道“在第几区、还剩几区”，切换不迷路。 */
(function () {
  "use strict";

  var ZONES = [
    ["hero", "序 · 入口"],
    ["toc", "卷宗目录"],
    ["mapstory", "发展历程"],
    ["relic", "文献与版本"],
    ["press", "报刊"],
    ["wall-teaser", "史料墙"],
    ["artifacts", "文物与空间"],
    ["showcase-teaser", "展示模式"]
  ];

  function build() {
    var rail = document.createElement("nav");
    rail.className = "zone-rail";
    rail.setAttribute("aria-label", "展区导航");

    var links = [];
    ZONES.forEach(function (z) {
      var el = document.getElementById(z[0]);
      if (!el) return;
      var a = document.createElement("a");
      a.href = "#" + z[0];
      a.dataset.label = z[1];
      a.setAttribute("aria-label", z[1]);
      a.addEventListener("click", function (e) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      rail.appendChild(a);
      links.push({ el: el, a: a });
    });

    document.body.appendChild(rail);

    var ticking = false;
    function update() {
      ticking = false;
      var mid = window.innerHeight * 0.45;
      var current = -1;
      links.forEach(function (it, i) {
        var r = it.el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = i;
      });
      links.forEach(function (it, i) {
        it.a.classList.toggle("on", i === current);
        it.a.classList.toggle("done", i < current);
      });
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
