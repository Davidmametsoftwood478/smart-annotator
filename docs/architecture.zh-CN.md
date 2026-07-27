# 智能批注器 · 方案与架构（v10）

> 对 AI 产出物做**批量批注 → 一次性批量修改**，替代「批一处、改一处」的低效循环。
> 面向产品 / 营销 / 媒体文案等用 AI 产内容的知识工作者。单人本地、无后端、可离线。

---

## 1. 目标与场景

- **痛点**：AI 初稿要反复人工修改，逐条反馈效率低。
- **做法**：像给文档加批注一样标出多处问题，先**累积**、暂不触发修改；批完把「原文 + 全部批注」整体交给 AI，一次性改完，再前后对比确认。
- **形态**：第一阶段是「打开即用的单文件网页」，并已沉淀为可在 Claude 内直接调用的 **skill**。

## 2. 关键决策（现状）

| 维度 | 选择 |
|---|---|
| 支持格式 | 轻量（工具内渲染）：HTML / Markdown / 纯文本 / CSV；文档视觉（skill 侧转视图）：Word docx / Excel xlsx / PDF / PPT pptx / 图片 |
| 批注形态 | **划词高亮 + 整段 + 圈选视觉区域** 三种 |
| 渲染 | **静态**（innerHTML，文档类）与**交互**（iframe，脚本运行、可点击）双模式，自动切换 |
| 修改通道 | ① 内置 AI 调用（Anthropic / OpenAI 兼容，多模态可看图）② 导出批注单文件 / 复制 Prompt，回传给对话里的 AI |
| 回传方式 | 主推**导出一个 `.md` 批注单文件 → 拖回对话**（不用复制长文本）；备选 JSON 批注包、手动复制 |
| 协作 | 单人本地，数据只在浏览器内存/localStorage，Key 不落盘 |
| 语言 | 中英双语，**默认英文**，一键切换并记忆；prompt 跟随界面语言 |
| 多文档 | 标签栏管理多篇，各自独立批注，导出合并为一份批注单 |

## 3. 数据结构

一条批注：

```js
{
  id, kind,            // kind: 'selection' | 'block' | 'region'
  quote,               // 被批注的原文文本 / 区域摘要
  blockLabel,          // 位置标签，如 p#4、圈选区域
  comment,             // 用户的修改意见
  // 仅 region：
  rect,                // 相对渲染区的框选坐标 {x,y,w,h}
  snippetHTML,         // 框内底层 HTML 片段（供 AI 定位并改 HTML/CSS）
  thumb                // html2canvas 截取的区域缩略图 dataURL
}
```

导出格式两种：`annotation-order-*.md`（原文+批注清单+改写指令，人/AI 都可读，主推）与 `annotation-pack-*.json`（含截图 base64，供程序化处理）。

## 4. 分层架构

### ① 渲染层
- **静态模式**（默认，文档 / Markdown / CSV / 无脚本 HTML）：`innerHTML` 直渲染；Markdown 用内联 **marked**（GFM）；CSV 用内联解析器转表格；失配回退 miniMarkdown。
- **交互模式**（带 `<script>` 的可交互 HTML 自动进入）：用 **iframe（srcdoc）** 渲染，页面脚本正常运行、可点击操作；iframe 按内容高度自适应。
- 模式判定 `decideMode()`：HTML 且含 `<script>` → 交互；否则静态。顶栏「⚡交互模式」可手动覆盖。
- **两条格式路径**（用户选定"两者都要"）：
  - *轻量·工具内*：HTML / Markdown / 纯文本 / CSV，浏览器直接渲染，离线；图片文件在工具内包成 `<img>` 视图。
  - *文档视觉·skill 侧*：docx / xlsx / pdf / pptx / 图片由 `build_annotator.py`（Python）转成可批注视图——docx→HTML(mammoth)、xlsx→表格(openpyxl)、pdf→逐页 PNG(PyMuPDF)、pptx→LibreOffice 转 pdf 再逐页图（缺 soffice 回退取文字）、图片→内嵌——注入工具并记 `originalFile`，避免工具内联重解析库。

