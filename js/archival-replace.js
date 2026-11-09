/* archival-replace.js —— 把「示意性」的两个模块换成真实档案
   1) 卷六：把时序剧场换成《七十二天 · 档案册》——每个日期配一件可核对的真实材料
   2) 卷九：把年代热力地图换成《蜂房报》真实统计——4,780 篇里挑出的 117 条劳资条目
   两份数据都在本地：assets/manifests/images.json 与 assets/documents/bee-hive/analysis.json */
(function () {
  "use strict";

  var IMG_PATH = "assets/manifests/images.json";
  var BH_PATH = "assets/documents/bee-hive/analysis.json";

  /* ---------------- 卷六：档案册 ---------------- */
  var DOSSIER = [
    { date: "03.18", title: "蒙马特高地的炮", img: "016_06_commune_barricades.jpg",
      text: "政府军试图拖走国民自卫军的大炮，被居民与士兵拦下，这一天通常被记为公社起义的起点。",
      note: "图为后世绘制的街垒场景，不是当天现场记录。" },
    { date: "03.26", title: "市政选举", img: "015_05_commune_elections_1871.jpg",
      text: "巴黎举行市政选举，选出公社委员会。投票在包围与战争压力下进行。",
      note: "这张是当时的选举公告原件，署「法兰西共和国·中央委员会」，可直接读到投票号召。" },
    { date: "03.28", title: "公社宣告成立", img: "017_07_vendome_column_1871.jpg",
      text: "公社在市政厅前宣告成立，随后颁布法令：废除常备军、政教分离、把逃亡业主的工厂交给工人协会。",
      note: "图为同一时期拆除旺多姆圆柱的照片，反映当时的政治动员，不是成立仪式。" },
    { date: "04", title: "法令与象征", img: "018_08_barricade_castiglione.jpg",
      text: "4 月，公社推进制度改革，同时应对军事压力；旺多姆圆柱被拆除，成为政治象征事件。",
      note: "街垒照片的拍摄地点为卡斯蒂廖内街，与具体法令无直接对应。" },
    { date: "05.21", title: "流血周开始", img: "019_09_barricade_devambez.jpg",
      text: "政府军从西南部进入巴黎，街垒战在城市西部与中部展开，逐区推进。",
      note: "德瓦姆贝兹的绘画为当时或稍后的再现。" },
    { date: "05.27–28", title: "最后一批街垒", img: "030_01_mur_des_federes_a.jpg",
      text: "贝尔维尔与拉雪兹神父公墓一带成为最后战场，5 月 28 日战斗结束。",
      note: "社员墙为 5 月末战斗后的纪念地，墙体现状与 1871 年并不相同。" },
    { date: "05.30", title: "马克思起草《法兰西内战》", img: "032_03_mur_des_federes_c.jpg",
      text: "公社失败后，马克思受国际工人协会总委员会委托起草宣言，总结这七十二天的制度尝试与失败原因。",
      note: "图为社员墙铭牌特写；文本写作时间的依据是总委员会会议记录与书信。" }
  ];

  function buildCommune(imgs) {
    var sec = document.getElementById("commune");
    if (!sec || sec.dataset.replaced) return;
    var stage = sec.querySelector(".commune-stage");
    if (!stage) return;

    var byName = {};
    (imgs || []).forEach(function (it) { byName[it.src.split("/").pop()] = it; });

    var cards = DOSSIER.map(function (d) {
      var it = byName[d.img] || {};
      var src = it.src || "";
      var isDoc = /公告|选举|文件|proclamation|election/i.test((d.title || "") + (it.title || ""));
      var title = it.title || d.title;
      var author = it.author || "编者整理";
      var lic = it.license || "";
      var page = it.page || "";
      return '' +
        '<figure class="dossier-card">' +
          '<div class="dossier-img' + (isDoc ? " doc" : "") + '"><img loading="lazy" src="' + src + '" alt="' + title + '"></div>' +
          '<figcaption>' +
            '<div class="dossier-date">' + d.date + '</div>' +
            '<h3>' + d.title + '</h3>' +
            '<p>' + d.text + '</p>' +
            '<p class="dossier-note">' + d.note + '</p>' +
            '<div class="dossier-src">' + author + (lic ? " · " + lic : "") +
              (page ? ' · <a href="' + page + '" target="_blank" rel="noopener noreferrer">原始页 ↗</a>' : "") +
            '</div>' +
          '</figcaption>' +
        '</figure>';
    }).join("");

    stage.innerHTML =
      '<div class="dossier-grid">' + cards + '</div>' +
      '<p class="dossier-foot">七件材料均来自开放馆藏，图像与文字各自标注了“能证明什么”。' +
      '日期取自公社史事年表；图像若为后世绘制或纪念设施，已在卡片内注明。</p>';

    /* 旧的时序场景停掉，避免在隐藏画布上空转 */
    var api = window.HS && window.HS.scenes && window.HS.scenes.commune;
    if (api && typeof api.pause === "function") { try { api.pause(); } catch (e) {} }
    sec.dataset.replaced = "1";
  }

  /* ---------------- 卷九：《蜂房报》真实统计 ---------------- */
  function buildBeeHive(bh) {
    var sec = document.getElementById("heat");
    if (!sec || sec.dataset.replaced) return;
    var stage = sec.querySelector(".heat-stage");
    if (!stage) return;

    var items = bh.labourItems || [];
    var byYear = {};
    items.forEach(function (it) {
      var y = (it.date || "").slice(0, 4);
      byYear[y] = (byYear[y] || 0) + 1;
    });
    var years = Object.keys(byYear).sort();
    var max = Math.max.apply(null, years.map(function (y) { return byYear[y]; })) || 1;

    var bars = years.map(function (y) {
      var pct = Math.round(byYear[y] / max * 100);
      return '<div class="bh-bar-row">' +
        '<span class="bh-year">' + y + '</span>' +
        '<span class="bh-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="bh-num">' + byYear[y] + ' 条</span></div>';
    }).join("");

    var rows = items.slice(0, 14).map(function (it) {
      return '<tr><td>' + it.date + '</td><td>' + it.title.replace(/\.$/, "") + '</td></tr>';
    }).join("");

    stage.innerHTML =
      '<div class="bh-wrap">' +
        '<div class="bh-chart">' +
          '<h3>按年份：劳资冲突条目</h3>' + bars +
          '<p class="bh-note">口径：对 ' + bh.articles + ' 篇 OCR 文本按标题关键词（strike、lock-out、wages、union 等）识别，' +
          '共 ' + bh.labourItemCount + ' 条。规则可复算，但有漏检——正文讨论罢工而标题未出现的不会被计入。</p>' +
        '</div>' +
        '<div class="bh-list">' +
          '<h3>可点开核对的原刊条目（前 14 条）</h3>' +
          '<table><thead><tr><th>日期</th><th>标题（OCR 原文）</th></tr></thead><tbody>' + rows + '</tbody></table>' +
          '<p class="bh-note">来源：The Bee-Hive, 1862 &amp; 1872 selections，British Library，CC0，DOI 10.23636/dth2-z430。' +
          'OCR 未校勘，逐句引用前请回查原刊。</p>' +
        '</div>' +
      '</div>';

    var api2 = window.HS && window.HS.scenes && window.HS.scenes.heat;
    if (api2 && typeof api2.pause === "function") { try { api2.pause(); } catch (e) {} }
    sec.dataset.replaced = "1";
  }

  /* ---------------- 样式 ---------------- */
  var css = document.createElement("style");
  css.textContent = [
    ".dossier-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:8px}",
    ".dossier-card{margin:0;background:#fbf8f0;border:1px solid rgba(120,85,47,.18);display:flex;flex-direction:column}",
    ".dossier-img{aspect-ratio:4/3;overflow:hidden;background:#0e0c0a}",
    ".dossier-img img{width:100%;height:100%;object-fit:cover;filter:grayscale(.2) brightness(.95);transition:filter .5s,transform .7s}",
    ".dossier-img.doc{background:#f4efe4}",
    ".dossier-img.doc img{object-fit:contain;filter:none}",
    ".dossier-card:hover .dossier-img img{filter:none;transform:scale(1.03)}",
    ".dossier-card figcaption{padding:14px 16px 16px}",
    ".dossier-date{font:600 12px/1 'PingFang SC',sans-serif;letter-spacing:.16em;color:#a8332c}",
    ".dossier-card h3{margin:8px 0 6px;font-size:19px;line-height:1.35;color:#241f1a}",
    ".dossier-card p{margin:0 0 8px;font-size:14.5px;line-height:1.72;color:#4a4238}",
    ".dossier-note{font-size:12.5px!important;color:#8a6a52!important;border-left:2px solid rgba(168,51,44,.35);padding-left:8px}",
    ".dossier-src{font-size:11.5px;color:#7c7364;border-top:1px solid rgba(120,85,47,.14);padding-top:8px}",
    ".dossier-foot{margin-top:18px;font-size:13px;color:#6d6357;line-height:1.7}",
    ".bh-wrap{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:28px;margin-top:8px}",
    "@media(max-width:980px){.bh-wrap{grid-template-columns:1fr}}",
    ".bh-chart h3,.bh-list h3{margin:0 0 14px;font-size:16px;color:#292820}",
    ".bh-bar-row{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:10px;margin-bottom:10px}",
    ".bh-year{font:600 13px/1 'PingFang SC',sans-serif;color:#5d5348}",
    ".bh-bar{height:12px;background:rgba(120,85,47,.12);border-radius:999px;overflow:hidden}",
    ".bh-bar i{display:block;height:100%;background:linear-gradient(90deg,#a8332c,#c98a5a);border-radius:999px}",
    ".bh-num{font:600 13px/1 'PingFang SC',sans-serif;color:#a8332c;text-align:right}",
    ".bh-note{margin-top:14px;font-size:12.5px;line-height:1.7;color:#6d6357}",
    ".bh-list table{width:100%;border-collapse:collapse;font-size:13.5px}",
    ".bh-list th{text-align:left;font-weight:600;color:#5d5348;border-bottom:1px solid rgba(120,85,47,.2);padding:6px 4px}",
    ".bh-list td{border-bottom:1px solid rgba(120,85,47,.1);padding:6px 4px;color:#3f382f;line-height:1.5}",
    ".bh-list td:first-child{white-space:nowrap;color:#8a6a52}",
    "#commune .commune-stage,#heat .heat-stage{display:block}"
  ].join("");
  document.head.appendChild(css);

  /* ---------------- 载入数据 ---------------- */
  function loadJSON(p) {
    return fetch(p).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  function init() {
    loadJSON(IMG_PATH).then(function (d) {
      buildCommune(d && d.items ? d.items : []);
    });
    loadJSON(BH_PATH).then(function (d) {
      if (d) buildBeeHive(d);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
