/* ==========================================================================
   AiFiTrack — script.js
   Vanilla JavaScript only. No frameworks, no chart libraries.
   ========================================================================== */
"use strict";

/* ---------- Tiny helpers ---------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rand  = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick  = arr => arr[randInt(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const isLight = () => document.documentElement.dataset.theme === "light";

/* ==========================================================================
   1. LOADER
   ========================================================================== */
window.addEventListener("load", () => {
  setTimeout(() => $("#loader").classList.add("hidden"), 900);
});

/* ==========================================================================
   2. THEME TOGGLE (dark / light)
   ========================================================================== */
const themeToggle = $("#themeToggle");
const savedTheme = localStorage.getItem("aifitrack-theme");
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

themeToggle.addEventListener("click", () => {
  const next = isLight() ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("aifitrack-theme", next);
  drawLineChart(); drawActivityGraph(); drawDashGraph(); // repaint canvases for new colors
});

/* ==========================================================================
   3. NAVBAR — scroll effect, mobile menu, active link highlighting
   ========================================================================== */
const navbar = $("#navbar");
const hamburger = $("#hamburger");
const navMenu = $("#navMenu");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}, { passive: true });

hamburger.addEventListener("click", () => {
  const open = navMenu.classList.toggle("open");
  hamburger.classList.toggle("open", open);
  hamburger.setAttribute("aria-expanded", open);
});

// Close the mobile menu after tapping a link
$$(".nav-link, .mobile-cta .btn", navMenu).forEach(link =>
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  })
);

// Smooth scrolling for all in-page anchors
$$('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const target = $(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// Highlight the nav link of the section currently in view
const sections = $$("main section[id]");
const navLinks = $$(".nav-link");
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle("active", l.getAttribute("href") === `#${entry.target.id}`));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sections.forEach(s => sectionObserver.observe(s));

/* ==========================================================================
   4. HERO PARTICLES — canvas particle network
   ========================================================================== */
const pCanvas = $("#particleCanvas");
const pCtx = pCanvas.getContext("2d");
let particles = [];

function sizeParticleCanvas() {
  pCanvas.width = pCanvas.offsetWidth;
  pCanvas.height = pCanvas.offsetHeight;
  const count = Math.min(90, Math.floor(pCanvas.width / 14));
  particles = Array.from({ length: count }, () => ({
    x: rand(0, pCanvas.width), y: rand(0, pCanvas.height),
    vx: rand(-0.35, 0.35), vy: rand(-0.35, 0.35),
    r: rand(1, 2.4)
  }));
}

function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  const dotColor = isLight() ? "rgba(30,80,180,0.5)" : "rgba(0,229,255,0.6)";
  const lineColor = isLight() ? "rgba(59,130,246,0.14)" : "rgba(0,229,255,0.12)";

  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > pCanvas.width)  p.vx *= -1;
    if (p.y < 0 || p.y > pCanvas.height) p.vy *= -1;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = dotColor;
    pCtx.fill();
  });

  // connect nearby particles with data lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 110) {
        pCtx.beginPath();
        pCtx.moveTo(particles[i].x, particles[i].y);
        pCtx.lineTo(particles[j].x, particles[j].y);
        pCtx.strokeStyle = lineColor;
        pCtx.lineWidth = 1;
        pCtx.stroke();
      }
    }
  }
  requestAnimationFrame(drawParticles);
}
sizeParticleCanvas();
window.addEventListener("resize", sizeParticleCanvas);
requestAnimationFrame(drawParticles);

// Live HUD widgets in the hero illustration
setInterval(() => {
  const lat = $("#hudLatency"), conf = $("#hudConfidence");
  if (lat) lat.textContent = `${randInt(8, 26)}ms`;
  if (conf) conf.style.width = `${randInt(86, 97)}%`;
}, 2200);

/* ==========================================================================
   5. SCROLL REVEAL ANIMATIONS + TIMELINE + COUNTERS
   ========================================================================== */
// Generic reveal
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.15 });
$$(".reveal-up, .reveal-left, .reveal-right, .reveal-scale").forEach(el => revealObserver.observe(el));

