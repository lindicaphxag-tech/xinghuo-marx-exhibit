/* auto-demo.js —— 停在某卷不动时，自动演示该卷的可交互功能
   规则：某卷占到视口 60% 且 4 秒无操作 → 开始循环演示；一旦滚动/点击/按键即停止。*/
(function () {
  "use strict";
  if (window.__AUTODEMO__) return;
  window.__AUTODEMO__ = true;

  var IDLE_MS = 3000;      // 静止多久开始演示
  var STEP_MS = 2600;      // 默认每步间隔
  var STEP_BY_SECTION = { network: 1000, press: 1000 };   // 这两个卷一秒一切
  var timer = null, stepTimer = null, active = null, idx = 0;

  function stop() {
    clearTimeout(timer); clearInterval(stepTimer);
    timer = stepTimer = null;
    if (active && active.classList) active.classList.remove("demo-on");
    active = null; idx = 0;
  }
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach(function (e) {
    window.addEventListener(e, stop, { passive: true });
  });
  window.addEventListener("scroll", stop, { passive: true });

  /* 每个卷的演示动作：返回一个“走一步”的函数 */
  var DEMOS = {
    mapstory: function () {
      var api = window.HS && window.HS.scenes && window.HS.scenes.mapstory;
      if (!api || !api.showChapter) return null;
      var n = api.chapterCount ? api.chapterCount() : 12;
      var i = 0;
      return function () { api.showChapter(i % n); i++; };
    },
    network: function () { return null; },   /* 由 always-cycle.js 负责，每秒切换 */
    press: function () { return null; },     /* 同上 */
    artifacts: function () {
      var api = window.HS && window.HS.artifacts;
      if (!api || !api.list || !api.selectById) return null;
      var items = api.list(); var i = 0;
      return function () {
        if (!items.length) return;
        api.selectById(items[i % items.length].id); i++;
      };
    },
    commune: function () {
      var cards = document.querySelectorAll("#commune .dossier-card");
      if (!cards.length) return null;
      var i = 0;
      return function () {
        cards.forEach(function (c) { c.classList.remove("demo-focus"); });
        cards[i % cards.length].classList.add("demo-focus");
        i++;
      };
    },
    heat: function () {
      var rows = document.querySelectorAll("#heat .bh-row, #heat tbody tr");
      if (!rows.length) return null;
      var i = 0;
      return function () {
        rows.forEach(function (r) { r.classList.remove("demo-focus"); });
        rows[i % rows.length].classList.add("demo-focus");
        i++;
      };
    },
    classroom: function () {
      var knob = document.querySelector("#classroom [data-divider], #classroom .split-knob");
      if (!knob) return null;
      var t = 0;
      return function () {
        t = (t + 1) % 4;
        var x = [0.35, 0.6, 0.45, 0.5][t];
        knob.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
        knob.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x * window.innerWidth }));
        knob.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      };
    },
    lineart: function () {
      var btns = document.querySelectorAll("#lineart [data-line], #lineart .line-tab");
      if (!btns.length) return null;
      var i = 0;
      return function () { btns[i % btns.length].click(); i++; };
    }
  };

  function start(section) {
    var fn = DEMOS[section.id];
    if (!fn) return;
    var step = fn();
    if (!step) return;
    active = section;
    section.classList.add("demo-on");
    step();
    var every = STEP_BY_SECTION[section.id] || STEP_MS;
    stepTimer = setInterval(step, every);
  }

  /* 用「占视口比例最大」来判断当前卷，比 IntersectionObserver 阈值稳 */
  var IDS = ["mapstory", "network", "press", "artifacts", "commune", "heat", "classroom", "lineart"];

  function currentSection() {
    var best = null, bestRatio = 0;
    IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      var ratio = vis / Math.min(window.innerHeight, r.height);
      if (ratio > bestRatio) { bestRatio = ratio; best = el; }
    });
    return bestRatio > 0.45 ? best : null;
  }

  function schedule() {
    clearTimeout(timer);
    var sec = currentSection();
    if (!sec) { stop(); return; }
    if (active && active !== sec) stop();
    if (active === sec) return;
    timer = setTimeout(function () {
      if (document.hidden) return;
      if (currentSection() !== sec) return;
      start(sec);
    }, IDLE_MS);
  }

  window.addEventListener("scroll", function () {
    clearTimeout(timer);
    setTimeout(schedule, 260);
  }, { passive: true });
  window.addEventListener("load", function () { setTimeout(schedule, 600); });

  function boot() {
    if (!window.HS) { setTimeout(boot, 400); return; }
    schedule();
  }
  boot();
})();
