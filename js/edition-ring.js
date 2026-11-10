/* edition-ring.js —— 1848 初版与各语种版本的环形轮转 */
(function () {
  "use strict";
  var host = document.getElementById("edition-ring");
  if (!host) return;

  var SRC = "assets/documents/covers/";
  var ITEMS = [
    { f: "01_manifest_1848_cover.jpg", t: "1848 · 伦敦德文初版封面", s: "23 页，无作者署名；巴塞尔大学图书馆藏本，Public Domain Mark。", href: "https://www.e-rara.ch/bau_1/content/titleinfo/19116320" },
    { f: "02_manifest_1848_titlepage.jpg", t: "1848 · 初版扉页", s: "扉页只印书名与出版地，没有作者名。", href: "https://www.e-rara.ch/bau_1/content/titleinfo/19116320" },
    { f: "03_manifest_first_page.png", t: "1848 · 正文首面", s: "开篇第一句：「一个幽灵，共产主义的幽灵，在欧洲游荡。」", href: "https://www.e-rara.ch/bau_1/content/titleinfo/19116320" },
    { f: "04_manifest_english_1850.jpg", t: "1850 · 英译单行本", s: "首个英译本在伦敦出版，译者麦克法林。", href: "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/" },
    { f: "10_manifest_multilang_hangzhou.jpg", t: "1920 · 中译本", s: "陈望道译，上海社会主义研究社印行，封面书名曾误排。", href: "" },
    { f: "09_manifest_senate_house.jpg", t: "版本对照 · 馆藏书影", s: "同一文本在不同馆藏中的装帧差异。", href: "" },
    { f: "05_kapital_1867_zurich.jpg", t: "1867 · 《资本论》初版", s: "汉堡迈斯纳出版社，第一卷，印数不足千册。", href: "" },
    { f: "06_kapital_band1_cover.jpg", t: "《资本论》第一卷 · 封面", s: "初版封面用深绿布面烫金。", href: "" }
  ];

  var N = ITEMS.length;
  var R = 138;
  var wrap = document.createElement("div");
  wrap.className = "edition-ring-wrap";
  wrap.innerHTML =
    '<div class="edition-ring" id="er-ring"><div class="edition-ring-track" id="er-track"></div></div>' +
    '<div class="edition-meta" id="er-meta"></div>';
  host.innerHTML = "";
  host.appendChild(wrap);

  var track = document.getElementById("er-track");
  var meta = document.getElementById("er-meta");
  var ring = document.getElementById("er-ring");

  ITEMS.forEach(function (it, i) {
    var d = document.createElement("div");
    d.className = "edition-item";
    var ang = (360 / N) * i;
    d.style.transform = "rotateY(" + ang + "deg) translateZ(" + R + "px)";
    d.innerHTML = '<img src="' + SRC + it.f + '" alt="' + it.t + '" loading="lazy">';
    d.addEventListener("mouseenter", function () {
      ring.classList.add("paused");
      meta.innerHTML = "<b>" + it.t + "</b><span>" + it.s + "</span>" +
        (it.href ? '<a href="' + it.href + '" target="_blank" rel="noopener noreferrer">查看馆藏原件 ↗</a>' : "");
    });
    d.addEventListener("mouseleave", function () { ring.classList.remove("paused"); });
    track.appendChild(d);
  });

  meta.innerHTML = "<b>" + ITEMS[0].t + "</b><span>" + ITEMS[0].s + "</span>" +
    '<a href="' + ITEMS[0].href + '" target="_blank" rel="noopener noreferrer">查看馆藏原件 ↗</a>';
})();
