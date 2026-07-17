// 只需修改这里即可切换腾讯云 COS 存储桶
window.IMAGE_LIBRARY_CONFIG = {
  siteTitle: "Company Image Library",

  // 你的 Bucket 完整名称（已根据截图填写）
  bucket: "hhhhhr-1454825981",

  // 广州地域
  region: "ap-guangzhou",

  // 可选：只展示某个目录，例如 "share/"；留空代表整个 Bucket
  rootPrefix: "",

  // 每次请求数量，COS 最大通常为 1000
  maxKeys: 1000
};
