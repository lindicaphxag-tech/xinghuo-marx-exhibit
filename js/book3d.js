/* book3d.js —— 双页对开的 3D 翻书：《共产党宣言》全文 */
(function () {
  "use strict";
  var D = window.MANIFESTO_CN;
  var host = document.getElementById("book3d");
  if (!D || !host) return;

  var CHARS = 520;

  /* ---- 分页 ---- */
  var pages = [];
  D.sections.forEach(function (sec) {
    var buf = "";
    sec.paras.forEach(function (p) {
      if (buf.length + p.length > CHARS && buf) { pages.push({ t: sec.title, x: buf }); buf = ""; }
      buf += p;
    });
    if (buf) pages.push({ t: sec.title, x: buf });
  });
  if (!pages.length) return;
  while (pages.length % 2) pages.push({ t: "", x: "" });
  var spreads = pages.length / 2;

  host.innerHTML =
    '<div class="book3d-wrap">' +
      '<div class="book3d-stage"><div class="book3d-book" id="b3-book">' +
        '<div class="book3d-face left" id="b3-left"></div>' +
        '<div class="book3d-face right" id="b3-right"></div>' +
        '<div class="book3d-leaf" id="b3-leaf">' +
          '<div class="book3d-face front" id="b3-front"></div>' +
          '<div class="book3d-face back" id="b3-back"></div>' +
        '</div>' +
        '<div class="book3d-spine"></div>' +
      '</div></div>' +
      '<div class="book3d-side">' +
        '<div class="meter" id="b3-meter"></div>' +
        '<button type="button" id="b3-prev">← 上一跨页</button>' +
        '<button type="button" id="b3-next">下一跨页 →</button>' +
        '<div class="book3d-toc" id="b3-toc"></div>' +
      '</div>' +
    '</div>';

  var book = document.getElementById("b3-book");
  var leftEl = document.getElementById("b3-left");
  var rightEl = document.getElementById("b3-right");
  var leaf = document.getElementById("b3-leaf");
  var frontEl = document.getElementById("b3-front");
  var backEl = document.getElementById("b3-back");
  var meter = document.getElementById("b3-meter");
  var busy = false;
  var s = 0;                       /* 当前跨页序号 */

  function esc(t) {
    return (t || "").replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; });
  }

  function pageHTML(p, num, side) {
    if (!p || !p.x) return '<div class="book3d-face ' + side + '"></div>';
    return '<div class="pg-head"><span>' + esc(p.t) + '</span><span>共產黨宣言</span></div>' +
      (p.t ? '<h4>' + esc(p.t) + '</h4>' : '') +
      '<p>' + esc(p.x) + '</p>' +
      '<div class="pg-num">' + num + '</div>';
  }

  function paintBase() {
    leftEl.innerHTML = pageHTML(pages[s * 2], s * 2 + 1, "left").replace('class="book3d-face left"', "");
    rightEl.innerHTML = pageHTML(pages[s * 2 + 1], s * 2 + 2, "right").replace('class="book3d-face right"', "");
    leftEl.className = "book3d-face left";
    rightEl.className = "book3d-face right";
    meter.textContent = "跨页 " + (s + 1) + " / " + spreads +
      "　（第 " + (s * 2 + 1) + "–" + Math.min(pages.length, s * 2 + 2) + " 页）";
    Array.prototype.forEach.call(document.querySelectorAll("#b3-toc button"), function (b) {
      b.classList.toggle("on", b.dataset.s === String(s));
    });
  }

  function turn(dir) {
    if (busy) return;
    if (dir > 0 && s >= spreads - 1) return;
    if (dir < 0 && s <= 0) return;
    busy = true;

    /* 正翻：右页翻到左边；反翻：左页翻回右边 */
    var target = dir > 0 ? pages[s * 2 + 1] : pages[s * 2];
    var nextPage = dir > 0 ? pages[s * 2 + 2] : pages[s * 2 - 1];
    var num = dir > 0 ? s * 2 + 2 : s * 2;

    frontEl.innerHTML = pageHTML(target, num, "front").replace('class="book3d-face front"', "");
    backEl.innerHTML = pageHTML(nextPage, num + (dir > 0 ? 1 : -1), "back").replace('class="book3d-face back"', "");
    frontEl.className = "book3d-face front";
    backEl.className = "book3d-face back";

    leaf.style.visibility = "visible";
    leaf.style.transition = "none";
    leaf.style.transform = dir > 0 ? "rotateY(0deg)" : "rotateY(-178deg)";
    leaf.style.zIndex = "30";
    /* 强制回流后再开启动画 */
    void leaf.offsetWidth;
    leaf.style.transition = "transform .85s cubic-bezier(.3,.05,.25,1)";
    requestAnimationFrame(function () {
      leaf.style.transform = dir > 0 ? "rotateY(-178deg)" : "rotateY(0deg)";
    });

    setTimeout(function () {
      s += dir;
      paintBase();
      leaf.style.transition = "none";
      leaf.style.transform = "rotateY(0deg)";
      leaf.style.zIndex = "1";
      leaf.style.visibility = "hidden";
      frontEl.innerHTML = backEl.innerHTML = "";
      busy = false;
    }, 900);
  }

  document.getElementById("b3-next").addEventListener("click", function () { turn(1); });
  document.getElementById("b3-prev").addEventListener("click", function () { turn(-1); });
  book.addEventListener("click", function (e) {
    var r = book.getBoundingClientRect();
    turn(e.clientX - r.left > r.width / 2 ? 1 : -1);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") turn(1);
    if (e.key === "ArrowLeft") turn(-1);
  });

  var toc = document.getElementById("b3-toc");
  D.sections.forEach(function (sec) {
    var first = pages.findIndex(function (p) { return p.t === sec.title; });
    if (first < 0) return;
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.s = String(Math.floor(first / 2));
    b.textContent = sec.title.replace(/^[一二三四五]、?/, "");
    b.addEventListener("click", function () {
      s = Number(b.dataset.s);
      paintBase();
    });
    toc.appendChild(b);
  });

  /* 自动翻页：6 秒一跨，用户一操作就暂停，静置 8 秒恢复 */
  var autoTimer = null;
  function autoStart() {
    if (autoTimer) return;
    autoTimer = setInterval(function () {
      if (s >= spreads - 1) { s = 0; paintBase(); } else { turn(1); }
    }, 6000);
  }
  function autoStop() { clearInterval(autoTimer); autoTimer = null; }
  book.addEventListener("mouseenter", autoStop);
  book.addEventListener("pointerdown", autoStop);
  document.addEventListener("keydown", autoStop);
  host.addEventListener("mouseleave", function () { setTimeout(autoStart, 1500); });
  setTimeout(autoStart, 1800);

  leaf.style.visibility = "hidden";
  paintBase();
  window.HSBook = { start: autoStart, stop: autoStop, next: function () { turn(1); }, next: function () { turn(1); }, prev: function () { turn(-1); }, pages: pages.length };
})();
