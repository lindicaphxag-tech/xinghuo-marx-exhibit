/* command-palette.js — Ctrl/Cmd+K 全局搜索跳转 */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    var HS = window.HS;
    if (!HS) return;

    var box = document.createElement("div");
    box.id = "cmdk";
    box.innerHTML =
      '<input id="cmdk-input" placeholder="跳转：输入章节名 / 城市 / 展品…" autocomplete="off">' +
      '<div id="cmdk-list"></div>' +
      '<div id="cmdk-hint">↑↓ 选择 · ↵ 进入 · Esc 关闭</div>';
    document.body.appendChild(box);

    var css = document.createElement("style");
    css.textContent =
      '#cmdk{position:fixed;inset:0;z-index:99998;background:rgba(10,6,4,.7);backdrop-filter:blur(6px);' +
      'display:none;align-items:flex-start;justify-content:center;padding:12vh 16px} ' +
      '#cmdk.open{display:flex} ' +
      '#cmdk>div{width:min(640px,100%);background:#1f140e;border:1px solid #d4a84a;border-radius:10px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)} ' +
      '#cmdk-input{width:100%;padding:16px 18px;background:transparent;border:0;border-bottom:1px solid #3a2a1a;color:#fff;font-size:16px;outline:none;font-family:inherit} ' +
      '#cmdk-list{max-height:50vh;overflow-y:auto} ' +
      '.cmdk-item{padding:11px 18px;cursor:pointer;display:flex;gap:10px;align-items:baseline;font-size:14px;color:#e8d8b8} ' +
      '.cmdk-item.active{background:#b3202a;color:#fff} ' +
      '.cmdk-item .tag{font-size:10px;color:#d4a84a;min-width:48px;letter-spacing:1px} ' +
      '.cmdk-item.active .tag{color:#ffd27a} ' +
      '#cmdk-hint{padding:8px 18px;font-size:11px;color:#8a7050;border-top:1px solid #2a1c10}';
    document.head.appendChild(css);

    var input = box.querySelector("#cmdk-input");
    var list = box.querySelector("#cmdk-list");

    /* 收集可跳转条目 */
    var items = [];
    var D = window.HS_DATA || {};
    (D.modules || []).forEach(function (m) {
      items.push({ tag: "卷宗", label: (m.code || "") + " " + m.name, run: function () { HS.scrollToId(m.id); } });
    });
    (D.cities || []).forEach(function (c) {
      items.push({ tag: "城市", label: c.name + " " + (c.en || ""), run: function () {
        HS.scrollToId("mapstory");
        setTimeout(function () { if (HS.scenes.mapstory && HS.scenes.mapstory.focusCity) HS.scenes.mapstory.focusCity(c.id); }, 400);
      }});
    });
    /* 主要展品：从 asset_catalog 动态加载 */
    fetch("assets/manifests/asset_catalog.json").then(function (r) { return r.json(); }).then(function (cat) {
      (cat.items || []).slice(0, 80).forEach(function (it) {
        if (!it.title) return;
        items.push({ tag: "展品", label: it.title, run: function () {
          if (it.href && it.href.charAt(0) !== "#") window.location.href = it.href;
          else if (it.href) HS.scrollToId(it.href.replace("#", ""));
        }});
      });
    }).catch(function () {});

    var filtered = [], active = 0;
    function render() {
      var q = input.value.trim().toLowerCase();
      filtered = !q ? items.slice(0, 20) : items.filter(function (it) { return it.label.toLowerCase().indexOf(q) >= 0; }).slice(0, 20);
      active = 0;
      list.innerHTML = "";
      filtered.forEach(function (it, i) {
        var d = document.createElement("div");
        d.className = "cmdk-item" + (i === 0 ? " active" : "");
        d.innerHTML = '<span class="tag">' + it.tag + '</span><span>' + it.label + "</span>";
        d.addEventListener("click", function () { choose(i); });
        list.appendChild(d);
      });
      if (!filtered.length) list.innerHTML = '<div class="cmdk-item"><span class="tag">无结果</span><span>换个关键词试试</span></div>';
    }
    function choose(i) {
      var it = filtered[i];
      if (!it) return;
      close(); it.run();
    }
    function open() { box.classList.add("open"); input.value = ""; render(); setTimeout(function(){input.focus();}, 30); }
    function close() { box.classList.remove("open"); }

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.classList.contains("open") ? close() : open(); }
      else if (e.key === "Escape") close();
      else if (box.classList.contains("open")) {
        if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); paint(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
        else if (e.key === "Enter") { e.preventDefault(); choose(active); }
      }
    });
    function paint() {
      var nodes = list.querySelectorAll(".cmdk-item");
      nodes.forEach(function (n, i) { n.classList.toggle("active", i === active); });
      if (nodes[active]) nodes[active].scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", render);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    /* 右上角浮动触发按钮 */
    var fab = document.createElement("button");
    fab.textContent = "⌘K";
    fab.style.cssText = "position:fixed;top:60px;right:14px;z-index:59;background:rgba(20,12,8,.7);color:#d4a84a;border:1px solid #604020;border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer";
    fab.title = "快速跳转 (Ctrl+K)";
    fab.addEventListener("click", open);
    document.body.appendChild(fab);
  });
})();
