#!/usr/bin/env python3
"""Generate a reproducible, per-item audit of the exhibit asset catalog."""
from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets/manifests/asset_catalog.json"
CSV_OUT = ROOT / "assets/manifests/asset_audit.csv"
REPORT = ROOT / "docs/资产全量核查.md"
HTML_FILES = [ROOT / "index.html", ROOT / "assets.html", ROOT / "scenes.html"]

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
items = catalog["items"]
ids = {item.get("id") for item in items}
html = "\n".join(p.read_text(encoding="utf-8") for p in HTML_FILES if p.exists())
anchors = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))


def local_path(value: str) -> Path | None:
    if not value or re.match(r"^(https?:|data:|blob:|scene:|#|mailto:|javascript:)", value, re.I):
        return None
    parsed = urlsplit(value)
    path = parsed.path
    if not path:
        return None
    try:
        candidate = (ROOT / path.replace("/", "\\")).resolve()
        candidate.relative_to(ROOT.resolve())
        return candidate
    except (ValueError, OSError):
        return None


def exists(value: str) -> str:
    path = local_path(value)
    if path is None:
        return "external-or-not-a-file" if value else "not-applicable"
    return "present" if path.is_file() else "MISSING"


def resolve_status(item: dict) -> tuple[str, str]:
    href = item.get("href", "")
    path = local_path(href)
    if path:
        return ("present" if path.is_file() else "MISSING", "本地文件")
    if href.startswith("#"):
        return ("present" if href[1:] in anchors else "UNRESOLVED", "站内锚点")
    if href.startswith("index.html#"):
        anchor = href.split("#", 1)[1]
        return ("present" if anchor in anchors else "UNRESOLVED", "站内章节")
    if href.startswith("index.html?") or href.startswith("scenes.html?"):
        dest = href.split("?", 1)[0]
        return ("present" if (ROOT / dest).is_file() else "MISSING", "站内交互入口")
    if href.startswith("http://") or href.startswith("https://"):
        return "external-needs-network", "外部网页 / 馆藏"
    if href.startswith("scene:"):
        return "scene-handler", "场景内部路由"
    return ("not-set" if not href else "unclassified"), ""


fields = ["id", "title", "type", "interaction_type", "chapter", "year", "evidence_type", "quality",
          "thumbnail", "thumbnail_status", "source_image", "source_image_status", "model", "model_status", "href", "href_status", "href_kind",
          "source", "source_count", "license", "rights_status", "reference_url", "reference_label", "access_status", "description"]
rows = []
for item in items:
    href_status, href_kind = resolve_status(item)
    sources = item.get("source") or []
    if isinstance(sources, str):
        sources = [sources]
    rows.append({
        "id": item.get("id", ""), "title": item.get("title", ""), "type": item.get("type", ""),
        "interaction_type": item.get("interaction_type", ""), "chapter": item.get("chapter", ""),
        "year": item.get("year", ""), "evidence_type": item.get("evidence_type", ""),
        "quality": item.get("quality", ""), "thumbnail": item.get("thumbnail", ""),
        "thumbnail_status": exists(item.get("thumbnail", "")), "model": item.get("model", ""),
        "source_image": item.get("source_image", ""), "source_image_status": exists(item.get("source_image", "")),
        "model_status": exists(item.get("model", "")), "href": item.get("href", ""),
        "href_status": href_status, "href_kind": href_kind,
        "source": " | ".join(map(str, sources)), "source_count": sum(str(s).startswith(("http://", "https://")) for s in sources),
        "license": item.get("license", ""), "rights_status": item.get("rights_status", ""),
        "reference_url": item.get("reference_url", ""), "reference_label": item.get("reference_label", ""),
        "access_status": item.get("access_status", item.get("digital_access_status", "")),
        "description": item.get("description", ""),
    })

with CSV_OUT.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

counts = Counter(x["type"] for x in rows)
missing_thumbs = [x for x in rows if x["thumbnail_status"] == "MISSING"]
missing_models = [x for x in rows if x["model_status"] == "MISSING"]
bad_hrefs = [x for x in rows if x["href_status"] in {"MISSING", "UNRESOLVED"}]
missing_weak_sources = [x for x in rows if x["type"] == "model" and x["quality"] in {"flat", "fail"} and x["source_image_status"] != "present"]
no_source = [x for x in rows if not x["source_count"] and x["type"] not in {"scene_model", "scene"}]
quality = Counter(x["quality"] or "未标注" for x in rows if x["type"] in {"model", "scene_model"})

