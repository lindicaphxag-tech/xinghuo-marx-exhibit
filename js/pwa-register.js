(function () {
  "use strict";
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  function register() {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {
      // file://、受限内网或浏览器禁用离线功能时，展馆仍可正常在线浏览。
    });
  }
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
})();
