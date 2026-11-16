// ===========================================================================
// Abinfolio – About me
// Switches between the home view and the About view (#about), and runs the
// fan of cards: next / back buttons, dots, swipe, arrow keys, and clicking the
// edge of a card waiting behind. Also draws the faint corner drawing on each card.
// ===========================================================================
(function () {
  const body = document.body;
  const about = document.getElementById("about");
  if (!about) return;

  const deck = about.querySelector(".deck");
  const cards = Array.prototype.slice.call(about.querySelectorAll(".card"));
  const dotsBox = about.querySelector(".dots");
  const prevBtn = about.querySelector("[data-prev]");
  const nextBtn = about.querySelector("[data-next]");
  const count = about.querySelector(".count");
  let current = 0;

  // ---- the drawing in the corner of each card ---------------------------
  // Kept very faint. Each card has its own small sky object plus a few tiny stars that twinkle slowly:
  //   1 sun · 2 ringed planet · 3 comet · 4 constellation · 5 eclipse · 6 half moon
  const TINTS = ["255,140,70", "235,80,130", "80,130,255", "150,90,255", "255,140,70", "235,80,130"];

  function seeded(seed) {                         // small repeatable random-number maker
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const f = function (n) { return n.toFixed(1); };

  // each object gets: m.cx, m.cy, m.r (position and size), m.tint, m.id, m.rnd
  // and returns { defs, body } – the svg pieces
  const OBJECTS = [
    // sun: a faint disc, a thin ring and a few short rays
    function (m) {
      const r = m.r * 0.55;
      let rays = "";
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        rays += '<line x1="' + f(m.cx + Math.cos(a) * (r + 10)) + '" y1="' + f(m.cy + Math.sin(a) * (r + 10)) +
                '" x2="' + f(m.cx + Math.cos(a) * (r + 17)) + '" y2="' + f(m.cy + Math.sin(a) * (r + 17)) + '"/>';
      }
      return {
        defs: "",
        body: '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(r) + '" fill="rgb(' + m.tint + ')" fill-opacity="0.22"/>' +
              '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(r + 5) + '" fill="none" stroke="#fff" stroke-opacity="0.14"/>' +
              '<g stroke="#fff" stroke-opacity="0.18" stroke-linecap="round">' + rays + '</g>'
      };
    },
    // ringed planet
    function (m) {
      return {
        defs: "",
        body: '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(m.r * 0.62) + '" fill="rgb(' + m.tint + ')" fill-opacity="0.2"/>' +
              '<ellipse cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" rx="' + f(m.r * 1.35) + '" ry="' + f(m.r * 0.32) + '" transform="rotate(-22 ' + f(m.cx) + ' ' + f(m.cy) + ')" fill="none" stroke="#fff" stroke-opacity="0.22"/>'
      };
    },
    // comet: a small head with a long fading tail
    function (m) {
      const hx = m.cx - m.r * 0.5, hy = m.cy + m.r * 0.4;
      const tx = hx + m.r * 2.6, ty = hy - m.r * 1.0;
      return {
        defs: '<linearGradient id="tail' + m.id + '" gradientUnits="userSpaceOnUse" x1="' + f(hx) + '" y1="' + f(hy) + '" x2="' + f(tx) + '" y2="' + f(ty) + '">' +
              '<stop offset="0" stop-color="rgb(' + m.tint + ')" stop-opacity="0.45"/><stop offset="1" stop-color="rgb(' + m.tint + ')" stop-opacity="0"/></linearGradient>',
        body: '<line x1="' + f(hx) + '" y1="' + f(hy) + '" x2="' + f(tx) + '" y2="' + f(ty) + '" stroke="url(#tail' + m.id + ')" stroke-width="2" stroke-linecap="round"/>' +
              '<line x1="' + f(hx) + '" y1="' + f(hy + 6) + '" x2="' + f(tx - 10) + '" y2="' + f(ty + 2) + '" stroke="url(#tail' + m.id + ')" stroke-width="1" stroke-linecap="round"/>' +
              '<circle cx="' + f(hx) + '" cy="' + f(hy) + '" r="3.2" fill="#fff" fill-opacity="0.6"/>'
      };
    },
    // constellation: a few stars joined by thin lines
    function (m) {
      const pts = [[-40, 14], [-16, -12], [8, 6], [30, -16], [46, 10]].map(function (p) {
        return [m.cx + p[0] + (m.rnd() - 0.5) * 8, m.cy + p[1] + (m.rnd() - 0.5) * 8];
      });
      let dots = "";
      pts.forEach(function (p) {
        dots += '<circle class="star" style="animation-duration:' + f(4 + m.rnd() * 3) + 's;animation-delay:-' + f(m.rnd() * 6) + 's" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="1.7" fill="#fff" fill-opacity="0.65"/>';
      });
      return {
        defs: "",
        body: '<polyline points="' + pts.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join(" ") + '" fill="none" stroke="#fff" stroke-opacity="0.16"/>' + dots
      };
    },
    // eclipse: a dark disc in front of a glowing ring
    function (m) {
      return {
        defs: "",
        body: '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(m.r * 0.85) + '" fill="none" stroke="rgb(' + m.tint + ')" stroke-opacity="0.4" stroke-width="2"/>' +
              '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(m.r * 0.85 + 6) + '" fill="none" stroke="rgb(' + m.tint + ')" stroke-opacity="0.12" stroke-width="5"/>' +
              '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(m.r * 0.78) + '" fill="#232327"/>'
      };
    },
    // half moon: a thin outline with one half softly filled
    function (m) {
      return {
        defs: "",
        body: '<circle cx="' + f(m.cx) + '" cy="' + f(m.cy) + '" r="' + f(m.r * 0.8) + '" fill="none" stroke="#fff" stroke-opacity="0.2"/>' +
              '<path d="M' + f(m.cx) + ',' + f(m.cy - m.r * 0.8) + ' A' + f(m.r * 0.8) + ',' + f(m.r * 0.8) + ' 0 0 1 ' + f(m.cx) + ',' + f(m.cy + m.r * 0.8) + ' Z" fill="rgb(' + m.tint + ')" fill-opacity="0.2"/>'
      };
    }
  ];

  function makeArt(i) {
    const rnd = seeded(i * 977 + 13);
    const m = {
      id: i,
      rnd: rnd,
      tint: TINTS[i % TINTS.length],
      r: 30 + rnd() * 8,
      cx: 220 + rnd() * 70,
      cy: 40 + rnd() * 20
    };
    const obj = OBJECTS[i % OBJECTS.length](m);

    let stars = "";
    for (let k = 0; k < 8; k++) {
      stars += '<circle class="star" style="animation-duration:' + (3.5 + rnd() * 4).toFixed(1) + 's;animation-delay:-' + (rnd() * 6).toFixed(1) +
               's" cx="' + (20 + rnd() * 300).toFixed(1) + '" cy="' + (10 + rnd() * 100).toFixed(1) +
               '" r="' + (0.5 + rnd() * 0.6).toFixed(2) + '" fill="#fff" fill-opacity="' + (0.2 + rnd() * 0.3).toFixed(2) + '"/>';
    }

    const wrap = document.createElement("div");
    wrap.className = "card-art";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<svg viewBox="0 0 340 130" preserveAspectRatio="xMidYMin slice" aria-hidden="true">' +
                     '<defs>' + obj.defs + '</defs>' + obj.body + stars + '</svg>';
    return wrap;
  }

  // ---- set up every card: drawing, edge title, click-to-open ------------
  cards.forEach(function (card, i) {
    card.insertBefore(makeArt(i), card.firstChild);

    const tab = document.createElement("span");   // the title on the edge
    tab.className = "tab";
    tab.setAttribute("aria-hidden", "true");
    tab.textContent = card.dataset.title;
    card.appendChild(tab);

    card.addEventListener("click", function () {  // clicking a card waiting behind brings it forward
      if (card.dataset.pos === "n1" || card.dataset.pos === "n2") go(i);
    });
  });

  // one dot per card
  const dots = cards.map(function (card, i) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.setAttribute("aria-label", "Go to " + card.dataset.title);
    dot.addEventListener("click", function () { go(i); });
    dotsBox.appendChild(dot);
    return dot;
  });

  // put every card where it belongs: front, waiting behind, or already flipped away
  function render() {
    cards.forEach(function (card, i) {
      const offset = i - current;
      card.dataset.pos = offset < 0 ? "prev" : offset === 0 ? "front" : offset === 1 ? "n1" : offset === 2 ? "n2" : "far";
      const content = card.querySelector(".card-body");
      content.toggleAttribute("inert", offset !== 0);        // only the front card's content can be reached
      card.setAttribute("aria-hidden", offset !== 0 ? "true" : "false");
    });
    dots.forEach(function (dot, i) {
      if (i === current) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    const upNext = cards[current + 1];
    count.textContent = (current + 1) + " / " + cards.length + "  ·  " + (upNext ? "Next: " + upNext.dataset.title : "That\u2019s everything");
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === cards.length - 1;
    cards[current].querySelector(".card-body").scrollTop = 0;
  }

  function go(i) {
    current = Math.max(0, Math.min(cards.length - 1, i));
    render();
  }

  prevBtn.addEventListener("click", function () { go(current - 1); });
  nextBtn.addEventListener("click", function () { go(current + 1); });

  // arrow keys (and Esc to go back home) while the About view is open
  document.addEventListener("keydown", function (e) {
    if (body.dataset.view !== "about") return;
    if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "Escape") location.hash = "#home";
  });

  // swipe on touch screens
  let startX = 0, startY = 0, tracking = false;
  deck.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    startX = e.clientX; startY = e.clientY; tracking = true;
  });
  deck.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  });
  deck.addEventListener("pointercancel", function () { tracking = false; });

  // links marked data-soon do nothing yet; remove the attribute from a link once its page exists.
  about.querySelectorAll("a[data-soon]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); });
  });

  // which view to show, based on the address (#about = About cards, anything else = home).
  // The case studies list and the case studies themselves are separate pages (case-studies.html and so on).
  function route() {
    const view = location.hash === "#about" ? "about" : "home";
    if (body.dataset.view === view) return;
    body.dataset.view = view;
    if (view === "about") {
      go(0);
      deck.focus({ preventScroll: true });
    }
  }

  window.addEventListener("hashchange", route);
  render();
  route();
})();