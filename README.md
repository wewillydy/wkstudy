# douxue — K12 教育抖音视频学习平台

## 项目概述

douxue 是一个面向 K12 教育的抖音视频学习平台，帮助用户按学科/年级/知识点搜索并学习抖音上的优质教育视频。

项目由以下模块组成：

| 模块 | 技术栈 | 端口 | 数据库 |
|------|--------|------|--------|
| **client** | React 18 + Vite 5 + TailwindCSS 3 | 5173 | — |
| **server** | Express 4 + sql.js + JWT | 3001 | SQLite |
| **douyin-search** | Python FastAPI + Playwright | 8000 | MySQL |
| **Douyin_TikTok_Download_API** | 参考项目（API 签名算法） | — | — |

```
D:\project\douxue\
├── client/                  # React 前端
├── server/                  # Express 后端
│   ├── src/
│   │   ├── index.js              # 入口（建表 + 路由 + 标签初始化）
│   │   ├── db.js                 # SQLite 数据库（自动保存）
│   │   ├── middleware/auth.js    # JWT 认证中间件
│   │   └── routes/
│   │       ├── auth.js           # 登录 / 验证码
│   │       ├── links.js          # 视频链接 CRUD + 播放代理
│   │       ├── tags.js           # 标签树查询
│   │       └── user.js           # 设置 / 点赞 / 收藏 / 攻克
│   ├── resolver/                 # 抖音分享链接解析
│   │   ├── resolve.py            # 解析脚本（依赖 douyin-downloader）
│   │   └── resolve.log           # 解析日志
│   └── douxue.db                # SQLite 数据文件
│
├── douyin-search/           # 抖音搜索采集工具
│   ├── server.py                 # FastAPI 服务 + Web UI 后端
│   ├── index.html                # Web 前端界面（内联 SPA）
│   ├── douyin_browser_search.py  # Playwright 浏览器搜索核心
│   ├── db_writer.py              # MySQL 写入模块
│   ├── abogus.py / x_bogus.py    # 抖音 API 签名算法
│   ├── cookie_loader.py          # Cookie 加载器
│   ├── import_csv.py             # CSV → MySQL 导入工具
│   ├── debug_search.py           # API 调试脚本
│   ├── schema.sql                # 建表 SQL
│   ├── requirements.txt          # Python 依赖
│   └── chrome-win64/             # 本地 Chromium 浏览器
│
├── Douyin_TikTok_Download_API/  # 参考项目（开源抖音下载器）
└── ui/                        # 产品原型（静态 HTML 设计稿）
    ├── video-list.html
    └── video-detail.html
```

---

## 系统架构

```
                     ┌─────────────────────┐
    浏览器  ───────>  │  client (:5173)     │  React + Vite + TailwindCSS
                     │  /api/* 代理 ──────┐ │
                     └─────────────────────┘ │
                                             v
                     ┌────────────────────────────────┐
                     │  server (:3001)                │  Express + sql.js
                     │  douxue.db (SQLite)            │  用户 / 标签 / 链接
                     │  视频流代理 -> 抖音 CDN          │  点赞 / 收藏 / 攻克
                     └────────────────────────────────┘

                     ┌────────────────────────────────────────┐
                     │  douyin-search (:8000)                 │  FastAPI + Playwright
                     │  MySQL douxue.douyin_videos            │  浏览器搜索 + 数据存储
                     │  抖音搜索采集 + 热度 Top N 筛选          │
                     └────────────────────────────────────────┘
```

- **client + server** = 主应用，前后端通过 `/api/*` 通信（Vite 开发代理），构成完整视频学习平台
- **douyin-search** = 独立采集工具，用真实 Chrome 浏览器自动化搜索抖音、筛选 Top N 视频入 MySQL
- 两个数据系统独立运行：server 用 SQLite 管理用户和人工录入的视频链接；douyin-search 用 MySQL 存储自动采集的搜索结果

---

