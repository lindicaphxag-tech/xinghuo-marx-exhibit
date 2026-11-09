/* main.js — 全局调度：导航、目录、章节激活、揭示动画、场景生命周期 */
(function () {
  "use strict";

  var D = window.HS_DATA;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  window.HS = { $: $, $all: $, clamp: clamp, lerp: lerp, reduced: reduced, scenes: {} };

  /* ---------- 章节注册表：各场景脚本在加载后登记 ---------- */
  var registry = {};
  window.HS.registerScene = function (id, api) {
    registry[id] = api;
    window.HS.scenes[id] = api;
    /* 注册即接入观察：避免脚本晚于 observeScenes() 加载而永远不被启动 */
    attachScene(id, api);
  };

  function startScene(id, api) {
    if (!api || api._started) return;
    api._started = true;
    try {
      if (typeof api.start === "function") api.start();
    } catch (e) {
      if (window.console) console.warn("scene start failed:", id, e && e.message);
    }
    /* 有些场景在 resize 里才设置画布尺寸，补一次 */
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }

  function attachScene(id, api) {
    if (!api || api._io) return;
    var el = document.getElementById(id);
    if (!el) return;

    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            if (!api._started) startScene(id, api);
            else if (typeof api.resume === "function") api.resume();
          } else if (typeof api.pause === "function") {
            api.pause();
          }
        });
      }, { threshold: 0.08 });
      io.observe(el);
      api._io = io;
    }

    /* 兜底：滚动时用位置判断，防止观察器在某些布局下不触发 */
    sceneList.push({ id: id, api: api, el: el });
    if (!sceneWatchBound) {
      sceneWatchBound = true;
      var tick = false;
      window.addEventListener("scroll", function () {
        if (tick) return;
        tick = true;
        requestAnimationFrame(function () { tick = false; checkScenes(); });
      }, { passive: true });
      checkScenes();
    }
  }

  var sceneList = [], sceneWatchBound = false;

  function checkScenes() {
    var vh = window.innerHeight || 800;
    sceneList.forEach(function (s) {
      if (s.api._started) return;
      var r = s.el.getBoundingClientRect();
      if (r.top < vh * 1.2 && r.bottom > -vh * 0.2) startScene(s.id, s.api);
    });
  }

  /* ---------- 极简事件总线：模块之间不直接互相引用 ---------- */
  var listeners = {};
  window.HS.on = function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); };
  window.HS.emit = function (name, payload) {
    (listeners[name] || []).forEach(function (fn) { try { fn(payload); } catch (e) {} });
  };

  /* ---------- 目录图腾 ---------- */
  var ICONS = {
    globe: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></svg>',
    map: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    manuscript: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
    network: '<svg class="icon" viewBox="0 0 24 24"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M7 7l3 4M17 7l-3 4M10 12l-2 6M14 12l2 6"/></svg>',
    press: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
    split: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4"/></svg>',
    barricade: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 20h18M6 20l3-9h6l3 9M9 11V7M15 11V7"/></svg>',
    sound: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 010 6M18 7a7 7 0 010 10"/></svg>',
    river: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 8c3 2 6 2 9 0s6-2 9 0M3 13c3 2 6 2 9 0s6-2 9 0M3 18c3 2 6 2 9 0s6-2 9 0"/></svg>',
    heat: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity=".5"/><circle cx="12" cy="12" r="10" opacity=".2"/></svg>',
    monument: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3l3 7h-6zM8 10h8l-1 11H9z"/></svg>'
  };

  function renderTotems() {
    var grid = $("#totem-grid");
    if (!grid || !D.modules) return;
    D.modules.forEach(function (m) {
      if (m.id === "hero") return;
      var card = document.createElement("div");
      card.className = "totem";
      card.dataset.target = m.id;
      card.innerHTML =
        '<div class="code">' + m.code + "</div>" +
        (ICONS[m.icon] || ICONS.manuscript) +
        "<h3>" + m.name + "</h3><p>" + m.sub + "</p>" +
        '<div class="go">进入卷宗 →</div>';
      card.addEventListener("click", function () { scrollToId(m.id); });
      grid.appendChild(card);
    });
  }

  function renderChapterQuestions() {
    if (!D.modules) return;
    D.modules.forEach(function (module) {
      var head = document.querySelector("#" + module.id + " .chapter-head");
      if (!head && module.id === "hero") head = document.querySelector("#hero .hero-inner");
      if (!head) return;
      if (module.question && !head.querySelector(".chapter-question")) {
        var aside = document.createElement("aside");
        aside.className = "chapter-question";
        aside.setAttribute("aria-label", "本卷思考问题");
        var label = document.createElement("strong");
        label.textContent = "带着这个问题读";
        var question = document.createElement("p");
        question.textContent = module.question;
        aside.append(label, question);
        head.appendChild(aside);
      }
      var sources = (D.sources || []).filter(function (source) { return source.module === module.id; });
      if (!sources.length || head.querySelector(".chapter-source-index")) return;
      var details = document.createElement("details");
      details.className = "chapter-source-index";
      var summary = document.createElement("summary");
      summary.textContent = "本卷史料与馆藏入口 · " + sources.length + " 项";
      details.appendChild(summary);
      var list = document.createElement("ul");
      sources.forEach(function (source) {
        var item = document.createElement("li");
        var heading = document.createElement("strong");
        heading.textContent = source.title;
        var meta = document.createElement("small");
        meta.textContent = [source.institution, source.date, source.kind].filter(Boolean).join(" · ");
        var note = document.createElement("p");
        note.textContent = source.note || "";
        item.append(heading, meta, note);
        var links = document.createElement("div");
        links.className = "chapter-source-links";
        if (source.local_url) {
          var local = document.createElement("a");
          local.href = source.local_url;
          local.textContent = "在本馆打开 / 离线资料";
          links.appendChild(local);
        }
        if (source.url) {
          var external = document.createElement("a");
          external.href = source.url;
          external.target = "_blank";
          external.rel = "noopener noreferrer";
          external.textContent = source.local_url ? "核对原始来源 ↗" : "打开原件或馆藏记录 ↗";
          links.appendChild(external);
        }
        item.appendChild(links);
        list.appendChild(item);
      });
      details.appendChild(list);
      head.appendChild(details);
    });
  }

  /* ---------- 右侧导航 ---------- */
  function renderNav() {
    var nav = $("#side-nav");
    if (!nav || !D.modules) return;
    D.modules.forEach(function (m) {
      var a = document.createElement("a");
      a.href = "#" + m.id;
      a.dataset.target = m.id;
      a.setAttribute("aria-label", m.code + " " + m.name);
      a.innerHTML = "<span>" + m.code + " " + m.name + "</span>";
      a.addEventListener("click", function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        scrollToId(m.id, true);
      });
      nav.appendChild(a);
    });
  }

  /* ---------- 平滑滚动（不使用 scrollIntoView） ---------- */
  function scrollToId(id, updateLocation, targetId) {
    var el = document.getElementById(targetId || id);
    if (!el) return;
    if (updateLocation !== false && window.history && window.history.pushState) {
      var nextHash = "#" + encodeURIComponent(id);
      if (window.location.hash !== nextHash) window.history.pushState({ chapter: id }, "", nextHash);
    }
    var top = el.getBoundingClientRect().top + window.pageYOffset - 40;
    window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    if (targetId) {
      window.setTimeout(function () {
        var current = document.getElementById(targetId);
        if (!current) return;
        var correctedTop = current.getBoundingClientRect().top + window.pageYOffset - 40;
        if (Math.abs(window.pageYOffset - correctedTop) > 24) window.scrollTo({ top: correctedTop, behavior: "auto" });
      }, 900);
    }
  }
  window.HS.scrollToId = scrollToId;
  window.addEventListener("popstate", function () {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (id && document.getElementById(id)) scrollToId(id, false);
    else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  /* ---------- 章节激活观察 ---------- */
  function observeSections() {
    var links = $all("#side-nav a");
    var map = {};
    links.forEach(function (a) { map[a.dataset.target] = a; });

    var sections = $all("section[id]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.id;
        if (en.isIntersecting) {
          links.forEach(function (a) {
            a.classList.remove("active");
            a.removeAttribute("aria-current");
          });
          if (map[id]) {
            map[id].classList.add("active");
            map[id].setAttribute("aria-current", "location");
            if (window.matchMedia("(max-width: 768px)").matches) {
              map[id].scrollIntoView({ block: "nearest", inline: "center", behavior: reduced ? "auto" : "smooth" });
            }
          }
          if (registry[id]) {
            /* 场景脚本登记的是 start/pause（不是 activate/deactivate）；
             * 这里两种都认，否则章节进入时场景不会启动。 */
            if (typeof registry[id].activate === "function") registry[id].activate();
            if (typeof registry[id].start === "function") registry[id].start();
          }
        } else {
          if (registry[id]) {
            if (typeof registry[id].deactivate === "function") registry[id].deactivate();
            if (typeof registry[id].pause === "function") registry[id].pause();
          }
        }
      });
    }, { threshold: 0.015 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- 揭示动画 ---------- */
  function observeReveal() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.01 });
    $all(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ---------- 场景生命周期：进入视口启动，离开暂停 ---------- */
  function observeScenes() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var api = registry[en.target.id];
        if (!api) return;
        if (en.isIntersecting) {
          if (!api._started) { api._started = true; if (typeof api.start === "function") api.start(); }
          else if (typeof api.resume === "function") api.resume();
        } else if (typeof api.pause === "function") {
          api.pause();
        }
      });
    }, { threshold: 0.08 });
    Object.keys(registry).forEach(function (id) {
      if (registry[id] && registry[id]._io) return;   /* 已由 attachScene 接管 */
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- 顶部按钮 ---------- */
  function bindButtons() {
    $all("[data-goto]").forEach(function (b) {
      b.addEventListener("click", function () { scrollToId(b.dataset.goto); });
    });
  }

  /* ---------- 自动导览：用四层历史逻辑串联现有章节 ---------- */
  var tourStops = [
    { id: "mapstory", act: "第一层 · 生产条件", title: "先看生产方式怎样重组劳动", text: "机器大工业把分散劳动者置于共同的生产过程，也重排时间、空间与生计。先从劳动条件的变化读出冲突，再看冲突如何走向集体行动。", duration: 22710 },
    { id: "classroom", act: "第一层 · 生产条件", title: "共同处境如何成为社会关系", text: "里昂织工的行动呈现生计冲突如何走向集体行动。共同处境提供联合条件，却不会自动带来一致的意识与行动。", duration: 17270 },
    { id: "relic", act: "第二层 · 理论自觉", title: "理论从现实矛盾中形成", text: "把宣言、手稿与不同版本放在一起读：理论不是凭空降临的答案，而是对时代经验的概括、争论与再表达。", duration: 18600 },
    { id: "network", act: "第二层 · 理论自觉", title: "从共同处境走向共同认识", text: "阶级关系先存在于现实生产关系中。传播、组织与共同斗争使分散经验可以被辨认和讨论，阶级意识在这一过程中形成。", duration: 19470 },
    { id: "press", act: "第二层 · 理论自觉", title: "思想沿着媒介跨越地方", text: "沿原刊、卷期与译本观察思想如何流动。每一次传播都进入新的城市与语境；报刊是历史行动的一部分，也留下可追索的痕迹。", duration: 21200 },
    { id: "commune", act: "第三层 · 组织实践", title: "理论进入组织与制度试验", text: "巴黎公社不是理论自动兑现的结局。按日期观察制度主张、城市行动与战争压力如何相遇，理解集体实践怎样把思想变为现实力量。", duration: 19940 },
    { id: "heat", act: "第三层 · 组织实践", title: "受挫与失败也进入历史", text: "罢工与运动的空间分布显示行动并非直线推进。组织条件、政治压力和地方差异共同影响结果；经验也会反过来修正认识与策略。", duration: 21230 },
    { id: "artifacts", act: "第四层 · 认识方法", title: "用证据等级读懂数字复原", text: "先看材料来源，再看模型形态。原件、图像依据与推断性复原不是同一种证据；E4 模型是帮助理解的解释工具，不是历史实物。", evidence: "E1—E4 · 来源与复原", duration: 22300 },
    { id: "monument", act: "第四层 · 认识方法", title: "让历史问题保持开放", text: "终章不替观众封存结论。地图、文献、关系与复原各有边界；回到现实实践，历史认识仍可被检验、补充和继续编织。", duration: 24190 }
  ];
  function scrollTourStop(id) {
    var target = id === "artifacts" ? "artifact-view" : id === "monument" ? "monument-stage" : id;
    scrollToId(id, true, target);
  }
  var tour = { index: 0, active: false, automatic: false, timer: 0, bar: null, trigger: null };

  function renderTour() {
    if (!tour.bar) {
      tour.bar = document.createElement("aside");
      tour.bar.className = "guided-tour";
      tour.bar.setAttribute("aria-label", "四层历史逻辑自动导览");
      tour.bar.setAttribute("aria-live", "polite");
      tour.bar.hidden = true;
      tour.bar.innerHTML = '<div class="guided-tour-thread" aria-hidden="true"><span></span></div><div class="guided-tour-copy"><span class="guided-tour-count"></span><span class="guided-tour-act"></span><strong class="guided-tour-title"></strong><p class="guided-tour-text"></p><span class="guided-tour-evidence" hidden></span></div><div class="guided-tour-actions"><button type="button" data-tour-toggle>暂停自动</button><button type="button" data-tour-prev>上一段</button><button type="button" class="guided-tour-next" data-tour-next>下一段</button><button type="button" class="guided-tour-exit" data-tour-exit>结束</button></div>';
      document.body.appendChild(tour.bar);
      tour.bar.addEventListener("click", function (event) {
        var action = event.target.closest("[data-tour-prev], [data-tour-next], [data-tour-toggle], [data-tour-exit]");
        if (!action) return;
        if (action.hasAttribute("data-tour-prev")) moveTour(-1);
        else if (action.hasAttribute("data-tour-next")) moveTour(1);
        else if (action.hasAttribute("data-tour-toggle")) toggleTourPlayback();
        else endTour();
      });
    }
    var stop = tourStops[tour.index];
    tour.bar.querySelector(".guided-tour-count").textContent = "自动导览 · " + String(tour.index + 1).padStart(2, "0") + " / " + String(tourStops.length).padStart(2, "0");
    tour.bar.querySelector(".guided-tour-act").textContent = stop.act;
    tour.bar.querySelector(".guided-tour-title").textContent = stop.title;
    tour.bar.querySelector(".guided-tour-text").textContent = stop.text;
    var evidence = tour.bar.querySelector(".guided-tour-evidence");
    evidence.textContent = stop.evidence || "";
    evidence.hidden = !stop.evidence;
    var prev = tour.bar.querySelector("[data-tour-prev]");
    var next = tour.bar.querySelector("[data-tour-next]");
    var toggle = tour.bar.querySelector("[data-tour-toggle]");
    prev.disabled = tour.index === 0;
    next.textContent = tour.index === tourStops.length - 1 ? "完成" : "下一段";
    toggle.textContent = tour.automatic ? "暂停自动" : "继续自动";
    tour.bar.dataset.playing = tour.automatic ? "true" : "false";
    tour.bar.style.setProperty("--tour-progress", ((tour.index + 1) / tourStops.length * 100) + "%");
  }

  function scheduleTour() {
    window.clearTimeout(tour.timer);
    if (!tour.active || !tour.automatic) return;
    var duration = tourStops[tour.index].duration || 17000;
    tour.bar.style.setProperty("--tour-duration", duration + "ms");
    tour.bar.classList.remove("is-weaving");
    void tour.bar.offsetWidth;
    tour.bar.classList.add("is-weaving");
    tour.timer = window.setTimeout(function () { moveTour(1); }, duration);
  }

  function toggleTourPlayback() {
    tour.automatic = !tour.automatic;
    renderTour();
    if (tour.automatic) scheduleTour();
    else window.clearTimeout(tour.timer);
  }

  function startTour() {
    tour.trigger = document.activeElement;
    tour.index = 0;
    tour.active = true;
    tour.automatic = true;
    renderTour();
    tour.bar.hidden = false;
    scrollTourStop(tourStops[0].id);
    tour.bar.querySelector("[data-tour-next]").focus({ preventScroll: true });
    scheduleTour();
  }

  function moveTour(delta) {
    var nextIndex = tour.index + delta;
    if (nextIndex < 0) return;
    if (nextIndex >= tourStops.length) { endTour(); return; }
    tour.index = nextIndex;
    renderTour();
    scrollTourStop(tourStops[tour.index].id);
    if (tour.automatic) scheduleTour();
  }

  function endTour() {
    tour.active = false;
    tour.automatic = false;
    window.clearTimeout(tour.timer);
    if (tour.bar) tour.bar.hidden = true;
    var heading = document.querySelector("#" + tourStops[tour.index].id + " .chapter-head h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    else if (tour.trigger && typeof tour.trigger.focus === "function") tour.trigger.focus({ preventScroll: true });
  }

  /* 用户自己滚动/操作时，自动导览自动暂停，避免把页面拽回前面的卷 */
  function bindTourInterrupt() {
    function pauseByUser(e) {
      if (!tour.active || !tour.automatic) return;
      if (e && e.target && e.target.closest && e.target.closest(".guided-tour")) return;
      tour.automatic = false;
      window.clearTimeout(tour.timer);
      renderTour();
    }
    ["wheel", "touchmove"].forEach(function (ev) {
      window.addEventListener(ev, pauseByUser, { passive: true });
    });
    document.addEventListener("keydown", function (e) {
      if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].indexOf(e.key) >= 0) pauseByUser(e);
    });
    /* 点章节导航或任何 data-goto 也算用户接管 */
    document.addEventListener("click", function (e) {
      if (e.target.closest("#side-nav a, [data-goto], a[href^='#']")) pauseByUser(e);
    });
    window.__tourInterrupt = true;
  }

  function bindTour() {
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-tour-start]")) startTour();
    });

    /* ?tour=1 —— 三入口页直接拉起导览，不必再让用户找按钮 */
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get("tour") === "1") {
        window.addEventListener("load", function () {
          setTimeout(function () { if (typeof startTour === "function") startTour(); }, 600);
        }, { once: true });
      }
    } catch (e) {}
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderTotems();
    renderNav();
    renderChapterQuestions();
    bindButtons();
    bindTour();
    bindTourInterrupt();
    observeReveal();
    observeSections();
    /* 场景脚本已在头部同步加载，注册完成后再观察 */
    setTimeout(observeScenes, 60);
  });
})();
