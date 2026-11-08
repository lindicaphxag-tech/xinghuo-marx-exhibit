/* Press archive scan reader — PDF.js-powered page navigation and zoom. */
import * as pdfjsLib from "../../assets/vendor/pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../../assets/vendor/pdfjs/pdf.worker.mjs", import.meta.url).toString();

const dialog = document.getElementById("press-reader");
const stage = dialog && dialog.querySelector("[data-reader-stage]");
const canvas = document.getElementById("press-reader-page");
const status = dialog && dialog.querySelector("[data-reader-status]");
const pageInput = dialog && dialog.querySelector("[data-reader-page]");
const pageTotal = dialog && dialog.querySelector("[data-reader-total]");
const previous = dialog && dialog.querySelector("[data-reader-prev]");
const next = dialog && dialog.querySelector("[data-reader-next]");
const zoomOut = dialog && dialog.querySelector("[data-reader-zoom-out]");
const zoomIn = dialog && dialog.querySelector("[data-reader-zoom-in]");
const zoomLabel = dialog && dialog.querySelector("[data-reader-zoom]");

let pdf = null;
let loadTask = null;
let renderTask = null;
let currentPage = 1;
let zoom = 1;
let renderToken = 0;
let activeUrl = "";
let loadNoticeTimer = 0;

function setStatus(message, visible) {
  status.textContent = message;
  status.hidden = !visible;
}

function updateControls() {
  pageInput.value = currentPage;
  pageInput.max = pdf ? pdf.numPages : 1;
  pageTotal.textContent = "/ " + (pdf ? pdf.numPages : "—");
  previous.disabled = !pdf || currentPage <= 1;
  next.disabled = !pdf || currentPage >= pdf.numPages;
  zoomLabel.textContent = zoom === 1 ? "适合页面" : Math.round(zoom * 100) + "%";
}

async function renderPage(direction) {
  if (!pdf || !canvas || !stage) return;
  const token = ++renderToken;
  if (renderTask) {
    try { renderTask.cancel(); } catch (_) {}
    renderTask = null;
  }
  if (direction) {
    stage.classList.remove("turn-forward", "turn-backward");
    void stage.offsetWidth;
    stage.classList.add(direction > 0 ? "turn-forward" : "turn-backward");
  }
  setStatus("正在显影第 " + currentPage + " 页…", true);
  updateControls();

  try {
    const page = await pdf.getPage(currentPage);
    if (token !== renderToken) return;
    const base = page.getViewport({ scale: 1 });
    const fit = Math.min(1, Math.max(.35, (stage.clientWidth - 38) / base.width));
    const viewport = page.getViewport({ scale: fit * zoom });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width * outputScale);
    canvas.height = Math.ceil(viewport.height * outputScale);
    canvas.style.width = Math.ceil(viewport.width) + "px";
    canvas.style.height = Math.ceil(viewport.height) + "px";
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    renderTask = page.render({
      canvasContext: context,
      viewport: viewport,
      transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
    });
    await renderTask.promise;
    if (token === renderToken) setStatus("", false);
  } catch (error) {
    if (error && error.name === "RenderingCancelledException") return;
    if (token === renderToken) setStatus("这一页暂时无法显示。请用新窗口打开原件 PDF。", true);
  }
}

export async function open(url) {
  if (!url || url === activeUrl && pdf) return renderPage(0);
  await close();
  activeUrl = url;
  currentPage = 1;
  zoom = 1;
  setStatus("正在连接数字原件…", true);
  updateControls();
  window.clearTimeout(loadNoticeTimer);
  loadNoticeTimer = window.setTimeout(function () {
    if (!pdf && dialog.open) setStatus("原刊文件较大或网络响应较慢，仍在尝试载入。也可使用右上角“新窗口打开原件”。", true);
  }, 12000);
  try {
    loadTask = pdfjsLib.getDocument({ url: url, withCredentials: false });
    pdf = await loadTask.promise;
    window.clearTimeout(loadNoticeTimer);
    loadNoticeTimer = 0;
    if (!dialog.open) return close();
    currentPage = 1;
    updateControls();
    await renderPage(0);
  } catch (error) {
    window.clearTimeout(loadNoticeTimer);
    loadNoticeTimer = 0;
    if (dialog.open) setStatus("原件暂时无法在馆内读取，可能是网络或来源限制。请点击“新窗口打开原件”。", true);
  }
}

export async function close() {
  window.clearTimeout(loadNoticeTimer);
  loadNoticeTimer = 0;
  renderToken++;
  if (renderTask) {
    try { renderTask.cancel(); } catch (_) {}
    renderTask = null;
  }
  if (loadTask) {
    try { await loadTask.destroy(); } catch (_) {}
    loadTask = null;
  } else if (pdf) {
    try { await pdf.destroy(); } catch (_) {}
  }
  pdf = null;
  activeUrl = "";
  if (canvas) { canvas.width = 0; canvas.height = 0; canvas.style.width = ""; canvas.style.height = ""; }
  if (stage) stage.classList.remove("turn-forward", "turn-backward");
  updateControls();
}

if (previous) previous.addEventListener("click", function () { if (currentPage > 1) { currentPage--; renderPage(-1); } });
if (next) next.addEventListener("click", function () { if (pdf && currentPage < pdf.numPages) { currentPage++; renderPage(1); } });
if (pageInput) pageInput.addEventListener("change", function () {
  if (!pdf) return;
  currentPage = Math.max(1, Math.min(pdf.numPages, Number(pageInput.value) || 1));
  renderPage(0);
});
if (zoomOut) zoomOut.addEventListener("click", function () { zoom = Math.max(.65, Math.round((zoom - .2) * 10) / 10); renderPage(0); });
if (zoomIn) zoomIn.addEventListener("click", function () { zoom = Math.min(2.6, Math.round((zoom + .2) * 10) / 10); renderPage(0); });
if (stage && "ResizeObserver" in window) new ResizeObserver(function () { if (pdf && dialog.open) renderPage(0); }).observe(stage);
if (dialog) dialog.addEventListener("keydown", function (event) {
  if (event.target === pageInput) return;
  if (event.key === "ArrowRight" && pdf && currentPage < pdf.numPages) { currentPage++; renderPage(1); event.preventDefault(); }
  if (event.key === "ArrowLeft" && pdf && currentPage > 1) { currentPage--; renderPage(-1); event.preventDefault(); }
});

updateControls();
