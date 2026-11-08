/* 卷九：年代事件地图。强度是策展分级，不是跨国统计指数。 */
(function () {
  "use strict";
  var D = window.HS_DATA.heat;
  var canvas = document.getElementById("heat-canvas");
  var side = document.getElementById("heat-eras");
  var detail = document.getElementById("heat-detail");
  var eventsEl = document.getElementById("heat-events");
  if (!canvas || !side || !detail) return;
  var ctx = canvas.getContext("2d");
  var cityMap = {};
  window.HS_DATA.cities.forEach(function (c) { cityMap[c.id] = c; });
  var active = 0, W = 0, H = 0, hits = [], selectedPulse = 0;
  var previousEra = -1, transitionStarted = 0, transitionDuration = 720, transitionRaf = null;

  function describe(eraIndex, pulseIndex) {
    var era = D[eraIndex], pulse = era.pulses[pulseIndex];
    selectedPulse = pulseIndex;
    var city = cityMap[pulse.city];
    detail.replaceChildren();
    var heading = document.createElement("h4");
    heading.textContent = (city ? city.name : pulse.city) + " · " + pulse.event;
    var eventText = document.createElement("p"); eventText.textContent = pulse.detail;
    var eraText = document.createElement("p"); eraText.className = "heat-era-summary"; eraText.textContent = era.summary;
    var basis = document.createElement("p"); basis.className = "basis";
    basis.textContent = era.era + " 年代切片 · 策展分级 " + Math.round(pulse.v * 5) + "/5。" + era.basis;
    detail.append(heading, eventText, eraText, basis);
    if (pulse.sources && pulse.sources.length) {
      var sources = document.createElement("div"); sources.className = "heat-sources";
      var sourceHeading = document.createElement("strong"); sourceHeading.textContent = "继续查阅机构资料"; sources.appendChild(sourceHeading);
      pulse.sources.forEach(function (source) {
        var link = document.createElement("a"); link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = source.label + " ↗"; sources.appendChild(link);
      });
      detail.appendChild(sources);
    }
    if (eventsEl) Array.prototype.forEach.call(eventsEl.querySelectorAll("button"), function (button, i) {
      button.setAttribute("aria-pressed", i === pulseIndex ? "true" : "false");
      button.classList.toggle("active", i === pulseIndex);
    });
  }

  function renderEvents(eraIndex) {
    if (!eventsEl) return;
    eventsEl.replaceChildren();
    D[eraIndex].pulses.forEach(function (pulse, index) {
      var city = cityMap[pulse.city];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "heat-event";
      button.setAttribute("aria-pressed", index === selectedPulse ? "true" : "false");
      var title = document.createElement("strong");
      title.textContent = pulse.event;
      var meta = document.createElement("span");
      meta.textContent = (city ? city.name : pulse.city) + " · 策展分级 " + Math.round(pulse.v * 5) + "/5" + (pulse.sources ? " · 有机构资料" : "");
      button.append(title, meta);
      button.addEventListener("click", function () { describe(active, index); draw(); });
      eventsEl.appendChild(button);
    });
  }

  D.forEach(function (era, i) {
    var b = document.createElement("button");
    b.className = "heat-era" + (i === 0 ? " active" : "");
    b.textContent = era.era + "年前后 · " + era.pulses.length + "个地点";
    b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(side.querySelectorAll(".heat-era"), function (x, k) {
        x.classList.toggle("active", k === i); x.setAttribute("aria-pressed", k === i ? "true" : "false");
      });
      selectedPulse = 0;
      renderEvents(i);
      if (active === i) { describe(i, 0); draw(); return; }
      previousEra = active; active = i; describe(i, 0);
      transitionStarted = 0;
      if (transitionRaf) cancelAnimationFrame(transitionRaf);
      if (window.HS.reduced) { previousEra = -1; transitionRaf = null; draw(1); return; }
      transitionRaf = requestAnimationFrame(animateTransition);
    });
    side.appendChild(b);
  });

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = W * Math.min(window.devicePixelRatio || 1, 2);
    canvas.height = H * Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }
  function project(x, y) {
    return { x: 42 + (x - 430) / 500 * (W - 84), y: 42 + (y - 100) / 520 * (H - 84) };
  }
  var COAST = [[560,250],[548,300],[548,330],[516,356],[504,408],[526,482],[500,456],[470,470],[486,540],[560,548],[600,500],[640,430],[700,380],[760,330],[822,148],[720,200],[646,304],[648,356],[562,300],[560,250]];
  function draw(progress) {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(238,228,205,.045)";
    ctx.beginPath();
    COAST.forEach(function (q, i) { var p = project(q[0], q[1]); i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y); });
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(238,228,205,.3)"; ctx.lineWidth = 1.4; ctx.stroke();
    var era = D[active]; hits = [];
    var t = progress === undefined ? (previousEra >= 0 && transitionStarted ? Math.min(1,(performance.now()-transitionStarted)/transitionDuration) : 1) : progress;
    if (previousEra >= 0 && t < 1) paintEra(previousEra, 1 - t, false);
    paintEra(active, previousEra >= 0 ? t : 1, true);
    ctx.textAlign="left"; ctx.font="600 13px 'Noto Sans SC',sans-serif";
    ctx.fillStyle="#f5eddc"; ctx.fillText(era.era+"年前后 · "+era.title,18,24);
    ctx.font="12px 'Noto Sans SC',sans-serif"; ctx.fillStyle="rgba(245,237,220,.8)";
    ctx.fillText("鼠标移到亮点查看事件与分级依据 · 地图位置为叙事示意",18,H-18);
  }
  function paintEra(eraIndex, alpha, current) {
    if (alpha <= 0) return;
    D[eraIndex].pulses.forEach(function (pl, i) {
      var c=cityMap[pl.city]; if(!c)return;
      var p=project(c.x,c.y),r=12+pl.v*22;
      if(current)hits.push({x:p.x,y:p.y,index:i,r:Math.max(18,r)});
      ctx.save();ctx.globalAlpha=alpha;
      var g=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,r);
      g.addColorStop(0,"rgba(224,63,54,"+(.62*pl.v)+")");
      g.addColorStop(.48,"rgba(198,56,46,"+(.32*pl.v)+")");
      g.addColorStop(1,"rgba(198,56,46,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,current&&i===selectedPulse?7:5,0,Math.PI*2);
      ctx.fillStyle=current&&i===selectedPulse?"#ffe3a2":"#f06c57";ctx.fill();
      if(current){
        ctx.font="600 13px 'Noto Sans SC',sans-serif";ctx.textAlign="left";ctx.fillStyle="#fff1d8";ctx.fillText(c.name,p.x+9,p.y-7);
        ctx.font="11px 'Noto Sans Mono',monospace";ctx.fillStyle="#d8ccb7";ctx.fillText(""+Math.round(pl.v*5)+"/5",p.x+9,p.y+10);
      }
      ctx.restore();
    });
  }
  function animateTransition(now) {
    if(!transitionStarted)transitionStarted=now;
    var progress=Math.min(1,(now-transitionStarted)/transitionDuration);
    draw(progress);
    if(progress<1)transitionRaf=requestAnimationFrame(animateTransition);
    else{previousEra=-1;transitionRaf=null;draw(1);}
  }
  function pick(ev) {
    var rect=canvas.getBoundingClientRect(), x=ev.clientX-rect.left, y=ev.clientY-rect.top;
    var best=-1, dist=Infinity;
    hits.forEach(function(h){ var d=(x-h.x)*(x-h.x)+(y-h.y)*(y-h.y); if(d<h.r*h.r&&d<dist){best=h.index;dist=d;} });
    canvas.style.cursor=best>=0?"pointer":"default";
    if(best>=0){selectedPulse=best;describe(active,best);draw();}
  }
  canvas.addEventListener("mousemove",pick);
  canvas.addEventListener("click",pick);
  canvas.addEventListener("mouseleave",function(){canvas.style.cursor="default";});
  /* 热度由半径和色阶表达，静态图可让比较依据更清楚。 */
  function start(){resize();renderEvents(active);describe(active,0);draw();}
  function pause(){}
  function resume(){draw();}
  window.addEventListener("resize",resize);
  window.HS.registerScene("heat",{start:start,pause:pause,resume:resume});
})();
