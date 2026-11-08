/* Rebuild the single public catalog from the exhibit manifest and chapter data. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const registry = readJson("assets/manifests/registry.json");
const books = readJson("assets/manifests/books.json");
const booksByCover = new Map(books.items.map((book) => [path.basename(book.cover || ""), book]));
const modelManifest = readJson("assets/models/models.json");
const modelDetails = new Map(modelManifest.items.map((model) => [model.id, model]));
const scenes = readJson("assets/scenes/scenes.json");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dataScripts = [...html.matchAll(/<script src="(js\/data(?:\/[^"]+)?\.js)(?:\?[^\"]*)?"/g)].map((m) => m[1]);
const context = { window: { HS_DATA: {} }, console };
context.HS_DATA = context.window.HS_DATA;
vm.createContext(context);
for (const src of dataScripts) vm.runInContext(fs.readFileSync(path.join(ROOT, src), "utf8"), context, { filename: src });
const d = context.HS_DATA;
const items = [...registry.items];

for (const item of items) {
  if (item.type === "image") item.href = item.thumbnail;
  else if (item.type === "model") item.href = `index.html?artifact=${encodeURIComponent(item.id)}#artifacts`;
  else if (item.type === "document") {
    const book = booksByCover.get(path.basename(item.thumbnail || ""));
    if (book) {
      item.title = book.title_zh || item.title;
      item.description = book.description || item.description;
      item.material_type = book.material_type || "档案图像";
      item.digital_url = book.digital_url || book.source_url || "";
      item.digital_label = book.digital_label || "打开原件或馆藏记录";
      item.digital_access_status = book.digital_access_status || "source-record-only";
      item.href = item.digital_url || "index.html#relic";
      item.scene_id = "relic";
    } else {
      item.href = item.source_url || (item.source || [])[0] || "index.html#relic";
      item.scene_id = "relic";
    }
    item.model = "";
  }
  else if (item.type === "scene") item.href = `scenes.html?scene=${encodeURIComponent(item.id.replace(/^scene_/, ""))}`;
  if (item.type === "model") {
    const detail = modelDetails.get(item.id);
    if (detail) {
      item.source_image = detail.source_image || "";
      item.quality_note = detail.note || "";
      item.reference_url = detail.reference_url || "";
      item.reference_label = detail.reference_label || "";
      item.reference_note = detail.reference_note || "";
      if (item.quality === "flat" || item.quality === "fail") {
        item.description = `${detail.note || item.description || "单图重建质量不足。"} 展厅已停用该三维网格，改为查看本地原始档案图像。`;
      }
      if (detail.source_url) item.source = [detail.source_url, detail.license].filter(Boolean);
    }
  }
}

for (const scene of scenes.items) {
  const evidenceByRepresentation = {
    "historical-scan": { quality: "measured-site-scan", production_method: "external_photogrammetry", evidence_type: "measured_site" },
    "present-day-scan": { quality: "measured-site-scan", production_method: "external_photogrammetry", evidence_type: "measured_site" },
    "present-day-interior-360": { quality: "measured-current-panorama", production_method: "official_institutional_panorama", evidence_type: "measured_site" },
    "present-day-lidar-terrain": { quality: "measured-current-surface", production_method: "derived_lidar_mesh", evidence_type: "open_lidar_measurement" },
    "present-day-lidar-surface": { quality: "measured-current-surface", production_method: "derived_lidar_mesh", evidence_type: "open_lidar_measurement" },
    "historical-reconstruction": { quality: "source-constrained-reconstruction", production_method: "source_constrained_reconstruction", evidence_type: "source_constrained_reconstruction" },
    "historical-3d-reference": { quality: "source-constrained-reconstruction", production_method: "source_constrained_reconstruction", evidence_type: "source_constrained_reconstruction" },
    "reconstruction-needed": { quality: "evidence-limited-model", production_method: "interpretive_blockout", evidence_type: "incomplete_evidence" },
    "concept": { quality: "concept", production_method: "procedural_blockout", evidence_type: "E4" },
  };
  const classification = evidenceByRepresentation[scene.representation] || evidenceByRepresentation.concept;
  const sourceUrls = [
    scene.model_url,
    scene.embedUrl,
    scene.reference_url,
    scene.source_url,
    ...(scene.related_sources || []).map((x) => x.url),
    ...(scene.related_3d_models || []).flatMap((x) => [x.model_url, x.source_url, x.viewer_url, x.embed_url]),
    ...(scene.evidence_galleries || []).map((x) => x.source_url),
  ].filter((url, i, all) => typeof url === "string" && /^(https?:\/\/|assets\/)/.test(url) && all.indexOf(url) === i);
  items.push({
    id: `scene_model_${scene.id}`,
    title: `${scene.name} · ${scene.file ? "空间模型" : scene.representation === "present-day-interior-360" ? "现状全景漫游" : "外部实景数据"}`,
    type: "scene_model",
    chapter: 10,
    asset_format: scene.file ? "glb" : scene.representation === "present-day-interior-360" ? "interactive-360-panorama" : "external-3d-source",
    production_method: classification.production_method,
    evidence_type: classification.evidence_type,
    quality: classification.quality,
    fill: "",
    thumbnail: "",
    model: scene.file ? `assets/scenes/${scene.file}` : "",
    source: sourceUrls,
    source_record: scene.credit,
    is_flagship: false,
    description: scene.note,
    href: `index.html?mode=scenes&scene=${encodeURIComponent(scene.id)}#artifacts`,
    preview_class: scene.previewClass,
    glyph: scene.glyph,
  });
}

function addRecords(subtype, rows, section, chapter, getTitle, getDescription, getYear, getId) {
  (rows || []).forEach((row, i) => {
    const title = getTitle(row, i);
    const description = getDescription(row, i) || "项目交互内容；查看对应章节获取完整上下文。";
    const year = getYear ? getYear(row, i) : "";
    const id = getId ? getId(row, i) : `${subtype}_${String(i + 1).padStart(2, "0")}`;
    items.push({
      id: `interaction_${subtype}_${id}`,
      title,
      type: "interaction",
      interaction_type: subtype,
      chapter,
      asset_format: "interactive-data",
      production_method: "chapter_data",
      evidence_type: "editorial-data",
      quality: "ok",
      fill: "",
      thumbnail: "",
      model: "",
      source: [],
      creator: "项目叙事数据",
      license: "以文末史料说明为准；该条目是交互内容索引。",
      is_flagship: false,
      description: String(description),
      year: year == null ? "" : String(year),
      href: `index.html#${section}`,
      preview_class: subtype,
    });
  });
}

addRecords("map-place", d.cities, "mapstory", 1,
  (x) => `${x.name} · 地图节点`, (x) => `${x.en || ""}；${x.x}, ${x.y} 为叙事地图示意坐标，不代表精确测绘。`, null, (x) => x.id);
addRecords("story-chapter", d.storyChapters, "mapstory", 1,
  (x) => x.title, (x) => x.lead || x.body || x.desc || x.subtitle || "滚动叙事地图章节。", (x) => x.year, (x) => x.id);
addRecords("network-node", d.network.nodes, "network", 3,
  (x) => x.label, (x) => x.desc || x.description || x.group || "人物、组织或刊物关系节点。", (x) => x.era, (x) => x.id);
addRecords("press-edition", d.press, "press", 4,
  (x) => x.name, (x) => `${x.kind || "报刊"}；${x.summary || ""}`, (x) => x.year, (x) => `${x.year}_${x.place || x.name}`);
const pressEditions = d.press;
items.filter((item) => item.interaction_type === "press-edition").forEach((item) => {
  const edition = pressEditions.find((x) => item.year === String(x.year));
  if (!edition) return;
  item.source = [edition.archive_url, edition.archive_source].filter(Boolean);
  item.href = edition.archive_url || item.href;
  item.evidence_type = edition.issues && edition.issues.length ? "sampled-primary-scans" : "external-archive-record";
  item.access_status = edition.archive_status || "尚未整理逐期数字原件。";
  item.license = edition.archive_url ? "请在外部馆藏 / 数据页逐项核对许可；仅链接，不在本项目重新托管。" : item.license;
});
const pressIssues = d.press.flatMap((publication) => (publication.issues || []).map((issue, i) => ({ publication, issue, i })));
addRecords("press-issue", pressIssues, "press", 4,
  (x) => `${x.issue.date} · ${x.publication.name} ${x.issue.volume}`,
  (x) => `${x.issue.note} ${x.issue.highlights.join("；")}`,
  (x) => x.issue.year,
  (x) => `${x.publication.id || x.publication.year}_${String(x.issue.volume).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "")}`);
pressIssues.forEach(({ publication, issue }, i) => {
  const item = items[items.length - pressIssues.length + i];
  item.thumbnail = issue.thumb || "";
  item.source = [issue.scan, issue.text].filter(Boolean);
  item.license = issue.scan ? "扫描来源及许可见原件馆藏页面；转录文本见维基文库逐期目录。" : "此期仅有逐期目录转录，未取得可核验扫描。";
  item.href = issue.pdf || issue.text;
  item.evidence_type = issue.scan ? "digitized-primary-source" : "transcribed-catalog";
});
addRecords("class-comparison", [
  ...d.classDivide.leftItems.map((x) => ({ ...x, side: "资本一侧" })),
  ...d.classDivide.rightItems.map((x) => ({ ...x, side: "劳动一侧" })),
], "classroom", 5,
  (x) => `${x.side} · ${x.head || x.title || x.label || x.name || "阶级生活对照"}`,
  (x) => x.body || x.desc || x.description || x.text || "查看阶级对照章节。", null, (x, i) => `${i + 1}`);
addRecords("commune-slice", d.commune.slices, "commune", 6,
  (x) => `${x.date} · ${x.title}`, (x) => x.body, (x) => `1871-${x.date}`, (x) => x.date.replaceAll(".", ""));
addRecords("river-event", d.river, "river", 8,
  (x) => `${x.year || x.date || ""} · ${x.label || x.title || x.name || "历史事件"}`,
  (x) => x.desc || x.body || x.description || `事件城市：${x.city || "未标注"}。`, (x) => x.year || x.date, (x) => String(x.year || x.date || "event").replaceAll(".", ""));
addRecords("heat-period", d.heat, "heat", 9,
  (x) => `${x.era} · 罢工浪潮地图`, (x) => `该年代切片包含 ${x.pulses.length} 个城市事件脉冲；位置与强度为叙事示意。`, (x) => x.era, (x) => String(x.era));
addRecords("relic-section", d.relic.sections, "relic", 2,
  (x) => `${x.no} · ${x.title}`, (x) => x.text || "数字文献章节。", null, (x, i) => `${i + 1}`);
addRecords("manuscript-layer", d.relic.manuscriptLayers, "relic", 2,
  (x) => x.label || x.layer, (x) => x.desc || x.hot, null, (x) => x.layer);
addRecords("wordcloud-era", d.relic.wordCloudByEra, "relic", 2,
  (x) => `${x.era} · 关键词层`, (x) => `该年代包含 ${x.words.length} 个关键词；用于显示概念语汇随历史阶段的变化。`, (x) => x.era, (x) => String(x.era));

const ids = items.map((x) => x.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) throw new Error(`Duplicate catalog IDs: ${duplicates.join(", ")}`);
const counts = Object.fromEntries([...new Set(items.map((x) => x.type))].map((type) => [type, items.filter((x) => x.type === type).length]));
const output = {
  schema: "v2.0",
  generated: new Date().toISOString().slice(0, 10),
  unique_entry_count: items.length,
  type_counts: counts,
  counting_note: "Counts distinct source objects, 3D models, scene models, immersive scene experiences, and data-driven interactions by stable ID. Texture previews and thumbnails are not counted separately.",
  items,
};
fs.writeFileSync(path.join(ROOT, "assets/manifests/asset_catalog.json"), JSON.stringify(output, null, 2) + "\n", "utf8");
const csvFields = ["id", "title", "type", "interaction_type", "chapter", "year", "asset_format",
  "production_method", "evidence_type", "quality", "thumbnail", "model", "creator", "license",
  "rights_status", "source", "href", "description"];
const esc = (value) => {
  const s = Array.isArray(value) ? value.join(" ; ") : value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
};
const csv = [csvFields.join(","), ...items.map((item) => csvFields.map((f) => esc(item[f])).join(","))].join("\r\n") + "\r\n";
fs.writeFileSync(path.join(ROOT, "assets/manifests/asset_catalog.csv"), "\uFEFF" + csv, "utf8");
console.log(`Wrote ${items.length} unique entries: ${JSON.stringify(counts)}`);