### ② 批注层
- **划词**（静态）：`TreeWalker` 遍历选区内文本节点、逐段包裹 `<mark>`，规避 `surroundContents` 跨元素报错。
- **整段**（静态）：块级元素打 `data-block` 序号 + 悬停 💬 按钮。
- **圈选**（静态 & 交互通用）：覆盖层拖框 → `captureSnippet()` 取「能完整包住框的最近祖先」的 outerHTML，`captureThumb()` 用 html2canvas 截图；坐标按模式切换取 `#doc` 或 `iframe.contentDocument`。
- **模式-能力矩阵**：静态支持三种；交互只支持圈选（不往运行中的页面注入批注 UI，避免干扰其脚本）。

### ③ 组装层
- `buildPrompt()` = 编辑角色指令 + 完整原文 + 结构化批注清单。
- 划词/整段批注用 `JSON.stringify(quote)` 精确引用；圈选批注附 `snippetHTML` 代码块（并提示"随附截图"）。

### ①.5 多文档层
- `state.docs[]` 每篇 `{id,name,format,source,mode,userSetMode,originalFile,annotations,seq}`；`state.*` 恒为「当前文档」的活动副本。
- `syncActive()`（活动→docs）与 `adoptDoc()`（docs→活动）成对使用，`activateDoc/closeDoc/renderTabs` 负责切换与标签；单篇时标签栏自动隐藏，不增加界面负担。
- 导出/提交面向**全部文档**，侧栏列表与计数面向**当前文档**，另有 `scopeHint` 显示「共 N 篇，M 篇已有批注」。

### ①.6 i18n 层
- `I18N.{en,zh}` 词典 + `t(key,...args)`（支持函数式插值）；静态文案用 `data-i18n / -html / -title / -ph` 标注，`applyI18n()` 统一刷写并重绘列表与标签。
- **UI 语言同时决定 prompt 语言**——英文界面产出英文批注单，避免混语。

### ②.5 结构锚点层
- 转换器在视图里埋坐标：`data-cell`（xlsx/CSV 单元格）、`data-page`（pdf/pptx 页）。
- 工具端 `anchorOf(node)` 逐级上溯取最近锚点（cell → page → block 序号兜底）；`anchorForRect(rect)` 对圈选框做几何相交，把覆盖到的单元格汇总成 Excel 区域、页汇总成页范围。
- 锚点存入 annotation 的 `anchor:{type,ref}` 与 `blockLabel`，随批注单/JSON 一起传给 AI，是二进制格式「改得准」的关键。

### ③.5 持久化层
- `saveSession()` 防抖写 localStorage（key `smart-annotator:last`），载荷含原文、格式、模式、全部批注（含 rect/snippetHTML/thumb）与 seq。
- `applySession()` 为「恢复上次」与「载入批注包」共用的重建入口：回填 state → `renderContent()`（内部 `reindexAnnotations()` 重新落高亮/整段/圈选框）→ `renumberRegions()` → `renderList()`。
- 全部存储调用 try/catch 包裹，任何环境异常都只降级、不中断批注。

### ④ 应用层（结果 / 采纳 / 回执）
- **内置调用** `callAI()`：Anthropic（`/v1/messages`，自动带 `anthropic-dangerous-direct-browser-access`）或 OpenAI 兼容（`/chat/completions`）；圈选截图作为 **image block** 走多模态，让模型真正"看到"视觉。
- **导出回传**：主推导出 `.md` 批注单，拖回对话让 AI 改；下载用「挂 DOM + 延迟 revoke」，避免大文件被立即取消。
- **逐条采纳**：LCS 行级 diff → 合并连续增删为 hunk；每块可勾选，`assemble()` 按勾选重组（接受用新行、拒绝留旧行），支持全选/全不选，多文件分文件审阅。
- **批注回执**：`verifyNotes()` 用「引用指纹是否仍原样存在」判定 changed / nochange / unknown，给出 N/M 摘要并高亮未检出项；`resubmitUnapplied()` 生成只含未生效批注、基于当前版本的追加请求。
- **诚实边界**：核验是启发式——"在这句后面补个数据"这类不改原句的批注会显示"未检出"，界面明确说明需自行确认，不做过度断言。

## 5. 交付形态与构建

- **单文件**：`annotator.template.html`（应用）+ 构建脚本 `build.mjs` 把 **marked**（~42KB）与 **html2canvas**（~198KB）内联进 `<!--__LIBS__-->` 占位，产出 `smart-annotator.html`（~275KB，离线可用）。
- **预加载入口**：模板含 `/*__PRELOAD__*/` 占位，供 skill 注入内容后打开即自动渲染。

