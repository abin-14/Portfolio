// Abinfolio – main script
// Draws the static star field behind the page.
// Stars are generated from a fixed seed, so they sit in the same places every time
// (and stay put when the window is resized). The stars themselves don't move;
// an occasional comet crosses the sky (second block at the bottom).

(function () {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // --- tweak the sky here -------------------------------------------
  const AREA_PER_STAR = 11000;  // bigger number = fewer stars (less crowded)
  const MIN_STARS = 70;
  const MAX_STARS = 220;
  const BRIGHT_CHANCE = 0.08;   // share of stars that are bigger and glow softly
  // --------------------------------------------------------------------

  // small seeded random generator (same sky every visit)
  function seeded(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = seeded(11);
  const tints = ["255,255,255", "255,255,255", "255,255,255", "205,192,255", "255,214,234"];
  const stars = Array.from({ length: MAX_STARS }, () => {
    const bright = rand() < BRIGHT_CHANCE;
    return {
      x: rand(),
      y: rand(),
      r: bright ? 0.9 + rand() * 0.7 : 0.35 + rand() * 0.55,
      a: bright ? 0.85 + rand() * 0.15 : 0.25 + rand() * 0.6,
      tint: tints[Math.floor(rand() * tints.length)],
      bright,
    };
  });

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const count = Math.max(MIN_STARS, Math.min(MAX_STARS, Math.round((w * h) / AREA_PER_STAR)));

    for (let i = 0; i < count; i++) {
      const s = stars[i];
      const x = s.x * w;
      const y = s.y * h;

      if (s.bright) {                       // soft glow around the bigger stars
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 6);
        g.addColorStop(0, "rgba(" + s.tint + "," + (s.a * 0.45) + ")");
        g.addColorStop(1, "rgba(" + s.tint + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(" + s.tint + "," + s.a + ")";
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw();
  window.addEventListener("resize", draw);
})();


// ---------------------------------------------------------------------------
// Comets: a quiet surprise. One comet at a time crosses the whole sky on a
// diagonal path (never straight across or straight down), in a different colour
// each time, shedding a few tiny glints. Then a pause of about 20 seconds before the next one.
// Drawn on its own transparent canvas, so the star field is never touched.
// Switched off for visitors who prefer reduced motion.
// ---------------------------------------------------------------------------
(function () {
  const starCanvas = document.getElementById("stars");
  if (!starCanvas) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (document.body.hasAttribute("data-calm")) return;     // reading pages keep the sky still

  // --- tweak the comets here ------------------------------------------
  const FIRST_DELAY = [6000, 10000];    // ms before the first comet
  const GAP = [18000, 22000];           // ms of quiet between one comet and the next (about 20 seconds)
  const LENGTH = [120, 200];            // tail length in px
  const SPEED = [450, 600];             // px per second (lower = slower, calmer)
  const LINE_WIDTH = 1.2;               // thickness of the streak
  const ANGLE = [22, 68];               // degrees from horizontal: keeps it diagonal, never flat or straight down
  const GLINT_EVERY = 0.05;             // seconds between tiny glints (bigger = fewer)
  const COLORS = [                      // a different one is used each time
    "255,255,255",   // white
    "205,192,255",   // lavender
    "255,185,215",   // rose
    "150,190,255",   // soft blue
    "255,215,160",   // amber
    "150,235,225",   // teal
  ];
  // ----------------------------------------------------------------------

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";
  starCanvas.insertAdjacentElement("afterend", canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, comet = null, glints = [], running = false, last = 0, sinceGlint = 0, lastColor = -1;

  const between = (a, b) => a + Math.random() * (b - a);
  const pick = (range) => between(range[0], range[1]);

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // where along a line (through c, direction d) the head enters / leaves a span of the screen
  function span(c, d, size, margin) {
    const a = (-margin - c) / d;
    const b = (size + margin - c) / d;
    return a < b ? [a, b] : [b, a];
  }

  function schedule(delay) {
    setTimeout(launch, delay);
  }

  function launch() {
    if (document.hidden || comet) { schedule(8000); return; }   // not while the tab is in the background

    const angle = between(ANGLE[0], ANGLE[1]) * Math.PI / 180;
    const dx = Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1);  // left or right
    const dy = Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);  // up or down
    const len = pick(LENGTH);
    const speed = pick(SPEED);

    // a path through the middle part of the screen, so it always crosses the whole sky
    const cx = between(0.25, 0.75) * w;
    const cy = between(0.25, 0.75) * h;
    const margin = len + 10;
    const sx = span(cx, dx, w, margin);
    const sy = span(cy, dy, h, margin);
    const t0 = Math.max(sx[0], sy[0]);                 // head enters (just off-screen)
    const t1 = Math.min(sx[1], sy[1]);                 // head leaves (tail fully off-screen)

    let ci;
    do { ci = Math.floor(Math.random() * COLORS.length); } while (ci === lastColor);
    lastColor = ci;

    comet = { cx, cy, dx, dy, len, speed, t0, age: 0, life: (t1 - t0) / speed, tint: COLORS[ci] };
    sinceGlint = 0;
    if (!running) { running = true; last = 0; requestAnimationFrame(tick); }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    ctx.clearRect(0, 0, w, h);

    if (comet) {
      const c = comet;
      c.age += dt;
      const p = c.age / c.life;

      if (p >= 1) {
        comet = null;
        schedule(pick(GAP));                           // pause before the next one
      } else {
        const alpha = Math.min(1, p * 10, (1 - p) * 10) * 0.85;
        const t = c.t0 + c.speed * c.age;
        const hx = c.cx + c.dx * t;
        const hy = c.cy + c.dy * t;
        const tx = hx - c.dx * c.len;
        const ty = hy - c.dy * c.len;

        // tail: coloured, fading away behind the head
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0, "rgba(" + c.tint + "," + alpha + ")");
        g.addColorStop(1, "rgba(" + c.tint + ",0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = LINE_WIDTH;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // head: tiny white point with a soft coloured glow
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 5);
        glow.addColorStop(0, "rgba(255,255,255," + alpha + ")");
        glow.addColorStop(0.35, "rgba(" + c.tint + "," + alpha * 0.45 + ")");
        glow.addColorStop(1, "rgba(" + c.tint + ",0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();

        // glints: a few tiny sparkles dropped along the tail that twinkle and fade
        sinceGlint += dt;
        while (sinceGlint > GLINT_EVERY) {
          sinceGlint -= GLINT_EVERY;
          if (hx > 0 && hx < w && hy > 0 && hy < h) {
            const back = between(0, c.len * 0.6);
            glints.push({
              x: hx - c.dx * back + between(-3, 3),
              y: hy - c.dy * back + between(-3, 3),
              r: between(0.5, 1.1),
              age: 0,
              life: between(0.7, 1.3),
              phase: Math.random() * Math.PI * 2,
              tint: Math.random() < 0.5 ? "255,255,255" : c.tint,
            });
          }
        }
      }
    }

    glints = glints.filter((s) => s.age < s.life);
    for (const s of glints) {
      s.age += dt;
      const fade = 1 - s.age / s.life;
      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.age * 16 + s.phase));
      const a = fade * twinkle * 0.8;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, "rgba(" + s.tint + "," + a + ")");
      g.addColorStop(1, "rgba(" + s.tint + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (comet || glints.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  resize();
  window.addEventListener("resize", resize);
  schedule(pick(FIRST_DELAY));
})();