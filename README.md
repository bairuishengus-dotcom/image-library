# Image Library V2（index.json 版）

此版本不再调用腾讯云 COS 的匿名 ListBucket 接口，因此不会再出现 403 列目录错误。

## 上传到 GitHub

把以下文件覆盖上传到仓库根目录：

- index.html
- style.css
- app.js
- config.js
- index.json

`generate-index.html` 是本地生成目录工具，可一起上传，也可只保存在电脑上。

## 重要说明

当前 `index.json` 已创建 4 个目录：

- 24
- 27
- 33
- hc08

但因为我无法看到你 COS 里的具体文件名，所以这些目录暂时是空的。

## 生成完整 index.json

1. 双击打开 `generate-index.html`
2. 点击选择文件夹
3. 选择你电脑上包含 24、27、33、hc08 的总文件夹
4. 点击“下载 index.json”
5. 用新生成的 index.json 覆盖 GitHub 仓库中的旧文件
6. 等 GitHub Pages 更新后刷新网页

工具不会上传你的图片，只读取文件夹和文件名。
