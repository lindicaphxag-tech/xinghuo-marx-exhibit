/* design-pass.js — 章节头改造（第二版，按截图反馈修正）
 * 1. 英文大写 eyebrow 是模板痕迹 → 隐藏，换成中文卷印
 * 2. 卷号用中文数字竖排，避免 "卷/0/1" 被拆成三行
 */
(function () {
  "use strict";

  var CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

  function volInfo(text) {
    var m = text.match(/VOL\.?\s*(\d+)/i);
    if (m) {
      var n = parseInt(m[1], 10);
      var zh = CN[n] || String(n);
      return { seal: ("0" + n).slice(-2), margin: "卷" + zh };
    }
    if (/序章/.test(text)) return { seal: "序", margin: "序章" };
    if (/终章|FINALE/i.test(text)) return { seal: "终", margin: "终章" };
    return null;
  }

  function run() {
    if (location.search.indexOf("classic") > -1) return;   // ?classic 关闭本次改版

    var heads = document.querySelectorAll(".chapter-head");
    Array.prototype.forEach.call(heads, function (head) {
      var kicker = head.querySelector(".kicker");
      if (!kicker) return;
      var info = volInfo(kicker.textContent || "");
      kicker.classList.add("kicker--off");
      if (!info) return;

      // 印章：标题上方的方形红框
      var seal = document.createElement("span");
      seal.className = "seal";
      seal.setAttribute("aria-hidden", "true");
      seal.textContent = info.seal;
      head.insertBefore(seal, head.firstChild);

      // 页边竖排卷名
      if (getComputedStyle(head).position === "static") head.style.position = "relative";
      var margin = document.createElement("span");
      margin.className = "vol-margin";
      margin.setAttribute("aria-hidden", "true");
      margin.textContent = info.margin;
      head.appendChild(margin);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
