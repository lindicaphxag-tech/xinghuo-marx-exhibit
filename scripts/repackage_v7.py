"""Update the delivery ZIP while correcting its legacy GBK filenames."""
from __future__ import annotations

import copy
import os
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(errors="backslashreplace")
SITE = Path(__file__).resolve().parents[1]
PARENT = SITE.parent
SOURCE_ZIP = PARENT / "交付包_v6.zip"
OUTPUT_ZIP = PARENT / "交付包_v7.zip"
TEMP_ZIP = PARENT / "交付包_v7.partial.zip"
PREFIX = "01_展馆/"

REPLACE = {
    "hall.html": "hall.html",
    "index.html": "index.html",
    "js/main.js": "js/main.js",
    "js/scenes/artifacts.js": "js/scenes/artifacts.js",
    "js/scenes/monument.js": "js/scenes/monument.js",
    "sw.js": "sw.js",
    "README.md": "README.md",
    "docs/展示与讲解手册.md": "docs/展示与讲解手册.md",
    "docs/产品定位与展示策略.md": "docs/产品定位与展示策略.md",
}
NEW_FILES = [
    "css/method-tour.css",
    "video-tour.html",
    "video-tour.css",
    "video/out/method-tour-screen-v5.webm",
    "video/历史唯物主义_四层自动导览.mp4",
    "video/历史唯物主义_四层自动导览.srt",
    "video/历史唯物主义_四层自动导览.vtt",
    "video/历史唯物主义_四层自动导览_封面.png",
    "video/method_tour_script.json",
    "video/build_method_audio.ps1",
    "video/build_method_video.py",
]


def clean_extra(extra: bytes) -> bytes:
    """Drop stale Unicode-path extras whose CRC refers to the old GBK bytes."""
    kept = bytearray()
    pos = 0
    while pos + 4 <= len(extra):
        field_id = int.from_bytes(extra[pos:pos + 2], "little")
        size = int.from_bytes(extra[pos + 2:pos + 4], "little")
        field = extra[pos:pos + 4 + size]
        if len(field) < 4 + size:
            break
        if field_id != 0x7075:
            kept.extend(field)
        pos += 4 + size
    if pos < len(extra):
        kept.extend(extra[pos:])
    return bytes(kept)


def corrected_name(info: zipfile.ZipInfo) -> str:
    # v6 marked legacy GBK names as UTF-8. Decode those bytes as GBK before writing
    # the new ZIP with correct UTF-8 flags so Windows Explorer shows readable names.
    try:
        raw = info.filename.encode("cp437")
        decoded = raw.decode("gbk")
        return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        return info.filename


def make_info(name: str, source: zipfile.ZipInfo | None = None) -> zipfile.ZipInfo:
    if source is None:
        return zipfile.ZipInfo(name)
    result = zipfile.ZipInfo(name, source.date_time)
    result.compress_type = source.compress_type
    result.comment = source.comment
    result.extra = clean_extra(source.extra)
    result.create_system = source.create_system
    result.create_version = source.create_version
    result.extract_version = source.extract_version
    result.internal_attr = source.internal_attr
    result.external_attr = source.external_attr
    result.flag_bits = 0
    return result


def main() -> None:
    if not SOURCE_ZIP.exists():
        raise FileNotFoundError(SOURCE_ZIP)
    replace_paths = {PREFIX + rel: SITE / rel for rel in REPLACE.values()}
    added_paths = {PREFIX + rel: SITE / rel for rel in NEW_FILES}
    for path in [*replace_paths.values(), *added_paths.values()]:
        if not path.is_file():
            raise FileNotFoundError(path)

    names_seen: set[str] = set()
    found: set[str] = set()
    root_readme_name: str | None = None
    root_readme_info: zipfile.ZipInfo | None = None
    with zipfile.ZipFile(SOURCE_ZIP, "r") as source, zipfile.ZipFile(
        TEMP_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1, allowZip64=True
    ) as target:
        target.comment = source.comment
        source_entries = source.infolist()
        for entry_index, old_info in enumerate(source_entries, 1):
            name = corrected_name(old_info)
            if "/" not in name and name.lower().endswith(".md") and name.startswith("README_"):
                root_readme_name = name
                root_readme_info = old_info
                continue
            if name in replace_paths:
                found.add(name)
                payload = replace_paths[name].read_bytes()
                target.writestr(make_info(name, old_info), payload)
                names_seen.add(name)
                continue
            if name in added_paths:
                # Replacing rather than duplicating makes repeated builds deterministic.
                continue
            if name in names_seen:
                raise ValueError(f"Duplicate path after filename repair: {name!r}")
            info = make_info(name, old_info)
            with source.open(old_info, "r") as reader, target.open(info, "w") as writer:
                while chunk := reader.read(1024 * 1024):
                    writer.write(chunk)
            names_seen.add(name)
            if entry_index % 250 == 0:
                print(f"Packed {entry_index}/{len(source_entries)} entries", flush=True)

        missing = set(replace_paths) - found
        if missing:
            raise ValueError(f"Replacement paths missing from v6 ZIP: {sorted(missing)!r}")

        if root_readme_name:
            # Put a short v7 changelog above the v6 delivery notes.
            assert root_readme_info is not None
            old_text = source.read(root_readme_info).decode("utf-8", errors="replace")
            old_text = old_text.replace("交付包_v6", "交付包_v7")
            update = (
                "# 交付包说明 · v7\n\n"
                "本版新增四层九节点自动导览、同步旁白视频与字幕、证据等级说明及开放式结尾。"
                "展馆提供网站和独立视频两种展示入口。\n\n"
            )
            target.writestr(make_info(root_readme_name), (update + old_text).encode("utf-8"))
            names_seen.add(root_readme_name)

        for name, path in added_paths.items():
            if name in names_seen:
                continue
            target.write(path, name, compress_type=zipfile.ZIP_DEFLATED, compresslevel=1)
            names_seen.add(name)

    # Validate the completed archive before making it the user-facing version.
    with zipfile.ZipFile(TEMP_ZIP, "r") as result:
        bad = result.testzip()
        if bad:
            raise IOError(f"ZIP CRC failed: {bad!r}")
        missing = set(added_paths) - set(result.namelist())
        if missing:
            raise IOError(f"ZIP missing new deliverables: {sorted(missing)!r}")
        print(f"Entries: {len(result.infolist())}")
        print(f"Root README: {root_readme_name!r}")
    os.replace(TEMP_ZIP, OUTPUT_ZIP)
    print(f"Created: {OUTPUT_ZIP}")
    print(f"Size: {OUTPUT_ZIP.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
