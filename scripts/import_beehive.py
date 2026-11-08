#!/usr/bin/env python3
"""Build a browsable offline The Bee-Hive corpus from the British Library CC0 ZIPs."""
from __future__ import annotations

import hashlib
import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "assets" / "documents"
OUT = DOCS / "bee-hive"
SOURCES = [
    (1862, DOCS / "the-bee-hive-1862-plaintext.zip"),
    (1872, DOCS / "the-bee-hive-1872-plaintext.zip"),
]


def clean_text(raw: bytes) -> str:
    return raw.decode("utf-8", errors="replace").replace("\r\n", "\n").strip()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    issue_records: dict[str, dict] = defaultdict(lambda: {"date": "", "articles": []})
    source_files = []

    for year, archive in SOURCES:
        if not archive.is_file():
            raise FileNotFoundError(archive)
        source_files.append({
            "year": year,
            "file": archive.name,
            "sha256": hashlib.sha256(archive.read_bytes()).hexdigest().upper(),
        })
        with zipfile.ZipFile(archive) as zf:
            names = set(zf.namelist())
            metadata_names = [n for n in names if n.endswith("_metadata.xml")]
            for metadata_path in metadata_names:
                root = ET.fromstring(zf.read(metadata_path))
                issue = root.find(".//issue")
                item = root.find(".//item")
                if issue is None or item is None:
                    continue
                date = (issue.findtext("date") or "").strip()
                plain_name = (item.findtext("plain_text_file") or "").strip()
                if not date or not plain_name:
                    continue
                prefix = metadata_path.split("_metadata/", 1)[0]
                plain_path = prefix + "_plaintext/" + "/".join(metadata_path.split("_metadata/", 1)[1].split("/")[:-1] + [plain_name])
                if plain_path not in names:
                    raise FileNotFoundError(f"Plain text for metadata record not found: {plain_path}")
                article_text = clean_text(zf.read(plain_path))
                article_id = Path(plain_name).stem.rsplit("_", 1)[-1]
                article = {
                    "id": article_id,
                    "title": (item.findtext("title") or "").strip(),
                    "type": (item.findtext("item_type") or "ARTICLE").strip(),
                    "wordCount": int(item.findtext("word_count") or 0),
                    "ocrQuality": float(item.findtext("ocr_quality_mean") or 0),
                    "text": article_text,
                }
                issue_records[date]["date"] = date
                issue_records[date]["articles"].append(article)

    index = {
        "schema": "1.0",
        "title": "The Bee-Hive :",
        "publisher": "British Library",
        "license": "CC0 1.0",
        "sourceUrl": "https://bl.iro.bl.uk/entities/product/6f05315c-e2bf-4d66-bfdb-145036f29d51",
        "doi": "10.23636/dth2-z430",
        "coverageNote": "Selected digitized issues from 1862 and 1872 only; not a complete run and no issue-page facsimile images are included.",
        "sourceFiles": source_files,
        "issues": [],
    }
    total_articles = 0
    for date in sorted(issue_records):
        record = issue_records[date]
        record["articles"].sort(key=lambda x: x["id"])
        filename = f"{date}.json"
        payload = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
        (OUT / filename).write_text(payload, encoding="utf-8")
        article_count = len(record["articles"])
        total_articles += article_count
        index["issues"].append({
            "date": date,
            "year": int(date[:4]),
            "articleCount": article_count,
            "file": filename,
        })
    index["articleCount"] = total_articles
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(index['issues'])} issues / {total_articles} articles in {OUT}")


if __name__ == "__main__":
    main()
