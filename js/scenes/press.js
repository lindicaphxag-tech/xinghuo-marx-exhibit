/* press.js — 卷四：报刊时间胶卷 + 数字原刊入口 */
(function () {
  "use strict";
  var HS = window.HS;
  var D = window.HS_DATA.press || [];
  var strip = document.getElementById("press-strip");
  var detail = document.getElementById("press-detail");
  if (!strip || !detail) return;

  var active = Math.max(0, D.findIndex(function (p) { return p.id === "xinqingnian"; }));
  var carousel = null;
  var media = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reader = document.getElementById("press-reader");
  var readerTitle = reader && reader.querySelector("[data-reader-title]");
  var readerFallback = reader && reader.querySelector("[data-reader-fallback]");
  var readerStatus = reader && reader.querySelector("[data-reader-status]");
  var readerModulePromise = null, readerModule = null;
  /* This file is a classic script. Resolve the reader relative to its own URL,
     not the document root, or import() requests /press-reader.js and 404s. */
  var pressScript = document.querySelector('script[src*="js/scenes/press.js"]');
  var readerModuleUrl = pressScript
    ? new URL("./press-reader.js", pressScript.src).href
    : new URL("js/scenes/press-reader.js", document.baseURI).href;
  if (reader) reader.addEventListener("click", function (ev) {
    if (ev.target === reader || ev.target.closest("[data-reader-close]")) reader.close();
  });
  if (reader) reader.addEventListener("close", function () { if (readerModule) readerModule.close(); });

  function setActive(index, reveal) {
    active = index;
    Array.prototype.forEach.call(strip.querySelectorAll(".press-card"), function (card, i) {
      var chosen = i === index;
      card.classList.toggle("active", chosen);
      card.setAttribute("aria-pressed", chosen ? "true" : "false");
    });
    /* 切刊时保住视口：替换内容会重排页面，这里在下一帧与稍后再校正一次 */
    var keep = window.pageYOffset;
    renderDetail(reveal);
    requestAnimationFrame(function () { window.scrollTo({ top: keep, behavior: "auto" }); });
    setTimeout(function () {
      if (Math.abs(window.pageYOffset - keep) > 40) window.scrollTo({ top: keep, behavior: "auto" });
    }, 140);
  }

  function renderStrip() {
    strip.innerHTML = "";
    strip.setAttribute("aria-label", "报刊档案目录");
    D.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (p) {
      var i = D.indexOf(p);
      var card = document.createElement("button");
      card.type = "button";
      card.className = "press-card";
      card.setAttribute("aria-pressed", "false");
      card.innerHTML =
        '<div class="press-card-top"><span class="yr">' + p.year + "</span><span class=\"press-card-count\">" + (p.localArchiveIndex ? "65 个本地全文期次" : p.issues ? p.issues.length + " 个已核验期号" : "刊物档案") + "</span></div>" +
        "<h3>" + p.name + "</h3>" +
        '<div class="place">' + p.place + "</div>" +
        '<div class="kind">' + p.kind + "</div>" +
        '<p class="summary">' + p.summary + "</p>";
      card.addEventListener("click", function () { setActive(i, true); });
      strip.appendChild(card);
    });
  }

  /* 编者批注：按刊物 id + 期号/日期取 */
  var NOTES = (window.HS_DATA && window.HS_DATA.pressNotes) || {};
  function notesFor(paperId, key) {
    var bag = NOTES[paperId];
    return bag && bag[key] ? bag[key] : null;
  }
  function renderNotes(paperId, key) {
    var notes = notesFor(paperId, key);
    if (!notes || !notes.length) return "";
    return '<div class="press-notes"><p class="press-notes-head">编者批注 · ' + notes.length + " 条</p>" +
      notes.map(function (n) {
        return '<div class="press-note kind-' + (n.kind === "对照" ? "cmp" : n.kind === "存疑" ? "doubt" : "clue") + '">' +
          '<span class="press-note-kind">' + n.kind + "</span>" +
          '<span class="press-note-text">' + n.text + "</span></div>";
      }).join("") + "</div>";
  }
  function hasNotes(paperId, key) { return !!notesFor(paperId, key); }

  function renderResources(p) {
    if (!p.resources || !p.resources.length) return "";
    return '<div class="press-resources"><p class="press-resources-head">可核验的数字化入口 · ' + p.resources.length + " 处</p>" +
      p.resources.map(function (r) {
        return '<a href="' + r.url + '" target="_blank" rel="noopener noreferrer"><b>' + r.label +
          "</b><span>" + r.note + "</span></a>";
      }).join("") + "</div>";
  }

  function renderIssueRail(p) {
    var issues = p.issues || [];
    if (!issues.length) {
      return '<div class="press-reel-empty"><span class="press-reel-overline">ISSUE RECORD</span><p>本页暂不逐期列出该刊期号；下面给出可直接核对的馆藏与数字化入口。</p>' + renderResources(p) + '</div>';
    }
    return '' +
      '<section class="press-reel" aria-label="' + p.name + ' 时光胶卷">' +
        '<div class="press-reel-heading"><div><span class="press-reel-overline">DIGITAL PERIODICAL ARCHIVE</span><h4>历史报刊 · 时光胶卷</h4><p>按原刊日期排列的代表性期号 · 拖动探索，点击选中，再打开扫描原件</p></div>' +
          '<div class="press-reel-controls"><button type="button" data-reel-prev aria-label="上一条已收录期号">←</button><span data-reel-count aria-live="polite"></span><button type="button" data-reel-next aria-label="下一条已收录期号">→</button></div>' +
        '</div>' +
        '<div class="press-film-frame"><div class="press-film-holes" aria-hidden="true"></div>' +
          '<div class="press-reel-viewport embla__viewport" data-reel-viewport><div class="press-reel-track embla__container">' +
            issues.map(function (issue, i) {
              var cover = issue.thumb ? '<img class="press-issue-thumb" src="' + issue.thumb + '" alt="' + p.name + " " + issue.volume + ' 原刊扫描首页" loading="lazy" referrerpolicy="no-referrer">' : '<span class="press-cover-missing">此期暂无可核验扫描<br>保留真实目录记录</span>';
              return '<div class="press-reel-slide embla__slide"><button type="button" class="press-issue-card" data-issue-index="' + i + '" aria-pressed="false">' +
                '<span class="press-issue-date">' + issue.date + '</span>' +
                '<span class="press-issue-cover" data-label="' + issue.volume + ' · 封面需联网载入">' + cover + '<span class="press-scan-stamp">' + (issue.thumb ? "数字原件 · 首页" : "扫描缺期") + '</span>' + (hasNotes(p.id, issue.volume || issue.date) ? '<span class="press-note-dot" title="本期有编者批注">批注</span>' : '') + '</span>' +
                '<span class="press-issue-meta"><strong>' + issue.volume + '</strong><span>' + issue.title + '</span></span>' +
              '</button></div>';
            }).join("") +
          '</div></div><div class="press-film-holes bottom" aria-hidden="true"></div></div>' +
        '<div class="press-issue-detail" data-issue-detail aria-live="polite"></div>' +
        '<p class="press-reel-footnote">胶卷只展示有出处的代表期号，不代表整刊全期收录；空缺年份和期号不会按动画节奏补造。数字原件托管在外部馆藏，阅读扫描需要联网；若馆内阅读器受网络限制，可打开原刊 PDF 或目录转录。</p>' +
      '</section>';
  }

  function updateIssue(p, index) {
    var issues = p.issues || [];
    var issue = issues[index];
    if (!issue) return;
    var cards = detail.querySelectorAll(".press-issue-card");
    Array.prototype.forEach.call(cards, function (card, i) {
      card.classList.toggle("is-selected", i === index);
      card.setAttribute("aria-pressed", i === index ? "true" : "false");
    });
    var count = detail.querySelector("[data-reel-count]");
    if (count) count.textContent = String(index + 1).padStart(2, "0") + " / " + String(issues.length).padStart(2, "0");
    /* 广播当前期号：供时空穿梭把年份同步给地图与关系图 */
    try {
      var yr = String(issue.date || "").match(/\d{4}/);
      window.HS = window.HS || {};
      window.HS.currentIssue = { paper: p.name, date: issue.date, title: issue.title, year: yr ? Number(yr[0]) : null };
      if (typeof window.HS.emit === "function") {
        window.HS.emit("press:issue", window.HS.currentIssue);
      }
    } catch (e) {}

    var summary = detail.querySelector("[data-issue-detail]");
    if (!summary) return;
    summary.innerHTML =
      '<div class="press-issue-copy"><span class="press-issue-kicker">' + issue.date + " · " + issue.volume + "</span><h5>" + issue.title + "</h5><p>" + issue.note + "</p>" +
      renderNotes(p.id, issue.volume) +
      '<div class="press-highlight-list">' + issue.highlights.map(function (h) { return "<span>" + h + "</span>"; }).join("") + "</div></div>" +
      '<div class="press-issue-actions">' +
        (issue.pdf ? '<button class="press-primary-link" type="button" data-open-pdf="' + issue.pdf + '" data-issue-title="' + issue.title + '">在展馆内阅览原刊</button>' : '') +
        (issue.pdf ? '<a class="press-primary-link" href="' + issue.pdf + '" target="_blank" rel="noopener noreferrer">打开这一期原刊扫描 PDF ↗</a>' : '<span class="press-primary-link disabled" aria-disabled="true">本期暂无扫描 PDF</span>') +
        (issue.scan ? '<a class="press-secondary-link" href="' + issue.scan + '" target="_blank" rel="noopener noreferrer">核对扫描来源与许可 ↗</a>' : '<span class="press-missing-note">此期有目录转录，未找到可核验扫描</span>') +
        '<a class="press-secondary-link" href="' + issue.text + '" target="_blank" rel="noopener noreferrer">浏览逐期目录与转录文本 ↗</a>' +
      '</div>';
    var readButton = summary.querySelector("[data-open-pdf]");
    if (readButton) readButton.addEventListener("click", function () {
      if (!reader) { window.open(issue.pdf, "_blank", "noopener"); return; }
      readerTitle.textContent = issue.title + " · " + issue.date + " · " + issue.volume;
      readerFallback.href = issue.pdf;
      readerStatus.hidden = false;
      readerStatus.textContent = "正在读取原刊扫描…";
      reader.showModal();
      if (!readerModulePromise) readerModulePromise = import(readerModuleUrl).then(function (module) { readerModule = module; return module; });
      readerModulePromise.then(function (module) { if (reader.open) module.open(issue.pdf); }).catch(function () {
        readerStatus.hidden = false;
        readerStatus.textContent = "馆内阅读器未能加载原件。可点击“新窗口打开原件”继续阅读。";
      });
    });
    if (window.gsap && !(media && media.matches)) {
      window.gsap.fromTo(summary, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out", overwrite: true });
    }
  }

  function mountIssueRail(p) {
    if (carousel) { carousel.destroy(); carousel = null; }
    var viewport = detail.querySelector("[data-reel-viewport]");
    if (!viewport || !window.EmblaCarousel) return;
    var issues = p.issues || [];
    var options = { align: "center", containScroll: false, loop: false, duration: 28, dragFree: false, skipSnaps: false };
    /* 封面拉不到时用文字占位 */
    Array.prototype.forEach.call(viewport.querySelectorAll(".press-issue-thumb"), function (img) {
      img.addEventListener("error", function () {
        img.style.display = "none";
        if (img.parentNode) img.parentNode.classList.add("cover-missing");
      });
      if (img.complete && img.naturalWidth === 0) {
        img.style.display = "none";
        if (img.parentNode) img.parentNode.classList.add("cover-missing");
      }
    });
    carousel = window.EmblaCarousel(viewport, options);
    carousel.on("select", function () { updateIssue(p, carousel.selectedScrollSnap()); });
    carousel.on("init", function () { updateIssue(p, carousel.selectedScrollSnap()); });
    var prev = detail.querySelector("[data-reel-prev]");
    var next = detail.querySelector("[data-reel-next]");
    if (prev) prev.addEventListener("click", function () { carousel.scrollPrev(); });
    if (next) next.addEventListener("click", function () { carousel.scrollNext(); });
    Array.prototype.forEach.call(detail.querySelectorAll(".press-issue-card"), function (card, index) {
      card.addEventListener("click", function () { carousel.scrollTo(index); });
    });
    Array.prototype.forEach.call(detail.querySelectorAll(".press-issue-thumb"), function (img) {
      img.addEventListener("error", function () {
        var fallback = document.createElement("span");
        fallback.className = "press-cover-missing";
        fallback.innerHTML = "扫描缩略图暂不可用<br>可直接打开原刊 PDF";
        img.replaceWith(fallback);
      }, { once: true });
    });
    updateIssue(p, carousel.selectedScrollSnap());
    if (issues.length < 2) {
      if (prev) prev.disabled = true;
      if (next) next.disabled = true;
    }
  }

  function renderDetail(reveal) {
    var p = D[active];
    if (!p) return;
    /* 内容整块替换会让浏览器丢失滚动锚点，切刊时页面会跳到文末；这里手动补偿 */
    var keepY = window.pageYOffset;
    if (p.localArchiveIndex) {
      detail.innerHTML = '<div class="press-profile bee-hive-profile"><h3>' + p.name + " · " + p.place + " · 1862 / 1872" + "</h3>" +
        '<p class="press-evidence">英国图书馆数字化文本 · 本地离线检索 · 65 个日期期次 · 4,780 篇 OCR 条目</p>' +
        '<p class="press-profile-summary">' + p.summary + '</p>' +
        '<div class="bee-hive-columns">' + p.columns.map(function (col) { return '<div class="col-block"><div class="cname">' + col.name + '</div><div class="crole">' + col.role + '</div></div>'; }).join("") + '</div>' +
        '<div class="bee-hive-browser" data-bee-hive-browser aria-live="polite"><p>正在载入本地报刊目录…</p></div>' +
        renderResources(p) +
        '<p class="bee-hive-credit">原始数据：British Library, <em>The Bee-Hive</em>, DOI <a href="https://doi.org/10.23636/dth2-z430" target="_blank" rel="noopener noreferrer">10.23636/dth2-z430 ↗</a> · CC0 1.0。OCR 需与原刊影像交叉核对。</p></div>';
      loadBeeHive(detail.querySelector("[data-bee-hive-browser]"), p.localArchiveIndex);
      if (reveal && window.gsap && !(media && media.matches)) {
        window.gsap.fromTo(detail, { opacity: 0.45, y: 8 }, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out", overwrite: true });
      }
      return;
    }
    var html = '<div class="press-profile"><h3>' + p.name + " · " + p.place + " · " + p.year + "</h3>" +
      '<p class="press-evidence">' + (p.issues && p.issues.length ? "胶卷显示具有可核验扫描的代表性期号；卡片封面取自该期数字扫描首页。缺少扫描的期号会保留目录信息并明确标出。" : "此刊尚未整理成馆内逐期胶卷；下方提供可核验的外部馆藏或开放数据入口，并标明它是否含原刊影像。") + '</p>' +
      '<p class="press-profile-summary">' + p.summary + '</p>' +
      (p.archive_url ? '<aside class="press-archive-link"><strong>' + p.archive_label + '</strong><p>' + p.archive_status + '</p><a href="' + p.archive_url + '" target="_blank" rel="noopener noreferrer">打开外部原刊馆藏 / 数据 ↗</a>' + (p.archive_source ? ' · <a href="' + p.archive_source + '" target="_blank" rel="noopener noreferrer">浏览相关文章转录 ↗</a>' : '') + '</aside>' : '') +
      (p.scan ? '<figure class="press-scan"><a href="' + p.scan + '" target="_blank" rel="noopener"><img src="' + p.scan + '" alt="' + p.name + '实物扫描，点击打开原图"></a><figcaption>' + p.scanCaption + ' · <a href="' + p.scanSource + '" target="_blank" rel="noopener">核对来源与许可</a></figcaption></figure>' : '') +
      p.columns.map(function (col) { return '<div class="col-block"><div class="cname">' + col.name + '</div><div class="crole">' + col.role + '</div></div>'; }).join("") +
    '</div>' + renderIssueRail(p);
    detail.innerHTML = html;
    if (reveal && window.gsap && !(media && media.matches)) {
      window.gsap.fromTo(detail, { opacity: 0.45, y: 8 }, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out", overwrite: true });
    }
    mountIssueRail(p);
    if (Math.abs(window.pageYOffset - keepY) > 4) window.scrollTo({ top: keepY, behavior: "auto" });
  }

  function loadBeeHive(root, indexUrl) {
    if (!root) return;
    fetch(indexUrl).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (index) {
      renderBeeHive(root, index, indexUrl);
    }).catch(function () {
      root.innerHTML = '<p class="bee-hive-error">本地全文索引暂不可用。请通过展馆 HTTP 服务打开页面，并检查 assets/documents/bee-hive/index.json。原始资料包可从 <a href="assets/documents/the-bee-hive-1862-plaintext.zip">1862 全文包</a>、<a href="assets/documents/the-bee-hive-1872-plaintext.zip">1872 全文包</a>下载。</p>';
    });
  }

  function renderBeeHive(root, index, indexUrl) {
    var selectedYear = 1862;
    var chosen = null;
    root.innerHTML = '<div class="bee-hive-controls"><label>年份 <select data-bee-year><option value="1862">1862</option><option value="1872">1872</option></select></label><label class="bee-hive-search-label">本期全文检索 <input type="search" data-bee-search placeholder="输入词语，筛查当前期文章"></label><span data-bee-status role="status">先选择一期 · ' + index.issues.length + ' 个日期期次</span></div>' +
      '<div class="bee-hive-workspace"><nav class="bee-hive-issue-list" aria-label="《蜂房报》日期期次"></nav><section class="bee-hive-article-view"><p class="bee-hive-empty">从左侧选择一期。展开文章标题可阅读 OCR 全文。</p></section></div>' +
      '<div class="bee-hive-downloads"><a href="assets/documents/the-bee-hive-1862-plaintext.zip" download>下载 1862 全文数据包</a><a href="assets/documents/the-bee-hive-1872-plaintext.zip" download>下载 1872 全文数据包</a><a href="assets/documents/README.md" target="_blank" rel="noopener noreferrer">资料范围与许可</a></div>';
    var yearSelect = root.querySelector("[data-bee-year]");
    var search = root.querySelector("[data-bee-search]");
    var status = root.querySelector("[data-bee-status]");
    var issueList = root.querySelector(".bee-hive-issue-list");
    var articleView = root.querySelector(".bee-hive-article-view");

    function showIssue(record, button) {
      chosen = record;
      Array.prototype.forEach.call(issueList.querySelectorAll("button"), function (node) {
        var activeIssue = node === button;
        node.classList.toggle("is-active", activeIssue);
        node.setAttribute("aria-current", activeIssue ? "date" : "false");
      });
      status.textContent = "正在读取 " + record.date + " · " + record.articleCount + " 篇";
      articleView.innerHTML = '<p class="bee-hive-empty">正在载入本期 OCR 全文…</p>';
      fetch(indexUrl.replace(/index\.json(?:\?.*)?$/, record.file)).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      }).then(function (issue) {
        if (chosen !== record) return;
        var heading = document.createElement("div");
        heading.className = "bee-hive-issue-heading";
        var h = document.createElement("h4"); h.textContent = "The Bee-Hive · " + issue.date;
        var meta = document.createElement("p"); meta.textContent = issue.articles.length + " 篇文章/栏目 · 英国图书馆 OCR 转录";
        heading.append(h, meta);
        var bnee = renderNotes("bee-hive", issue.date);
        if (bnee) heading.insertAdjacentHTML("beforeend", bnee);
        var list = document.createElement("div"); list.className = "bee-hive-articles";
        issue.articles.forEach(function (article) {
          var details = document.createElement("details"); details.className = "bee-hive-article";
          var summary = document.createElement("summary"); summary.textContent = article.title || (article.type + " " + article.id);
          var data = document.createElement("small"); data.textContent = article.type + " · " + article.wordCount.toLocaleString("en") + " words · OCR confidence " + Math.round(article.ocrQuality * 100) + "%";
          var pre = document.createElement("pre"); pre.textContent = article.text;
          details.append(summary, data, pre); list.appendChild(details);
        });
        articleView.replaceChildren(heading, list);
        status.textContent = issue.date + " · " + issue.articles.length + " 篇 · 搜索仅筛选本期";
        filterArticles();
      }).catch(function () {
        if (chosen === record) articleView.innerHTML = '<p class="bee-hive-error">本期全文加载失败。可检查展馆服务是否正常，或下载原始 ZIP 包离线查看。</p>';
      });
    }

    function filterArticles() {
      var query = (search.value || "").trim().toLocaleLowerCase();
      var visible = 0;
      Array.prototype.forEach.call(articleView.querySelectorAll(".bee-hive-article"), function (row) {
        var match = !query || row.textContent.toLocaleLowerCase().indexOf(query) !== -1;
        row.hidden = !match;
        if (match) visible += 1;
      });
      if (chosen && articleView.querySelector(".bee-hive-article")) status.textContent = chosen.date + " · 显示 " + visible + " / " + chosen.articleCount + " 篇";
    }

    function renderIssueList() {
      selectedYear = Number(yearSelect.value);
      issueList.replaceChildren();
      index.issues.filter(function (record) { return record.year === selectedYear; }).forEach(function (record) {
        var button = document.createElement("button"); button.type = "button"; button.className = "bee-hive-issue-choice";
        button.textContent = record.date + " · " + record.articleCount + " 篇";
        button.addEventListener("click", function () { showIssue(record, button); });
        issueList.appendChild(button);
      });
      chosen = null;
      search.value = "";
      articleView.innerHTML = '<p class="bee-hive-empty">已列出 ' + issueList.children.length + ' 期。选择日期后，文章全文在此处逐条展开。</p>';
      status.textContent = selectedYear + " 年 · " + issueList.children.length + " 个日期期次";
    }
    yearSelect.addEventListener("change", renderIssueList);
    search.addEventListener("input", filterArticles);
    renderIssueList();
    var first = issueList.querySelector("button");
    if (first) first.click();
  }

  var rendered = false;
  function start() {
    /* 数据脚本可能晚于本脚本加载：没数据就稍后再试，有数据才真正渲染 */
    if (!D.length) { setTimeout(start, 300); return; }
    if (rendered) return;
    rendered = true;
    renderStrip();
    setActive(active, false);
  }

  /* 自启动：不依赖 IntersectionObserver（实测在长页面里会漏触发），
   * 改用「滚动 + 定时轮询」判断章节是否进入视口，且数据到位才渲染。 */
  var pressSection = document.getElementById("press");
  function inView() {
    if (!pressSection) return false;
    var r = pressSection.getBoundingClientRect();
    return r.top < (window.innerHeight || 800) && r.bottom > 0;
  }
  function tryStart() {
    if (rendered) return true;
    /* 数据脚本可能晚于本脚本执行，且可能是整体赋值（HS_DATA.press = [...]），
     * 所以每次都要重新取一次引用，而不是依赖模块初始化时抓到的那份。 */
    if (!D.length && window.HS_DATA && window.HS_DATA.press && window.HS_DATA.press.length) {
      D = window.HS_DATA.press;
      active = Math.max(0, D.findIndex(function (x) { return x.id === "xinqingnian"; }));
    }
    if (!D.length) return false;
    /* 不再等「进入视口」：7 张刊卡 + 6 张期号卡渲染成本很低，
     * 提前渲染反而避免了长页面里滚动事件/观察器漏触发的偶发空白。 */
    start();
    return true;
  }
  window.addEventListener("scroll", tryStart, { passive: true });
  window.addEventListener("resize", tryStart);
  if (document.readyState === "complete") tryStart();
  else window.addEventListener("load", tryStart);
  setInterval(function () { if (!rendered) tryStart(); }, 400);
  function pause() {}
  function resume() {}
  window.addEventListener("resize", function () { if (carousel) carousel.reInit(); });
  window.HS.registerScene("press", {
    start: start, pause: pause, resume: resume,
    /* 外部调用：按报刊名或年份定位到某一期 */
    gotoIssue: function (opts) {
      opts = opts || {};
      var idx = -1;
      if (opts.paper) {
        idx = D.findIndex(function (x) { return x.name === opts.paper; });
      }
      if (idx < 0 && opts.year) {
        idx = D.findIndex(function (x) { return String(x.year) === String(opts.year); });
      }
      if (idx < 0) return false;
      active = idx;
      renderDetail(true);
      if (typeof opts.issueIndex === "number" && carousel) {
        setTimeout(function () { try { carousel.scrollTo(opts.issueIndex); } catch (e) {} }, 60);
      }
      return true;
    },
    current: function () { return window.HS.currentIssue || null; }
  });
})();
