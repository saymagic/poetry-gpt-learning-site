# 09 部署到公网访问

当前学习站点是纯静态站点，不需要后端服务。只要把少量静态文件发布到静态托管平台，其它设备就可以通过公网 URL 访问。

核心文件是：

```text
index.html
styles.css
site.js
assets/
```

不要直接上传项目根目录。项目根目录里有 `data/`、`artifacts/`、模型权重、训练样本和本机环境文件。公开部署只应该上传站点文件。

## 先准备发布目录

每次修改教程或重新生成 HTML 后，先运行：

```bash
python scripts/prepare_learning_site_deploy.py
```

它会生成：

```text
artifacts/deploy/learning-site/
```

这个目录只包含公网访问需要的静态文件：

```text
artifacts/deploy/learning-site/
├── index.html
├── styles.css
├── site.js
├── assets/
├── .nojekyll
└── _headers
```

后面所有部署命令都使用这个目录。

## 推荐方案

| 场景 | 推荐方式 | 特点 |
| --- | --- | --- |
| 只想今天在手机或另一台电脑看 | Cloudflare Tunnel | 最快，不需要真正部署；电脑关机后 URL 失效。 |
| 想长期访问，不想建 Git 仓库 | Cloudflare Pages Direct Upload | 上传一个静态目录，自动有 HTTPS URL。 |
| 想长期访问，操作简单 | Netlify Deploy | CLI 或网页拖拽都可以。 |
| 已经在用 Vercel | Vercel | 适合静态站点，也适合以后加前端工程化。 |
| 想和 GitHub 仓库绑定 | GitHub Pages | 适合长期版本管理，但初始配置稍多。 |

我的建议是：

- 临时访问：用 Cloudflare Tunnel。
- 长期访问：优先用 Cloudflare Pages 或 Netlify。
- 如果以后要做成完整前端项目，再考虑 Vercel 或 GitHub Pages。

## 方案 A：临时公网访问

这个方式适合你现在马上用手机打开学习站点。

先启动本地静态服务：

```bash
cd artifacts/deploy/learning-site
python3 -m http.server 8080
```

再开一个终端，把本地端口映射到公网：

```bash
cloudflared tunnel --url http://localhost:8080
```

终端会输出一个类似这样的 URL：

```text
https://example.trycloudflare.com
```

用手机或其它电脑打开这个 URL 即可。

注意：

- 这个 URL 是临时的。
- 本机不能关机。
- 终端进程不能退出。
- 适合自用预览，不适合长期分享。

## 方案 B：Cloudflare Pages 长期部署

适合不想维护服务器，但希望有稳定 HTTPS 链接。

先登录：

```bash
npx wrangler login
```

创建 Pages 项目：

```bash
npx wrangler pages project create poetry-gpt-lab
```

部署静态目录：

```bash
npx wrangler pages deploy artifacts/deploy/learning-site --project-name poetry-gpt-lab
```

部署完成后，Cloudflare 会给出一个公网 URL。之后每次更新站点，只需要重新运行：

```bash
python learning/site/build_site.py
python scripts/prepare_learning_site_deploy.py
npx wrangler pages deploy artifacts/deploy/learning-site --project-name poetry-gpt-lab
```

## 方案 C：Netlify 长期部署

如果你想用网页操作，Netlify 支持把静态目录拖到网页里发布。拖拽目录：

```text
artifacts/deploy/learning-site/
```

如果使用 CLI：

```bash
npx netlify-cli login
npx netlify-cli deploy --dir=artifacts/deploy/learning-site
npx netlify-cli deploy --dir=artifacts/deploy/learning-site --prod
```

第一次 `deploy` 通常用于预览，确认没有问题后再加 `--prod` 发布到正式 URL。

## 方案 D：Vercel 长期部署

Vercel 也可以直接部署静态目录：

```bash
cd artifacts/deploy/learning-site
npx vercel
npx vercel --prod
```

第一次执行时，按提示创建项目。这个站点没有构建命令，输出目录就是当前目录。

如果你从项目根目录执行 Vercel，容易误上传整个项目。因此推荐先 `cd artifacts/deploy/learning-site` 再运行 `vercel`。

## 方案 E：GitHub Pages

GitHub Pages 适合把教程和站点都放到 GitHub 仓库里长期维护。

当前项目目录不是 Git 仓库，所以 GitHub Pages 不是最快路径。要用 GitHub Pages，你需要：

1. 创建 GitHub 仓库。
2. 把项目提交到仓库。
3. 配置 GitHub Actions，把 `artifacts/deploy/learning-site/` 发布到 Pages。

如果只是想在其它设备访问，不建议第一步就选 GitHub Pages。

## 部署前检查

运行：

```bash
rg -n "/Users/|api[_-]?key|secret|password|Bearer|密钥|密码" learning artifacts/deploy/learning-site
```

当前教程里有本机路径示例，例如：

```text
$HOME/...
```

如果 URL 只给自己使用，可以接受。如果要公开分享给别人，建议把这些路径改成更通用的写法：

```text
cd your-project-directory
```

## 部署后的验证

拿到公网 URL 后，至少检查：

- 首页能打开。
- 左侧章节导航能跳转。
- 图片能正常加载。
- 代码块复制按钮可用。
- “本章检查点”的答案 hover 能显示。
- 手机浏览器排版没有明显遮挡。

如果 CSS 或图片加载失败，通常是上传目录不完整。确认你上传的是：

```text
artifacts/deploy/learning-site/
```

而不是只上传了 `index.html`。

## 重要边界

这个部署只发布学习站点，不发布训练好的模型服务。

也就是说：

- 可以公网浏览教程。
- 可以公网查看生成样例。
- 不能在网页里实时调用模型生成诗词。

如果以后想让网页在线生成诗词，需要额外做一个推理服务。常见选择是 Hugging Face Spaces、云服务器、Modal、Replicate 或自建 API。那是后端和推理部署问题，不属于静态站点部署。

## 本章检查点

你应该能回答：

- 为什么不能直接部署项目根目录？
- 临时公网访问和长期静态托管有什么区别？
- `artifacts/deploy/learning-site/` 里应该包含哪些文件？
- 为什么静态站点部署后不能直接在线运行模型生成？
