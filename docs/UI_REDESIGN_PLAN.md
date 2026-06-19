# StudyFlow UI 与交互重做方案

## 设计方向

StudyFlow 应该更像一个“学生自己的 AI 学习资料工作台”，而不是普通后台管理系统或单纯文件上传工具。

这次 UI 方向参考 `DESIGN.md` 里的 Cohere 风格：

- 默认使用干净的白色编辑画布。
- 多用细分隔线、列表结构、留白来组织信息，少用厚重大卡片。
- 主按钮使用接近黑色的高克制按钮，不要到处都是亮蓝色。
- 蓝色只用于链接、焦点、少量状态提示。
- 少量暖色可以用于警告或标签，但不作为主视觉。
- 标题更沉稳，辅助信息更精确。
- 产品界面要有“企业 AI / 研究工具”的控制感，而不是花哨感。
- 尽量少用阴影。层级主要靠间距、线条、背景色和排版建立。

当前的问题是页面里“大框框”太多，视觉上像粗糙的后台卡片堆叠。重做后应该更像现代知识库 / AI 工具。

## 导航模型

顶部导航保留：

- `Workspace`
- `Library`
- `Study`
- `Review`
- 用户名
- `Logout`

`Upload` 不应该作为顶栏一级入口。

原因：

- 上传不是一个独立产品模块。
- 上传是 Library 里的一个管理动作。
- 学生的心智是“我去资料库添加/管理 lecture 文件”，不是“我进入一个上传系统”。

旧的 `/upload` 路由：

- 保留，但直接跳转到 `/library`。
- 这样历史链接不会坏，也不会让用户进入旧上传页面。

## Upload 应该怎么做

上传应该集成在 Library 内，而不是单独页面。

推荐方案：**Library 内的上传命令面板**

交互：

1. 用户进入 `Library`。
2. 点击右上角 `Add material`。
3. 页面顶部工具栏下方展开一个轻量上传面板。
4. 面板里包含：
   - 目标 folder 选择。
   - 拖拽上传区域。
   - `Select files` 按钮。
   - 上传状态列表。
   - 一句说明：当前 parser 仍然是 mock segment。
5. 上传成功后：
   - Library 刷新文件列表。
   - 文件先显示 `Processing`，处理完成后显示 `Processed`。
   - 用户仍然留在 Library。
   - 用户可以直接点文件名打开 Reader。

为什么不用弹窗：

- 上传不是一个一次性确认动作。
- 用户可能需要选择 folder、拖文件、看处理状态、再打开文件。
- 弹窗会把 Library 上下文遮住。

为什么不用单独页面：

- 上传只是 Library 的动作，不是目的地。
- 文件管理、新建 folder、上传、重命名、删除、打开 reader 应该在同一个地方完成。

后续如果上传流程变复杂，可以升级成右侧 drawer：

- 比如添加课程元数据。
- 选择语言。
- 选择解析方式。
- 设置是否生成 embeddings。

但现在 MVP 不需要。

## Library 页面

Library 是资料管理中心。

页面结构：

- 左侧：Folder 列表。
- 右侧主区域：
  - 小标签：`SOURCE LIBRARY`
  - 标题：`Course materials`
  - 搜索框。
  - 主操作：`Add material`
  - 可选的轻量统计：全部文件数、已处理数、当前 folder。
  - 文件列表。

Folder 交互：

- `New`：新建 folder。
- hover folder 行时显示：
  - `Rename`
  - `Delete`
- 删除 folder 只允许删除空 folder。
- 非空 folder 删除时显示轻提示：
  - “先删除或移动该 folder 下的 materials。”
- 不做大红色错误块。

文件交互：

- 点击文件标题：打开 Reader。
- 每一行右侧提供：
  - `Rename`
  - `Delete`
- 删除文件需要确认。
- 后续可加：
  - `Move to folder`
  - `Reprocess`
  - `Download original`

视觉要求：

- 文件列表使用细分隔线，不要每一项都是大卡片。
- 状态 pill 要轻，不要太亮。
- Rename/Delete 更像文本按钮或 ghost action。
- 上传面板要轻，不要成为一个巨大 dashed box。

## Reader 页面

