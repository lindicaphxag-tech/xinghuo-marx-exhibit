/* network-tour.js —— 卷三自动讲解：按关联度排序逐个展示节点，可配音 */
(function () {
  "use strict";
  var host = document.getElementById("network");
  if (!host) return;

  var btn = null, playing = false, idx = 0, timer = null, list = [];
  var VOICE_ON = false;

  function ensureBtn() {
    if (btn) return btn;
    var bar = host.querySelector(".net-controls");
    if (!bar) return null;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "net-tour";
    btn.textContent = "自动讲解";
    btn.setAttribute("aria-pressed", "false");
    btn.style.cssText = "margin-left:8px;font:inherit;font-size:12px;padding:5px 10px;" +
      "border:1px solid rgba(120,85,47,.35);border-radius:2px;background:#fffdf8;color:#6b5334;cursor:pointer";
    bar.appendChild(btn);
    btn.addEventListener("click", function () { playing ? stop() : start(true); });
    return btn;
  }

  function speak(text) {
    if (!VOICE_ON || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 忽略语音失败 */ }
  }

  function step() {
    var api = window.HS && window.HS.network;
    if (!api) return;
    if (idx >= list.length) idx = 0;
    var node = list[idx];
    idx++;
    api.show(node.id);

    var title = document.getElementById("net-node-title");
    var desc = document.getElementById("net-node-desc");
    var t = (title ? title.textContent : node.label) || node.label;
    var d = (desc ? desc.textContent : "") || "";
    speak(t + "。" + d.slice(0, 120));

    if (btn) btn.textContent = "讲解中 " + idx + " / " + list.length;
  }

  function start(withVoice) {
    var api = window.HS && window.HS.network;
    if (!api) return;
    list = api.list().slice(0, 18);
    if (!list.length) return;
    VOICE_ON = !!withVoice;
    playing = true;
    idx = 0;
    ensureBtn();
    if (btn) { btn.setAttribute("aria-pressed", "true"); btn.textContent = "讲解中"; }
    step();
    timer = setInterval(step, 5200);
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    timer = null;
    if ("speechSynthesis" in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    if (btn) { btn.setAttribute("aria-pressed", "false"); btn.textContent = "自动讲解"; }
  }

  /* 用户一动就停：滚轮、点击画布、切换聚类 */
  ["wheel", "pointerdown", "keydown"].forEach(function (e) {
    host.addEventListener(e, function () { if (playing) stop(); }, { passive: true });
  });
  var sel = document.getElementById("net-cluster");
  if (sel) sel.addEventListener("change", function () { if (playing) stop(); });

  window.HSNetTour = { start: function () { start(false); }, stop: stop, isPlaying: function () { return playing; } };

  ensureBtn();
})();
