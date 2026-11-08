# 部署到公网（GitHub Pages / Cloudflare Pages）

展馆是**纯静态站点**，无需后端。任选一种方式，5 分钟上线。

## 方式一：GitHub Pages（推荐）

1. 在 GitHub 新建仓库，例如 `workers-museum`，**Public**；
2. 把 `01_展馆/` 目录下的所有文件 push 上去（仓库根目录或 `docs/` 均可）；
3. 仓库 **Settings → Pages**：
   - Source：`Deploy from a branch`
   - Branch：`main` / 根目录（或 `/docs`）
4. 等 1–2 分钟，访问 `https://<用户名>.github.io/<仓库名>/hall.html`。

> 注意：GitHub Pages 单文件有 100 MB 限制。本包最大单文件是 GLB 模型，已核验均 < 50 MB；
> The Bee-Hive 全文包 zip 共 15 MB，无超限。

## 方式二：Cloudflare Pages（国内访问更快）

1. https://pages.cloudflare.com → 连接 GitHub 仓库；
2. Build command 留空，Build output directory 设为仓库根目录；
3. 部署后得到 `*.pages.dev` 域名，国内可直连。

## 方式三：本地局域网演示（答辩现场无网时）

```powershell
cd 01_展馆
python -m http.server 8765 --bind 0.0.0.0
```
同 Wi-Fi 下其他设备访问 `http://<本机IP>:8765/hall.html`。

## 上线后必改

1. `hall.html` 与 `index.html` 里所有 `href="..."` 相对路径保持不变即可，不要改成绝对路径；
2. 若挂自定义域名，在仓库根目录加 `CNAME` 文件写域名；
3. `assets/documents/` 下的离线文献包仅 CC0 / 公有领域，可公开发布；
   **12 张"待核"授权图（见 `02_…/来源与授权.csv`）在授权确认前不要公开发布。**
