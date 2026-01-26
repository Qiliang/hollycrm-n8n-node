# n8n-nodes-dashscope

这是一个 n8n 社区节点，用于调用阿里云 DashScope (通义千问) API。

[n8n](https://n8n.io/) 是一个 [公平代码许可](https://docs.n8n.io/reference/license/) 的工作流自动化平台。

## 安装

在你的 n8n 实例中安装此社区节点：

1. 进入 **Settings > Community Nodes**
2. 选择 **Install**
3. 输入 `n8n-nodes-dashscope`
4. 同意风险提示并点击 **Install**

## 功能

### DashScope 节点

支持以下操作：

- **聊天补全** - 发送消息并获取 AI 响应

支持的模型：

- Qwen Plus (qwen-plus)
- Qwen Turbo (qwen-turbo)  
- Qwen Max (qwen-max)
- Qwen Long (qwen-long)

### 凭证配置

需要配置 DashScope API 凭证：

1. 登录 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 获取 API Key
3. 在 n8n 中创建 DashScope API 凭证，填入 API Key

## 使用示例

1. 添加 DashScope 节点到工作流
2. 配置 DashScope API 凭证
3. 选择模型（默认 qwen-plus）
4. 填写系统提示词和用户消息
5. 可选：配置温度、最大 Token 数等参数
6. 执行节点获取 AI 响应

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听文件变化）
npm run dev
```

## 发布到 npm

此项目使用 GitHub Actions 自动发布：

1. 在 GitHub 仓库 Settings > Secrets 中添加 `NPM_TOKEN`
2. 创建新的 Release 或手动触发 workflow
3. 包将自动发布到 npm

## 许可证

MIT
