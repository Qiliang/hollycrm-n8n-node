# n8n-nodes-hollycrm

HollyCRM 自定义 n8n 节点集合。

## 节点介绍

### DashScope

调用阿里云 **DashScope（通义千问）** API，在流程中进行大模型对话。

- **操作**：聊天补全（发送消息并获取 AI 响应）
- **模型**：支持 Qwen Plus、Qwen Turbo、Qwen Max、Qwen Long 等
- **多上下文**：可配置多个上下文输入，将不同来源的内容一并传给模型
- **凭证**：需配置 DashScope API 凭证（`dashScopeApi`）

---

### Markdown

输入和处理 **Markdown 多行文本**，适合在流程中嵌入富文本内容。

- 支持多行 Markdown 编辑（标题、列表、粗体、斜体等）
- 可自定义输出字段名（默认 `markdown`）
- 选项：去除首尾空白、是否保留上游输入数据并合并到输出

---

### Pandoc

使用 **Pandoc** 命令行进行**文档格式转换**，将二进制或文本文档转为指定格式。

- **输入格式**：docx、pptx、xlsx、json、html、text，或自动根据扩展名推断
- **输出格式**：markdown、text
- **数据来源**：从上游节点的二进制属性读取文档（默认属性名 `data`）
- **环境变量**：通过 `PANDOC_PATH` 指定 Pandoc 可执行文件路径；支持 `extraArgs` 传递额外参数（如 `--standalone --toc`）

---

### Qwen ASR

使用阿里云 **DashScope Qwen ASR** 进行**语音识别**（语音转文本）。

- **音频来源**：二进制数据（上游节点）或 URL
- **模型**：如 Qwen3 ASR Flash 等
- **凭证**：需配置 DashScope API 凭证（`dashScopeApi`）

---

### TOON

**JSON 与 TOON 格式互转**。TOON 是一种面向 Token 优化的对象表示法，可减少约 40% 的 Token 消耗，适合在调用大模型前压缩结构化数据。

- **JSON 转 TOON**：将输入数据编码为 TOON 文本；支持字段选择、分隔符、缩进、键折叠、Token 统计等高级选项
- **TOON 转 JSON**：将 TOON 文本解析为 JSON；支持路径展开等解码选项

依赖 `@toon-format/toon` 库。
