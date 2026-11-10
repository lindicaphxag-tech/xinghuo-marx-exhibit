/* manifesto-reader.js —— 内嵌《共产党宣言》全文：章节导航、搜索高亮、字号切换 */
(function () {
  "use strict";
  var D = window.MANIFESTO_CN;
  if (!D || !D.sections || !D.sections.length) return;

  var host = document.getElementById("mf-reader");
  if (!host) return;

  var secs = D.sections;
  var navHTML = secs.map(function (s, i) {
    return '<button type="button" data-i="' + i + '">' + s.title + "</button>";
  }).join("");

  host.innerHTML =
    '<div class="mf-head">' +
      '<h3>《共产党宣言》全文</h3>' +
      '<span class="src">' + D.source + '译本 · <a href="' + D.url +
        '" target="_blank" rel="noopener noreferrer">维基文库</a></span>' +
      '<div class="mf-tools">' +
        '<input id="mf-q" type="search" placeholder="在全文里搜…">' +
        '<button type="button" id="mf-sm">小</button>' +
        '<button type="button" id="mf-lg">大</button>' +
      '</div>' +
    '</div>' +
    '<div class="mf-body">' +
      '<nav class="mf-nav" id="mf-nav">' + navHTML + '</nav>' +
      '<article class="mf-text" id="mf-text"></article>' +
    '</div>' +
    '<div class="mf-foot">共 ' + secs.reduce(function (a, s) { return a + s.paras.length; }, 0) +
      ' 段，约 ' + secs.reduce(function (a, s) { return a + s.paras.join("").length; }, 0).toLocaleString() +
      ' 字。原文为公有领域；此译本按维基文库条目转写，仅用于课程展示，逐段保留原文。</div>';

  var nav = document.getElementById("mf-nav");
  var text = document.getElementById("mf-text");
  var total = secs.reduce(function (a, s) { return a + s.paras.join("").length; }, 0);

  function esc(s) {
    return s.replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function render(i, q) {
    var s = secs[i];
    var html = "<h4>" + esc(s.title) + "</h4>";
    s.paras.forEach(function (p) {
      var t = esc(p);
      if (q) {
        var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        t = t.replace(re, function (m) { return "<mark>" + m + "</mark>"; });
      }
      html += "<p>" + t + "</p>";
    });
    text.innerHTML = html;
    text.scrollTop = 0;
    Array.prototype.forEach.call(nav.children, function (b, k) {
      b.classList.toggle("on", k === i);
    });
  }

  nav.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]");
    if (b) render(+b.dataset.i, document.getElementById("mf-q").value.trim());
  });

  document.getElementById("mf-q").addEventListener("input", function (e) {
    var q = e.target.value.trim();
    if (!q) { render(0, ""); return; }
    /* 命中章节优先：跳到第一个含该词的章节 */
    for (var i = 0; i < secs.length; i++) {
      if (secs[i].paras.join("").indexOf(q) >= 0) { render(i, q); break; }
    }
  });

  document.getElementById("mf-sm").onclick = function () { text.dataset.size = "s"; };
  document.getElementById("mf-lg").onclick = function () { text.dataset.size = "l"; };

  render(0, "");
})();
