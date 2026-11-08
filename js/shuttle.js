/* shuttle.js —— 历史时空穿梭（状态联动 v1）
 * 一个事件 = { year, section, artifact, doc, scene }。
 * 点击事件后：滚到对应章节 → 更新地址栏 → 把 artifact/doc 通过深链参数带给对应模块，
 * 用户可随时「回到原处」。
 */
(function () {
  "use strict";

  var root = document.getElementById("shuttle");
  if (!root) return;

  var EVENTS = null;
  var backTo = null;          // 记住进入前的滚动位置
  var panel = null, listEl = null, isOpen = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildPanel() {
    panel = el("section", "shuttle-panel");
    panel.setAttribute("aria-label", "历史时空穿梭");
    panel.hidden = true;

    var head = el("header", "shuttle-head");
    head.appendChild(el("strong", null, "历史时空穿梭"));
    var close = el("button", "shuttle-close", "收起");
    close.type = "button";
    close.onclick = function () { toggle(false); };
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(el("p", "shuttle-hint", "选一个年份：会跳到对应章节，并带上那件展品与那份文献。"));

    listEl = el("div", "shuttle-list");
    panel.appendChild(listEl);
    root.appendChild(panel);
  }

  function renderList() {
    listEl.innerHTML = "";
    EVENTS.forEach(function (ev) {
      var b = el("button", "shuttle-item");
      b.type = "button";
      b.appendChild(el("span", "shuttle-year", String(ev.year)));
      var body = el("span", "shuttle-body");
      body.appendChild(el("strong", null, ev.title));
      body.appendChild(el("small", null, ev.place + " · " + (ev.artifact ? "含展品" : "含文献")));
      b.appendChild(body);
      b.onclick = function () { jump(ev); };
      listEl.appendChild(b);
    });
  }

  function toggle(open) {
    isOpen = open == null ? !isOpen : open;
    if (panel) {
      panel.hidden = !isOpen;
      panel.classList.toggle("open", isOpen);
    }
    var btn = root.querySelector(".shuttle-toggle");
    if (btn) btn.setAttribute("aria-expanded", String(isOpen));
  }

  function jump(ev) {
    if (backTo == null) backTo = window.scrollY;
    // 自己算位置：主站的 scrollToId 会把章节停在视口下方约 1000px 处（它按内部导航高度算偏移），
    // 这里按「章节顶部 - 顶栏高度」精确对齐。
    var target = document.getElementById(ev.section);
    if (target) {
      var align = function (smooth) {
        var top = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
      };
      align(true);
      /* 章节里的图片/画布是懒加载的，滚到一半时布局还在长高，
       * 所以平滑滚动结束后再校正两次，把它真正对齐到视口顶部。 */
      setTimeout(function () { align(false); }, 900);
      setTimeout(function () { align(false); }, 1900);
    }

    var url = new URL(window.location.href);
    url.searchParams.set("event", ev.id);
    url.searchParams.set("year", String(ev.year));
    if (ev.artifact) url.searchParams.set("artifact", ev.artifact);
    else url.searchParams.delete("artifact");
    if (ev.doc) url.searchParams.set("doc", ev.doc);
    else url.searchParams.delete("doc");
    url.hash = ev.section;
    window.history.replaceState(null, "", url.toString());

    syncMapYear(ev.year);
    syncNetwork(ev);
    showChip(ev);
    toggle(false);
  }

  /* 关系图联动：按事件年份筛选（滑块）+ 选中该事件相关的人物/组织 */
  function syncNetwork(ev) {
    var tries = 0;
    var timer = setInterval(function () {
      var net = window.HS && window.HS.scenes && window.HS.scenes.network;
      if (net && typeof net.setYear === "function") {
        clearInterval(timer);
        try {
          if (ev.year) net.setYear(ev.year);
          if (ev.nodes && ev.nodes.length && typeof net.selectById === "function") {
            for (var i = 0; i < ev.nodes.length; i++) {
              if (net.selectById(ev.nodes[i])) break;
            }
          }
        } catch (e) {}
        return;
      }
      if (++tries > 30) clearInterval(timer);
    }, 100);
  }

  /* 地图联动：地图模块可能还没注册，轮询等它出现后调 setYear */
  function syncMapYear(year) {
    if (!year) return;
    var tries = 0;
    var timer = setInterval(function () {
      var map = window.HS && window.HS.scenes && window.HS.scenes.mapstory;
      if (map && typeof map.setYear === "function") {
        clearInterval(timer);
        try { map.setYear(year); } catch (e) {}
        return;
      }
      if (++tries > 30) clearInterval(timer);
    }, 100);
  }

  function gotoArtifact(id) {
    var stage = document.getElementById("artifacts");
    if (stage) {
      var top = stage.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    /* 文物厅是懒初始化的：滚进视口后 IntersectionObserver 才会 boot，
     * 所以这里轮询等接口出现，再执行选中（最多等 3 秒）。 */
    var tries = 0;
    var timer = setInterval(function () {
      var api = window.HS && window.HS.artifacts;
      if (api) {
        clearInterval(timer);
        var ok = api.selectById(id);
        var u = new URL(window.location.href);
        if (ok) u.searchParams.set("artifact", id);
        u.hash = "artifacts";
        window.history.replaceState(null, "", u.toString());
        return;
      }
      if (++tries > 30) clearInterval(timer);
    }, 100);
  }

  function showChip(ev) {
    var chip = root.querySelector(".shuttle-chip");
    if (!chip) {
      chip = el("div", "shuttle-chip");
      root.appendChild(chip);
    }
    chip.innerHTML = "";
    chip.appendChild(el("span", "shuttle-chip-year", String(ev.year)));
    chip.appendChild(el("span", "shuttle-chip-title", ev.title));
    var back = el("button", "shuttle-back", "回到原处");
    back.type = "button";
    back.onclick = function () {
      if (backTo != null) window.scrollTo({ top: backTo, behavior: "smooth" });
      chip.remove();
      var u = new URL(window.location.href);
      ["event", "year", "artifact", "doc"].forEach(function (k) { u.searchParams.delete(k); });
      window.history.replaceState(null, "", u.toString());
    };
    var docLink = ev.reader_doc ? "reader.html?doc=" + encodeURIComponent(ev.reader_doc) : "";
    if (docLink) {
      var a = el("a", "shuttle-doc", "看这份文献");
      a.href = docLink;
      chip.appendChild(a);
    }
    if (ev.artifact) {
      /* 原位切换：不刷新页面，直接滚到文物厅并让 artifacts 模块选中该件 */
      var b = el("button", "shuttle-art", "看这件展品");
      b.type = "button";
      b.onclick = function () { gotoArtifact(ev.artifact); };
      chip.appendChild(b);
    }
    chip.appendChild(back);
    root.appendChild(chip);
  }

  /* 报刊胶卷滚到某期时，把年份广播给地图与关系图（双向联动的反向一路） */
  function bindPressBus() {
    if (!window.HS || typeof window.HS.on !== "function") {
      setTimeout(bindPressBus, 200);
      return;
    }
    window.HS.on("press:issue", function (issue) {
      if (!issue || !issue.year) return;
      syncMapYear(issue.year);
      (function syncNet() {
        var tries = 0;
        var timer = setInterval(function () {
          var net = window.HS && window.HS.scenes && window.HS.scenes.network;
          if (net && typeof net.setYear === "function") {
            clearInterval(timer);
            try { net.setYear(issue.year); } catch (e) {}
            return;
          }
          if (++tries > 20) clearInterval(timer);
        }, 100);
      })();
      var chip = root.querySelector(".shuttle-chip");
      if (chip && issue.paper) {
        var label = chip.querySelector(".shuttle-chip-title");
        if (label) label.textContent = issue.year + " · " + issue.paper;
      }
    });
  }

  function init() {
    buildPanel();
    bindPressBus();
    var btn = el("button", "shuttle-toggle");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.appendChild(el("span", "shuttle-toggle-year", "1871"));
    btn.appendChild(el("span", "shuttle-toggle-label", "时空穿梭"));
    btn.onclick = function () { toggle(); };
    root.appendChild(btn);

    fetch("assets/manifests/events.json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        EVENTS = d.events || [];
        renderList();
        // 从深链进来时，直接恢复那个事件
        var q = new URLSearchParams(window.location.search);
        var id = q.get("event");
        if (id) {
          var ev = EVENTS.filter(function (x) { return x.id === id; })[0];
          if (ev) showChip(ev);
        }
      })
      .catch(function () { /* 静默失败，不阻塞主页面 */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
