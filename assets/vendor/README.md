# 本地前端依赖

- `embla/embla-carousel.umd.js`：Embla Carousel 8.6.0，MIT，来源 <https://www.npmjs.com/package/embla-carousel>。
- `gsap/gsap.min.js`：GSAP 3.15.0，GreenSock Standard “No Charge” License，条款 <https://gsap.com/standard-license/>。
- `pdfjs/`：Mozilla PDF.js 6.4.299，Apache-2.0；用于扫描件分页、缩放与清晰度适配，项目只随附显示层和 Worker。
- `three-r147/`：项目原有 Three.js r147 依赖。

本地打包这些运行时文件，是为了在静态 HTTP 服务下使用时不依赖第三方脚本 CDN。

- `lidar-viewer-1.0.0/`：固定版本的 GitHub LiDAR COPC 流式查看器及 WASM，提供巴黎当前 IGN LiDAR HD 点云的馆内对照。遵守上游署名要求；随附 LICENSE、NOTICE 和依赖许可证全文。仅按当前视窗范围请求点数据，不镜像 IGN 大型原始瓦片。
