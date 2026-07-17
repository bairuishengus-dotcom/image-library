V7 修复说明：
1. 删除无签名 response-content-disposition 参数，避免 InvalidRequest。
2. 新增 viewer.html。
3. “查看”和“复制链接”现在指向 viewer.html，而不是直接指向 COS。
4. viewer.html 会在浏览器中显示图片，并把标签页标题设置成图片文件名。
5. 缩略图继续使用原始 COS 地址。

上传覆盖 GitHub 根目录：
- index.html
- style.css
- app.js
- viewer.html

config.js 保持不变。