## 模块一：server（Express 后端）

### 技术栈

- Express 4 + sql.js（内存 SQLite，30 秒自动刷盘）
- JWT 认证（Bearer Token，30 天过期）
- CORS 全开

### 启动

```powershell
cd D:\project\douxue\server
npm install
npm run dev     # 开发模式（node --watch 热重载）
# 或
npm start       # 生产模式
```

### 数据库表（SQLite，首次启动自动创建）

| 表 | 字段 | 用途 |
|---|---|---|
| `users` | id, phone, nickname, stage, grade | 用户信息 |
| `sms_codes` | id, phone, code, expires_at | 验证码（5 分钟有效，固定 1234） |
| `links` | id, share_url, title, cover_url, author, status | 视频链接（软删除 via status） |
| `tags` | id, name, category, parent_id | 标签树（stage/grade/subject/dimension/point） |
| `link_tags` | link_id, tag_id | 链接-标签多对多 |
| `user_likes` | user_id, link_id | 用户点赞 |
| `user_favorites` | user_id, link_id | 用户收藏 |
| `user_conquered` | user_id, link_id | 用户已攻克 |
| `user_interests` | user_id, tag_id | 用户兴趣标签 |

### API 路由

| 路由 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/auth/send-code` | POST | 否 | 发送验证码 |
| `/api/auth/login` | POST | 否 | 手机号 + 验证码登录 |
| `/api/auth/me` | GET | 是 | 当前用户信息 |
| `/api/links` | GET/POST | 是 | 视频链接列表 / 添加（自动解析标题封面） |
| `/api/links/:id` | GET/PUT/DELETE | 是 | 链接详情 / 编辑 / 软删除 |
| `/api/links/:id/stream` | GET | 否 | **视频流代理**（从抖音 CDN 推流到前端播放） |
| `/api/links/:id/resolve` | GET | 否 | 解析抖音分享链接获取视频地址 |
| `/api/tags` | GET | 否 | 标签树全量 |
| `/api/tags/:category` | GET | 否 | 按分类获取标签（stage/grade/subject/dimension/point） |
| `/api/tags/children/:parentId` | GET | 否 | 获取子标签 |
| `/api/user/settings` | PUT | 是 | 个人设置（昵称/学段/年级/兴趣标签） |
| `/api/user/like/:linkId` | POST | 是 | Toggle 点赞 |
| `/api/user/favorite/:linkId` | POST | 是 | Toggle 收藏 |
| `/api/user/conquer/:linkId` | POST | 是 | Toggle 已攻克 |
| `/api/user/feed` | GET | 是 | 个性化推荐 Feed |
| `/api/user/likes` | GET | 是 | 点赞列表（分页） |
| `/api/user/favorites` | GET | 是 | 收藏列表（分页） |
| `/api/user/conquered` | GET | 是 | 已攻克列表（分页） |
| `/api/user/link-status/:linkId` | GET | 是 | 查询对某个链接的交互状态 |
| `/api/health` | GET | 否 | 健康检查 |

### 标签体系（自动初始化）

服务首次启动时自动创建以下标签层级：

```
学段 -> 年级：
  小学 -> 一年级 / 二年级 / 三年级 / 四年级 / 五年级 / 六年级
  初中 -> 七年级 / 八年级 / 九年级
  高中 -> 高一 / 高二 / 高三

