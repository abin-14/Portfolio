// ===========================================================================
// Abinfolio – opening animation (home page only, about 4.5 seconds)
//   1. the stars hang still for a moment
//   2. then we shoot towards the spot where your name will be, faster and faster
//   3. we slow down as a nebula blooms around that spot
//   4. your name comes up out of the glow, the sky settles behind it
//   5. top bar, job title, then each button, one after another
// Click, tap or any key skips it. It is skipped for visitors who prefer reduced motion,
// and when you come back to the home page from another page of the site.
// (The small script in the <head> of index.html decides whether it plays.)
// ===========================================================================
(function () {
  const root = document.documentElement;
  if (root.getAttribute("data-intro") !== "wait") return;

  // --- tweak the animation here -----------------------------------------
  const T_NAME = 2100;     // ms: the name starts to come up out of the nebula
  const T_REST = 2800;     // ms: top bar appears, then the title, then the buttons one by one
  const T_FADE = 2900;     // ms: the flight canvas starts to melt away
  const T_END = 4500;      // ms: everything is in place, clean up
  const SPEED = 2.4;       // how fast the stars rush past (higher = faster)
  // ----------------------------------------------------------------------

  const canvas = document.createElement("canvas");
  canvas.id = "warp";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, fx = 0, fy = 0, hw = 0, stars = [];
  let running = true, finished = false, start = 0, last = 0;
  const timers = [];

  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const smooth = function (u) { return u * u * (3 - 2 * u); };

  // how fast we move at second t: still, sudden burst, cruise, slow down, nearly stop
  function speedAt(t) {
    if (t < 0.5) return 0;
    if (t < 1.1) { const u = (t - 0.5) / 0.6; return u * u * u; }
    if (t < 1.8) return 1;
    if (t < 2.6) return 1 - smooth((t - 1.8) / 0.8);
    return 0.015;
  }

  const TINTS = ["255,255,255", "255,255,255", "255,255,255", "205,192,255", "255,214,234"];
  const focal = function () { return Math.max(w, h) * 0.3; };   // how strongly distance shrinks things

  // a star is placed so that, at its depth, it lands at a random spot on the screen:
  // that keeps the still sky evenly spread, and the rushing stars evenly spread too
  function makeStar(anyDepth) {
    const z = anyDepth ? 0.05 + Math.random() * 0.95 : 1;
    const f = focal();
    return {
      x: (Math.random() * w - fx) * z / f,
      y: (Math.random() * h - fy) * z / f,
      z: z,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
    };
  }

  // the flight heads for the middle of the name, so the nebula blooms exactly where the name will appear
  function findTarget() {
    const hero = document.querySelector(".hero");
    if (hero && hero.getBoundingClientRect) {
      const r = hero.getBoundingClientRect();
      if (r.width > 0) { fx = r.left + r.width / 2; fy = r.top + r.height / 2; hw = r.width; return; }
    }
    fx = w / 2; fy = h * 0.42; hw = Math.min(w * 0.8, 700);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    findTarget();
    const n = Math.round(clamp(w * h / 6500, 160, 320));
    stars = [];
    for (let i = 0; i < n; i++) stars.push(makeStar(true));
  }

  // the nebula: four soft glows in the colours of the name, stretched sideways to sit behind it
  const BLOBS = [
    { x: -0.30, y: -0.03, r: 0.36, c: "255,140,70" },
    { x: 0.30,  y: 0.07,  r: 0.34, c: "235,80,130" },
    { x: 0.02,  y: -0.26, r: 0.28, c: "80,130,255" },
    { x: -0.06, y: 0.22,  r: 0.30, c: "150,90,255" },
  ];
  function drawNebula(t) {
    const grow = smooth(clamp((t - 1.0) / 1.6, 0, 1));          // blooms while we slow down
    if (grow <= 0) return;
    const settle = smooth(clamp((t - 2.7) / 1.2, 0, 1));         // then calms to a faint haze behind the name
    const m = Math.min(w, h);
    const stretch = clamp(hw / m * 0.9, 1, 2.2);
    const scale = (0.55 + 0.5 * grow) * (1 - 0.12 * settle);
    const alpha = 0.46 * grow * (1 - 0.7 * settle);
    ctx.globalCompositeOperation = "lighter";
    BLOBS.forEach(function (b) {
      const x = fx + b.x * m * scale * stretch, y = fy + b.y * m * scale, r = b.r * m * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(stretch, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, "rgba(" + b.c + "," + alpha + ")");
      g.addColorStop(1, "rgba(" + b.c + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (!running) return;
    if (!start) { start = now; last = now; }
    const t = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (t > (T_FADE + 1400) / 1000) { running = false; return; }   // the canvas is invisible by now
    const vz = speedAt(t) * SPEED;

    ctx.clearRect(0, 0, w, h);
    drawNebula(t);

    const f = focal();
    ctx.lineCap = "round";
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= vz * dt;
      const sx = fx + (s.x / s.z) * f, sy = fy + (s.y / s.z) * f;
      if (s.z < 0.03 || sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) {
        stars[i] = makeStar(false);                    // a new star far ahead
        continue;
      }
      const pz = s.z + vz * 0.06;                      // where it was a moment ago = the streak
      const px = fx + (s.x / pz) * f, py = fy + (s.y / pz) * f;
      const a = clamp((1 - s.z) * 1.4 + 0.15, 0, 1);
      ctx.strokeStyle = "rgba(" + s.tint + "," + a + ")";
      ctx.lineWidth = 0.4 + (1 - s.z) * 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }

  function stage(name) { root.setAttribute("data-intro", name); }

  function finish() {
    if (finished) return;
    finished = true;
    running = false;
    timers.forEach(clearTimeout);
    root.removeAttribute("data-intro");
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    window.removeEventListener("resize", resize);
    document.removeEventListener("keydown", skip);
  }

  // skip: go straight to the finished page
  function skip() {
    if (finished) return;
    timers.forEach(clearTimeout);
    canvas.classList.add("out");
    stage("rest");
    timers.length = 0;
    timers.push(setTimeout(finish, 1500));
  }

  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("click", skip);
  canvas.addEventListener("touchstart", skip, { passive: true });
  document.addEventListener("keydown", skip);

  timers.push(setTimeout(function () { stage("name"); }, T_NAME));
  timers.push(setTimeout(function () { stage("rest"); }, T_REST));
  timers.push(setTimeout(function () { canvas.classList.add("out"); }, T_FADE));
  timers.push(setTimeout(finish, T_END));
  requestAnimationFrame(frame);
})();