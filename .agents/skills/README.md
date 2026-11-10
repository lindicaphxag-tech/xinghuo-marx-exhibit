# 本项目的设计技能

本目录保留用于展馆 UI/UX 改进的可复用 Agent Skills。安装时从上游 GitHub 固定提交下载；用前先读对应 `SKILL.md` 和所需 references。技能文件是工作流指南，不会自动运行代码。

| 技能 | 来源 / 固定提交 | 许可 | 本项目用途 |
|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) · `ca45fc496a3436251f191354091d557da31c15b5` | 上游 `LICENSE.txt` | 结合历史主题定色、字体、布局与动效；先计划、再检查是否套模板，之后才改代码。 |
| `ux-audit` | [paulunemoon/ux-audit-skill](https://github.com/paulunemoon/ux-audit-skill) · `f07ff7607039a846fba1e711bb99716a68b12f34` | MIT | 对已运行界面进行证据化体验检查；报告严重度、信心、证据和可执行建议。 |

Codex 本机还提供 `ui-ux-pro-max`，用于按产品类型检索 UI、无障碍、响应式和动效规则。该本机技能不随项目重复复制。检索生成结果必须结合项目证据审阅；不适配中文历史展馆的通用配色/字体不能直接落地。本项目已据此整理 [`design-system/xinghuo-and-road/MASTER.md`](../../design-system/xinghuo-and-road/MASTER.md)。

## 已应用的工作流

1. 先用 `frontend-design` 基于展馆受众和叙事任务建立视觉方案，再用用户提出的“明亮、史料可信、动效可解释”约束排除通用方案。
2. 用 `ux-audit` 抽查桌面和窄屏页面；截图、审视报告位于 [`output/playwright/`](../../output/playwright/)。
3. 优先修复移动端导航的可发现性，加入本地 favicon，并把审阅得到的语义颜色、字体、动效和史料边界固化到设计系统。

本轮使用的本地设计检索命令：

```powershell
python "$env:USERPROFILE\.codex\skills\ui-ux-pro-max\scripts\search.py" "museum archival research exhibit historical interpretation" --design-system -p "Xinghuo and Road" -f markdown
```

检索的默认配色与字体针对普通数字产品，未直接套用；最终规范记录了取舍原因。
## 本轮新增：ThreeUI 与 AI Design

核实后的上游与用途：

| Skill / 资源 | 上游固定提交 | 本项目用途 |
|---|---|---|
| `add-gallery` | [MengTo/threeui](https://github.com/MengTo/threeui/tree/68802d5428071ada5c20db8094b1649e6bb770ed) · `68802d5428071ada5c20db8094b1649e6bb770ed` | 研究弧形图像胶卷的视线聚焦、响应式与 WebGL 生命周期；对应报刊期刊探索。 |
| `add-bookshelf` | [MengTo/threeui](https://github.com/MengTo/threeui/tree/68802d5428071ada5c20db8094b1649e6bb770ed) · `68802d5428071ada5c20db8094b1649e6bb770ed` | 研究书籍检查、翻页状态与键盘/减弱动态要求；对应文献阅览。 |
| `threejs` | [MengTo/Skills](https://github.com/MengTo/Skills/tree/a45892d2fdadab75b31fb16abecc02f101b31c43) · `a45892d2fdadab75b31fb16abecc02f101b31c43` | 复核现有 Three.js 的相机、灯光、resize、DPR、资源释放与 reduced-motion。 |
| `landing-page-design`（AI Design） | [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills/tree/4fdcdd52f15eda09da1257c303c860c13e0c879f) · `4fdcdd52f15eda09da1257c303c860c13e0c879f` | 作为 AI Design 的视觉/内容审查清单；营销页转化规则不直接套用多目标历史展馆。 |
| `redesign-existing-projects` | [elayadesign/redesign-skill](https://github.com/elayadesign/redesign-skill/tree/7df13f6a289f4a7f91c5fe3efd70f51fd584ec28) · `7df13f6a289f4a7f91c5fe3efd70f51fd584ec28` | 既有网站先诊断、再按优先级小步修复，保持原生 HTML/CSS/JS 技术栈。 |

### 已应用的约束

- ThreeUI 上游不是单一通用 `ThreeUI` Skill，而是 Three.js 组件库；本地保留的是它为 `Gallery` 和 `Bookshelf` 生成的组件级 Skills。项目仍是原生 HTML/Three.js，不为套用 React 版演示而迁移框架。
- ThreeUI 示例运行时分别依赖 Three.js r149 / r165；本项目有既有版本与模型加载链路，不混载另一套 Three.js。只借鉴契合展馆任务的交互与性能生命周期，并以本项目的明亮阅览室、史料来源、真实卷期和完整阅读路径为准。
- AI Design 的默认品牌字体/色板是通用落地页配置，与历史展馆的阅读性和明亮档案室规范不同；保留它的内容结构、明确状态、响应式与动效检查，不覆写 [`design-system/xinghuo-and-road/MASTER.md`](../../design-system/xinghuo-and-road/MASTER.md)。
- 原有 `frontend-design` 与 `ux-audit` 工作流、审阅证据与此前的实际改动继续有效；本次新增指南已按场景读过并记录边界。

以上上游仓库均为 MIT。对应许可证副本在 [`licenses/`](licenses/)。
