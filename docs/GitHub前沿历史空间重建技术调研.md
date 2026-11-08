# GitHub 前沿历史空间重建技术调研

核查日期：2026-11-01  
目标：为本展馆选择能实际改善历史空间真实性、场景规模、地理对齐与交互的开源技术。这里的“前沿”不等于仓库刚创建；按近期维护、可复现工作流、格式互通、许可证与项目适配性判断。

## 结论先行

项目已有独立的 Three.js r180 + Spark 2.4.0 实景扫描工作台，因此不需要再换一套 Gaussian Splat 渲染器。下一阶段最有价值的技术增量是：

1. **超大地理场景按需流式加载**：NASA-AMMOS/3DTilesRendererJS，配合公开 LiDAR / 城市模型的 3D Tiles。它能把当前“点云窗口”和模型参考入口扩展为可定位、可分块、带 LOD 的现场环境；不是历史复原算法。
2. **实拍图像产生可量测网格**：COLMAP 的 SfM + MVS / 网格纹理流程，或 AliceVision Meshroom。需要新采集的足够重叠、视角覆盖良好的照片，输出点云/网格后再注册到地理坐标；档案中的零散版画不能代替现场摄影。
3. **历史地图恢复街区级语义模型**：histo3d → CityJSON → Three.js loader。适合从同年代地图恢复街廓、地块与建筑体量；模型中的高度、屋顶和内部必须区分史料与推断，不能把程序化体量称为扫描。
4. **从 3DGS 获得表面/网格**：2DGS、SuGaR、MILo 是值得做小样验证的研究路线，但许多代码路径继承原始 Gaussian-Splatting 的非商业研究许可，发布展馆前应逐库核对许可；暂不直接用于正式资产生成。

## 仓库筛选与适配

