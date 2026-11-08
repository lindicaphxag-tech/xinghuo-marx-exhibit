/* file-guard.js：检测 file:// 直接打开，给出中文引导。
   展馆的三维模型 / JSON / 文献需要 HTTP 服务加载，双击 HTML 会白屏。 */
(function () {
  if (location.protocol !== 'file:') return;
  var box = document.createElement('div');
  box.style.cssText = [
    'position:fixed;inset:0;z-index:2147483647;background:#1a1410;color:#f5e9d4',
    'display:flex;align-items:center;justify-content:center;padding:24px;',
    'font-family:"Microsoft YaHei",system-ui,sans-serif'
  ].join(';');
  box.innerHTML =
    '<div style="max-width:560px;line-height:1.8;text-align:center">' +
    '<div style="font-size:42px;margin-bottom:12px">&#128274;</div>' +
    '<h2 style="margin:0 0 12px;font-size:22px">请通过本地启动器打开展馆</h2>' +
    '<p style="margin:0 0 8px;opacity:.85">检测到您正在直接双击 HTML 文件（file:// 模式）。</p>' +
    '<p style="margin:0 0 20px;opacity:.85">展馆的三维模型、文献和数据清单需要通过本地网页服务加载，直接打开会出现白屏或模型不显示。</p>' +
    '<ol style="text-align:left;display:inline-block;margin:0 0 20px;padding-left:22px">' +
    '<li>在提交包目录双击 <b style="color:#ffd27a">启动展馆.bat</b>；在源项目目录运行 <b style="color:#ffd27a">powershell -ExecutionPolicy Bypass -File .\\启动展馆.ps1</b></li>' +
    '<li>等待浏览器打开本地门厅 hall.html</li>' +
    '</ol>' +
    '<p style="margin:0;font-size:13px;opacity:.6">停止服务时，提交包可关闭启动窗口；源项目请运行 停止展馆.ps1。</p>' +
    '</div>';
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(box);
  });
  // 若 head 阶段就已经有 body
  if (document.body) document.body.appendChild(box);
})();
