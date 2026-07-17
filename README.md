# Company Image Library

这是一个可以部署到 GitHub Pages 的腾讯云 COS 文件浏览网页。

## 已填写的 COS 信息

- Bucket：`hhhhhr-1454825981`
- Region：`ap-guangzhou`
- 网站地址：`https://bairuishengus-dotcom.github.io/image-library/`

## 上传方法

把下面 4 个文件上传到 GitHub 仓库根目录：

- `index.html`
- `style.css`
- `app.js`
- `config.js`

## 腾讯云 COS 必须设置

### 1. 公有读

存储桶需允许匿名读取和列出文件，否则网页无法浏览目录。

### 2. CORS

进入：

`COS 控制台 → 安全管理 → 跨域访问 CORS`

添加规则：

- 来源 Origin：`https://bairuishengus-dotcom.github.io`
- 允许方法：`GET`、`HEAD`
- 允许 Headers：`*`
- 暴露 Headers：`ETag`、`Content-Length`
- 缓存时间：`600`

## 修改标题或 Bucket

编辑 `config.js`。