// How-it-works connecting line animation
const timeline = $(".timeline");
new IntersectionObserver((entries, obs) => {
  if (entries[0].isIntersecting) { timeline.classList.add("animated"); obs.disconnect(); }
}, { threshold: 0.35 }).observe(timeline);

// Animated counters (0 -> target)
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const duration = 2000;
  const start = performance.now();

  function tick(now) {
    const p = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.6 });
$$(".counter, .hero-meta-item strong[data-count]").forEach(el => {
  el.dataset.target = el.dataset.target || el.dataset.count;
  counterObserver.observe(el);
});

/* ==========================================================================
   6. LIVE TRACKING SIMULATION — moving markers, routes, live stats
   ========================================================================== */
const mapMarkers = $("#mapMarkers");
const mapRoutes = $("#mapRoutes");
const DEVICES = [
  { id: "DEV-101", x: 20, y: 30 }, { id: "DEV-102", x: 65, y: 22 },
  { id: "DEV-103", x: 45, y: 65 }, { id: "DEV-104", x: 78, y: 58 },
  { id: "DEV-105", x: 30, y: 80 }
];

// Create markers
DEVICES.forEach(d => {
  const m = document.createElement("div");
  m.className = "marker";
  m.style.left = d.x + "%";
  m.style.top = d.y + "%";
  m.innerHTML = `<span class="marker-pin"></span><span class="marker-label">${d.id}</span>`;
  mapMarkers.appendChild(m);
  d.el = m;
});

function moveMarkers() {
  DEVICES.forEach(d => {
    d.x = clamp(d.x + rand(-9, 9), 6, 92);
    d.y = clamp(d.y + rand(-9, 9), 8, 90);
    d.el.style.left = d.x + "%";
    d.el.style.top = d.y + "%";
  });
  // Draw connecting routes between the first few devices
  let paths = "";
  for (let i = 0; i < DEVICES.length - 1; i++) {
    const a = DEVICES[i], b = DEVICES[i + 1];
    const ax = a.x * 6, ay = a.y * 4, bx = b.x * 6, by = b.y * 4; // map % -> 600x400 viewBox
    const mx = (ax + bx) / 2 + rand(-40, 40), my = (ay + by) / 2 + rand(-40, 40);
    paths += `<path d="M${ax} ${ay} Q ${mx} ${my} ${bx} ${by}"/><circle cx="${bx}" cy="${by}" r="3"/>`;
  }
  mapRoutes.innerHTML = paths;

  // Random tracking coordinates + live stats
  const lat = rand(-33.8, 51.5).toFixed(4), lon = rand(-122.4, 151.2).toFixed(4);
  $("#statCoords").textContent = `${lat}° , ${lon}°`;
  $("#lastUpdated").textContent = nowTime();
}
moveMarkers();
setInterval(moveMarkers, 3000); // simulate live updates every 3 seconds

// Drifting stats (distance / speed / active users)
let distance = 1284.6;
setInterval(() => {
  distance += rand(0.4, 2.8);
  $("#statDistance").textContent = distance.toFixed(1) + " km";
  $("#statSpeed").textContent = rand(38, 74).toFixed(0) + " km/h";
  $("#statUsers").textContent = (1042 + randInt(-12, 18)).toLocaleString();
}, 3000);

/* ==========================================================================
   7. FEATURE CARD SPOTLIGHT — track cursor for hover glow position
   ========================================================================== */
