// ===========================================================================
// Abinfolio – case study pages
// 1) the "Quick read / Full case study" switch   2) the image viewer (click a picture to enlarge)
// ===========================================================================
(function () {
  // ---- 1. reading mode ----------------------------------------------------
  const page = document.querySelector(".case");
  if (page) {
    const buttons = page.querySelectorAll("[data-mode-btn]");

    function setMode(mode) {
      page.dataset.mode = mode;
      buttons.forEach(function (b) {
        if (b.closest(".seg")) b.setAttribute("aria-pressed", b.dataset.modeBtn === mode ? "true" : "false");
      });
      window.scrollTo(0, 0);                      // each mode starts from the top
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.dataset.modeBtn); });
    });

    if (location.hash === "#full") setMode("full");   // case-chatgpt.html#full opens the full story directly
  }

  // ---- 2. image viewer ----------------------------------------------------
  const links = Array.prototype.slice.call(document.querySelectorAll("a[data-lb]"));
  if (!links.length) return;

  const icon = function (d) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  const lb = document.createElement("div");
  lb.className = "lb";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Image viewer");
  lb.innerHTML =
    '<button class="icon-btn x" type="button" aria-label="Close">' + icon("M6 6l12 12M18 6L6 18") + '</button>' +
    '<button class="icon-btn pv" type="button" aria-label="Previous image">' + icon("M15 5l-7 7 7 7") + '</button>' +
    '<button class="icon-btn nx" type="button" aria-label="Next image">' + icon("M9 5l7 7-7 7") + '</button>' +
    '<img alt=""><p></p>';
  document.body.appendChild(lb);

  const img = lb.querySelector("img");
  const caption = lb.querySelector("p");
  const closeBtn = lb.querySelector(".x");
  const prevBtn = lb.querySelector(".pv");
  const nextBtn = lb.querySelector(".nx");
  let index = 0, opener = null;

  function show(i) {
    index = (i + links.length) % links.length;
    const a = links[index];
    img.src = a.href;
    img.alt = a.querySelector("img").alt;
    caption.textContent = a.dataset.caption || "";
  }
  function open(i, from) {
    opener = from;
    show(i);
    lb.classList.add("open");
    document.documentElement.style.overflow = "hidden";   // page behind stays still
    closeBtn.focus();
  }
  function close() {
    lb.classList.remove("open");
    document.documentElement.style.overflow = "";
    img.removeAttribute("src");
    if (opener) opener.focus();
  }

  links.forEach(function (a, i) {
    a.addEventListener("click", function (e) { e.preventDefault(); open(i, a); });
  });
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", function () { show(index - 1); });
  nextBtn.addEventListener("click", function () { show(index + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });   // click outside the picture

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // swipe left / right on touch screens
  let sx = 0, tracking = false;
  lb.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { sx = e.clientX; tracking = true; } });
  lb.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });
})();