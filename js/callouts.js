/* callouts.js —— 单图「引线标注」：图上拉一条线指向部位并写名称
 * 数据按图片文件名（去目录）索引；坐标为百分比。只给已逐张看过的图标注。
 */
(function () {
  "use strict";

  var DATA = {
    "000_01_trier_statue_front": [
      { x: 48.7, y: 21.6, tx: 60.5, ty: 16, text: "头部：胡须与发型按 2018 年落成版本铸造" },
      { x: 44.0, y: 36.5, tx: 56.0, ty: 31, text: "右手持书卷" },
      { x: 54.8, y: 80.1, tx: 66.0, ty: 74, text: "五级石阶基座，可对照原址照片看尺度" }
    ],
    "001_02_trier_statue_wolf": [
      { x: 45.0, y: 40.0, tx: 58.0, ty: 34, text: "衣纹细节：表层做旧模拟铜锈" },
      { x: 52.0, y: 66.0, tx: 64.0, ty: 60, text: "下摆与台阶接触面" }
    ],
    "003_04_trier_statue_detail_cloak": [
      { x: 47.0, y: 32.0, tx: 60.0, ty: 26, text: "翻领处的铸缝线" },
      { x: 44.0, y: 60.0, tx: 57.0, ty: 55, text: "手部：指节被简化为块面" }
    ]
  };

  function keyOf(it) {
    return String(it.src || "").split("/").pop().replace(/\.(jpg|jpeg|png|webp)$/i, "");
  }

  function marks(item) {
    var key = keyOf(item);
    return DATA[key] || null;
  }

  /* 在给定容器（含 <img>）上绘制标注层 */
  function attach(container, item) {
    var list = marks(item);
    if (!list) return;
    var old = container.querySelector(".co-layer");
    if (old) old.remove();

    var layer = document.createElement("div");
    layer.className = "co-layer";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:3";

    list.forEach(function (m, i) {
      var dot = document.createElement("span");
      dot.className = "co-dot";
      dot.style.cssText = "position:absolute;left:" + m.x + "%;top:" + m.y + "%;width:9px;height:9px;" +
        "margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#e0524a;box-shadow:0 0 0 3px rgba(224,82,74,.22)";
      layer.appendChild(dot);

      var line = document.createElement("span");
      var dx = m.tx - m.x, dy = m.ty - m.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      line.style.cssText = "position:absolute;left:" + m.x + "%;top:" + m.y + "%;width:" + len + "%;height:1px;" +
        "background:rgba(224,82,74,.65);transform-origin:0 0;transform:rotate(" + ang + "deg)";
      layer.appendChild(line);

      var label = document.createElement("span");
      label.className = "co-label";
      label.textContent = m.text;
      label.style.cssText = "position:absolute;left:" + m.tx + "%;top:" + m.ty + "%;transform:translate(-2%,-50%);" +
        "max-width:34%;padding:3px 7px;border-radius:2px;font-size:11px;line-height:1.5;" +
        "background:rgba(10,9,8,.86);border:1px solid rgba(224,82,74,.5);color:#f0e4d2;" +
        "pointer-events:auto";
      layer.appendChild(label);
    });

    container.appendChild(layer);
    return layer;
  }

  window.HSCallouts = { attach: attach, marks: marks, keyOf: keyOf };
})();
