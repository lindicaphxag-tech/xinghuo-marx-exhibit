/* 卷八：时间河流。河道表示年代连续性，目录按历史阶段说明转折。 */
(function () {
  "use strict";
  var D=window.HS_DATA.river, canvas=document.getElementById("river-canvas");
  var detail=document.getElementById("river-detail"), list=document.getElementById("river-events");
  if(!canvas||!detail||!list)return;
  var ctx=canvas.getContext("2d"), cities={};
  window.HS_DATA.cities.forEach(function(c){cities[c.id]=c;});
  var minY=D[0].year,maxY=D[D.length-1].year,W=0,H=0,hover=-1,selected=0;
  var travelFrom=0,travelTo=0,travelStarted=0,travelDuration=700,travelRaf=null,playTimer=null;
  var playButton=document.getElementById("river-play"),stepLabel=document.getElementById("river-step"),progressFill=document.getElementById("river-progress");
  var PHASES=["思想形成","城市抗争","群众组织","跨国组织","革命与政权","组织延续","组织分化"];
  var QUESTIONS=[
    "为什么用思想形成作为这条工人运动主线的起点？个人思想与集体行动如何相遇？",
    "围绕工资与生计的行动，怎样发展为关于权利和政治表达的诉求？",
    "同一城市的再次起义说明了哪些问题：组织记忆、制度压力，还是两者的交织？",
    "为什么工人运动会把普选权等政治改革纳入诉求，而不只讨论工作条件？",
    "包买制度与贫困如何把劳动关系变成公共议题？",
    "跨国组织如何把分散的地方经验转化为共同纲领？",
    "1848 年工人与民主派的合作带来什么力量，又留下哪些目标分歧？",
    "跨国工人协会怎样协调不同国家、行业和政治立场？",
    "公社的选举与劳动改革，如何在战争压力和有限时间内推进？",
    "理论传播为什么需要组织、出版和教育网络持续参与？",
    "五一劳动节如何把地方劳动诉求转化为国际共同议题？",
    "政治组织应如何在议会行动、工会工作和革命策略之间作出选择？",
    "组织分化反映了哪些关于党员身份、集中决策与群众参与的分歧？",
    "1917 年的变化如何同时受到战争、城市动员和政治组织的推动？"
  ];

  function stopPlayback(){if(playTimer)window.clearInterval(playTimer);playTimer=null;if(playButton){playButton.textContent="播放历史演进";playButton.setAttribute("aria-pressed","false");}}
  function updatePlaybackPosition(){if(stepLabel)stepLabel.textContent=(selected+1)+" / "+D.length;if(progressFill)progressFill.style.width=((selected+1)/D.length*100)+"%";}
  function animateTravel(from,to){
    if(travelRaf)cancelAnimationFrame(travelRaf);
    travelFrom=from;travelTo=to;travelStarted=0;
    travelDuration=Math.min(1500,Math.max(420,420+Math.abs(D[to].year-D[from].year)*5));
    travelRaf=requestAnimationFrame(drawTravel);
  }
  function drawTravel(now){
    if(!travelStarted)travelStarted=now;
    var p=Math.min(1,(now-travelStarted)/travelDuration);
    draw(p);
    if(p<1)travelRaf=requestAnimationFrame(drawTravel);else{travelRaf=null;travelFrom=travelTo;draw(1);}
  }
  function select(i,fromPlayback){
    if(!fromPlayback)stopPlayback();
    var previous=selected;
    selected=i; hover=i;
    updatePlaybackPosition();
    if(previous!==i&&W&&H){
      if(window.HS.reduced){if(travelRaf)cancelAnimationFrame(travelRaf);travelRaf=null;travelFrom=travelTo=i;draw(1);}
      else animateTravel(previous,i);
    }
    var e=D[i], city=cities[e.city];
    detail.innerHTML="<div class='river-meta'>"+e.phase+"　/　"+e.year+"　/　"+(city?city.name:e.city)+"</div><strong>"+e.label+"</strong><p>"+e.detail+"</p><div class='river-question'><strong>继续思考</strong><p>"+QUESTIONS[i]+"</p></div>"+(city?"<button type='button' class='river-map-link' data-river-map='"+e.city+"'>在叙事地图定位 "+city.name+"</button>":"");
    Array.prototype.forEach.call(list.querySelectorAll("button"),function(b,k){b.classList.toggle("active",k===i);b.setAttribute("aria-pressed",k===i?"true":"false");});
    var mapButton=detail.querySelector("[data-river-map]");
    if(mapButton)mapButton.addEventListener("click",function(){if(window.HS.scenes.mapstory)window.HS.scenes.mapstory.focusCity(e.city);});
    Array.prototype.forEach.call(document.querySelectorAll("[data-river-year]"),function(b){var year=Number(b.getAttribute("data-river-year"));var closest=D.reduce(function(best,event,index){return Math.abs(event.year-year)<Math.abs(D[best].year-year)?index:best;},0);b.setAttribute("aria-current",closest===i?"true":"false");});
    canvas.setAttribute("aria-label",e.year+"年，"+(city?city.name:e.city)+"："+e.label+"。"+e.detail+" 使用左右方向键浏览事件。");
    if(previous===i||!W||!H)draw(1);
  }
  function buildList(){
    PHASES.forEach(function(phase){
      var subset=D.map(function(e,i){return {e:e,i:i};}).filter(function(x){return x.e.phase===phase;});
      if(!subset.length)return;
      var group=document.createElement("section"); group.className="river-phase";
      var heading=document.createElement("h3"); heading.textContent=phase; group.appendChild(heading);
      var row=document.createElement("div"); row.className="river-phase-events";
      subset.forEach(function(x){
        var b=document.createElement("button");b.type="button";b.className="river-event";
        b.innerHTML="<span>"+x.e.year+" · "+(cities[x.e.city]?cities[x.e.city].name:x.e.city)+"</span><strong>"+x.e.label+"</strong>";
        b.setAttribute("aria-pressed","false");b.addEventListener("click",function(){select(x.i);});row.appendChild(b);
      });
      group.appendChild(row);list.appendChild(group);
    });
  }
  function xOf(year){return 62+(year-minY)/(maxY-minY)*(W-124);}
  function yOf(i){return H*.51+Math.sin(i*1.7)*H*.22;}
  function posOf(i){return {x:xOf(D[i].year),y:yOf(i)};}
  function resize(){W=canvas.clientWidth;H=canvas.clientHeight;if(!W||!H)return;canvas.width=W*Math.min(devicePixelRatio||1,2);canvas.height=H*Math.min(devicePixelRatio||1,2);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
  function draw(travelProgress){
    if(!W||!H)return;ctx.clearRect(0,0,W,H);
    /* 固定河道把事件连成时间连续体；选中节点时才改变视觉焦点。 */
    ctx.strokeStyle="rgba(245,237,220,.14)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(62,H*.5);ctx.lineTo(W-62,H*.5);ctx.stroke();
    for(var band=0;band<3;band++){
      ctx.beginPath();for(var x=0;x<=W;x+=6){var y=H*.5+Math.sin(x*.012+band*1.8)*H*.18+(band-1)*12;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.strokeStyle=["rgba(208,166,105,.35)","rgba(107,145,145,.24)","rgba(239,226,199,.14)"][band];ctx.lineWidth=band===1?2:1;ctx.stroke();
    }
    D.forEach(function(e,i){
      var p=posOf(i),hot=i===hover||i===selected;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y+(i%2?24:-24));ctx.strokeStyle=hot?"rgba(223,111,83,.8)":"rgba(206,175,126,.32)";ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,hot?8:5,0,Math.PI*2);ctx.fillStyle=hot?"#ef765d":"#d3a86b";ctx.fill();
      ctx.font="12px 'Noto Sans Mono',monospace";ctx.textAlign="center";ctx.fillStyle=hot?"#fff1d8":"#d8ccb7";ctx.fillText(e.year,p.x,p.y+(i%2?42:-40));
      if(hot){ctx.font="600 13px 'Noto Sans SC',sans-serif";ctx.fillStyle="#fff1d8";ctx.fillText(e.label,p.x,p.y+(i%2?61:-58));}
    });
    if(travelFrom!==travelTo&&travelProgress<1){
      var a=posOf(travelFrom),b=posOf(travelTo),ease=travelProgress*travelProgress*(3-2*travelProgress);
      var mx=a.x+(b.x-a.x)*ease,my=a.y+(b.y-a.y)*ease;
      ctx.beginPath();ctx.arc(mx,my,9,0,Math.PI*2);ctx.fillStyle="#fff0b5";ctx.fill();
      ctx.beginPath();ctx.arc(mx,my,14,0,Math.PI*2);ctx.strokeStyle="rgba(239,118,93,.86)";ctx.lineWidth=2;ctx.stroke();
    }
    ctx.textAlign="left";ctx.font="12px 'Noto Sans SC',sans-serif";ctx.fillStyle="rgba(245,237,220,.75)";ctx.fillText("从地方生计抗争　→　工人组织　→　跨国联合　→　政权实践",18,24);
  }
  function hit(ev){var r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top,found=-1,best=26*26;
    D.forEach(function(_,i){var p=posOf(i),d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<best){best=d;found=i;}});
    hover=found;canvas.style.cursor=found>=0?"pointer":"default";if(found>=0)select(found);else draw();
  }
  canvas.addEventListener("mousemove",hit);canvas.addEventListener("click",hit);
  canvas.addEventListener("mouseleave",function(){hover=selected;draw();});
  canvas.tabIndex=0;canvas.setAttribute("role","img");
  document.querySelectorAll("[data-river-year]").forEach(function(button){button.addEventListener("click",function(){var year=Number(button.getAttribute("data-river-year"));var closest=0;D.forEach(function(event,i){if(Math.abs(event.year-year)<Math.abs(D[closest].year-year))closest=i;});select(closest);});});
  if(playButton)playButton.addEventListener("click",function(){
    if(playTimer){stopPlayback();return;}
    if(selected===D.length-1)select(0,true);
    playButton.textContent="暂停历史演进";playButton.setAttribute("aria-pressed","true");
    playTimer=window.setInterval(function(){if(selected>=D.length-1){stopPlayback();return;}select(selected+1,true);},4000);
  });
  var prevButton=document.getElementById("river-prev"),nextButton=document.getElementById("river-next");
  if(prevButton)prevButton.addEventListener("click",function(){stopPlayback();select(Math.max(0,selected-1));});
  if(nextButton)nextButton.addEventListener("click",function(){stopPlayback();select(Math.min(D.length-1,selected+1));});
  canvas.addEventListener("keydown",function(ev){if(ev.key==="ArrowRight"||ev.key==="ArrowLeft"){select((selected+(ev.key==="ArrowRight"?1:-1)+D.length)%D.length);ev.preventDefault();}});
  buildList();select(0);updatePlaybackPosition();
  function start(){resize();draw();}
  function pause(){stopPlayback();if(travelRaf){cancelAnimationFrame(travelRaf);travelRaf=null;}travelFrom=travelTo=selected;draw(1);}
  function resume(){resize();draw();}
  window.addEventListener("resize",resize);
  window.HS.registerScene("river",{start:start,pause:pause,resume:resume});
})();