## 6. Skill 封装（可在 Claude 内直接调用）

```
smart-annotator/
├── SKILL.md                    # 两阶段编排：A 打开工具 / B 应用批注
├── assets/annotator.html       # 完整工具（含预加载入口）
└── scripts/build_annotator.py  # 把内容注入工具、按扩展名判格式；对 </script> 转义
```

- **阶段 A**：把用户内容写入临时文件 → 跑 `build_annotator.py` 注入 → SendUserFile（桌面端可 create_artifact 常驻）→ 用户批注 → 点「导出批注单」拖回对话。
- **阶段 B**：识别回传的 `annotation-order-*.md` / `annotation-pack.json` / 粘贴文本 → 依批注整体改写 → SendUserFile 交付新版。
- 回传走文本通道，圈选截图不随文本传递，但 `snippetHTML` 已足够定位改 HTML/CSS；需"看图"时另附截图或用 JSON 包。

## 7. 已知取舍 / 限制

- `<canvas>`（JS 画布）绘制的图表：截图能看到像素，但没有对应 HTML 可改，AI 只能给建议；SVG / HTML / CSS 做的可视化可正常改。
- html2canvas 无法 100% 还原复杂 CSS / 跨域图片 / 自定义字体。
- 圈选 `snippetHTML` 可能过/欠捕获容器，用缩略图确认。
- 交互模式的 iframe 用 `sandbox="allow-scripts allow-same-origin ..."`：脚本运行且父窗口可读取以供批注；因内容是用户自有产出、本地打开，权衡下可接受。
- 中文文件名会被部分浏览器丢扩展名，故导出用 ASCII 文件名（界面文案仍中文）。

## 8. 演进路线

- **插件化**：抽 `core`（parse / annotate / buildPrompt / diff）为纯逻辑；skill 已完成；下一步可做成带 `/annotate` 斜杠命令的 **plugin**，或浏览器扩展（右键批注任意在线页面）。
- **多格式**：docx/xlsx/pdf/pptx/图片已支持（skill 侧转视图 + 回写原文件）；后续可做单元格级精确锚点（`Sheet!R{r}C{c}`）、pdf 文本层批注。
- **开源**：GitHub 单仓 `demo/ + src/ + skill/ + docs/`，MIT；README 突出「批注包为开放格式、单文件离线、多格式、双服务商兼容」。

## 9. 版本变更

