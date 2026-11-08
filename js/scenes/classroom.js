/* classroom.js — 卷五 阶级平行宇宙：可拖动分屏对照 */
(function () {
  "use strict";
  var D = window.HS_DATA.classDivide;
  var stage = document.getElementById("split-stage");
  if (!stage) return;

  var leftSide = stage.querySelector(".split-side.left");
  var rightSide = stage.querySelector(".split-side.right");
  var divider = document.getElementById("split-divider");

  document.getElementById("left-label").textContent = D.leftTitle;
  document.getElementById("right-label").textContent = D.rightTitle;

  function fill(el, items) {
    el.innerHTML = items.map(function (it) {
      return '<div class="item"><div class="head">' + it.head + "</div>" +
        '<div class="body">' + it.body + "</div></div>";
    }).join("");
  }
  fill(document.getElementById("left-items"), D.leftItems);
  fill(document.getElementById("right-items"), D.rightItems);
  document.getElementById("class-note").textContent = D.note;

  /* 扩展维度：三栏对照表 */
  (function renderMore() {
    var box = document.getElementById("class-more-table");
    if (!box || !D.moreItems) return;
    var html = "";
    D.moreItems.forEach(function (it) {
      html += '<div class="row">' +
        '<div class="cell l">' + it.left + "</div>" +
        '<div class="dim">' + it.head + "</div>" +
        '<div class="cell r">' + it.right + "</div>" +
        "</div>";
    });
    box.innerHTML = html;
    var note = document.getElementById("class-more-note");
    if (note) note.textContent = D.moreNote || "";
  })();

  var pos = 50;
  function apply() {
    leftSide.style.clipPath = "inset(0 " + (100 - pos) + "% 0 0)";
    rightSide.style.clipPath = "inset(0 0 0 " + pos + "%)";
    divider.style.left = pos + "%";
    divider.setAttribute("aria-valuenow", Math.round(pos));
    divider.setAttribute("aria-valuetext", "资本一侧 " + Math.round(pos) + "%，劳动一侧 " + Math.round(100 - pos) + "%");
  }

  var dragging = false;
  function onMove(ev) {
    if (!dragging) return;
    var r = stage.getBoundingClientRect();
    var x = ev.clientX - r.left;
    pos = Math.max(15, Math.min(85, x / r.width * 100));
    apply();
  }
  divider.addEventListener("pointerdown", function (ev) { dragging = true; divider.setPointerCapture(ev.pointerId); onMove(ev); ev.preventDefault(); });
  divider.addEventListener("pointermove", onMove);
  divider.addEventListener("pointerup", function () { dragging = false; });
  divider.addEventListener("pointercancel", function () { dragging = false; });
  divider.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
      pos = Math.max(15, Math.min(85, pos + (ev.key === "ArrowRight" ? 3 : -3)));
      apply(); ev.preventDefault();
    } else if (ev.key === "Home" || ev.key === "End") {
      pos = ev.key === "Home" ? 15 : 85; apply(); ev.preventDefault();
    }
  });

  apply();
  window.HS.registerScene("classroom", { start: function () {}, pause: function () {}, resume: function () {} });
})();
