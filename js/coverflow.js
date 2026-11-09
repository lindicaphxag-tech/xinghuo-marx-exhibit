/* coverflow.js —— 史料墙「展柜模式」：中间放大、两侧后退、圆点分页
 * 借鉴博物馆网站在线展厅的封面流交互；数据仍来自页面已有的 items。
 */
(function () {
  "use strict";

  function build(items, startIndex, opts) {
    opts = opts || {};
    var root = document.createElement("div");
    root.className = "cf-root";
    root.innerHTML =
      '<div class="cf-stage"><div class="cf-track"></div></div>' +
      '<button class="cf-nav prev" aria-label="上一件">‹</button>' +
      '<button class="cf-nav next" aria-label="下一件">›</button>' +
      '<div class="cf-bar"><div class="cf-dots"></div><div class="cf-cap"></div></div>' +
      '<button class="cf-close" aria-label="关闭展柜模式">×</button>';

    var style = document.createElement("style");
    style.textContent = [
      ".cf-root{position:fixed;inset:0;z-index:9600;background:radial-gradient(120% 90% at 50% 20%,#191512 0%,#0b0908 70%);display:flex;align-items:center;justify-content:center;overflow:hidden}",
      ".cf-stage{width:100%;height:72vh;display:flex;align-items:center;justify-content:center;position:relative}",
      ".cf-track{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d}",
      ".cf-card{position:absolute;top:50%;left:50%;border:1px solid rgba(201,162,98,.28);background:#0f0d0c;overflow:hidden;",
      "transition:transform .55s cubic-bezier(.22,.61,.36,1),opacity .45s,filter .45s;cursor:pointer;box-shadow:0 24px 60px rgba(0,0,0,.6)}",
      ".cf-card img{display:block;width:100%;height:100%;object-fit:cover}",
      ".cf-card.center{cursor:default}",
      ".cf-card.center img{filter:none}",
      ".cf-nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:64px;border:1px solid rgba(201,162,98,.3);",
      "background:rgba(12,10,9,.7);color:#e8dcc6;font-size:26px;cursor:pointer;border-radius:4px;z-index:5}",
      ".cf-nav.prev{left:26px}.cf-nav.next{right:26px}",
      ".cf-nav:hover{color:#fff;border-color:var(--gold,#c9a262);background:rgba(201,162,98,.14)}",
      ".cf-close{position:absolute;right:22px;top:18px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(201,162,98,.3);",
      "background:rgba(12,10,9,.7);color:#cbbfae;font-size:22px;cursor:pointer;z-index:6}",
      ".cf-close:hover{color:#fff;border-color:var(--gold,#c9a262)}",
      ".cf-bar{position:absolute;left:0;right:0;bottom:26px;display:flex;flex-direction:column;align-items:center;gap:12px}",
      ".cf-cap{max-width:min(900px,84vw);text-align:center;font-size:13px;line-height:1.8;color:#cfc3b0}",
      ".cf-cap b{display:block;color:#f2e9d8;font-size:16px;margin-bottom:4px;font-weight:500}",
      ".cf-dots{display:flex;gap:7px}",
      ".cf-dots button{width:7px;height:7px;border-radius:50%;border:0;padding:0;cursor:pointer;background:rgba(201,162,98,.28)}",
      ".cf-dots button.on{background:#c9a262;transform:scale(1.25)}",
      ".cf-count{font:12px/1 ui-monospace,monospace;color:#8d8175;letter-spacing:.14em}"
    ].join("");
    document.head.appendChild(style);
    document.body.appendChild(root);

    var track = root.querySelector(".cf-track");
    var dots = root.querySelector(".cf-dots");
    var cap = root.querySelector(".cf-cap");
    var cards = [];
    var cur = Math.max(0, Math.min(items.length - 1, startIndex || 0));

    items.forEach(function (it, i) {
      var c = document.createElement("div");
      c.className = "cf-card";
      c.innerHTML = '<img src="' + (window.HSNorm ? window.HSNorm(it.src) : (it.ring || it.src)) + '" alt="">';
      c.addEventListener("click", function () {
        if (i === cur) return;
        go(i);
      });
      track.appendChild(c);
      cards.push(c);

      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "第 " + (i + 1) + " 件");
      d.addEventListener("click", function () { go(i); });
      dots.appendChild(d);
    });

    function layout() {
      var W = track.clientWidth || window.innerWidth;
      var H = track.clientHeight || window.innerHeight * 0.72;
      var cardW = Math.min(W * 0.26, H * 0.74 * 0.92);
      var cardH = Math.min(H * 0.82, cardW * 1.5);
      cards.forEach(function (c, i) {
        var off = i - cur;
        var abs = Math.abs(off);
        if (abs > 2) {
          c.style.opacity = "0";
          c.style.pointerEvents = "none";
          c.style.transform = "translate(-50%,-50%) scale(.6)";
          return;
        }
        c.style.width = cardW + "px";
        c.style.height = cardH + "px";
        c.style.opacity = abs === 0 ? "1" : (abs === 1 ? "0.62" : "0.3");
        c.style.zIndex = String(10 - abs);
        c.style.pointerEvents = "auto";
        c.classList.toggle("center", abs === 0);
        var tx = off * (cardW * 0.92);
        var sc = abs === 0 ? 1 : (abs === 1 ? 0.82 : 0.66);
        var rot = off * -10;
        c.style.transform = "translate(-50%,-50%) translateX(" + tx + "px) scale(" + sc + ") rotateY(" + rot + "deg)";
      });
      var it = items[cur] || {};
      typeLine(it);
      /* 卡片为 4:5 规范化画框（含留白），引线坐标不再成立，故封面流不画标注；
         需要看标注请到单件页（原图 + 精确坐标）。 */
      if (items.length > 24) {
        dots.innerHTML = '<span class="cf-count">' + (cur + 1) + " / " + items.length + "</span>";
      } else {
        Array.prototype.forEach.call(dots.children, function (d, i) {
          if (d.classList) d.classList.toggle("on", i === cur);
        });
      }
    }

    var typeTimer = 0;
    function typeLine(it) {
      clearTimeout(typeTimer);
      var head = "<b>" + (it.title || "") + "</b>";
      var tail = (it.page ? '　<a href="' + it.page + '" target="_blank" rel="noopener noreferrer" style="color:#c9a262">核对原始页面 ↗</a>' : "");
      var body = it.desc || "";
      cap.innerHTML = head + '<span class="cf-typed"></span>' + tail;
      var span = cap.querySelector(".cf-typed");
      var k = 0;
      (function tick() {
        if (!span.isConnected) return;
        span.textContent = body.slice(0, ++k);
        if (k < body.length) typeTimer = setTimeout(tick, 42);
      })();
    }

    function go(i) {
      cur = (i + items.length) % items.length;
      layout();
    }

    root.querySelector(".cf-prev") || root.querySelector(".cf-nav.prev").addEventListener("click", function () { go(cur - 1); });
    root.querySelector(".cf-nav.next").addEventListener("click", function () { go(cur + 1); });
    root.querySelector(".cf-close").addEventListener("click", function () { close(); });
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    function onKey(e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", layout);
    layout();

    function close() {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", layout);
      root.remove();
      if (opts.onClose) opts.onClose();
    }
    return { close: close, go: go };
  }

  window.HSCoverflow = { build: build };
})();