学科 -> 维度 -> 知识点（完整 K12 知识树）：
  语文 -> 基础知识 -> 字音字形 / 词语辨析 / 病句修改 / 标点符号 / 修辞手法
        -> 阅读理解 -> 现代文阅读 / 文言文阅读 / 古诗词鉴赏
        -> 写作 -> 记叙文 / 议论文 / 说明文 / 应用文
        -> 文言文 -> 实词虚词 / 特殊句式 / 翻译技巧
        -> 诗词鉴赏 -> 意象意境 / 表现手法

  数学 -> 代数 -> 方程与不等式 / 函数 / 数列 / 复数
        -> 几何 -> 平面几何 / 立体几何 / 解析几何 / 向量
        -> 概率与统计
        -> 函数

  英语 -> 词汇 / 语法 / 阅读 / 听力 / 写作 / 口语
  物理 -> 力学 / 电学 / 热学 / 光学 / 声学 / 原子物理
  化学 -> 无机化学 / 有机化学 / 物理化学 / 分析化学
  生物 -> 细胞生物学 / 遗传学 / 生态学 / 人体生理
  历史 -> 中国古代史 / 中国近现代史 / 世界古代史 / 世界近现代史
  地理 -> 自然地理 / 人文地理 / 区域地理 / 地图技能
  政治 -> 经济生活 / 政治生活 / 文化生活 / 哲学
  其他 -> 综合
```

### 视频流代理机制

`/api/links/:id/stream` 的工作流程：
1. 从 SQLite 获取 share_url
2. 调用 `resolver/resolve.py` 解析出抖音视频 CDN 地址
3. 服务端 fetch 视频数据，支持 Range 请求（206 部分内容）
4. 流式推送到前端播放器

---

## 模块二：client（React 前端）

### 技术栈

- React 18 + React Router 6（Hash 路由）
- Vite 5（开发服务器 + 构建）
- TailwindCSS 3（原子化 CSS）

### 启动

```powershell
cd D:\project\douxue\client
npm install
npm run dev      # Vite 开发服务器 (http://localhost:5173)
npm run build    # 生产构建 -> dist/
npm run preview  # 预览生产构建
```

**注意：Vite 配置 `/api` 代理到 `http://localhost:3001`，必须先启动 server。**

### 页面路由

| 路由 | 组件 | 说明 |
|------|------|------|
| `/login` | Login | 手机号 + 验证码登录 |
| `/` | Feed | 个性化视频推荐 Feed 流（瀑布布局） |
| `/play/:id` | Player | 视频播放页（调用 `/api/links/:id/stream` 代理播放） |
| `/admin` | LinksManage | 管理端 — 添加抖音分享链接 + 打标签 |
| `/settings` | Settings | 个人设置（昵称/学段/年级/兴趣标签选择） |
| `/profile` | Profile | 我的（点赞/收藏/已攻克列表，Tab 切换） |

所有页面（除 `/login`）均有 JWT 认证保护，未登录自动跳转到登录页。

---

## 模块三：douyin-search（抖音搜索采集工具）

### 技术栈

- **Python 3.10+** / FastAPI / uvicorn
- **Playwright** — 真实 Chrome 浏览器自动化（绕过抖音反爬验证）
- **MySQL 8.0** — 数据存储
- **httpx** — 异步 HTTP 请求

### 安装依赖

```powershell
cd D:\project\douxue\douyin-search
pip install -r requirements.txt
pip install playwright pymysql
```

### 浏览器配置（二选一）

```powershell
# 方案 A：Playwright 自动下载（可能很慢）
playwright install chromium

# 方案 B（推荐）：手动使用项目内 Chrome
# 下载 chrome-win64.zip 解压到项目目录：
# D:\project\douxue\douyin-search\chrome-win64\
# 脚本已配置 executable_path 指向该路径
```

### 数据库初始化

```powershell
# 确保 MySQL 运行中（localhost:3306, root/root）
mysql -uroot -proot < D:\project\douxue\douyin-search\schema.sql
```

### 启动方式

#### 1. Web UI（推荐）

```powershell
cd D:\project\douxue\douyin-search
python server.py
```

浏览器打开 `http://localhost:8000`：
- 输入关键词（多个以 `;` 分隔，如 `六年级数学;中考作文;初中物理力学`）
- 设置 Top N（默认 10）、排序方式（点赞/播放/收藏/评论）、翻页数（默认 5 页）
- 点击"开始采集"，任务按顺序执行
- 采集完成后可查看结果统计

