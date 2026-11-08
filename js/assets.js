(function () {
  "use strict";

  var DATA_URL = "assets/manifests/asset_catalog.json?v=quality-evidence11";

/* 统一说明：用 images.json 的「地点 · 内容 · 时间」覆盖目录卡片文案 */
var DESC_MAP = {};
function normKey(s) {
  s = String(s || "").split("/").pop().split("?")[0];
  s = s.replace(/^\d+_/, "").replace(/\.(jpg|jpeg|png|webp)$/i, "");
  return s.toLowerCase();
}
fetch("assets/manifests/images.json?v=e3").then(function (r) { return r.json(); }).then(function (d) {
  (d.items || []).forEach(function (it) {
    var k = normKey(it.src);
    if (k && !DESC_MAP[k]) DESC_MAP[k] = { title: it.title, desc: it.desc };
  });
  if (typeof render === "function") { try { render(); } catch (e) {} }
}).catch(function () {});

  var root = document.getElementById("catalog-results");
  var filters = document.getElementById("catalog-filters");
  var search = document.getElementById("catalog-search");
  var quality = document.getElementById("quality-filter");
  var count = document.getElementById("catalog-count");
  var empty = document.getElementById("catalog-empty");
  var items = [];
  var activeType = "all";

  var TYPE_NAMES = {
    all: "全部记录", image: "源图", model: "三维模型", document: "文献与档案图像",
    scene: "历史空间", interaction: "交互记录"
  };
  var QUALITY_NAMES = {
    ok: "可作体量展示", flat: "薄片样例", fail: "失败样例", concept: "空间概念模型",
    "measured-site-scan": "现存遗址/建筑扫描", "measured-current-surface": "当代 LiDAR 测量",
    "source-constrained-reconstruction": "史料约束复原", "evidence-limited-model": "证据有限推演"
  };
  var TYPE_ORDER = ["image", "model", "document", "scene", "scene_model", "interaction"];

  function category(item) {
    return item.type === "scene_model" ? "scene" : item.type;
  }

  function typeName(item) {
    if (item.type === "scene_model") return "空间结构模型";
    if (item.type === "scene") return "沉浸式场景";
    if (item.type === "interaction") return interactionName(item.interaction_type);
    return TYPE_NAMES[item.type] || "档案记录";
  }

  function interactionName(subtype) {
    var names = {
      "map-place": "地图节点", "story-chapter": "叙事地图", "network-node": "关系节点",
      "press-edition": "报刊条目", "class-comparison": "阶级对照", "commune-slice": "公社时序",
      "river-event": "时间线事件", "heat-period": "热力年代", "relic-section": "文献章节",
      "manuscript-layer": "手稿层", "wordcloud-era": "关键词年代"
    };
    return names[subtype] || "交互记录";
  }

  function sourceUrl(item) {
    if (item.source_url && /^https?:\/\//i.test(item.source_url)) return item.source_url;
    if (Array.isArray(item.source)) {
      var link = item.source.find(function (x) { return typeof x === "string" && /^https?:\/\//i.test(x); });
      if (link) return link;
    }
    return "";
  }

  function preview(item) {
    var isWeakModel = item.type === "model" && (item.quality === "flat" || item.quality === "fail");
    var href = (isWeakModel && item.source_image) || item.thumbnail || "";
    if (item.type === "image" || item.type === "document" || item.type === "model") {
      var link = document.createElement("a");
      link.className = "entry-visual";
      link.href = href || "#";
      link.setAttribute("aria-label", "查看" + item.title + "的预览图");
      if (href) {
        var img = document.createElement("img");
        img.src = href;
        img.alt = item.title;
        img.loading = "lazy";
        img.onerror = function () { link.removeChild(img); link.appendChild(placeholder(item)); };
        link.appendChild(img);
      } else link.appendChild(placeholder(item));
      addBadges(link, item);
      return link;
    }
    var visual = document.createElement("div");
    visual.className = "entry-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.appendChild(placeholder(item));
    addBadges(visual, item);
    return visual;
  }

  function placeholder(item) {
    var el = document.createElement("div");
    var kind = item.type === "interaction" ? "interaction" : (item.preview_class || item.id || "");
    el.className = "entry-placeholder " + kind;
    if (item.type === "interaction") {
      var meta = document.createElement("small");
      meta.textContent = item.year || interactionName(item.interaction_type);
      var title = document.createElement("strong");
      title.textContent = item.title;
      el.appendChild(meta);
      el.appendChild(title);
    } else {
      el.textContent = item.glyph || (item.type === "scene" ? "景" : item.type === "scene_model" ? "構" : "文");
    }
    return el;
  }

  function addBadges(container, item) {
    var type = document.createElement("span");
    type.className = "entry-type";
    type.textContent = typeName(item);
    container.appendChild(type);
    if (item.type === "model" || item.type === "scene_model") {
      var badge = document.createElement("span");
      badge.className = "entry-quality " + (item.quality || "");
      badge.textContent = QUALITY_NAMES[item.quality] || "待审";
      container.appendChild(badge);
    }
  }

  function makeCard(item) {
    var isWeakModel = item.type === "model" && (item.quality === "flat" || item.quality === "fail");
    var article = document.createElement("article");
    article.className = "entry";
    article.dataset.id = item.id;
    article.appendChild(preview(item));

    var copy = document.createElement("div");
    copy.className = "entry-copy";
    var kicker = document.createElement("p");
    kicker.className = "entry-kicker";
    kicker.textContent = [typeName(item), item.chapter ? "卷" + item.chapter : ""].filter(Boolean).join("　/　");
    var heading = document.createElement("h2");
    var shortTitle = String(item.title || "").replace(/[（(][^）)]*[）)]/g, "").trim();
    heading.textContent = item.title_cn || shortTitle || item.title;
    var description = document.createElement("p");
    description.className = "entry-description";
    description.textContent = item.desc || item.description || "";
    copy.append(kicker, heading, description);

    var creditText = [];
    if (item.creator) creditText.push(item.creator);
    if (item.license) creditText.push(item.license);
    if (item.source_record && item.type === "scene_model") creditText.push(item.source_record);
    if (creditText.length) {
      var credit = document.createElement("p");
      credit.className = "entry-credit";
      credit.textContent = creditText.join(" · ");
      copy.appendChild(credit);
    }

    var actions = document.createElement("div");
    actions.className = "entry-actions";
    if (item.href) {
      var open = document.createElement("a");
      open.href = item.href;
      open.textContent = item.type === "image" ? "查看源图" : isWeakModel ? "查看原始史料图" : item.type === "model" || item.type === "scene_model" ? "在三维厅打开" : item.type === "interaction" ? "打开对应章节" : item.type === "document" ? (item.digital_label || "打开原件或馆藏记录") : "进入空间";
      actions.appendChild(open);
    }
    var src = sourceUrl(item);
    if (src) {
      var source = document.createElement("a");
      source.href = src;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "来源页与许可";
      actions.appendChild(source);
    }
    if (item.reference_url) {
      var reference = document.createElement("a");
      reference.href = item.reference_url;
      reference.target = "_blank";
      reference.rel = "noopener noreferrer";
      reference.textContent = item.reference_label || "更可靠的外部参照";
      actions.appendChild(reference);
    }
    if (actions.childNodes.length) copy.appendChild(actions);

    article.appendChild(copy);
    return article;
  }

  function searchable(item) {
    return [item.title, item.description, item.creator, item.license, item.year,
      item.source_url, item.source, item.interaction_type, item.source_record]
      .flat().filter(Boolean).join(" ").toLocaleLowerCase();
  }

  function matches(item, query, qualityValue) {
    if (activeType !== "all" && category(item) !== activeType) return false;
    if (qualityValue !== "all" && (item.type !== "model" || item.quality !== qualityValue)) return false;
    if (query && !searchable(item).includes(query)) return false;
    return true;
  }

  function render() {
    var query = search.value.trim().toLocaleLowerCase();
    var qualityValue = quality.value;
    var visible = items.filter(function (item) { return matches(item, query, qualityValue); });
    visible.sort(function (a, b) {
      var order = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
      if (order) return order;
      return String(a.title).localeCompare(String(b.title), "zh-CN");
    });
    var fragment = document.createDocumentFragment();
    visible.forEach(function (item) { fragment.appendChild(makeCard(item)); });
    root.replaceChildren(fragment);
    count.textContent = `显示 ${visible.length} 条 / 清册共 ${items.length} 条${query ? ` / 搜索“${search.value.trim()}”` : ""}`;
    empty.hidden = visible.length !== 0;
  }

  function buildFilters(counts) {
    var types = ["all", "image", "model", "document", "scene", "interaction"];
    types.forEach(function (type) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.type = type;
      button.setAttribute("aria-pressed", type === "all" ? "true" : "false");
      button.append(document.createTextNode(TYPE_NAMES[type]));
      var badge = document.createElement("span");
      badge.textContent = type === "all" ? items.length : (type === "scene" ? (counts.scene || 0) + (counts.scene_model || 0) : counts[type] || 0);
      button.appendChild(badge);
      button.addEventListener("click", function () {
        activeType = type;
        Array.prototype.forEach.call(filters.querySelectorAll("button"), function (b) {
          b.setAttribute("aria-pressed", b === button ? "true" : "false");
        });
        render();
      });
      filters.appendChild(button);
    });
  }

  fetch(DATA_URL).then(function (response) {
    if (!response.ok) throw new Error("catalog " + response.status);
    return response.json();
  }).then(function (data) {
    items = data.items || [];
    var counts = data.type_counts || {};
    document.getElementById("stat-total").textContent = data.unique_entry_count || items.length;
    document.getElementById("stat-image").textContent = counts.image || 0;
    document.getElementById("stat-model").textContent = counts.model || 0;
    document.getElementById("stat-scene").textContent = (counts.scene || 0) + (counts.scene_model || 0);
    document.getElementById("stat-interaction").textContent = counts.interaction || 0;
    buildFilters(counts);
    search.addEventListener("input", render);
    quality.addEventListener("change", render);
    render();
  }).catch(function () {
    count.textContent = "目录文件加载失败，请通过启动脚本打开网站。";
    empty.hidden = false;
  });
})();
