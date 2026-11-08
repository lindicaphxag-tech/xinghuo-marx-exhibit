# -*- coding: utf-8 -*-
"""生成「在线公开版」精简包：只带浏览器真正要加载的东西。

用法：
    python deploy/make_public_bundle.py [输出目录]
默认输出到 桌面/马原/在线版_public/

排除项（不进公开包）：
    video/                    1389 MB  成片与素材，放到别处发布
    assets/models/sketchfab/   224 MB  原始下载（网页只用 sketchfab_web 减面版）
    assets/models/sketchfab_lod 173 MB 中间产物
    shots/ output/ .agents/ .playwright-cli/ 等开发目录
"""
import os, shutil, sys, json

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\HUAWEI\Desktop\马原\在线版_public"

SKIP_DIRS = {
    "video", "screencast", "screencast2", "frames", "shots", "output",
    ".agents", ".playwright-cli", ".github", ".git", "sketchfab", "sketchfab_lod",
    "raw", "__pycache__", "tools",
}
SKIP_FILES = {"启动展馆.bat", "启动（免安装）.bat", "使用说明.txt"}

def main():
    if os.path.exists(DST):
        print("清理旧目录", DST)
        shutil.rmtree(DST)
    n = 0
    total = 0
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(root, SRC)
        out_dir = DST if rel == "." else os.path.join(DST, rel)
        os.makedirs(out_dir, exist_ok=True)
        for f in files:
            if f in SKIP_FILES:
                continue
            s = os.path.join(root, f)
            try:
                size = os.path.getsize(s)
            except OSError:
                continue
            shutil.copy2(s, os.path.join(out_dir, f))
            n += 1
            total += size
    print(f"完成：{n} 个文件，{total/1024/1024:.1f} MB → {DST}")

    # 记录清单，便于核对
    manifest = {"files": n, "bytes": total, "source": SRC}
    with open(os.path.join(DST, "public-bundle.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
