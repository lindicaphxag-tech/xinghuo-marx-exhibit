/* sound.js — 卷七 声音史诗层：Web Audio 合成环境音 + 语音朗诵 + 声波可视化 */
(function () {
  "use strict";
  var HS = window.HS;
  var toggle = document.getElementById("sound-toggle");
  var state = document.getElementById("sound-state");
  var wave = document.getElementById("wave-canvas");
  var track = document.getElementById("script-track");
  if (!toggle || !wave || !track) return;
  var ctx = wave.getContext("2d");

  var SCRIPTS = [
    "一个幽灵，共产主义的幽灵，在欧洲游荡。",
    "至今一切社会的历史都是阶级斗争的历史。",
    "无产阶级在这个革命中失去的只是锁链。他们获得的将是整个世界。",
    "全世界无产者，联合起来！"
  ];

  /* ---------- 朗诵轨道 ---------- */
  var lines = [];
  SCRIPTS.forEach(function (text, i) {
    var el = document.createElement("div");
    el.className = "script-line";
    el.textContent = text;
    el.addEventListener("click", function () { speak(i); });
    track.appendChild(el);
    lines.push(el);
  });

  var speaking = -1;
  function speak(i) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    lines.forEach(function (l) { l.classList.remove("active"); });
    var u = new SpeechSynthesisUtterance(SCRIPTS[i]);
    u.lang = "zh-CN"; u.rate = 0.92;
    u.onstart = function () { speaking = i; lines[i].classList.add("active"); };
    u.onend = function () {
      lines[i].classList.remove("active");
      speaking = -1;
      if (i < SCRIPTS.length - 1) speak(i + 1);
    };
    window.speechSynthesis.speak(u);
  }

  /* ---------- 环境声场（默认关闭，手动开启） ---------- */
  var audioCtx = null, analyser = null, nodesOn = false;
  var raf = null, running = false;

  function buildAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(audioCtx.destination);

    /* 低频集会嗡鸣 */
    var osc = audioCtx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.value = 58;
    var lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.18;
    var lfoGain = audioCtx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    var lowGain = audioCtx.createGain(); lowGain.gain.value = 0.05;
    osc.connect(lowGain); lowGain.connect(analyser);
    osc.start(); lfo.start();

    /* 印刷机节奏：噪声脉冲 + 节拍 LFO 周期性敲击 */
    var noise = audioCtx.createBuffer(1, audioCtx.sampleRate * 1, audioCtx.sampleRate);
    var data = noise.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    var noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noise; noiseSrc.loop = true;
    var nGain = audioCtx.createGain(); nGain.gain.value = 0.02;
    var nFilter = audioCtx.createBiquadFilter();
    nFilter.type = "bandpass"; nFilter.frequency.value = 2200;
    noiseSrc.connect(nFilter); nFilter.connect(nGain); nGain.connect(analyser);
    var beat = audioCtx.createOscillator();
    beat.type = "square"; beat.frequency.value = 1.7;
    var beatGain = audioCtx.createGain(); beatGain.gain.value = 0.018;
    beat.connect(beatGain); beatGain.connect(nGain.gain);
    noiseSrc.start(); beat.start();
  }

  toggle.addEventListener("click", function () {
    if (!audioCtx) buildAudio();
    if (nodesOn) {
      audioCtx.suspend(); nodesOn = false;
      toggle.textContent = "开启声场"; state.textContent = "当前静默";
    } else {
      audioCtx.resume(); nodesOn = true;
      toggle.textContent = "关闭声场"; state.textContent = "环境声场播放中";
    }
    drawWave();
    if (nodesOn && running && !raf) loop();
    if (!nodesOn && raf) { cancelAnimationFrame(raf); raf = null; }
  });

  function drawWave() {
    var W = wave.clientWidth, H = wave.clientHeight;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#b3202a"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    var samples = null;
    if (nodesOn && analyser) { samples = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(samples); }
    for (var x = 0; x < W; x++) {
      var y = H / 2;
      if (samples) y += ((samples[Math.floor(x / W * samples.length)] - 128) / 128) * H * .38;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function resize() {
    wave.width = wave.clientWidth * Math.min(window.devicePixelRatio, 2);
    wave.height = wave.clientHeight * Math.min(window.devicePixelRatio, 2);
    ctx.setTransform(wave.width / wave.clientWidth, 0, 0, wave.width / wave.clientWidth, 0, 0);
  }

  function loop() { if (!running || !nodesOn) { raf = null; return; } drawWave(); raf = requestAnimationFrame(loop); }
  function start() { resize(); drawWave(); running = true; if (nodesOn && !raf) loop(); }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  function resume() { if (!running) { resize(); running = true; drawWave(); if (nodesOn && !raf) loop(); } }
  window.addEventListener("resize", resize);

  window.HS.registerScene("sound", { start: start, pause: pause, resume: resume });
})();
