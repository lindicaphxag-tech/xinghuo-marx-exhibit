/* image-detail.js —— 打开单张图时生成较完整的解释面板
 * 依赖 window.__IMG_ALL（本页已加载的图像清单）与 window.__IMG_OPEN(i)
 * 说明文字按「地点 / 内容 / 时代 / 同类」四层组织，全部来自清单字段与馆内分组，
 * 不虚构单张图片独有的考据。
 */
(function () {
  "use strict";

  var GROUP_NOTE = {
    "形象与雕像": "记录的是后世纪念物：雕像、胸像、纪念地。看它说明了谁被纪念、在何处、什么姿态；它不是当事人的样子。",
    "文献与版本": "书影与初版本的价值在于版式、书名页、出版者与年代；正文内容需要另找全本核对。",
    "场景绘画": "后人对场面的再现，构图和人物都经过选择。它留下的是想象，不是现场。",
    "场地与旧址": "旧照与现状照片能确认地点，但建筑多经改建；判断年代要看照片里的街景、招牌与交通。",
    "工厂与罢工": "工厂内景与罢工现场是劳动条件最直接的视觉证据；拍摄者的立场会影响取景，需与文字材料对读。",
    "革命与组织": "组织文件、报刊与纪念物记录运动如何组织与传播；它们多由参与者或同情者保存，带有立场。",
    "馆藏艺术品": "馆藏艺术品的元数据最完整（作者、年代、材质、馆藏号），适合做图像细读与风格比较。",
    "三维模型": "依据单张照片推断的模型（E4）。形状完整，史实未必准确；看形制、比例和可见细节。",
    "开放模型": "开放许可模型多为主题性器物（机器、工具、建筑构件），可用于说明技术形态，与本馆主题为间接关系。"
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function pickRelated(all, it, n) {
    var out = [], seen = {};
    function push(x) { if (!x || x === it || seen[x.src]) return; seen[x.src] = 1; out.push(x); }
    all.forEach(function (x) { if (x.place && it.place && x.place === it.place) push(x); });
    all.forEach(function (x) { if (x.era && it.era && x.era === it.era) push(x); });
    all.forEach(function (x) { if (x.group && it.group && x.group === it.group) push(x); });
    return out.slice(0, n);
  }

  function build(it, all) {
    var group = it.group || "档案图像";
    var gnote = GROUP_NOTE[group] || "档案图像，来源与许可见下。";
    var rel = pickRelated(all, it, 4);

    var html = "";
    html += '<div class="det-head"><span class="det-place">' + esc(it.place || "地点未标注") + "</span>" +
            '<span class="det-era">' + esc(it.era || "时期未标注") + "</span></div>";
    html += "<h3>" + esc(it.title || "") + "</h3>";
    if (it.desc) html += '<p class="det-lead">' + esc(it.desc) + "</p>";

    html += '<div class="det-sec"><b>这是什么</b><p>' + esc(gnote) + "</p></div>";
    html += '<div class="det-sec"><b>看的时候注意</b><p>' +
      "先看主体（人、物、建筑、版面），再看拍摄角度与文字信息；" +
      "年代与地点以本页标注为准，画面中的细节（招牌、服饰、工具）可以与同期材料互证。" +
      "</p></div>";
    html += '<div class="det-sec"><b>边界</b><p>' +
      "本页给出的「地点 · 内容 · 时间」是编者标注，不是馆藏原始著录；" +
      "原始著录与授权以来源链接为准。" + "</p></div>";

    if (rel.length) {
      html += '<div class="det-rel"><b>同类对照</b><div class="det-thumbs">' +
        rel.map(function (x, k) {
          return '<button type="button" data-rel="' + k + '"><img src="' + esc(x.ring || x.src) +
            '" alt=""><span>' + esc((x.title || "").slice(0, 12)) + "</span></button>";
        }).join("") + "</div></div>";
    }

    html += '<div class="det-src">' +
      (it.author ? "<span>作者：" + esc(it.author) + "</span>" : "") +
      (it.license ? "<span>许可：" + esc(it.license) + "</span>" : "") +
      (it.page ? '<a href="' + esc(it.page) + '" target="_blank" rel="noopener noreferrer">核对原始页面 ↗</a>' : "") +
      "</div>";
    return { html: html, related: rel };
  }

  window.HSImageDetail = { build: build, esc: esc };
})();
