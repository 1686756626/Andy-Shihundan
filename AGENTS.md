# Andy 的石鸡蛋 — AI Agent 交接手册

> **这是给朋友 Andy 做的搞笑网站。** 丑事墙 + AI 聊天。
> 读完本文件，你能立刻理解并维护这个项目。

---

## 一、项目定位

**Andy 的石鸡蛋** — 一个纯前端单页应用，两个页面：
1. **丑事墙** — 展示 Andy 的糗事卡片，数据来自 `shame.json`
2. **AI 聊天** — 通过 CoPaw API 与 AI agent 对话（SSE 流式）

**一句话说明：** 浏览器打开网页 → 加载 shame.json → 渲染丑事卡片 + AI 聊天面板。

---

## 二、技术架构

```
index.html        → 入口（CSS + HTML 外壳 + JS 引入）
config.js         → 站点配置（主题色、AI 参数、页面列表）
utils.js          → 工具函数（Markdown 渲染、HTML 转义等）
app.js            → 主应用对象（路由 + 数据加载）
pages/shame.js    → 丑事墙渲染（Object.assign 挂到 app）
pages/chat.js     → AI 聊天渲染（Object.assign 挂到 app）
shame.json        → 丑事数据（唯一数据源）
```

### 数据流

```
浏览器 → app.init() → fetch shame.json → this.data
       → route() → 根据 hash 渲染页面
       → pages/shame.js 读取 this.data 渲染卡片
       → pages/chat.js 通过 CoPaw API SSE 流式对话
```

### 路由

| Hash | 页面 | 方法 |
|------|------|------|
| `#shame` | 丑事墙 | `app.renderShame()` |
| `#chat` | AI 聊天 | `app.renderChat()` |

---

## 三、GitHub 仓库

| 项目 | 值 |
|------|---|
| 用户 | `1686756626` |
| 仓库名 | `Andy-Shihundan` |
| 分支 | `main` |
| 可见性 | 公开 |

---

## 四、服务器部署

| 项目 | 值 |
|------|---|
| IP | `131.143.251.21` |
| Web 根目录 | `/var/www/andy/` |
| Nginx 配置 | `/etc/nginx/sites-available/andy` |
| 域名 | `andyshihundan.icu` |

### 部署步骤

```bash
# 从 GitHub 拉取最新代码到服务器
cd /var/www/andy
git pull origin main

# 如有 Nginx 配置变更
sudo nginx -t && sudo nginx -s reload
```

---

## 五、shame.json 数据格式

```json
[
  {
    "id": 1,
    "date": "2026-04-09",
    "tag": "🥚 石鸡蛋",
    "text": "丑事描述...",
    "witness": "目击者：xxx"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 唯一 ID，越大越新 |
| `date` | string | 发生日期 |
| `tag` | string | 分类标签（带 emoji） |
| `text` | string | 丑事内容（支持 **粗体**、*斜体*、`代码`） |
| `witness` | string | 目击者信息（可选） |

---

## 六、修改指南

### 添加丑事
编辑 `shame.json`，在数组中追加新对象（id 递增），推送到 GitHub 后部署。

### 添加新页面
1. 创建 `pages/xxx.js`，用 `Object.assign(app, { renderXxx(el) { ... } })` 挂载
2. 在 `config.js` 的 `pages` 数组中添加页面名
3. 在 `index.html` 导航栏加 tab，底部加 `<script>` 引入
4. 在 `app.js` 的 route switch 中加 case

### 修改主题
编辑 `config.js` 的 `theme` 对象，然后在 `index.html` 的 CSS 中引用。

---

## 七、依赖

- **CoPaw API**：`localhost:8088`，通过 Nginx `/copaw-api/` 代理
- **无其他外部依赖**：不使用 Tailwind、React 等框架，纯原生 HTML/CSS/JS

---

## 八、通用经验知识库联动

> 详细联动关系见 `knowledge-map.json`（机器可读）。

知识库：[Web-Project-Template](https://github.com/1686756626/Web-Project-Template)
贡献规范：`Web-Project-Template/贡献规范.md`

### 规则

- 发现新的通用经验或可复用代码时，按 `贡献规范.md` 提取到知识库
- 提取后更新本项目的 `knowledge-map.json`（contributes 数组）和知识库的 `knowledge-map.json`

---

## 九、注意事项

- `shame.json` 用 UTF-8 编码，换行 LF
- AI 聊天的 agentId 配置在 `config.js` 的 `chat.agentId`
- 网站风格是**暗黑搞笑风**，金色 (#f59e0b) 为主色调