#### 2. CLI 命令行

```powershell
# 单个关键词
python douyin_browser_search.py 六年级数学

# 多个关键词
python douyin_browser_search.py 六年级数学 中考作文 "初中物理力学"

# headless 静默模式（供 server.py Web UI 调用）
python douyin_browser_search.py --headless --json --top 10 --sort digg_count --pages 5 六年级数学
```

### 首次使用（重要）

**CLI 首次运行流程：**
1. 弹出 Chrome 浏览器窗口
2. 自动打开 `https://www.douyin.com/`
3. 在浏览器中**手动登录抖音**（扫码或手机号）
4. 登录成功后按 Enter 确认，开始自动搜索
5. 登录状态保存在 `~/douyin-browser-data/` 目录

**Web UI 首次使用：**
- 检测到未登录时，页面提示先运行 CLI 登录
- 登录后可复用 session 进行 headless 采集
- 如果已登录，直接 headless 执行

### 搜索流程（CLI / headless）

1. 打开抖音首页，使用已保存的登录状态
2. 导航到搜索页 `https://www.douyin.com/search/{关键词}?type=general`
3. 拦截 `general/search/single` 和 `search/item` API 响应，收集视频列表
4. 滚动翻页（默认 5 页），逐页收集
5. 自动点击"筛选 -> 排序 -> 最多点赞"，获取按热度排序后的 Top N
6. 批量获取视频详情（通过 `aweme/v1/web/aweme/detail` 接口）
7. 写入 MySQL（`aweme_id` 唯一键，重复采集自动更新统计数据）

### MySQL 表结构

**数据库**: `douxue` / **表**: `douyin_videos` / **存储引擎**: InnoDB / **字符集**: utf8mb4

| 列名 | 类型 | 说明 |
|------|------|------|
| `id` | INT AUTO_INCREMENT | 主键 |
| `aweme_id` | VARCHAR(30) | 视频 ID（**唯一键**，重复则更新） |
| `keyword` | VARCHAR(200) | 搜索关键词 |
| `title` | TEXT | 视频描述（截取前 500 字符） |
| `tags` | VARCHAR(500) | 标签（逗号分隔） |
| `author_name` | VARCHAR(100) | 作者昵称 |
| `author_id` | VARCHAR(50) | 作者 ID |
| `digg_count` | INT | 点赞数 |
| `play_count` | BIGINT | 播放量 |
| `collect_count` | INT | 收藏数 |
| `comment_count` | INT | 评论数 |
| `share_count` | INT | 分享数 |
| `duration` | INT | 时长（毫秒） |
| `publish_time` | DATETIME | 发布时间 |
| `cover_url` | VARCHAR(500) | 封面图 URL |
| `batch_id` | VARCHAR(20) | 采集批次 ID |
| `created_at` | DATETIME | 首次入库时间 |

**UPSERT 策略**: `INSERT ... ON DUPLICATE KEY UPDATE` — 同一 `aweme_id` 再次采集时自动更新点赞/播放/收藏/评论等统计字段。

### Web UI API

