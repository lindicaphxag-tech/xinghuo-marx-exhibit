"""Package the project's sourced historical images into the web exhibit.

Run from any directory with Python 3.10+ while the sibling research folder is
present. It copies the licensed source images, repairs the media paths in the
catalog, and regenerates attribution files from the JSON source of truth.
"""
from __future__ import annotations

import csv
import json
import shutil
from collections import Counter
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
RESEARCH = APP.parent / "工人革命的马克思宣讲_文物3D重建" / "02_素材图片"
SOURCE_JSON = RESEARCH / "来源与授权.json"
REGISTRY_JSON = APP / "assets/manifests/registry.json"
BOOKS_JSON = APP / "assets/manifests/books.json"
MODELS_JSON = APP / "assets/models/models.json"
OUT = APP / "assets/sources"

REPAIRS = {
    "07_marx_memorial_library.jpg": {
        "author": "Justinc",
        "credit_note": "Commons 页标注 Photographer: User:Justinc",
    },
    "1878_Pachis_May_Day_on_Corfu_1888_National_Gallery_-_Co.jpg": {
        "author": "Charalambos Pachis (painting); Anagoria (image file)",
        "license": "Public domain (Public Domain Mark 1.0)",
        "license_url": "https://creativecommons.org/publicdomain/mark/1.0/",
        "commons_page": "https://commons.wikimedia.org/wiki/File:1878_Pachis_May_Day_on_Corfu_1888_National_Gallery_-_Corfu_Annex_anagoria.jpg",
    },
    "Demonstration_of_the_War_Invalids__Petrograd__April_191.jpg": {
        "author": "The Kathryn and Shelby Cullom Davis Library (photographer unknown)",
        "license": "Public domain in Russia (Commons file description)",
        "license_url": "",
        "commons_page": "https://commons.wikimedia.org/wiki/File:Demonstration_of_the_War_Invalids,_Petrograd_(April_1917)_(14576336083).jpg",
        "credit_note": "Commons file page identifies the collection and marks the photograph public domain in Russia.",
    },
}

def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def norm(text: str) -> str:
    return "".join(ch.lower() for ch in text if ch.isalnum())

NAMED_MODELS = {
    "statue_trier": "01_trier_statue_front.jpg",
    "statue_trier_side": "02_trier_statue_wolf.jpg",
    "bust_trier": "07_trier_bust.jpg",
    "bust_cc0": "08_bust_cc0.jpg",
    "forum_berlin": "05_berlin_marx_engels_forum.jpg",
    "monument_berlin": "06_berlin_marx_engels_monument.jpg",
    "statue_shanghai": "09_shanghai_fuxing_park.jpg",
    "statue_shanghai2": "10_shanghai_marx_engels.jpg",
    "marx_house": "01_marx_house_summer.jpg",
    "memorial_library": "07_marx_memorial_library.jpg",
    "mur_federes": "01_mur_des_federes_a.jpg",
    "kapital_1867": "05_kapital_1867_zurich.jpg",
    "ait_card": "04_ait_membership_card.jpg",
    "milrevkom": "Milrevkom_proclamation.jpg",
    "union_banner": "Central_London___trade_union_banner__Piccadilly_-_geogr.jpg",
    "barricade_vendome": "Barricade_place_Vendome_Commune_Paris_1871.jpg",
    "manifest": "01_manifest_1848_cover.jpg",
}

def attach_source(item: dict, by_file: dict[str, dict], by_folder: dict[str, list[dict]], manual_file: str | None = None) -> bool:
    source = by_file.get(manual_file or "") if manual_file else None
    if source is None and item.get("folder"):
        target = norm(item.get("name", ""))
        candidates = by_folder.get(item["folder"], [])
        ranked = []
        for row in candidates:
            stem = Path(row["file"]).stem
            # Commons filenames often start with a sequence number that the
            # generated model label intentionally omits.
            stem = stem.lstrip("0123456789")
            stem = stem.lstrip(" _-.")
            key = norm(stem)
            if not key or not target:
                continue
            if key == target or key.startswith(target) or target.startswith(key):
                ranked.append((min(len(key), len(target)), row))
        if ranked:
            ranked.sort(key=lambda pair: pair[0], reverse=True)
            source = ranked[0][1]
    if source is None:
        item["rights_status"] = "source-link-missing"
        return False
    item["source_image"] = source["web_path"]
    item["source_image_id"] = source["file"]
    item["source_url"] = source.get("commons_page", "")
    item["creator"] = source.get("author", "")
    item["license"] = source.get("license", "")
    item["license_url"] = source.get("license_url", "")
    item["rights_status"] = source["rights_status"]
    return True