Reader 是学习工作区。

它的职责：

- 阅读 source segments。
- 选择当前学习上下文。
- 运行小型 AI action。
- 查看带 source reference 的输出。

当前结构方向是对的，但视觉需要精修。

布局：

- 顶部：文件标题、类型、folder、segment 数、上传时间。
- 左侧：source segments。
- 右侧：selected context 和 generated artifacts。
- 中间顶部：当前 study scope action bar。

交互：

- 点击 segment：选中 / 取消选中。
- 没有选中 segment 时，micro action 按钮禁用。
- 点击 `Explain / Summarize / Key terms / Mini quiz / Cheat sheet`：
  - 在右侧追加 artifact。
  - artifact 必须显示 source reference。

视觉调整：

- 当前选中 segment 不要用很重的大蓝框。
- 可以使用左侧细蓝线、轻蓝背景、或更克制的边框。
- action bar 应该像紧凑命令条，不要像厚卡片。
- 右侧输出区不要堆过重卡片。
- source text 要更适合长时间阅读。

## Review 页面

Review 是保存过的学习产物列表。

它应该更像 Cohere 的 research/blog list，而不是卡片墙。

页面结构：

- 顶部：标题和说明。
- 下方：细分隔线列表。
- 每个 artifact row 包含：
  - 类型 / 标题。
  - 日期。
  - 内容预览。
  - source reference chips。
  - 操作：`Open`、`Export`。

后续可以增加筛选：

- `All`
- `Explain`
- `Summary`
- `Quiz`
- `Cheat sheet`

视觉调整：

- 不要大卡片堆叠。
- 用细线、留白和排版组织。
- source refs 保留，但弱化视觉重量。

## Workspace 页面

Workspace 是登录后的入口，不应该显示太多假的 dashboard 数据。

当前的 fake stats 后续应该删掉或改成真实 API 数据。

更合适的结构：

- 大标题：当前学习空间。
- 几个明确命令：
  - `Open library`
  - `Continue recent lecture`
  - `Review saved artifacts`
- 如果没有真实数据，就不要展示假的数字。

后续：

- 接真实统计：
  - lecture 数。
  - processed 数。
  - saved artifacts 数。
  - recent lecture。

## 当前上传与 segment 状态说明

当前上传链路：

- 文件上传到 MinIO。
- 创建 `Lecture` 记录。
- 后台 mock parsing。
- 创建 placeholder segments。

所以现在看到：

```text
Mock segment 1 from xxx.pdf...
```

这是正常的。

它不是 UI bug。

真实功能还没做的是：

- PDF 文本解析。
- 按页码 / 段落 / heading 结构切分。
- source anchor。
- embeddings。
- RAG retrieval。

这应该作为后续 ingestion / RAG milestone 做。

## 实施顺序

1. 稳定上传链路。
   - `/upload` redirect 到 `/library`。
   - Library 内完成上传。
   - 上传后文件能出现在列表里。

2. 重做 Library UI。
   - 按 Cohere 风格减弱大卡片。
   - 使用细线列表和轻量命令面板。
   - 完成 folder/file 管理操作。

3. 重做 Reader UI。
   - 精修 selected segment。
   - 精修 action bar。
   - 精修右侧 context/artifact 面板。

4. 重做 Review UI。
   - 从卡片墙改成 rule-separated list。
   - 增加筛选预留。

5. 清理 Workspace。
   - 去掉假 stats 或改成真实数据。
   - 做成真正的学习入口页。

6. 开始真实 ingestion/RAG。
   - PDF parsing。
   - structure-aware chunking。
   - embeddings。
   - retrieval endpoint。
   - citation validation。

## 验收标准

- 顶栏没有独立 `Upload`。
- `/upload` 自动跳转到 `/library`。
- 上传在 Library 内完成。
- Folder 可以新建、重命名、删除。
- File 可以重命名、删除、打开。
- UI 不再由大块厚卡片主导。
- PDF 上传成功后出现在 Library。
- PDF 可以打开 Reader。
- Reader 里 mock segment 被明确视为临时 parser 输出。
- 页面整体更接近 Cohere 风格：克制、细线、白色画布、近黑按钮、少阴影。
