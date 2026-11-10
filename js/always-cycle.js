/* always-cycle.js —— 卷三聚类与卷四报刊：进入视口就自动轮换，不需要先点任何按钮 */
(function () {
  "use strict";
  var timers = {};
  var pausedUntil = {};
  var state = { net: 0, press: 0 };

  function now() { return Date.now(); }

  function tickNet() {
    if (now() < (pausedUntil.net || 0)) return;
    var sel = document.getElementById("net-cluster");
    if (!sel || !sel.options.length) return;
    state.net = (sel.selectedIndex + 1) % sel.options.length;
    sel.selectedIndex = state.net;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /* 严格按卡片顺序前进：每次点下一张，到末页回到第一期 */
  var pressIdx = 0;
  function tickPress() {
    if (now() < (pausedUntil.press || 0)) return;
    var cards = document.querySelectorAll("#press [data-issue-index]");
    if (!cards.length) {
      var n = document.querySelector("[data-reel-next]");
      if (n) n.click();
      return;
    }
    pressIdx = (pressIdx + 1) % cards.length;
    cards[pressIdx].click();
  }

  function start(key, fn) {
    if (timers[key]) return;
    fn();
    timers[key] = setInterval(fn, 1000);
  }
  function stop(key) {
    clearInterval(timers[key]);
    delete timers[key];
  }

  function watch(id, key, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    /* 用户在这块里动手就停 6 秒，之后继续 */
    el.addEventListener("pointerdown", function () { pausedUntil[key] = now() + 6000; }, { passive: true });
    el.addEventListener("wheel", function () { pausedUntil[key] = now() + 4000; }, { passive: true });

    if (!("IntersectionObserver" in window)) { start(key, fn); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.3) start(key, fn);
        else stop(key);
      });
    }, { threshold: [0, 0.3, 0.6] }).observe(el);
  }

  window.addEventListener("load", function () {
    setTimeout(function () {
      watch("network", "net", tickNet);
      watch("press", "press", tickPress);
    }, 800);
  });

  window.HSCycle = { pause: function (key, ms) { pausedUntil[key] = now() + ms; } };
})();