| 项目 | 能做什么 | 本项目适配 | 状态 / 许可要点 | 建议 |
| --- | --- | --- | --- | --- |
| [sparkjsdev/spark](https://github.com/sparkjsdev/spark) | Three.js 中混合渲染高斯泼溅与网格；支持 PLY、SPZ、SOG 等格式 | 已在 `splat-viewer.html` 作为独立 r180 工作台使用，避免和主馆 r147 冲突 | GitHub 标注 MIT；当前仓库活跃 | 保留现有，不重复安装。后续只对比大型 SOG/移动端场景表现 |
| [PlayCanvas SuperSplat Viewer](https://github.com/playcanvas/supersplat-viewer) + [SplatTransform](https://github.com/playcanvas/splat-transform) | 浏览器编辑、压缩、发布高斯场景；支持 Streamed SOG 多级分块，Viewer 有实验性的 WebGPU stochastic 渲染选项 | 可作为 Spark 工作台处理超大扫描时的候选后端；SplatTransform 还列出 voxel 碰撞数据，可供步行体验的碰撞实验 | Viewer MIT；SuperSplat / SplatTransform 也由官方列为 MIT；WebGPU stochastic 功能标为实验 | 先用同一份扫描做 A/B：首次可见时间、显存、拖动稳定性、低端设备表现。不要为了特效改掉当前已能用的工作台 |
| [NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) + [3D Tiles](https://github.com/CesiumGS/3d-tiles) | Three.js 按视锥和误差加载地理场景瓦片；支持摄影测量、建筑、地形、点云等异构内容 | 优先用于巴黎、伦敦、肯宁顿和杨浦等现址的区域级背景，把局部 LiDAR / 城市建筑与历史点位统一在地理坐标中 | Renderer Apache-2.0；与 Three.js 集成；当前 peer dependency 要求较新 Three.js，主馆 r147 不宜直接混用 | 新建独立 r180 空间地图/场景页，或先尝试在 r180 工作台加载单一 tileset；核验真实可访问的数据源、API key 与再利用许可 |
| [Potree](https://github.com/potree/potree) / [PotreeConverter](https://github.com/potree/PotreeConverter) | 大规模点云多分辨率八叉树渲染；面向浏览器查看海量 LAS/LAZ 数据 | 若取得整片巴黎或室内的百万级以上点云，可补足现有单区域直接读取；目前联邦社墙已展示 213,721 个点，未必需要迁移 | 老牌 WebGL 点云查看器；数据需预处理为 Potree 层级格式；逐仓库核实许可及版本组合 | 把它当“超大点云模式”，不要拿它代替 Three.js 文物/模型工作流 |
| [COLMAP](https://github.com/colmap/colmap) | 影像 SfM、相机标定、MVS 深度融合、稠密点云与网格纹理 | 可对新采集现场照片产生可检查的稀疏/稠密模型；并支持导出网格与纹理 | BSD；官方仓库持续维护，提供 Windows 构建和 CLI/Python 接口；依赖另有许可 | 下次现场采集首选验证路线。先以标尺/控制点校尺度，再检查相机覆盖、重投影误差和网格洞；旧照片稀少时不要预期自动成功 |
| [AliceVision / Meshroom](https://github.com/alicevision/AliceVision) | 图形化摄影测量流水线：特征匹配、SfM、MVS、纹理模型 | 适合文博/现场采集人员用 GUI 复核采集集与网格；可作为 COLMAP 失败时的第二套算法比较 | AliceVision MPL-2.0，Meshroom 含多个依赖许可；运行要求与显卡版本需按平台确认 | 只在拍摄数据较完整时做并行复建；与本项目已经进行的 COLMAP 试算对照，不为旧影像再次重复大规模盲跑 |
| [histo3d](https://github.com/CamilleMorlighem/histo3d) + [CityJSON](https://github.com/cityjson) + [CityJSON Three.js loader](https://github.com/cityjson/cityjson-threejs-loader) | 从历史地图抽取地块/建筑轮廓，结合当代点云和仍存建筑，生成带语义的 CityJSON 城市模型；loader 支持 Three.js 选中与拾取 | 可把杨浦机器织布局、圣马丁堂、巴黎街垒与历史街区从“单体模型”扩展成有背景、有相邻街道的空间叙事 | histo3d MIT；CityJSON 是开放标准；loader MIT，但依赖 Three `^0.165`，适合单独 r180 页面而非直接塞进 r147 主场景。histo3d 需要 GRASS GIS、Blender、GIS 数据和参数校正 | 先在资料最齐的一个场地做小范围验证：历史地图配准 → 建筑轮廓 → 有证据的高度分级 → CityJSON → Three.js；把未知高度明确标作不确定 |
| [2D Gaussian Splatting](https://github.com/hbb1/2d-gaussian-splatting) | 用二维表面片表示场景，目标是更好的几何一致性；提供网格提取，方向上较 3DGS 更适合表面结构 | 对小型、有完整绕拍的纪念碑或房间可研究“视觉效果 + 可用表面”混合方案 | 当前官方仓库许可证沿用原始 Gaussian-Splatting License：研究/评估用途为主，商业使用需事先许可 | 只做研究样片，不进公开发布资产，直到确认该项目用途和发行方式满足许可 |
| [SuGaR](https://github.com/Anttwo/SuGaR) / [MILo](https://github.com/Anttwo/MILo) | 将网格/表面优化纳入 Gaussian 表示；输出可用于继续编辑的网格、纹理或混合表示。MILo 是更新的 mesh-in-the-loop 路线 | 可以比较“仅看着像”与“能拿来做几何交互”的差别；用于已有高覆盖度新扫描，不适用于证据稀少的历史照片 | SuGaR 与 MILo 仓库说明其部分代码依赖原始 Gaussian-Splatting 实现，许可带非商业研究限制；另有依赖需单独审核 | 技术上前沿、合规上不应直接并入正式馆。可用许可清晰的 COLMAP 几何网格做主资产，把 3DGS 当视觉对照 |

## 对现有展项的落地路径

### A. “现址真实空间”层：3D Tiles + 现有 LiDAR / 城市开放数据

目标不是给旧址贴一张地图，而是让观众在真实地理坐标中看到街区、遗址、地形和历史定位。建议的页面结构：

1. 基于现有场景 `longitude/latitude/height` 定义统一 CRS / 米制局部坐标。
2. 有公开 tileset 的位置采用 3D Tiles，按视点逐层加载；没有现成 tileset 的巴黎 IGN 点云仍用已工作的 COPC 路径，不为形式重做数据。
3. 历史建筑复原 GLB 以同一坐标锚定，提供 `历史复原 / 当前点云或地表 / 位置与来源` 图层切换。
4. 明确显示数据年份、空间分辨率、是否建筑立面扫描、坐标误差或缺失；地下/室内未测部分不生成伪精细空间。

最适合先试：肯宁顿公地（现有裸地 DTM）或联邦社墙（现有 IGN 点云）；之后再接巴黎街垒定位点。杨浦先使用官方城市底座入口，拿到许可可直接访问的 tileset 后再集成，不能用 API 未获授权的服务当作公开下载数据。

### B. “有照片但没模型”层：COLMAP / Meshroom 采集协议

新现场数据按摄影测量来采，不要只收正面照片：外立面需要闭环绕拍、相邻影像高重叠、多个高度层；室内要覆盖转角与天花板，放尺度尺/控制点，保存原始影像、焦距、拍摄位置、许可证明。COLMAP 输出稀疏相机与稠密点云，必要时 Meshroom 交叉复建。几何验收后再做网格清理、纹理和坐标定位。

本项目已经验证过：斯莫尔尼网页/档案照片数量多也不代表视角有足够重叠。该场地的既有试算未能形成可用摄影测量模型，因此不能仅把优化算法换成更“AI”的仓库，就推断能补出隐藏立面。

### C. “已消失历史街区”层：历史地图 → CityJSON

histo3d 的完整输入不只是一张古地图：需要配准后的地图、地面点云、现存建筑轮廓/模型、训练点和地面真值。它输出的是由地图与参数推导的建筑体量，不是原址扫描。工程版本可将每栋建筑保存 `source_map_id`、`map_year`、`height_source`、`confidence`、`reconstruction_method` 等元数据；网页点选建筑即可呈现依据和置信度。

适合把“历史空间”从几个孤立展柜升级为可比较的历史街区；第一期只做一小片，不要直接将其覆盖成全城“精确复原”。

## 推荐优先级

| 优先级 | 工作 | 依据 | 当前决策 |
| --- | --- | --- | --- |
| P0 | 以 3DTilesRendererJS 做单场景接入实验 | 与现有浏览器 Three.js 方案兼容，支撑地理瓦片按需加载 | 新建独立 r180 页；先找有许可且不用私钥的数据 |
| P0 | 建立 COLMAP 现场采集和几何验收模板 | 直接产生相机、点云、网格等可审查的几何证据 | 等取得真正多视角现场图像后启动；旧馆藏照不做无效重算 |
| P1 | 对一处历史街区做 CityJSON 证据分级原型 | 解决场景周边过空和历史定位割裂 | 选杨浦厂区或圣马丁堂周边，优先选地图/现状数据许可明确的对象 |
| P2 | SuperSplat Streamed SOG 与 Spark 性能对照 | 可以优化已有 Gaussian 工作台的大场景加载 | 仅当扫描文件过大或低端设备卡顿时做 |
| 研究项 | 2DGS / SuGaR / MILo 网格路线 | 表面质量与几何可用性值得关注 | 许可和GPU/Windows环境先评估；不直接替代可量测现场网格 |

## 参考仓库

- Spark：<https://github.com/sparkjsdev/spark>
- SuperSplat Viewer：<https://github.com/playcanvas/supersplat-viewer>
- SplatTransform：<https://github.com/playcanvas/splat-transform>
- 3D Tiles Renderer for Three.js：<https://github.com/NASA-AMMOS/3DTilesRendererJS>
- 3D Tiles Specification：<https://github.com/CesiumGS/3d-tiles>
- Potree：<https://github.com/potree/potree>
- COLMAP：<https://github.com/colmap/colmap>
- AliceVision：<https://github.com/alicevision/AliceVision>
- Histo3D：<https://github.com/CamilleMorlighem/histo3d>
- CityJSON Three.js Loader：<https://github.com/cityjson/cityjson-threejs-loader>
- 2DGS：<https://github.com/hbb1/2d-gaussian-splatting>
- SuGaR：<https://github.com/Anttwo/SuGaR>
- MILo：<https://github.com/Anttwo/MILo>

## 第二轮：视觉基础模型、语义场景和动态重建

本轮重点是 2025–2026 年的多视图重建基础模型及可交互语义场景。它们适合作为“采集和建模工具链”的候选，不会自动补足历史证据。

| 仓库 | 新增能力 | 项目用途与限制 | 结论 |
| --- | --- | --- | --- |
| [facebookresearch/MapAnything](https://github.com/facebookresearch/map-anything) | 一个前馈模型支持多视图 SfM、MVS、单目度量深度、点云/深度补全、配准等多种任务；官方发布了 Apache 2.0 代码及 Apache 2.0 权重变体 | 可用于“先快速看图像能不能形成一致几何”的预检，再导出相机/点云与 COLMAP、网格/3DGS流程比较。Apache 版本与研究用 CC-BY-NC 版本由不同训练数据组成，必须明确选用。预测只是一种估计，需控制点和独立测量校准 | **新增 P0 候选**：最适合给真实采集的新照片做预重建/算法对照；不拿预测自动填造历史建筑 |
| [facebookresearch/VGGT](https://github.com/facebookresearch/vggt) | 单次前馈从多张图像推断相机、深度、点图、点轨迹；可导出 COLMAP 格式，再进入 gsplat | 代码开放许可已更新，但原 checkpoint 仍非商业；只有 VGGT-1B-Commercial checkpoint 可按其专门许可用于商业场景，且需申请获取 | 作为辅助重建路线；用于正式处理必须锁定获准的权重版本和许可 |
| [facebookresearch/VGGT-Omega](https://github.com/facebookresearch/vggt-omega) | 2026 年更新的长序列视觉几何模型，提供 512 分辨率模型、文本对齐变体、训练/复现代码和几何过滤工具 | 官方公布的 A100 推理显存样例中，100 帧约13.37GB、300帧约28.26GB、500帧约43.15GB；权重申请受访问审核，LICENSE 是 FAIR Noncommercial Research License | **研究级观察**：大场景长序列采集有价值，但许可证、权重访问与资源门槛不适合作为当前正式生产依赖 |
| [lkeab/Gaussian Grouping](https://github.com/lkeab/gaussian-grouping) | 将二维 SAM 的分割掩膜提升成三维高斯分组，可按对象/区域分割与编辑 | 可用于试做“点选墙体/窗户/讲台后突出显示说明”的交互概念；其视觉分组依赖训练与分割结果。展馆可先用几何拾取 + 人工标注属性实现同类科普交互，避免运行研究训练栈 | **交互原型候选**：能增强现场扫描的可读性；模型生成的分组不能替代文物分类或史料判断 |
| [naver/DUSt3R](https://github.com/naver/dust3r) / [MapAnything](https://github.com/facebookresearch/map-anything) | DUSt3R 系列由两图几何扩展到 MASt3R 局部特征、Pow3R 相机/深度先验和 MUSt3R 多视图预测 | DUSt3R 代码和预训练权重使用 CC BY-NC-SA 4.0。MapAnything 中有 Apache 变体，许可更清晰；两者不能混为一谈 | 新项目先评估 MapAnything Apache checkpoint；DUSt3R 留作研究比较 |

### 这轮的项目级判断

- **首选新评估对象：MapAnything Apache checkpoint。** 它不是新渲染器，而是更灵活的建模前处理。用其输出与项目已用过的 COLMAP 对同一组实拍图做可复现对照，可判断是否在低重叠/复杂视角上有实际收益。必要的地理尺度约束仍需已知长度、测量点或 LiDAR 控制。
- **场景理解首选轻量实施：模型点选 + 证据面板。** Gaussian Grouping 是把分割带进 3DGS 的先进方法；但当前展馆的扫描页面没有这套训练字段。先在现有 Three.js mesh/热点上为窗、门、楼梯、街垒、纪念碑刻字建立可见的命名热点，并记录来源，稳定且不需牺牲模型可测量性。
- **时间轴式复原需限制含义。** 4D Gaussian Splatting 项目主要学习真实视频里的动态物体/场景变化；它无法从多个相隔年代的历史照片自动复原“建筑如何变化”。若同地点各年代模型都有资料，可以用明确离散的历史版本切换；不要让动态插值伪装为有证据的连续演变。
- **单张图/AI补全只用于展示假设。** VGGT、DUSt3R 等可能对单图给出令人信服的空间，但官方也强调零样本单图能力未必有完整定量评估。遮挡背面、室内布局和已经拆毁的结构必须继续标为未知或推演，不作为真实扫描文件进入资产主目录。

### 新增仓库链接

- MapAnything：<https://github.com/facebookresearch/map-anything>
- VGGT：<https://github.com/facebookresearch/vggt>
- VGGT-Omega：<https://github.com/facebookresearch/vggt-omega>
- Gaussian Grouping：<https://github.com/lkeab/gaussian-grouping>
- DUSt3R：<https://github.com/naver/dust3r>
- 4D Gaussian Splatting（动态视频场景研究）：<https://github.com/fudan-zvg/4d-gaussian-splatting>

# 大体量场景与动态时空：新增技术调研（2026-11）

本节专门回答“场景规模继续扩大、历史空间随时间变化怎么办”。这里的“动态”分成两类：连续运动（由视频/连续影像捕捉）和离散历史阶段（有证据的不同年代状态）。两者不能混为一谈：静态历史照片不能证明人物、车辆或建筑曾按某种轨迹运动；没有中间史料时，不应把两个年代模型平滑变形成看似真实的过程。

## 结论先行

- **大场景主线：3D Tiles 管城市/地形/点云分块，Spark RAD 管高斯扫描分块。** 现有独立扫描工作台已是 Three.js r180 + Spark 2.4.0，适合先继续沿用；Spark 文档说明其 LoD 与分页加载用于大型 splat，并给出预构建 LoD 和分页加载方案。不要把整座城市做成一个巨型 PLY 一次性载入。
- **动态历史主线：时间轴切换可考证的离散状态。** 每一状态是带年代、来源、空间范围、精度/不确定性说明的独立图层；用淡入/擦除/分层显隐表达“发生变化”，不伪造连续变化。
- **真正连续的 4DGS 只用于有连续视频的场景。** 它可以重建被拍摄对象的动态外观，不会凭空恢复没有拍摄记录的历史事件。
- **落地顺序：先把大体量静态场景做成流式、可定位、可分层；再把有史料的时间切片接入时间轴；最后才评估 4D 视频重建。**

## 候选技术与项目适配

| 路线 / GitHub | 规模与动态能力 | 接入现状、风险 | 判断 |
| --- | --- | --- | --- |
| [Spark 2.x LoD / RAD](https://github.com/sparkjsdev/spark) | 高斯场景 LoD、分页/按块加载，适用于高细节实景扫描；可在页面中组合多个 splat 场景对象 | 项目已有 Spark 2.4.0 + Three r180，版本方向匹配。RAD 分页需要真实数据与 HTTP Range/缓存链路验证；仓库 issue 有超大数据内存与流式兼容问题反馈 | **当前最适合先做的高斯大场景路线**；先用既有资产验证，不宣称未经测试的容量上限 |
| [PlayCanvas SplatTransform / Streamed SOG](https://github.com/playcanvas/splat-transform) | SOG 分块、多级细节、按需流式加载；提供转换与压缩工具 | 渲染器属于 PlayCanvas 生态，不能把 PlayCanvas 引擎对象直接塞进现有 Three 页面；可用独立对照页验证同一数据。仓库采用 MIT 许可 | **第二渲染后端候选**；若 Spark 在目标设备的内存/速度不达标，再作 A/B，不先重写 |
| [NASA-AMMOS 3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) + [3D Tiles](https://github.com/CesiumGS/3d-tiles) | 面向城市级建筑、地形、摄影测量模型与点云，按视锥、屏幕空间误差与层级请求瓦片 | 可与 Three.js 集成；仓库既有调研已指出适合单独 r180 空间页，主馆 r147 避免直接混用。性能最终取决于 tileset 质量、网络、GPU 和缓存 | **城市底座首选**；要找真实授权 tileset 或自行转换数据 |
| [MapLibre COPC Layer](https://github.com/Kanahiro/maplibre-copc-layer) | COPC 点云在地图视野中按需读取；面向大地理范围 LiDAR | 小型独立项目，须核查 license、兼容版本与长期维护；MapLibre 自定义层和当前 Three 场景需桥接，不是直接替换 | **现有 COPC 点云扩展候选**；先拿现有 COPC 样本做短验证 |
| [Temporal 3D Tiles 2.0 方向](https://github.com/CesiumGS/3d-tiles/blob/main/next/2.0/README.md) / [UD-Viz temporal extension](https://vcityteam.github.io/UD-Viz/html/extensions_3d_tiles_temporal/) | 把不同日期/版本的空间数据组织成可切换的时间状态，适合多期 LiDAR、街区模型与修复前后对照 | 3D Tiles 2.0 文档在 `next` 路线，不能当作已经稳定普及的生产标准；UD-Viz 是不同渲染技术栈的扩展，不能视为现有 Three 项目即插即用。插值过渡只作视觉辅助，不能表示史实 | **数据结构参考，暂不押注为核心运行时**；当前用自有时间切片清单即可 |
| [4D Gaussian Splat Format](https://github.com/avala-ai/4dgs) | 面向单文件、可寻址/可流式的时间变化高斯场景格式 | 格式项目较新；仓库明确把 viewer、renderer 和引擎集成排除在范围之外，生态尚不能等同于通用可播放格式 | **前沿跟踪项**；等浏览器端生产级播放器和导入链成熟后再验证 |
| [4D Gaussian Splatting](https://github.com/fudan-zvg/4d-gaussian-splatting) | 从动态视频重建随时间变化的 3DGS | 研究代码与 GPU/CUDA 流程为主，不是网页播放引擎；需要连续视频和拍摄覆盖 | **只用于确有视频的数据**，不能拿来“补演”历史空间 |
| [Gaussian-Splat-Lite](https://github.com/WilliamLiu-1997/Gaussian-Splat-Lite) | 针对 GIS/大坐标、WebGPU/WebGL2 与流式 SOG/RAD 的轻量渲染方向 | 当前要求 Three.js >=0.187，而项目扫描页为 r180；项目活跃但相对年轻 | **后续性能基准候选**，先等升级窗口并与 Spark 同数据比较 |
| [RD4DGS](https://github.com/HyeongminLEE/RD4DGS) | 研究 4DGS 压缩 | 仓库仍偏研究预印本/实验，结果展示与工程接入不完整，许可含非商业条款 | **不进入正式生产链** |

## 建议的时空数据模型

每个阶段/空间图层使用显式记录，不把动画关键帧当史料：

```json
{
  "id": "site-paris-commune-1871",
  "label": "巴黎公社时期（1871）",
  "time": { "start": "1871-03-18", "end": "1871-05-28", "precision": "day" },
  "geometry": "tileset-or-scene-url",
  "representation": "survey | photogrammetry | archival-map-model | interpretive",
  "sources": ["archive-record-id"],
  "confidence": "documented | inferred | illustrative",
  "notes": "说明哪些结构来自测绘，哪些来自史料推断"
}
```

场景浏览按相机视距与屏幕误差加载 LOD；时间控制器只激活当前时间有效的切片。相邻切片切换时保留前后对照（滑杆、擦除或并列），并在对象/图例里显示“测绘、照片建模、地图推演、示意”来源类型。只有当多个日期的数据确实可比时，才展示变化量；不可比的阶段只切换，不计算假精度差异。

## 面向本项目的实施路线

1. **建立大场景基准样本。** 选现有最完整的扫描，记录原文件大小、点/高斯数量、格式、坐标范围、目标机器与浏览器。对比当前直载、Spark 预构建 LoD/RAD 分页；记录首屏可见时间、完整加载时间、内存、相机移动帧率和失败恢复。不要用仓库宣传数据替代本机测量。
2. **搭建城市底座验证页。** 在独立 Three r180 页加载授权的 3D Tiles 样例，试坐标原点、地理锚定、切块、拾取与渐进加载；项目主馆 r147 不升级、不混插 r180 插件。
3. **为当前点云评估 COPC 分层。** 若现有 COPC 的区域、密度或多个场景增长到难以整体加载，再比较 MapLibre COPC 与当前 Three/COPC viewer；依据现有点云文件和网络能力决定，不为“新技术”重复迁移。
4. **先让年代切片可解释。** 以一个有多期地图/测绘/图像依据的地点建立 2–3 个真实可追溯状态。界面显示每期数据日期、来源、复原等级；用户能比较前后状态并打开证据。
5. **再评估真实动态重建。** 只有补采到连续、足够覆盖的视频时，才用 4DGS 研究重建运动；静态档案场景用有证据的离散变化叙事。

## 结论

真正能支撑本项目“大体量、动态”的不是单一 4D 模型，而是**空间分块/LOD + 多期证据图层 + 时间筛选/对照 + 可追溯来源**。当前工程最稳妥的组合是：城市与地形用 3D Tiles，高细节局部扫描继续用 Spark 并验证 RAD/LoD，历史时间变化用明确的多期状态组织；4DGS 与新格式维持试验路线，直到数据条件和浏览器播放器都成熟。
