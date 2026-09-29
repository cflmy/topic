# 专题书架（topic）

独立静态站，托管专题书架与各专题 bundle。默认域名：**https://topic.cflmy.cn**

内容与书架目录由仓库内 JSON / 文件维护，**无动态后端**。暗恋论坛（anlian）顶栏「专题」与旧路径 `/topics/*` 通过后台 `SiteSettings.topics_external_url` 跳转到本站。

## 目录

```text
config/site.json       # 站点名、baseUrl、SEO
config/topics.json     # 书架目录（排序 / 发布 / 简介 / SEO）
content/bundles/<slug> # 专题静态包（相对路径资源）
content/covers/        # 书架封面 WebP（400w + 200w）
templates/shelf.html   # 书架页模板
static/css/shelf.css   # 书架样式
scripts/build.py       # 生成 dist/
dist/                  # 构建产物（gitignore，部署用）
deploy/nginx/          # Nginx 示例
```

## URL

| 路径 | 说明 |
|------|------|
| `/` | 书架 |
| `/<slug>/` | 专题入口 |
| `/covers/<file>.webp` | 封面 |
| `/css/shelf.css` | 书架样式 |

## 构建与本地预览

```bash
cd /root/work/topic
python3 scripts/build.py
python3 -m http.server -d dist 4173
# 打开 http://127.0.0.1:4173/
```

构建会：

1. 校验已发布专题的 cover / bundle 存在  
2. 渲染书架 `dist/index.html`  
3. 拷贝 covers、css、各 bundle  
4. 将 bundle 内旧链接 `https://www.anlian.cyou/topics/` 替换为 `/`  
5. 按 `topics.json` 写入 title / description / keywords  

## 构建并推送到 `public` 分支

源码在默认分支（如 `master`）；**静态产物单独推到 `public`**（orphan，可 force push），便于服务器只拉部署内容。

```bash
./scripts/publish.sh
# 等价：构建 dist/ → 强制推送到 origin/public
```

环境变量（可选）：`PUBLISH_REMOTE`（默认 `origin`）、`PUBLISH_BRANCH`（默认 `public`）。

服务器示例：

```bash
git clone --branch public --single-branch https://gitee.com/cflmy/topic.git /var/www/topic
# Nginx root 指向该目录；更新时：
cd /var/www/topic && git fetch origin public && git reset --hard origin/public
```

## 新增专题

1. 在 `content/bundles/my-topic/` 放好 `index.html` 与相对路径资源；「返回书架」用 `/`。  
2. 导出封面到 `content/covers/my-topic.webp`（400×560）与 `my-topic-200.webp`（200×280）。  
3. 在 `config/topics.json` 追加条目（`sortOrder` 越大越靠前，`published: true`）。  
4. 运行 `./scripts/publish.sh`（构建并推 `public`），或仅本地 `python3 scripts/build.py`。

## 与 anlian 的对接

| anlian | topic |
|--------|-------|
| `SiteSettings.topics_external_url`（默认 `https://topic.cflmy.cn`） | 本站根地址；改域时只改后台与本仓库 `config/site.json` 的 `baseUrl` |
| 顶栏「专题」 | 外链到上述 URL |
| `/topics/`、`/topics/<slug>/` | 301 到 `{base}/`、`{base}/<slug>/` |

域名若从 `topic.cflmy.cn` 调整，先改 DNS / Nginx，再在 anlian 后台更新 `topics_external_url`。

## 部署

推荐：本机执行 `./scripts/publish.sh`，服务器检出 `public` 分支作文档根。

或手动：

1. `python3 scripts/build.py`  
2. 将 `dist/` 同步到服务器文档根  
3. 启用 [`deploy/nginx/topic.cflmy.cn.conf`](deploy/nginx/topic.cflmy.cn.conf)，签发证书：  
   `certbot --nginx -d topic.cflmy.cn`
