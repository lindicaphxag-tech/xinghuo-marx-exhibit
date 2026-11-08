# 星火与道路：工人运动时空叙事

![HTML5](https://img.shields.io/badge/HTML5-无构建-ef652a)
![Three.js](https://img.shields.io/badge/Three.js-r147-000000)
![Offline](https://img.shields.io/badge/离线可运行-是-success)
![PWA](https://img.shields.io/badge/PWA-可安装-4a90d9)

**分散在城市、工厂和报刊中的工人，如何成为一场跨越国界的运动？**

这是一个以历史问题为入口的互动数字展馆。观众沿着城市、组织、出版物和政治行动，走过 1831 至 1917 年的工人运动史；可以跟随短导览，也可以直接进入地图、报刊、人物关系、巴黎公社和历史空间。

> **先看体验：**点击「开始四层自动导览」；也可以直接打开 `index.html?tour=1`。网站会自动经过 9 个节点，从生产条件、理论自觉、组织实践推进到认识方法，逐段滚动并讲解，可暂停、跳段或退出。也可打开[完整讲解视频页](video-tour.html)，连续播放约 3 分钟的旁白视频、切换字幕或按四层章节跳转。

## 30 秒开始

项目为可离线运行的静态网站，无需安装依赖或构建。

1. Windows PowerShell 运行 `powershell -ExecutionPolicy Bypass -File .\启动展馆.ps1`；或在此目录运行 `python -m http.server 8765 --bind 127.0.0.1`。
2. 浏览器打开门厅 <http://127.0.0.1:8765/hall.html>，点击「进入主展馆」。
3. 在主展馆点击「开始四层自动导览」；或访问 `http://127.0.0.1:8765/index.html?tour=1` 直接自动播放。也可自由浏览或使用右侧章节导航。

也可在 Windows 资源管理器中双击 `启动展馆.bat`，由启动器打开门厅。

不要用 `file://` 直接打开 HTML：本地数据和 3D 模型需要 HTTP 服务。

## 先看展馆，再决定怎么逛

推荐从门厅进入主展馆，沿约三分钟的自动导览走完九个节点。网站是可操作版本，讲解视频则完整记录自动推进过程并配有旁白和字幕。下面的截图对应真实页面，可用于仓库首页、课程展示或答辩投屏。

![门厅：从问题进入展馆](video/shots/hall.png)

| 桌面入口 | 手机入口 |
|---|---|
| ![桌面叙事首屏](video/shots/hero.png) | ![手机端三分钟导览入口](video/shots/mobile.png) |

| 城市线索 | 关系网络 | 巴黎公社 | 文献展品 |
|---|---|---|---|
| ![滚动叙事地图](video/shots/mapstory.png) | ![人物与组织关系网络](video/shots/network.png) | ![巴黎公社时序剧场](video/shots/commune.png) | ![文献与展品](video/shots/artifacts.png) |

完整操作顺序与逐站讲解见 [`docs/展示与讲解手册.md`](docs/展示与讲解手册.md)；GitHub 项目展示对标、产品叙事和首页文案见 [`docs/产品定位与展示策略.md`](docs/产品定位与展示策略.md)。自动讲解的视频源文件、字幕与逐站脚本位于 `video/`。

如需重新合成旁白视频，在 Windows 安装了 Microsoft Kangkang 中文语音且 FFmpeg 已加入 PATH 的环境中运行 `pwsh -ExecutionPolicy Bypass -File .\video\build_method_audio.ps1`，再运行 `python .\video\build_method_video.py`。原始网页录屏保存在 `video/out/method-tour-screen-v4.webm`。

## 参观路径

### 3 分钟：跟着主线看懂项目

| 停靠点 | 观众要理解什么 | 建议操作 |
|---|---|---|
| 城市 | 地方性的劳动冲突如何进入跨城历史 | 滚动叙事地图，看城市如何逐段进入主线 |
| 组织 | 人物、团体和思想如何相互连接 | 选择一个节点，再看它与谁、以何种关系相连 |
| 传播 | 思想如何通过出版进入新的公共语境 | 打开报刊胶卷，选择期号并阅读原刊 |
| 行动 | 制度主张如何面对具体事件与战争压力 | 播放巴黎公社时间切片，暂停阅读一个节点 |
| 空间 | 历史现场如何帮助理解事件 | 选择一个展项并观察它对应的档案线索 |
| 记忆 | 历史由哪些行动共同塑造 | 在终章回想前五站，再从档案或空间继续探索 |

### 10–15 分钟：三条专题路线

- **历史怎样展开：**里昂、宪章运动、第一国际、巴黎公社与 1917 年，观察组织形式的变化。
- **观点怎样留下证据：**打开《共产党宣言》初版和历史报刊，沿原文、版本和传播线索阅读。
- **制度怎样经受现实：**按日期查看巴黎公社法令、行动地点和战争进程。

## 展馆内容

- `hall.html`：门厅与参观路线入口。
- `index.html`：序章、10 卷主题展区、四层九节点自动导览与开放式终章。
- `video-tour.html`：含字幕、章节跳转和逐段讲稿的完整自动讲解视频页。
- `scenes.html`：历史空间现场、来源记录和交互场景。
- `assets.html`：图像、文献、模型、空间和互动数据的统一目录，可搜索与筛选。
- `splat-viewer.html`：本地 Gaussian Splat 查看工作台。
- `large-world.html`：3D Tiles 空间尺度工作台。
- `reading-room-panorama.html`、`smolny-panorama.html`：沉浸式全景体验。
- `docs/展示与讲解手册.md`：答辩讲稿、逐站操作、转场句和演示备选方案。

核心资产目录记录 310 个稳定 ID：18 份文献、73 张图像、63 个文物模型、9 个漫游体验、16 个空间模型记录和 131 条交互数据记录。该口径按来源对象去重，不把缩略图重复计数。动态清单见 [`asset_catalog.json`](assets/manifests/asset_catalog.json)。

在主展馆按 `Ctrl/⌘ + K` 可打开快速跳转，搜索卷宗、城市或展品。

## 展示逻辑

全馆围绕一个问题组织：**工人如何从地方性行动发展为跨城市、跨国界的组织与思想运动？** 地图呈现空间联系，人物网络呈现组织关系，报刊与文献呈现思想传播，巴黎公社呈现制度和行动，空间与展品把叙事重新落到具体对象。每一卷标题下的问题引导观众观察，末尾可展开对应馆藏与原始材料入口。

## 技术与结构

纯 HTML、CSS 和 JavaScript，无框架构建步骤。Three.js 承担部分 WebGL 场景，Canvas 2D 用于地图、网络和时间可视化；静态资产和供应商依赖随项目提供，离线启动不依赖 CDN。

交互层使用 GSAP 滚动驱动、Embla Carousel 和 PDF.js；PWA 通过 Service Worker 缓存访问过的页面与核心资源，大体积模型和视频按需联网读取。项目提供 GitHub Pages 工作流，部署步骤见 [`DEPLOY.md`](DEPLOY.md)。

主要目录：

```text
index.html                 叙事主线
scenes.html                历史空间目录
assets.html                搜索与筛选目录
js/data/                   分卷叙事、人物关系、事件和史料数据
js/scenes/                 交互视图与场景逻辑
assets/manifests/          统一资产、来源和权利清单
assets/models/             文物模型及预览
assets/scenes/             空间模型
docs/                      研究、实现、操作和讲解文档
```

## GitHub 展示建议

公开仓库时，建议启用 GitHub Pages，将首页 Demo 链接放在仓库描述和 README 顶部。发布前从当前页面重新截取首屏、叙事地图、关系网络、巴黎公社和展品空间五个画面，并保留一段不超过 30 秒的演示视频。这样访客可以先判断体验，再决定是否下载完整资料包。

素材来源、许可和模型制作方式见展馆内的档案目录及 `docs/来源与授权.md`。模型、地图和可视化的具体呈现口径请以各展项说明为准。

## License

代码与叙事文本：CC BY-NC-SA 4.0。第三方图片和模型各自遵循其来源许可，见 `assets/manifests/来源与授权.csv`。


