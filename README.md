# 产教研平台 · 沉浸式课堂

网页版 AI 视频播放网站：本地播放 mp4，悬浮球 AI 助教具备「读屏」能力，暂停视频自动讲解画面，支持主动提问，多模型可配置（DeepSeek 等 OpenAI 兼容接口）。

## 交付文件

| 文件 | 说明 |
|------|------|
| `immersive-classroom.html` | 前端单文件（含全部 CSS/JS），双击即可打开看界面 |
| `functions/api/chat.js` | 云函数代理（Cloudflare Pages Functions），解决 CORS |
| `proxy.py` | 本地零依赖代理（Python 标准库），本地测试用 |

## 一、本地快速体验（不部署）

只需 Python 3（无需任何第三方库）。

1. 终端启动代理：
   ```bash
   python proxy.py
   ```
   看到 `代理已启动 http://127.0.0.1:8000` 即成功，窗口保持开启。

2. 浏览器打开 `immersive-classroom.html`（双击即可）。

3. 点右上角「设置」，填入：
   - **API Key**：你的 `sk-xxxx`
   - **代理路径**：`http://127.0.0.1:8000/api/chat`
   - 文本模型 `deepseek-chat`、视觉模型 `deepseek-v4-flash-vision-exp`（默认已填）

4. 点「测试连接」验证，保存后导入本地 mp4，暂停即触发 AI 讲解。

## 二、部署到公网（多人通过链接访问）

采用 GitHub + Cloudflare Pages（免费）。

1. 在 GitHub 新建仓库，把本目录推上去，注意把 `immersive-classroom.html` **重命名为 `index.html`**（Cloudflare 以 index.html 为首页）。

   最终仓库结构：
   ```
   repo-root/
   ├── index.html               # 原 immersive-classroom.html
   ├── functions/
   │   └── api/chat.js
   └── README.md
   ```

2. 登录 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → 连接 GitHub 仓库。

3. 构建命令留空，输出目录填 `/`，部署。

4. 获得公网链接（如 `https://xxx.pages.dev`）后分发即可。每个访客自行填入自己的 API Key（Key 存各自浏览器，经云函数透传，不落地）。

## 三、使用要点

- 视频仅在本机浏览器播放，**不会上传**。
- 「自动讲解」开关：暂停视频时自动截取画面送视觉模型分析。
- 暂停后也可在右侧输入框主动提问，会附带当前画面上下文。
- 模型地址、Key 均可在「设置」中随时切换（支持 DeepSeek / 通义 / 智谱等 OpenAI 兼容接口）。

## 四、安全边界

仅用于**非涉密、可公开内容**。严禁将涉密视频、内部资料接入任何外部模型 API。涉密场景需另用内网部署 + 私有化模型方案。
