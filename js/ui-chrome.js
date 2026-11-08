/* ui-chrome.js —— 全站统一顶栏（含首页）
 * 常驻显示，随时可跳转任意空间；右侧「全部入口」展开完整清单。
 */
(function () {
  "use strict";
  if (window.__uiChrome) return;
  window.__uiChrome = true;

  var TITLES = {
    "index.html": "主展馆",
    "wall.html": "史料墙",
    "kinetic.html": "星火长廊",
    "clips.html": "影像与声音",
    "notices.html": "报纸的另一面",
    "graph3d.html": "三维知识图谱",
    "sim.html": "运动扩散模拟",
    "showcase.html": "展示模式",
    "compare.html": "依据与复原",
    "compare-docs.html": "文献并排",
    "reader.html": "文献阅读室",
    "assets.html": "档案目录",
    "open-3d.html": "开放模型",
    "scenes-3d.html": "九场景",
    "enter.html": "三种走法",
    "hall.html": "四层九节点"
  };

  var PRIMARY = [
    ["index.html", "主展馆"],
    ["wall.html", "史料墙"],
    ["kinetic.html", "环廊"],
    ["clips.html", "影像"],
    ["graph3d.html", "图谱"],
    ["sim.html", "模拟"],
    ["showcase.html", "展示模式"]
  ];

  var ALL = [
    ["index.html", "主展馆 · 十一卷"],
    ["showcase.html", "展示模式 · 17 页"],
    ["wall.html", "史料墙 · 202 张"],
    ["kinetic.html", "星火长廊 · 环廊"],
    ["notices.html", "报纸的另一面 · 7 条"],
    ["clips.html", "影像与声音 · 9 段"],
    ["reader.html", "文献阅读室 · 9 册"],
    ["assets.html", "档案目录 · 272 条"],
    ["open-3d.html", "开放三维机械库 · 38 件"],
    ["scenes-3d.html", "九场景漫游"],
    ["graph3d.html", "三维知识图谱 · 40 节点"],
    ["sim.html", "运动扩散模拟 1830–1917"],
    ["compare.html", "依据与复原对照 · 63 组"],
    ["compare-docs.html", "文献并排比较 · 9 册"],
    ["enter.html", "三种走法"],
    ["hall.html", "四层九节点"]
  ];

  function here() { return (location.pathname.split("/").pop() || "index.html"); }

  function css() {
    var s = document.createElement("style");
    s.textContent = [
      ".uibar{position:fixed;left:0;right:0;top:0;height:50px;z-index:8000;display:flex;align-items:center;gap:16px;",
      "padding:0 20px;background:rgba(10,9,8,.93);backdrop-filter:blur(12px);",
      "border-bottom:1px solid rgba(201,162,98,.18);font:13px/1 'Noto Sans SC','Microsoft YaHei',system-ui,sans-serif}",
      ".uibar .ub-brand{color:#c9a262;letter-spacing:.16em;font-size:11.5px;text-decoration:none;white-space:nowrap}",
      ".uibar .ub-title{color:#f2e9d8;font-size:13.5px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:26vw}",
      ".uibar nav{margin-left:auto;display:flex;gap:3px;align-items:center}",
      ".uibar nav a{color:#9d9182;text-decoration:none;padding:6px 10px;border-radius:999px;white-space:nowrap}",
      ".uibar nav a:hover{color:#f2e9d8;background:rgba(201,162,98,.12)}",
      ".uibar nav a[aria-current]{color:#fff;background:#a8332c}",
      ".uibar .ub-more{font:inherit;font-size:12px;padding:6px 12px;border-radius:999px;cursor:pointer;",
      "border:1px solid rgba(201,162,98,.34);background:transparent;color:#e8dcc6;white-space:nowrap}",
      ".uibar .ub-more:hover{border-color:#c9a262;color:#fff;background:rgba(201,162,98,.12)}",
      ".ub-panel{position:fixed;right:16px;top:56px;z-index:8500;width:min(560px,calc(100vw - 32px));",
      "background:rgba(14,12,10,.98);border:1px solid rgba(201,162,98,.3);border-radius:8px;padding:12px 14px;",
      "box-shadow:0 26px 70px rgba(0,0,0,.66);backdrop-filter:blur(14px);display:none}",
      ".ub-panel.on{display:block}",
      ".ub-panel p{margin:0 0 9px;font-size:11px;letter-spacing:.2em;color:#c9a262}",
      ".ub-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}",
      ".ub-grid a{display:block;padding:7px 9px;border-radius:5px;color:#e8dcc6;text-decoration:none;font-size:12.5px;",
      "border:1px solid transparent}",
      ".ub-grid a:hover{background:rgba(201,162,98,.1);border-color:rgba(201,162,98,.32);color:#fff}",
      ".uiprogress{position:fixed;left:0;top:0;height:2px;width:0;z-index:8001;",
      "background:linear-gradient(90deg,#7d241f,#c9a262);transition:width .1s linear}",
      "body.uibody{padding-top:50px}",
      "body.uibody .topbar{display:none}",
      "@media(max-width:860px){.uibar nav a{padding:6px 7px;font-size:12px}.uibar .ub-title{display:none}}"
    ].join("");
    document.head.appendChild(s);
  }

  function build() {
    var f = here();
    var bar = document.createElement("header");
    bar.className = "uibar";
    bar.innerHTML = '<a class="ub-brand" href="index.html">星火与道路</a>' +
      '<span class="ub-title">' + (TITLES[f] || "展馆") + "</span>" +
      '<nav></nav>' +
      '<button type="button" class="ub-more" aria-expanded="false">全部入口 ▾</button>';

    var nav = bar.querySelector("nav");
    PRIMARY.forEach(function (l) {
      var a = document.createElement("a");
      a.href = l[0];
      a.textContent = l[1];
      if (l[0] === f) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });

    var panel = document.createElement("div");
    panel.className = "ub-panel";
    panel.innerHTML = '<p>全部入口 · ' + ALL.length + ' 个空间</p><div class="ub-grid">' +
      ALL.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + "</a>"; }).join("") + "</div>";

    document.body.classList.add("uibody");
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(panel);

    var prog = document.createElement("div");
    prog.className = "uiprogress";
    document.body.appendChild(prog);

    var btn = bar.querySelector(".ub-more");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var on = panel.classList.toggle("on");
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!panel.classList.contains("on")) return;
      if (panel.contains(e.target) || e.target === btn) return;
      panel.classList.remove("on");
      btn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { panel.classList.remove("on"); btn.setAttribute("aria-expanded", "false"); }
    });
    window.addEventListener("scroll", function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }, { passive: true });
  }

  function run() { css(); build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
