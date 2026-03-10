/* ════════════════════════════════════════
   NETDEV.SYSTEMS — Main JS
════════════════════════════════════════ */

/* ─── ATOM CURSOR ─────────────────────────────────────────────────────────── */
function initAtomCursor() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;pointer-events:none;z-index:9999;top:0;left:0;width:100%;height:100%;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let idle = false;
  let idleTimer = null;
  let collapse = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    idle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idle = true;
    }, 420);
  });

  const elecs = [
    { a: 0, speed: 0.038, rx: 20, ry: 7, tilt: 0 },
    { a: 2.09, speed: 0.032, rx: 20, ry: 7, tilt: Math.PI / 3 },
    { a: 4.19, speed: 0.044, rx: 20, ry: 7, tilt: -Math.PI / 3 },
  ];

  function getPinkRgb() {
    try {
      const s = getComputedStyle(document.documentElement)
        .getPropertyValue("--pink")
        .trim();
      const tmp = document.createElement("div");
      tmp.style.cssText = `color:${s};position:absolute;top:-9999px`;
      document.body.appendChild(tmp);
      const c = getComputedStyle(tmp).color;
      document.body.removeChild(tmp);
      const m = c.match(/\d+/g);
      return m ? `${m[0]},${m[1]},${m[2]}` : "232,24,109";
    } catch {
      return "232,24,109";
    }
  }

  let pinkRgb = "232,24,109";
  setInterval(() => {
    pinkRgb = getPinkRgb();
  }, 300);

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (idle) collapse = Math.min(1, collapse + 0.055);
    else collapse = Math.max(0, collapse - 0.075);

    const cp = collapse,
      cx = mx,
      cy = my;

    if (cp < 0.98) {
      elecs.forEach((e) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(e.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, e.rx * (1 - cp), e.ry * (1 - cp), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pinkRgb},${0.18 * (1 - cp)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();
      });
    }

    if (cp < 0.98) {
      elecs.forEach((e) => {
        e.a += e.speed;
        const cos = Math.cos(e.tilt),
          sin = Math.sin(e.tilt);
        const ex = Math.cos(e.a) * e.rx * (1 - cp);
        const ey = Math.sin(e.a) * e.ry * (1 - cp);
        const px = cx + ex * cos - ey * sin;
        const py = cy + ex * sin + ey * cos;
        ctx.beginPath();
        ctx.arc(px, py, 2 * (1 - cp * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pinkRgb},${0.85 * (1 - cp * 0.2)})`;
        ctx.fill();
      });
    }

    const baseR = 2.5,
      maxR = 9;
    const r = baseR + (maxR - baseR) * cp;
    const alpha = 0.9 + cp * 0.1;

    if (cp > 0.1) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.5);
      grad.addColorStop(0, `rgba(${pinkRgb},${0.25 * cp})`);
      grad.addColorStop(1, `rgba(${pinkRgb},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${pinkRgb},${alpha})`;
    ctx.fill();

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}

/* ─── CONTROL PANEL ──────────────────────────────────────────────────────── */
function initControlPanel() {
  const slider = document.getElementById("ctrl-slider");
  const preview = document.getElementById("ctrl-preview");
  const toggle = document.getElementById("ctrl-toggle");

  // Mobile controls
  const mobileToggle = document.querySelector(".mobile-theme-toggle");
  const mobileSlider = document.querySelector(".mobile-color-slider");
  const mobilePreview = document.querySelector(".mobile-preview");

  function updatePink(v) {
    const s = 30 + v * 0.7;
    const l = 45 + v * 0.13;
    const r = document.documentElement;
    r.style.setProperty("--pink-s", `${s.toFixed(1)}%`);
    r.style.setProperty("--pink-l", `${l.toFixed(1)}%`);
    const ld = 15 + v * 0.07;
    r.style.setProperty(
      "--pink-dim",
      `hsl(336,${(s * 0.65).toFixed(0)}%,${ld.toFixed(0)}%)`,
    );
    if (preview) preview.style.background = `hsl(336,${s}%,${l}%)`;
    if (mobilePreview) mobilePreview.style.background = `hsl(336,${s}%,${l}%)`;
  }

  function setLightMode(isLight) {
    document.body.classList.toggle("light", isLight);
    // Sync both toggles
    if (toggle) toggle.checked = isLight;
    if (mobileToggle) mobileToggle.checked = isLight;
  }

  function syncSliders(value) {
    if (slider) slider.value = value;
    if (mobileSlider) mobileSlider.value = value;
    updatePink(parseInt(value));
  }

  updatePink(50);

  // Desktop controls
  if (slider) {
    slider.addEventListener("input", () => syncSliders(slider.value));
  }
  if (toggle) {
    toggle.addEventListener("change", function () {
      setLightMode(this.checked);
    });
  }

  // Mobile controls
  if (mobileSlider) {
    mobileSlider.addEventListener("input", () =>
      syncSliders(mobileSlider.value),
    );
  }
  if (mobileToggle) {
    mobileToggle.addEventListener("change", function () {
      setLightMode(this.checked);
    });
  }
}

/* ─── NAV ─────────────────────────────────────────────────────────────────── */
function initNav() {
  const nav = document.querySelector("nav");
  const hamburger = document.querySelector(".nav-hamburger");
  const mobileMenu = document.querySelector(".nav-mobile-menu");

  if (nav) {
    window.addEventListener(
      "scroll",
      () => {
        nav.style.background = window.scrollY > 40 ? "hsla(248,60%,5%,.9)" : "";
      },
      { passive: true },
    );
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      mobileMenu.classList.toggle("open");
    });

    // Close button inside mobile menu
    const closeBtn = mobileMenu.querySelector(".nav-hamburger");
    if (closeBtn && closeBtn !== hamburger) {
      closeBtn.addEventListener("click", () => {
        hamburger.classList.remove("open");
        mobileMenu.classList.remove("open");
      });
    }

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("open");
        mobileMenu.classList.remove("open");
      });
    });
  }
}

/* ─── REVEAL ON SCROLL ───────────────────────────────────────────────────── */
function initReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
        }
      });
    },
    { threshold: 0.08 },
  );

  elements.forEach((el) => observer.observe(el));
}

/* ─── ANIMATED COUNTERS ──────────────────────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.done) {
          entry.target.dataset.done = "true";
          const target = parseFloat(entry.target.dataset.counter);
          const suffix = entry.target.dataset.suffix || "";
          const isFloat = String(entry.target.dataset.counter).includes(".");
          const dur = 1800;
          const t0 = performance.now();

          function step(now) {
            const p = Math.min((now - t0) / dur, 1);
            const v = target * (1 - Math.pow(1 - p, 4));
            entry.target.textContent =
              (isFloat ? v.toFixed(1) : Math.floor(v)) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else
              entry.target.textContent =
                (isFloat ? target.toFixed(1) : target) + suffix;
          }
          requestAnimationFrame(step);
        }
      });
    },
    { threshold: 0.5 },
  );

  counters.forEach((el) => observer.observe(el));
}

/* ─── TRON TRIGGER ───────────────────────────────────────────────────────── */
function initTronTrigger() {
  document.querySelectorAll(".tron-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof window.openTronGame === "function") window.openTronGame();
    });
  });
}

/* ─── INIT ─────────────────────────────────────────────────────────────────  */
document.addEventListener("DOMContentLoaded", () => {
  initAtomCursor();
  initControlPanel();
  initNav();
  initReveal();
  initCounters();
  initTronTrigger();
});