$$(".feature-card").forEach(card => {
  card.addEventListener("mousemove", e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

/* ==========================================================================
   8. ANALYTICS — hand-rolled canvas line chart, activity graph, bar chart
   ========================================================================== */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}
function chartColors() {
  return isLight()
    ? { line: "#1d6fe0", fill: "rgba(29,111,224,0.14)", grid: "rgba(30,60,140,0.12)", dot: "#00a0c8" }
    : { line: "#00e5ff", fill: "rgba(0,229,255,0.12)", grid: "rgba(120,160,255,0.1)", dot: "#8b5cf6" };
}

const lineData = Array.from({ length: 30 }, () => randInt(25, 90));
function drawLineChart() {
  const canvas = $("#lineChart");
  if (!canvas || !canvas.offsetWidth) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const c = chartColors();
  const pad = 8, stepX = (w - pad * 2) / (lineData.length - 1);

  // grid
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke();
  }
  // area fill
  ctx.beginPath();
  lineData.forEach((v, i) => {
    const x = pad + i * stepX, y = h - (v / 100) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(w - pad, h); ctx.lineTo(pad, h); ctx.closePath();
  ctx.fillStyle = c.fill; ctx.fill();
  // line
  ctx.beginPath();
  lineData.forEach((v, i) => {
    const x = pad + i * stepX, y = h - (v / 100) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = c.line; ctx.lineWidth = 2.5;
  ctx.shadowColor = c.line; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;
  // last point
  const lx = pad + (lineData.length - 1) * stepX;
  const ly = h - (lineData[lineData.length - 1] / 100) * h;
  ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = c.dot; ctx.shadowColor = c.dot; ctx.shadowBlur = 12; ctx.fill();
}

// Activity graph: sliding waveform
const actPoints = Array.from({ length: 60 }, () => randInt(20, 80));
function drawActivityGraph() {
  const canvas = $("#activityGraph");
  if (!canvas || !canvas.offsetWidth) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const c = chartColors();
  const stepX = w / (actPoints.length - 1);
  ctx.beginPath();
  actPoints.forEach((v, i) => {
    const x = i * stepX, y = h - (v / 100) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = c.line; ctx.lineWidth = 2;
  ctx.shadowColor = c.line; ctx.shadowBlur = 8;
  ctx.stroke();
}

// Stream new points into both charts periodically
setInterval(() => {
  lineData.push(clamp(lineData[lineData.length - 1] + randInt(-14, 14), 20, 96));
  lineData.shift();
  actPoints.push(randInt(20, 92)); actPoints.shift();
  drawLineChart(); drawActivityGraph();
}, 1600);

// Bar chart: pure DOM/CSS
const regions = [
  { name: "North", val: randInt(55, 95) }, { name: "South", val: randInt(40, 85) },
  { name: "East", val: randInt(50, 92) }, { name: "West", val: randInt(35, 78) },
  { name: "Central", val: randInt(60, 98) }
];
const barChart = $("#barChart");
regions.forEach(r => {
  const col = document.createElement("div");
  col.className = "bar-col";
  col.innerHTML = `<div class="bar" data-val="${r.val}%" style="height:0%"></div><span class="bar-name">${r.name}</span>`;
  barChart.appendChild(col);
});
new IntersectionObserver((entries, obs) => {
  if (entries[0].isIntersecting) {
    $$(".bar", barChart).forEach((b, i) =>
      setTimeout(() => b.style.height = b.dataset.val, i * 140));
    obs.disconnect();
  }
}, { threshold: 0.4 }).observe(barChart);

// Performance ring + value animation
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  const perf = 94, circ = 264;
  $("#ringFg").style.strokeDashoffset = circ - (circ * perf) / 100;
  const t0 = performance.now();
  (function countRing(now) {
    const p = clamp((now - t0) / 1800, 0, 1);
    const v = Math.round(perf * (1 - Math.pow(1 - p, 3)));
    $("#ringLabel").textContent = v + "%";
    $("#perfValue").textContent = v + "%";
    if (p < 1) requestAnimationFrame(countRing);
  })(t0);
  obs.disconnect();
}, { threshold: 0.5 }).observe($(".prediction-panel"));

// Recent activity list
const activityFeed = [
  { txt: "Device #207 completed route R-18", color: "var(--green)" },
  { txt: "Geofence check passed — Zone 4", color: "var(--cyan)" },
  { txt: "AI model retrained (v4.2)", color: "var(--purple)" },
  { txt: "Device #311 signal boosted", color: "var(--amber)" },
  { txt: "Batch sync: 148 records", color: "var(--blue)" }
];
$("#activityList").innerHTML = activityFeed
  .map(a => `<li><span class="dot" style="background:${a.color}"></span>${a.txt}<time>${randInt(1, 58)}m ago</time></li>`)
  .join("");

/* ==========================================================================
   9. SMART ALERTS — stream, filters, simulation, toasts
   ========================================================================== */
const alertPool = [
  { type: "info",     icon: "ℹ", title: "Tracking location updated",   desc: "Device #104 synched new coordinates." },
  { type: "warning",  icon: "⚠", title: "Device #102 detected movement", desc: "Motion sensor triggered outside schedule." },
  { type: "critical", icon: "✖", title: "Unusual activity detected",   desc: "AI flagged an anomalous pattern on Device #87." },
  { type: "warning",  icon: "⚠", title: "Battery level low",           desc: "Device #230 at 12% — charge recommended." },
  { type: "info",     icon: "ℹ", title: "New device paired",           desc: "Device #312 joined the fleet." },
  { type: "info",     icon: "ℹ", title: "Route optimization applied",  desc: "Fleet saved an estimated 8.4 km today." },
  { type: "critical", icon: "✖", title: "Geofence breached",           desc: "Device #145 left Zone 2 without authorization." }
];
const alertList = $("#alertList");
let alertCount = 0;

function pushAlert(a, prepend = true) {
  const li = document.createElement("li");
  li.className = `alert-item ${a.type}`;
  li.dataset.type = a.type;
  li.innerHTML = `
    <span class="alert-icon">${a.icon}</span>
    <div class="alert-body"><strong>${a.title}</strong><p>${a.desc}</p></div>
    <time>${nowTime()}</time>`;
  prepend ? alertList.prepend(li) : alertList.append(li);
  alertCount++;
  const kpi = $("#kpiAlerts");
  if (kpi) kpi.textContent = Math.min(alertCount, 99);
  while (alertList.children.length > 12) alertList.lastElementChild.remove();
  applyFilter();
}

// Seed initial alerts
alertPool.slice(0, 5).forEach(a => pushAlert(a, false));

// Live alert drip
setInterval(() => pushAlert(pick(alertPool)), 6500);

// Filter buttons
function applyFilter() {
  const active = $(".filter-btn.active")?.dataset.filter || "all";
  $$(".alert-item", alertList).forEach(item =>
    item.classList.toggle("hide", active !== "all" && item.dataset.type !== active));
}
$$(".filter-btn").forEach(btn => btn.addEventListener("click", () => {
  $$(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}));

// Toast notifications in the control panel
const toastStack = $("#toastStack");
function showToast(a) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="dot" style="width:9px;height:9px;border-radius:50%;background:${a.type === "critical" ? "var(--red)" : a.type === "warning" ? "var(--amber)" : "var(--cyan)"};box-shadow:0 0 10px currentColor"></span><div><strong>${a.title}</strong><br><small style="color:var(--text-dim)">${a.desc}</small></div>`;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 500);
  }, 4200);
  while (toastStack.children.length > 3) toastStack.firstElementChild.remove();
}
$("#simulateAlertBtn").addEventListener("click", () => {
  const a = pick(alertPool);
  showToast(a);
  pushAlert(a);
});

/* ==========================================================================
   10. DASHBOARD PREVIEW — clock, KPIs, live graph, activity feed
   ========================================================================== */
setInterval(() => { $("#dashClock").textContent = nowTime(); }, 1000);

const kpiBase = { total: 1284, active: 1042, inactive: 242 };
function updateKpis() {
  const active = clamp(kpiBase.active + randInt(-8, 10), 980, 1100);
  $("#kpiTotal").textContent = (kpiBase.total + randInt(-4, 8)).toLocaleString();
  $("#kpiActive").textContent = active.toLocaleString();
  $("#kpiInactive").textContent = (kpiBase.total - active).toLocaleString();
  $("#liveLocCount").textContent = `${active.toLocaleString()} online`;
}
updateKpis();
setInterval(updateKpis, 4000);

const dashSeries = Array.from({ length: 40 }, () => randInt(30, 85));
function drawDashGraph() {
  const canvas = $("#dashGraph");
  if (!canvas || !canvas.offsetWidth) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const c = chartColors();
  const stepX = w / (dashSeries.length - 1);

  // vertical bars
  dashSeries.forEach((v, i) => {
    const x = i * stepX;
    const bh = (v / 100) * (h - 14);
    const grad = ctx.createLinearGradient(0, h - bh, 0, h);
    grad.addColorStop(0, isLight() ? "rgba(29,111,224,0.85)" : "rgba(0,229,255,0.85)");
    grad.addColorStop(1, isLight() ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.25)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, h - bh, Math.max(stepX * 0.55, 2), bh);
  });
  // trend line
  ctx.beginPath();
  dashSeries.forEach((v, i) => {
    const x = i * stepX, y = h - (v / 100) * (h - 14) - 4;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = isLight() ? "rgba(217,70,239,0.9)" : "rgba(217,70,239,0.9)";
  ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
  ctx.stroke();
}
setInterval(() => {
  dashSeries.push(clamp(dashSeries[dashSeries.length - 1] + randInt(-12, 12), 22, 94));
  dashSeries.shift();
  drawDashGraph();
}, 1500);

const feedEvents = [
  { txt: "Device #101 checked in", color: "var(--green)" },
  { txt: "Alert resolved: Zone 4", color: "var(--cyan)" },
  { txt: "Device #88 entered hub H-2", color: "var(--blue)" },
  { txt: "Firmware update queued", color: "var(--purple)" },
  { txt: "Device #305 idle 15 min", color: "var(--amber)" },
  { txt: "Speed anomaly cleared", color: "var(--red)" }
];
const dashFeed = $("#dashFeed");
function pushFeed() {
  const li = document.createElement("li");
  const ev = pick(feedEvents);
  li.innerHTML = `<span class="dot" style="background:${ev.color}"></span>${ev.txt}<time>${nowTime()}</time>`;
  dashFeed.prepend(li);
  while (dashFeed.children.length > 8) dashFeed.lastElementChild.remove();
}
for (let i = 0; i < 5; i++) pushFeed();
setInterval(pushFeed, 3800);

/* ==========================================================================
   11. CONTACT FORM VALIDATION
   ========================================================================== */
const form = $("#contactForm");

function setError(input, errEl, msg) {
  const group = input.closest(".form-group");
  group.classList.toggle("invalid", !!msg);
  $(errEl).textContent = msg || "";
}
const validators = {
  name:    v => v.trim().length >= 2          || "Please enter your name (min 2 characters).",
  email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
  phone:   v => v.trim() === "" || /^[+]?[\d\s()-]{7,18}$/.test(v.trim()) || "Please enter a valid phone number.",
  message: v => v.trim().length >= 10         || "Message must be at least 10 characters."
};

["name", "email", "phone", "message"].forEach(id => {
  const input = $("#" + id);
  input.addEventListener("blur", () => {
    const res = validators[id](input.value);
    setError(input, `#${id}Error`, res === true ? "" : res);
  });
  input.addEventListener("input", () => setError(input, `#${id}Error`, ""));
});

form.addEventListener("submit", e => {
  e.preventDefault();
  let valid = true;
  ["name", "email", "phone", "message"].forEach(id => {
    const input = $("#" + id);
    const res = validators[id](input.value);
    if (res !== true) { setError(input, `#${id}Error`, res); valid = false; }
  });
  if (!valid) return;

  const btn = $("#sendBtn");
  btn.disabled = true;
  btn.textContent = "Transmitting…";
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "Send Message";
    form.reset();
    const ok = $("#formSuccess");
    ok.classList.add("show");
    setTimeout(() => ok.classList.remove("show"), 5000);
  }, 1400);
});

/* ==========================================================================
   12. INITIAL PAINT — draw all canvas charts once layout is ready
   ========================================================================== */
window.addEventListener("load", () => {
  drawLineChart(); drawActivityGraph(); drawDashGraph();
});
window.addEventListener("resize", () => {
  drawLineChart(); drawActivityGraph(); drawDashGraph();
});
