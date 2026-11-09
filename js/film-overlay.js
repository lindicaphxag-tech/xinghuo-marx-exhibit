/* film-overlay.js —— 讲解片的批注层（v2）
   结构：上下渐变压暗 → 左上标题 → 右上证据标签 → 底部字幕带 → 图上引线批注 */
(function () {
  "use strict";

  var root, capEl, capBox, headEl, badgeEl, notesEl;

  function build() {
    if (root) return;
    root = document.createElement("div");
    root.className = "film-layer";
    root.innerHTML =
      '<div class="film-top"></div>' +
      '<div class="film-bottom"></div>' +
      '<div class="film-head"><div class="film-kicker"></div><div class="film-title"></div></div>' +
      '<div class="film-badge"></div>' +
      '<div class="film-notes"></div>' +
      '<div class="film-capbox"><div class="film-cap"></div></div>' +
      '<div class="film-rule"></div>';
    document.body.appendChild(root);

    headEl = root.querySelector(".film-kicker");
    capEl = root.querySelector(".film-cap");
    capBox = root.querySelector(".film-capbox");
    badgeEl = root.querySelector(".film-badge");
    notesEl = root.querySelector(".film-notes");

    var css = document.createElement("style");
    css.textContent = [
      ".film-layer{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:'XH Serif','Noto Serif SC',serif}",
      /* 上下压暗，保证文字在浅色页面上也可读 */
      ".film-top{position:absolute;left:0;right:0;top:0;height:210px;" +
        "background:linear-gradient(180deg,rgba(6,5,4,.985) 0,rgba(6,5,4,.985) 128px,rgba(6,5,4,.6) 62%,transparent)}",
      ".film-bottom{position:absolute;left:0;right:0;bottom:0;height:250px;" +
        "background:linear-gradient(0deg,rgba(6,5,4,.94),rgba(6,5,4,.62) 55%,transparent)}",
      /* 标题：压暗带内 */
      ".film-head{position:absolute;left:58px;top:64px;max-width:56vw}",
      ".film-kicker{font-size:12px;letter-spacing:.34em;color:#c89b5a}",
      ".film-title{margin-top:10px;font-size:30px;font-weight:700;line-height:1.28;color:#fff7e7}",
      ".film-badge{position:absolute;right:58px;top:70px;padding:7px 14px;border:1px solid rgba(200,155,90,.6);" +
        "background:rgba(10,9,8,.8);color:#ecdfc9;font-size:12.5px;letter-spacing:.06em;border-radius:2px}",
      /* 字幕带：半透明底，居中 */
      ".film-capbox{position:absolute;left:50%;transform:translateX(-50%);bottom:52px;" +
        "width:min(1240px,82vw);padding:16px 26px;background:rgba(8,7,6,.62);" +
        "border-top:1px solid rgba(200,155,90,.28);border-bottom:1px solid rgba(200,155,90,.14)}",
      ".film-cap{font-size:22px;line-height:1.68;color:#fff8ec;text-align:center;letter-spacing:.01em}",
      ".film-rule{position:absolute;left:50%;transform:translateX(-50%);bottom:44px;" +
        "width:min(1240px,82vw);height:1px;background:linear-gradient(90deg,transparent,rgba(200,155,90,.5),transparent);opacity:0}",
      /* 图上批注 */
      ".film-notes{position:absolute;inset:0}",
      ".film-note{position:absolute;max-width:300px;padding:6px 10px;background:rgba(10,9,8,.9);" +
        "border:1px solid rgba(224,82,74,.65);color:#f6ebdb;font-size:13.5px;line-height:1.5;border-radius:2px}",
      ".film-note::after{content:'';position:absolute;left:-26px;top:50%;width:26px;height:1px;background:rgba(224,82,74,.85)}",
      ".film-note::before{content:'';position:absolute;left:-32px;top:50%;width:7px;height:7px;margin-top:-3px;" +
        "border-radius:50%;background:#e0524a;box-shadow:0 0 0 3px rgba(224,82,74,.25)}"
    ].join("");
    document.head.appendChild(css);
  }

  window.FilmOverlay = {
    show: function (o) {
      build();
      root.style.display = "block";
      headEl.textContent = o.kicker || "";
      root.querySelector(".film-title").textContent = o.title || "";
      badgeEl.textContent = o.badge || "";
      badgeEl.style.display = o.badge ? "block" : "none";
      capEl.textContent = o.cap || "";
      notesEl.innerHTML = (o.notes || []).map(function (n) {
        return '<div class="film-note" style="left:' + n.x + '%;top:' + n.y + '%">' + n.text + "</div>";
      }).join("");
      return true;
    },
    caption: function (text) {
      if (!capEl) return;
      capEl.textContent = text || "";
    },
    hide: function () { if (root) root.style.display = "none"; }
  };
})();
