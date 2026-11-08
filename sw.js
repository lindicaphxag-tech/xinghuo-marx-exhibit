/* sw.js — 网络优先 + 离线回退
 * 之前是「缓存优先、且 ignoreSearch」，导致改了页面浏览器还显示旧版。
 * 现在：HTML/JS/CSS 一律先走网络（带降级），图片等静态资源用缓存加速。
 */
var CACHE = "xinghuo-v15-netfirst";

var SHELL = [
  "./hall.html",
  "./index.html",
  "./css/main.css",
  "./css/redesign.css",
  "./css/method-tour.css",
  "./css/mobile-patch.css?v=6",
  "./css/ui-v3.css?v=1",
  "./js/main.js",
  "./js/ui-chrome.js?v=1",
  "./js/back.js?v=1",
  "./js/file-guard.js",
  "./js/command-palette.js",
  "./js/progress-bar.js",
  "./js/pwa-register.js",
  "./assets/favicon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  var requests = SHELL.map(function (path) {
    return new Request(new URL(path, self.registration.scope).href, { cache: "reload" });
  });
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(requests).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

var NET_FIRST = /\.(html|js|css|json|webmanifest)$/i;

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 大文件不进缓存，直接走网络 */
  if (/\.(glb|mp4|zip|wav|m4a|mp3)$/i.test(url.pathname)) return;

  /* 页面与代码：网络优先，失败回缓存 */
  if (NET_FIRST.test(url.pathname) || req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === "basic") {
          var clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return resp;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* 图片等资源：缓存优先，后台更新 */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (resp) {
        if (!resp || resp.status !== 200 || resp.type !== "basic") return resp;
        var clone = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return resp;
      });
    })
  );
});