def main() -> None:
    if not SOURCE_JSON.exists():
        raise SystemExit(f"Source metadata not found: {SOURCE_JSON}")
    source_rows = json.loads(SOURCE_JSON.read_text(encoding="utf-8"))
    expected_source_count = len(source_rows)
    if expected_source_count < 1:
        raise SystemExit("No source image records found")

    OUT.mkdir(parents=True, exist_ok=True)
    by_key: dict[str, dict] = {}
    packaged = []
    for row in source_rows:
        row = dict(row)
        row.update(REPAIRS.get(row.get("file", ""), {}))
        rel = Path(row["folder"]) / row["file"]
        src = RESEARCH / rel
        if not src.is_file():
            raise SystemExit(f"Missing source image: {src}")
        dst = OUT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        row["web_path"] = (Path("assets/sources") / rel).as_posix()
        row["web_bytes"] = dst.stat().st_size
        row["rights_status"] = "source-page-recorded"
        by_key[rel.as_posix()] = row
        packaged.append(row)
    by_file = {row["file"]: row for row in packaged}
    by_folder: dict[str, list[dict]] = {}
    for row in packaged:
        by_folder.setdefault(row["folder"], []).append(row)

    # Registry IDs img001..img063 have stable paths; rewrite them to the
    # self-contained website copy and attach the human-readable attribution.
    registry = json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))
    updated = 0
    for item in registry["items"]:
        if item.get("type") != "image":
            continue
        thumb = item.get("thumbnail", "")
        if "assets/sources/" in thumb:
            tail = thumb.split("assets/sources/", 1)[-1]
        else:
            tail = thumb.split("02_素材图片/", 1)[-1]
        source = by_key.get(Path(tail).as_posix())
        if not source:
            raise SystemExit(f"Could not map registry image {item.get('id')}: {tail}")
        item["thumbnail"] = source["web_path"]
        item["creator"] = source.get("author", "")
        item["license"] = source.get("license", "")
        item["license_url"] = source.get("license_url", "")
        item["rights_status"] = source["rights_status"]
        item["rights_note"] = source.get("credit_note", "")
        item["source"] = [source.get("commons_page", ""), source.get("license", "")]
        updated += 1
    expected_registry_images = sum(item.get("type") == "image" for item in registry["items"])
    if updated != expected_registry_images:
        raise SystemExit(f"Expected to update {expected_registry_images} registry image records, updated {updated}")

    books = json.loads(BOOKS_JSON.read_text(encoding="utf-8"))
    for book in books["items"]:
        source = by_file.get(Path(book.get("cover", "")).name)
        if source:
            book.update({"creator": source["author"], "license": source["license"],
                         "license_url": source.get("license_url", ""),
                         "source_url": source.get("commons_page", ""),
                         "rights_status": source["rights_status"]})
    write_json(BOOKS_JSON, books)

    models = json.loads(MODELS_JSON.read_text(encoding="utf-8"))
    matched_models = 0
    for model in models["items"]:
        if attach_source(model, by_file, by_folder, NAMED_MODELS.get(model["id"])):
            matched_models += 1
    write_json(MODELS_JSON, models)
    for item in registry["items"]:
        if item.get("type") == "model":
            source_model = next((model for model in models["items"] if model["id"] == item["id"]), None)
            if source_model:
                for field in ("source_image", "source_image_id", "source_url", "creator", "license", "license_url", "rights_status"):
                    item[field] = source_model.get(field, "")
                item["source"] = [source_model.get("source_url", ""), source_model.get("license", "")]
                item["thumbnail"] = "assets/models/preview/" + Path(source_model["file"]).stem + "_thumb.png"
        elif item.get("type") == "document":
            book = next((b for b in books["items"] if Path(b.get("cover", "")).name == Path(item.get("thumbnail", "")).name), None)
            if book:
                for field in ("creator", "license", "license_url", "source_url", "rights_status"):
                    item[field] = book.get(field, "")
                item["source"] = [book.get("source_url", ""), book.get("license", "")]

    write_json(OUT / "source_manifest.json", {"schema": "1.0", "items": packaged})
    write_json(REGISTRY_JSON, registry)

    registry_fields = ["id", "title", "type", "chapter", "asset_format", "production_method",
                       "evidence_type", "quality", "fill", "thumbnail", "model", "source",
                       "is_flagship", "description", "creator", "license", "license_url",
                       "rights_status", "rights_note"]
    with (APP / "assets/manifests/registry.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=registry_fields, extrasaction="ignore")
        writer.writeheader()
        for item in registry["items"]:
            flat = dict(item)
            flat["source"] = " ; ".join(item.get("source", []))
            writer.writerow(flat)

    fields = ["folder", "file", "commons_file", "author", "license", "license_url",
              "date", "orig_size", "commons_page", "local_bytes", "usage",
              "web_path", "web_bytes", "rights_status", "credit_note"]
    with (RESEARCH / "来源与授权.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(packaged)

    counts = Counter(row["license"] for row in packaged)
    lines = [
        "# 来源与授权清单",
        "",
        f"> 已打包 {len(packaged)} 张源图。每条记录均包含 Commons 文件页、许可字段、作者/摄影者和本地网站路径；若作者未知，按来源页显示为未知或收藏机构。",
        "> 项目只陈列来源页中记录的许可状态；涉及 CC BY / CC BY-SA 的公开发布仍须保留署名和许可链接。",
        "",
        "## 许可分布",
        "",
        "| 许可标记 | 数量 |",
        "|---|---:|",
    ]
    lines += [f"| {license} | {count} |" for license, count in sorted(counts.items())]
    lines += ["", "## 逐图记录", ""]
    for folder in sorted({row["folder"] for row in packaged}):
        lines += [f"### {folder}", "", "| 文件 | 作者 / 摄影者 | 许可 | 日期 | 网站文件 | 来源页 |", "|---|---|---|---|---|---|"]
        for row in packaged:
            if row["folder"] != folder:
                continue
            src = f"[Commons]({row['commons_page']})" if row.get("commons_page") else "待补来源"
            lines.append(f"| `{row['file']}` | {row.get('author') or '未署名'} | {row.get('license') or '待核'} | {row.get('date') or ''} | `{row['web_path']}` | {src} |")
        lines.append("")
    (RESEARCH / "来源与授权.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Packaged {len(packaged)} source photos; updated {updated} registry entries.")
    print(f"Linked {matched_models}/{len(models['items'])} models to their source images.")
    print("Licenses:", json.dumps(counts, ensure_ascii=False))

if __name__ == "__main__":
    main()