| 路由 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/search` | POST | keyword, top_n, sort_by, max_pages | 单个关键词搜索 |
| `/api/search/batch` | POST | keywords(;分隔), top_n, sort_by, max_pages | 批量搜索 |
| `/api/search/batch/:id` | GET | — | 查询批次进度 |
| `/api/task/:id` | GET | — | 查询任务结果 |
| `/api/videos` | GET | keyword, page, pageSize | 已采集视频列表（分页+筛选） |
| `/api/keywords` | GET | — | 关键词统计（去重计数） |
| `/api/stats` | GET | — | 数据库统计（总量/按关键词分布） |
| `/api/health` | GET | — | 健康检查 + 浏览器登录状态 |

### 关键文件

| 文件 | 说明 |
|------|------|
| `server.py` | FastAPI 入口，API 路由 + 子进程调用采集脚本 |
| `index.html` | Web 前端界面（完整的内联 SPA 单文件） |
| `douyin_browser_search.py` | 核心引擎 — Playwright 浏览器自动化搜索 + 抖音页面交互 |
| `db_writer.py` | MySQL 批量写入模块（UPSERT 策略） |
| `abogus.py` | a_bogus 签名算法（从 Douyin_TikTok_Download_API 复用） |
| `x_bogus.py` | x_bogus 参数生成 |
| `cookie_loader.py` | 浏览器 Cookie 工具 |
| `schema.sql` | 建库建表 SQL 脚本 |
| `import_csv.py` | 历史 CSV 数据导入 MySQL 工具 |
| `debug_search.py` | API 调测脚本（测试多种搜索接口方案） |

---

## 模块四：Douyin_TikTok_Download_API

来源: [https://github.com/Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)

本项目的核心参考项目，提供了：

- 抖音 API 的完整签名算法实现（a_bogus、x_bogus 参数生成）
- Cookie 管理和加载机制
- 多接口搜索方案（general/search、search/item 等）
- douyin-search 模块的 `abogus.py`、`x_bogus.py`、`cookie_loader.py` 均复用自此项目

**重要发现**：直接调用抖音搜索 API 会返回 `search_nil_type: verify_check`（风控验证），需要真实浏览器环境（Playwright）才能正常获取数据。因此 douyin-search 最终采用了 Playwright 浏览器方案而非纯 API 调用。

---

## 全栈启动

```powershell
# 终端 1：主后端 (Express server)
cd D:\project\douxue\server
npm run dev

# 终端 2：主前端 (React client)
cd D:\project\douxue\client
npm run dev

# 终端 3：搜索采集工具 (FastAPI + Playwright)
cd D:\project\douxue\douyin-search
python server.py
```

访问地址：
- 主应用（视频学习平台）: [http://localhost:5173](http://localhost:5173)
- 搜索采集 Web UI: [http://localhost:8000](http://localhost:8000)

---

## 数据流

```
douyin-search (Playwright 浏览器自动化)
       │
       │  搜索关键词 -> 抖音搜索结果 -> 按热度 Top N 筛选
       v
MySQL douxue.douyin_videos    (aweme_id 唯一，重复自动更新)
       │
       └── 可被任意系统读取分析

server <──/api/*──> client
       │
       v
SQLite douxue.db
  ├── users / sms_codes        (认证)
  ├── links / tags / link_tags  (视频内容 + 知识标签)
  └── user_likes/favorites/conquered/interests  (用户行为)
```

两个数据系统**独立运行**：
- douyin-search 采集的数据存储在 MySQL 中供后续数据分析、导出使用
- server + client 构成完整视频学习平台，通过人工录入链接 + K12 知识标签体系 + 个性化推荐实现学习闭环

---

## 环境要求

| 组件 | 版本/配置 |
|------|-----------|
| Node.js | >= 18 |
| Python | >= 3.10 |
| MySQL | 8.0+, localhost:3306, root/root |
| Chrome | chromium 或 chrome-win64（Playwright 驱动） |
| 操作系统 | Windows（当前配置的路径均为 Windows 格式） |

---

## 已知问题与注意事项

1. **douyin-downloader 依赖**：`server/resolver/resolve.py` 依赖 `D:\project\douxue\douyin-downloader` 项目（当前不存在），resolve 功能可能无法正常工作
2. **抖音反爬**：直接 API 调用会被风控（`verify_check`），必须使用 Playwright 真实浏览器
3. **登录状态**：首次使用必须通过 CLI 手动登录抖音，后续 headless 模式复用 session
4. **GBK 编码**：Windows 下子进程 stdout 可能遇到 GBK 编码问题，已在 server.py 设置 `PYTHONIOENCODING=utf-8`
5. **验证码固定**：开发阶段验证码固定为 `1234`，生产环境需对接真实短信服务
