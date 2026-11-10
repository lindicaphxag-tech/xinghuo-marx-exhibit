/* polyglot-cycle.js —— 多语口号逐行渐亮，循环播放 */
(function () {
  "use strict";
  var box = document.getElementById("polyglot");
  if (!box) return;
  var i = 0, timer = null;

  function rows() { return box.querySelectorAll(".lang-row"); }

  function tick() {
    var list = rows();
    if (!list.length) return;
    Array.prototype.forEach.call(list, function (r) { r.classList.remove("on"); });
    list[i % list.length].classList.add("on");
    box.classList.add("live");
    i++;
  }

  function start() {
    if (timer) return;
    tick();
    timer = setInterval(tick, 2200);
  }
  function stop() {
    clearInterval(timer); timer = null;
    Array.prototype.forEach.call(rows(), function (r) { r.classList.remove("on"); });
  }

  /* 行生成是异步的，等它出现再启动 */
  var wait = setInterval(function () {
    if (rows().length) { clearInterval(wait); start(); }
  }, 400);

  /* 鼠标移上去暂停，移开继续；停留自动演示也能触发 */
  box.addEventListener("mouseenter", stop);
  box.addEventListener("mouseleave", start);
  window.HSPolyglot = { start: start, stop: stop };
})();