- **v1**：单文件 Demo，划词 + 整段批注，导出 Prompt / 内置 AI 调用，line-diff。
- **v2**：换 marked 修复 Markdown 渲染；新增圈选批注（html2canvas 截图 + 多模态可看图）。
- **v3**：封装为 skill（两阶段 + 预加载注入）；主推「导出批注单文件拖回对话」；修复导出 JSON 无响应（延迟 revoke）；新增交互模式（iframe 运行脚本、可点击），圈选批注在交互页面通用。
- **v10（当前）**：**自用反馈驱动的一轮**（拿工具批注工具本身发现的问题）。① 批注栏可拖拽调宽，上限窗口 1/3、下限 280px，宽度记忆 + 双击复位，拖动时同步圈选层几何；② 视觉标尺收敛——边框由 5 种粗细（1.5/2/2.5/3/4px）压到 **2 级 chrome（hair 1.5 / bw 2）+ 1 级内容强调线（accent 3）**，层级改由阴影三档（sm/– /lg）表达；③ 新增「只发批注（不含原文）」，源码 >120KB 自动开启（实测批注单 378KB→3KB）；④ 嵌入 iframe 预览时改用独立 localStorage 键，避免内层实例覆盖宿主会话；⑤ iframe 高度改两趟测量，兼容 100vh 整页应用；⑥ **界面截图模式**——图片文档可勾选「这是界面截图 → 改它背后的代码」，prompt 明确要求改源码而非修图（此坑正是本轮实操暴露）。
- **v9**：**批注回执 + 逐条采纳**，直接对冲"AI 批量改会漏执行"这一核心风险（实证：arXiv 2507.11538 显示指令密集时前沿模型准确率降至 68%，且偏向执行靠前指令）。结果层重写为 hunk 结构：`lineOps → buildHunks → assemble`，每个改动块可独立勾选，最终文本按勾选重组（拒绝=保留旧行）。回执用**本地启发式**核验（比对引用指纹是否仍原样存在），如实标注「未检出改动 / 无法判定」而非断言未执行；未检出的可一键生成 `annotation-followup-*.md`（当前版本全文 + 仅剩批注）重新提交。应用时对**最终重组文本**重新核验：已生效批注移除、未生效保留待处理。多文档结果按 `<<<FILE>>>` 解析并分文件审阅应用。
- **v8**：**中英双语 + 多文档**。全部 UI 文案与发给 AI 的批注单走 i18n 词典，**默认英文**、右上角一键切换并记忆偏好（`--lang zh` 可由 skill 预设）；多文档以标签栏管理，每篇独立累积批注与渲染模式，切换时 `syncActive/adoptDoc` 互相同步，导出时合并为**一份**批注单——多篇时采用 `<<<FILE: 名>>>…<<<END>>>` 输出契约便于逐个回写，且**只提交有批注的文档**。批注包升到 v4（`docs[]`，单篇时保留 v3 字段兼容），自动保存/恢复同步支持多文档。转换脚本支持一次传多个文件与 `--lang`。
- **v7**：结构锚点。xlsx 转换输出真实单元格地址（`data-cell="Sheet1!B3"`，表名含空格按 Excel 惯例加引号，正确处理合并单元格与多 sheet），并渲染 Excel 式行号/列标栏（gutter 不可批注）；CSV 同样输出 A1 式坐标；pdf/pptx 每页带 `data-page`。三种批注均自动携带锚点：划词/整段取所在格，**圈选跨格自动汇总为区域**（`Sheet1!B2:D5`）、跨页汇总为页范围。`buildPrompt` 据此追加「定位说明」，令 AI 按坐标精确定位而非猜测；SKILL.md 阶段 B 同步要求优先用锚点改原文件。
- **v6**：会话持久化。批注变更 500ms 防抖自动存入 localStorage；刷新后顶部黄色横幅提示「发现上次未完成的批注 N 条 · 恢复/忽略」；新增「↺ 载入批注包」把导出的 JSON 读回继续批注/复盘。三重降级：超配额时丢弃圈选截图但保留 `snippetHTML`+意见并告知；localStorage 完全不可用时明确提示"请及时导出批注包"，不影响其它功能；skill 注入场景仅在原文一致时才提示恢复，避免把 A 文档批注落到 B 文档。
- **v5**：视觉改版为「Creative Mode」奶油纸风格——Archivo Black 粗黑标题 + Space Mono 标签（均内联 woff2 保离线）、绿/粉/橙/黄四色、黑描边 + 硬阴影 brutalist 卡片；三种批注色区分（划词黄/整段粉/圈选橙）。构建脚本 build.mjs 在 `/*__FONTS__*/` 处内联字体。
- **v4**：格式扩展到 CSV + Word/Excel/PDF/PPT/图片。轻量格式工具内渲染；文档视觉格式由 skill 侧 Python 转视图并记 `originalFile`，改写时**回写原始文件、保留格式**（用 Claude 的 docx/xlsx/pptx/pdf 技能）。`buildPrompt` 在有 `originalFile` 时注明"改原文件而非视图"。

## 10. 验证状态

Playwright 真机全流程通过：hunk 逐块勾选重组正确（拒绝块保留旧文本）、回执准确识别 AI 漏改条目、追加请求仅含未生效批注且基于新版全文、应用后已生效批注自动移除而未生效保留、多文档结果分文件应用、中英热切换弹窗跟随；默认英文/一键切中文/刷新记忆；多文件一次载入→标签切换→各自批注互不干扰→合并 prompt（含输出契约、仅含有批注的文档）→多文档 JSON 导出回载→刷新恢复→关闭标签；Markdown 表格/嵌套/代码块渲染；CSV 引号转义→表格；三种批注累积；导出 `.md` / `.json` 正常下载；交互 HTML 在 iframe 内脚本运行、按钮点击生效；交互模式圈选抓到底层 HTML + 截图；模式手动切换；diff / 采纳；skill 注入端到端；零页面报错。
格式转换真机验证：docx→段落、xlsx→表格(单元格可批注)、csv→表格、pdf→逐页图、pptx→LibreOffice 渲染逐页图、png→内嵌图，均正确渲染且 `originalFile` 注入 `buildPrompt`。