lines = [
    "# 资产全量核查",
    "",
    f"核查基准：`assets/manifests/asset_catalog.json`，共 **{len(rows)}** 条唯一记录；逐条明细见 [asset_audit.csv](../assets/manifests/asset_audit.csv)。",
    "",
    "## 清点结果",
    "",
    "| 类型 | 数量 | 含义 |", "|---|---:|---|",
    f"| 图片 / 史料图像 | {counts['image']} | 本地图片素材与其来源记录 |",
    f"| 文献与档案图像 | {counts['document']} | 混合原著、报刊、历史照片和艺术图像；不能全部当作可读书籍 |",
    f"| 文物模型 | {counts['model']} | GLB 模型，质量按目录标注 |",
    f"| 场景体验 | {counts['scene']} | 可进入的空间叙事章节 |",
    f"| 场景结构模型 | {counts['scene_model']} | 分别标注实景扫描、当代 LiDAR、史料约束复原或概念模型；不得混称 |",
    f"| 交互叙事数据 | {counts['interaction']} | 地图、人物关系、事件等章节数据索引，不是独立实物 |",
    "",
    "## 链接与文件状态",
    "",
    f"- 本地缩略图 / 主图缺失：**{len(missing_thumbs)}**。",
    f"- 本地模型文件缺失：**{len(missing_models)}**。",
    f"- 低质量模型改用的原始史料图缺失：**{len(missing_weak_sources)}**。",
    f"- 指向不存在文件或站内锚点的入口：**{len(bad_hrefs)}**。",
    f"- 没有独立外部来源链接的记录：**{len(no_source)}**（主要是站内交互索引或由对应章节统一说明来源的数据）。",
    "- `external-needs-network` 表示入口已接入，但要联网访问外部馆藏；该状态不等同已把原刊下载进展馆。",
    "",
    "## 三维模型质量标注",
    "",
    "| 目录质量状态 | 数量 | 说明 |", "|---|---:|---|",
]
for key, value in sorted(quality.items()):
    lines.append(f"| {key} | {value} | 按模型清单原始质量标签统计 |")
weak_models = [x for x in rows if x["type"] == "model" and x["quality"] in {"flat", "fail"}]
lines += ["", "## 已降级的低质量模型", "", "以下网格停止作为三维实物展示，展厅和目录预览改用已打包的原始档案图；可用的外部替代参照在最后一列，访问与许可以源站为准。", "", "| 项目 ID | 原质量 | 原图 | 替代 / 核验入口 |", "|---|---|---|---|"]
for item in weak_models:
    image = f"[`{item['source_image']}`]({item['source_image']})" if item["source_image"] else "缺少原图"
    reference = f"[{item['reference_label'] or '外部参考'}]({item['reference_url']})" if item["reference_url"] else "仅以本地史料图呈现"
    lines.append(f"| `{item['id']}` · {item['title'].replace('|', ' ')} | {item['quality']} | {image} | {reference} |")
lines += [
    "",
    "15 个 `flat` / `fail` 文物网格已从展厅中的三维呈现降级为原始二维档案图展示，卡片注明停用原因；仍保留网格文件供研究比对，不再让错误网格冒充实物。其余可用模型仍标注为单图推断，不能当作摄影测量扫描。",
    "",
    "## 文献、报刊与实景边界",
    "",
    "- 18 条文献类记录已经分别标出原著扫描、报刊扫描、馆藏记录或档案图像属性；历史照片、海报和绘画不再伪装成可翻阅的书。",
    "- 1848 年《共产党宣言》首版、1867 年《资本论》、部分《新青年》期号和《新莱茵报》都有外部数字原件入口；缺少扫描的期号标明仅有目录 / 转录。",
    "- 报刊展现有 7 种刊物：《莱茵报》《德法年鉴》《新莱茵报》《蜂房报》《社会民主党人报》《火星报》《新青年》。各自卡片 / 胶卷连到可核验的馆藏或扫描；英国图书馆《蜂房报》数据是部分卷年文本，并非完整扫描期刊库。《火星报》扫描汇编为第三方整理，页面提示了来源局限。",
    "- 为马克思故居接入博物馆 360° 实景导览，为特里尔马克思像接入特里尔官方摄影测量城市模型；公社展区提供 1909 年“革命遇难者纪念碑”摄影测量模型（注意：不是 1871 年原始墙体），以及旺多姆柱现存重建体的摄影测量资源（不是倒塌现场）。",
    "- 现有实景重建工作台列出可复用的公开扫描 / 点云项目及许可证注意事项；有些条目只能跳转源站，未获明确再发布权，因此没有镜像到本地。现存建筑扫描只能展示采集时的现状，不能充当 1871 年巴黎公社空间复原。",
    "",
    "## 可复现更新",
    "",
    "修改资产目录后，运行 `python scripts/audit_asset_catalog.py` 可重建此报告与 CSV。源记录更新后先运行 `python scripts/sync_sources.py`，再运行 `node scripts/build_asset_catalog.js`。",
    "",
    "本报告检查本地文件和站内路由的静态存在性，不会冒用自动 HTTP 检测来声称每个第三方网站永久可用；外链可用性、访问政策和许可应以来源机构当前页面为准。",
]
REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Audited {len(rows)} entries; {len(missing_thumbs)} missing thumbnails, {len(missing_models)} missing models, {len(bad_hrefs)} unresolved hrefs; wrote {CSV_OUT} and {REPORT}")
