/**
 * Abe Stack University — interactive curriculum app
 */
(function () {
  const DATA = window.ABE_UNIVERSITY;
  if (!DATA) {
    console.error("ABE_UNIVERSITY data missing");
    return;
  }

  const STORAGE_KEY = "abe-university-v1";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = Object.assign(
    {
      view: "home",
      phase: "year-0",
      unitId: "year-0-01",
      checks: {},
      unitDone: {},
      notes: "",
      flashIndex: 0,
      flashFlipped: false,
      timerSecs: 25 * 60,
      timerLeft: 25 * 60,
      timerRunning: false,
      streak: 0,
      lastStudyDay: null,
    },
    loadState(),
  );

  // Don't persist timerRunning across reloads
  state.timerRunning = false;
  state.flashFlipped = false;

  function persist() {
    saveState({
      view: state.view,
      phase: state.phase,
      unitId: state.unitId,
      checks: state.checks,
      unitDone: state.unitDone,
      notes: state.notes,
      flashIndex: state.flashIndex,
      timerSecs: state.timerSecs,
      timerLeft: state.timerLeft,
      streak: state.streak,
      lastStudyDay: state.lastStudyDay,
    });
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function markStudied() {
    const t = todayKey();
    if (state.lastStudyDay === t) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    state.streak = state.lastStudyDay === yKey ? (state.streak || 0) + 1 : 1;
    state.lastStudyDay = t;
    persist();
  }

  function totalTodos() {
    let n = 0;
    DATA.phases.forEach((p) =>
      p.units.forEach((u) =>
        u.sessions.forEach((s) => {
          n += s.todos.length;
        }),
      ),
    );
    return n;
  }

  function checkedCount() {
    return Object.values(state.checks).filter(Boolean).length;
  }

  function unitDoneCount() {
    return Object.values(state.unitDone).filter(Boolean).length;
  }

  function findUnit(id) {
    for (const p of DATA.phases) {
      const u = p.units.find((x) => x.id === id);
      if (u) return { phase: p, unit: u };
    }
    return { phase: DATA.phases[0], unit: DATA.phases[0].units[0] };
  }

  function checkKey(unitId, sessionId, todoIdx) {
    return `${unitId}:${sessionId}:${todoIdx}`;
  }

  function unitProgress(unit) {
    let total = 0;
    let done = 0;
    unit.sessions.forEach((s) => {
      s.todos.forEach((_, i) => {
        total++;
        if (state.checks[checkKey(unit.id, s.id, i)]) done++;
      });
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function nextIncomplete() {
    for (const p of DATA.phases) {
      for (const u of p.units) {
        if (!state.unitDone[u.id]) {
          const prog = unitProgress(u);
          if (prog.done < prog.total) return { phase: p, unit: u };
        }
      }
    }
    return { phase: DATA.phases[0], unit: DATA.phases[0].units[0] };
  }

  /* ——— DOM helpers ——— */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function setView(view) {
    state.view = view;
    $$(".uni-nav__btn").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
    $$(".uni-view").forEach((v) => {
      v.hidden = v.dataset.view !== view;
    });
    persist();
    if (view === "labs") initLabs();
    if (view === "curriculum") renderCurriculum();
    if (view === "home") renderHome();
    if (view === "flash") renderFlash();
    if (view === "resources") renderResources();
    if (view === "notes") renderNotes();
    if (view === "timer") renderTimer();
  }

  function updateHeroStats() {
    const checked = checkedCount();
    const total = totalTodos();
    const pct = total ? Math.round((checked / total) * 100) : 0;
    const unitsDone = unitDoneCount();

    const ring = $("#uni-ring-value");
    if (ring) {
      const c = 2 * Math.PI * 42;
      ring.style.strokeDasharray = String(c);
      ring.style.strokeDashoffset = String(c * (1 - pct / 100));
    }
    const pctEl = $("#uni-ring-pct");
    if (pctEl) pctEl.textContent = pct + "%";

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("uni-stat-units", `${unitsDone}/${DATA.meta.totalUnits}`);
    set("uni-stat-checks", String(checked));
    set("uni-stat-streak", String(state.streak || 0));
    set("uni-stat-sessions", "360");
  }

  /* ——— Home ——— */
  function renderHome() {
    updateHeroStats();
    const cont = $("#uni-continue");
    if (cont) {
      const { phase, unit } = nextIncomplete();
      cont.innerHTML = `
        <div>
          <strong>Continue: ${phase.label} · ${unit.unitLabel} ${String(unit.unit).padStart(2, "0")}</strong>
          <p>${escapeHtml(unit.title)}</p>
        </div>
        <button type="button" class="uni-btn uni-btn--primary" data-goto-unit="${unit.id}" data-goto-phase="${phase.key}">Open session →</button>
      `;
    }

    const honesty = $("#uni-honesty");
    if (honesty) {
      honesty.innerHTML = DATA.honesty
        .map(
          (h) =>
            `<li><strong>${escapeHtml(h.dream)}</strong><br>${escapeHtml(h.reality)}</li>`,
        )
        .join("");
    }

    const projects = $("#uni-projects");
    if (projects) {
      projects.innerHTML = DATA.projects
        .map(
          (p) =>
            `<div class="uni-project"><span class="uni-project__id">${p.id}</span><div><div style="font-weight:700;font-size:0.9rem">${escapeHtml(p.title)}</div><div style="font-size:0.75rem;color:#64748b">${escapeHtml(p.year)}</div></div></div>`,
        )
        .join("");
    }
  }

  /* ——— Curriculum ——— */
  function renderCurriculum() {
    const phase = DATA.phases.find((p) => p.key === state.phase) || DATA.phases[0];
    const shell = $("#uni-curriculum");
    if (!shell) return;

    shell.style.setProperty("--phase-color", phase.color);

    const tabs = $("#uni-phase-tabs");
    tabs.innerHTML = DATA.phases
      .map(
        (p) =>
          `<button type="button" class="uni-chip ${p.key === phase.key ? "is-active" : ""}" data-phase="${p.key}" style="--phase-color:${p.color}">${escapeHtml(p.label)}</button>`,
      )
      .join("");

    const head = $("#uni-phase-head");
    head.innerHTML = `
      <div>
        <div class="uni-panel__title">${escapeHtml(phase.label)}</div>
        <div class="uni-panel__sub">${escapeHtml(phase.subtitle)} · Exit: ${escapeHtml(phase.exit)}</div>
      </div>
    `;

    let unit = phase.units.find((u) => u.id === state.unitId) || phase.units[0];
    if (!phase.units.some((u) => u.id === state.unitId)) {
      state.unitId = unit.id;
    }

    const grid = $("#uni-week-grid");
    grid.innerHTML = phase.units
      .map((u) => {
        const prog = unitProgress(u);
        const done = prog.total > 0 && prog.done === prog.total;
        if (done) state.unitDone[u.id] = true;
        return `<button type="button" class="uni-week ${u.id === unit.id ? "is-active" : ""} ${done || state.unitDone[u.id] ? "is-done" : ""}" data-unit="${u.id}" title="${escapeHtml(u.title)}">${String(u.unit).padStart(2, "0")}</button>`;
      })
      .join("");

    const detail = $("#uni-unit-detail");
    const prog = unitProgress(unit);
    detail.innerHTML = `
      <div class="uni-panel__head" style="margin-bottom:0.75rem">
        <div>
          <div class="uni-panel__title">${escapeHtml(unit.unitLabel)} ${String(unit.unit).padStart(2, "0")}: ${escapeHtml(unit.title)}</div>
          <div class="uni-panel__sub">${prog.done}/${prog.total} tasks · ${prog.pct}%</div>
        </div>
        <label style="font-size:0.8rem;font-weight:700;display:flex;align-items:center;gap:0.4rem;cursor:pointer">
          <input type="checkbox" data-mark-unit ${state.unitDone[unit.id] ? "checked" : ""} /> Mark week complete
        </label>
      </div>
      ${unit.sessions
        .map(
          (s) => `
        <article class="uni-session">
          <div class="uni-session__top">
            <div><span class="uni-session__badge">${s.id}</span><strong>${escapeHtml(s.title)}</strong></div>
            <span class="uni-session__mins">~${s.mins} min</span>
          </div>
          <div class="uni-links">
            ${s.links
              .map((l) =>
                l.href
                  ? `<a class="uni-link" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`
                  : `<span class="uni-link uni-link--note" title="Local curriculum note">${escapeHtml(l.label || l.note || "Note")}</span>`,
              )
              .join("")}
          </div>
          <ul class="uni-todo">
            ${s.todos
              .map((t, i) => {
                const key = checkKey(unit.id, s.id, i);
                const on = !!state.checks[key];
                return `<li class="${on ? "is-checked" : ""}"><input type="checkbox" data-check="${escapeAttr(key)}" ${on ? "checked" : ""} /><span>${escapeHtml(t)}</span></li>`;
              })
              .join("")}
          </ul>
        </article>
      `,
        )
        .join("")}
      <div class="uni-meta-box">
        <p><strong>LinkedIn:</strong> ${escapeHtml(unit.linkedin || "—")}</p>
        <p style="margin-top:0.4rem"><strong>Project:</strong> ${escapeHtml(unit.project || "—")}</p>
      </div>
      <div class="uni-controls" style="margin-top:1rem">
        <button type="button" class="uni-btn" data-nav-unit="-1">← Prev</button>
        <button type="button" class="uni-btn uni-btn--primary" data-nav-unit="1">Next →</button>
      </div>
    `;

    updateHeroStats();
  }

  /* ——— Flashcards ——— */
  function renderFlash() {
    const cards = DATA.flashcards;
    const i = ((state.flashIndex % cards.length) + cards.length) % cards.length;
    state.flashIndex = i;
    const card = cards[i];
    const inner = $("#uni-flash-inner");
    if (!inner) return;
    inner.classList.toggle("is-flipped", state.flashFlipped);
    $("#uni-flash-q").textContent = card.q;
    $("#uni-flash-a").textContent = card.a;
    $("#uni-flash-count").textContent = `${i + 1} / ${cards.length}`;
  }

  /* ——— Resources ——— */
  function renderResources() {
    const root = $("#uni-resources");
    if (!root) return;
    const cats = [...new Set(DATA.resources.map((r) => r.cat))];
    const filter = root.dataset.filter || "All";
    root.innerHTML = `
      <div class="uni-phase-tabs">
        ${["All", ...cats]
          .map(
            (c) =>
              `<button type="button" class="uni-chip ${filter === c ? "is-active" : ""}" data-res-filter="${escapeAttr(c)}">${escapeHtml(c)}</button>`,
          )
          .join("")}
      </div>
      <div class="uni-resource-grid">
        ${DATA.resources
          .filter((r) => filter === "All" || r.cat === filter)
          .map(
            (r) =>
              `<a class="uni-resource" href="${escapeAttr(r.url)}" target="_blank" rel="noopener"><div class="uni-resource__cat">${escapeHtml(r.cat)}</div><div class="uni-resource__title">${escapeHtml(r.title)}</div><div class="uni-resource__src">${escapeHtml(r.src)}</div></a>`,
          )
          .join("")}
      </div>
    `;
  }

  /* ——— Notes ——— */
  function renderNotes() {
    const ta = $("#uni-notes-ta");
    if (ta && ta.value !== state.notes) ta.value = state.notes || "";
  }

  /* ——— Timer ——— */
  let timerInterval = null;

  function renderTimer() {
    const display = $("#uni-timer-display");
    const fill = $("#uni-timer-fill");
    if (!display) return;
    const m = Math.floor(state.timerLeft / 60);
    const s = state.timerLeft % 60;
    display.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const pct = state.timerSecs ? state.timerLeft / state.timerSecs : 0;
    if (fill) fill.style.transform = `scaleX(${Math.max(0, pct)})`;
    const runBtn = $("#uni-timer-toggle");
    if (runBtn) runBtn.textContent = state.timerRunning ? "Pause" : "Start";
  }

  function tickTimer() {
    if (!state.timerRunning) return;
    if (state.timerLeft <= 0) {
      state.timerRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
      markStudied();
      persist();
      renderTimer();
      try {
        if (window.Notification && Notification.permission === "granted") {
          new Notification("Abe Stack University", { body: "Focus block complete. Log what you learned." });
        }
      } catch (_) {}
      return;
    }
    state.timerLeft -= 1;
    if (state.timerLeft % 5 === 0) persist();
    renderTimer();
  }

  /* ——— Labs ——— */
  let labsReady = false;

  function initLabs() {
    if (labsReady) {
      drawVectorLab();
      return;
    }
    labsReady = true;
    setupVectorLab();
    setupGradientLab();
  }

  /* Vector lab */
  const vec = {
    a: { x: 2.5, y: 1.5 },
    b: { x: 1.2, y: 2.8 },
    drag: null,
  };

  function setupVectorLab() {
    const canvas = $("#uni-vec-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function toCanvas(p) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 10;
      return { x: cx + p.x * scale, y: cy - p.y * scale, scale, cx, cy };
    }

    function fromCanvas(mx, my) {
      const { scale, cx, cy } = toCanvas({ x: 0, y: 0 });
      return {
        x: Math.max(-4.5, Math.min(4.5, (mx - cx) / scale)),
        y: Math.max(-4.5, Math.min(4.5, (cy - my) / scale)),
      };
    }

    function hit(p, mx, my) {
      const c = toCanvas(p);
      const dx = c.x - mx;
      const dy = c.y - my;
      return dx * dx + dy * dy < 18 * 18;
    }

    window.__uniDrawVec = function draw() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.width * 0.62 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.width * 0.62;

      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, w, h);

      const { scale, cx, cy } = toCanvas({ x: 0, y: 0 });

      // grid
      ctx.strokeStyle = "rgba(148,163,184,0.15)";
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * scale, 0);
        ctx.lineTo(cx + i * scale, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy + i * scale);
        ctx.lineTo(w, cy + i * scale);
        ctx.stroke();
      }

      // axes
      ctx.strokeStyle = "rgba(226,232,240,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      function arrow(from, to, color, label) {
        const f = toCanvas(from);
        const t = toCanvas(to);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        const ang = Math.atan2(t.y - f.y, t.x - f.x);
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x - 12 * Math.cos(ang - 0.4), t.y - 12 * Math.sin(ang - 0.4));
        ctx.lineTo(t.x - 12 * Math.cos(ang + 0.4), t.y - 12 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "600 12px Plus Jakarta Sans, sans-serif";
        ctx.fillText(label, t.x + 10, t.y - 10);
      }

      // projection of a onto b
      const bLen2 = vec.b.x * vec.b.x + vec.b.y * vec.b.y || 1e-6;
      const dot = vec.a.x * vec.b.x + vec.a.y * vec.b.y;
      const proj = { x: (dot / bLen2) * vec.b.x, y: (dot / bLen2) * vec.b.y };

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(16,185,129,0.7)";
      ctx.beginPath();
      const pa = toCanvas(vec.a);
      const pp = toCanvas(proj);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pp.x, pp.y);
      ctx.stroke();
      ctx.setLineDash([]);

      arrow({ x: 0, y: 0 }, vec.b, "#38bdf8", "b");
      arrow({ x: 0, y: 0 }, vec.a, "#60a5fa", "a");
      arrow({ x: 0, y: 0 }, proj, "#34d399", "proj");

      const magA = Math.hypot(vec.a.x, vec.a.y);
      const magB = Math.hypot(vec.b.x, vec.b.y);
      const cos = magA && magB ? dot / (magA * magB) : 0;

      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };
      set("uni-dot", dot.toFixed(2));
      set("uni-cos", cos.toFixed(3));
      set("uni-angle", ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI).toFixed(1) + "°");
    };

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
    }

    function onDown(e) {
      e.preventDefault();
      const p = pointerPos(e);
      if (hit(vec.a, p.x, p.y)) vec.drag = "a";
      else if (hit(vec.b, p.x, p.y)) vec.drag = "b";
    }
    function onMove(e) {
      if (!vec.drag) return;
      e.preventDefault();
      const p = pointerPos(e);
      const v = fromCanvas(p.x, p.y);
      vec[vec.drag] = v;
      drawVectorLab();
    }
    function onUp() {
      vec.drag = null;
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp);

    drawVectorLab();
    window.addEventListener("resize", () => {
      if (state.view === "labs") drawVectorLab();
    });
  }

  function drawVectorLab() {
    if (window.__uniDrawVec) window.__uniDrawVec();
  }

  /* Gradient descent lab */
  const gd = {
    w: -2,
    lr: 0.15,
    history: [],
    running: false,
    target: 1.5,
  };

  function loss(w) {
    // (w - target)^2
    const d = w - gd.target;
    return d * d;
  }

  function grad(w) {
    return 2 * (w - gd.target);
  }

  function setupGradientLab() {
    const canvas = $("#uni-gd-canvas");
    if (!canvas) return;

    window.__uniDrawGd = function () {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;

      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, w, h);

      const xMin = -4;
      const xMax = 4;
      const yMax = 16;

      function X(x) {
        return ((x - xMin) / (xMax - xMin)) * w;
      }
      function Y(y) {
        return h - (y / yMax) * h * 0.9 - h * 0.05;
      }

      ctx.strokeStyle = "rgba(96,165,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = xMin + ((xMax - xMin) * i) / 100;
        const y = loss(x);
        const px = X(x);
        const py = Y(y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // history path
      if (gd.history.length > 1) {
        ctx.strokeStyle = "rgba(52,211,153,0.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        gd.history.forEach((pt, i) => {
          const px = X(pt.w);
          const py = Y(pt.l);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // current point
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(X(gd.w), Y(loss(gd.w)), 6, 0, Math.PI * 2);
      ctx.fill();

      // target
      ctx.strokeStyle = "rgba(248,113,113,0.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X(gd.target), 0);
      ctx.lineTo(X(gd.target), h);
      ctx.stroke();
      ctx.setLineDash([]);

      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
      };
      set("uni-gd-w", gd.w.toFixed(3));
      set("uni-gd-loss", loss(gd.w).toFixed(4));
      set("uni-gd-steps", String(gd.history.length));
    };

    gd.history = [{ w: gd.w, l: loss(gd.w) }];
    drawGd();
  }

  function drawGd() {
    if (window.__uniDrawGd) window.__uniDrawGd();
  }

  function gdStep() {
    gd.w = gd.w - gd.lr * grad(gd.w);
    gd.history.push({ w: gd.w, l: loss(gd.w) });
    if (gd.history.length > 80) gd.history.shift();
    drawGd();
  }

  /* ——— Utils ——— */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  /* ——— Events ——— */
  document.addEventListener("click", (e) => {
    const gotoView = e.target.closest("[data-uni-goto]");
    if (gotoView) {
      const v = gotoView.dataset.uniGoto;
      history.replaceState(null, "", "#" + v);
      setView(v);
      return;
    }

    const nav = e.target.closest(".uni-nav__btn");
    if (nav) {
      setView(nav.dataset.view);
      return;
    }

    const phaseBtn = e.target.closest("[data-phase]");
    if (phaseBtn) {
      state.phase = phaseBtn.dataset.phase;
      const p = DATA.phases.find((x) => x.key === state.phase);
      state.unitId = p.units[0].id;
      persist();
      renderCurriculum();
      return;
    }

    const unitBtn = e.target.closest("[data-unit]");
    if (unitBtn) {
      state.unitId = unitBtn.dataset.unit;
      markStudied();
      persist();
      renderCurriculum();
      return;
    }

    const goto = e.target.closest("[data-goto-unit]");
    if (goto) {
      state.phase = goto.dataset.gotoPhase;
      state.unitId = goto.dataset.gotoUnit;
      persist();
      setView("curriculum");
      return;
    }

    const navUnit = e.target.closest("[data-nav-unit]");
    if (navUnit) {
      const phase = DATA.phases.find((p) => p.key === state.phase);
      const idx = phase.units.findIndex((u) => u.id === state.unitId);
      const next = idx + Number(navUnit.dataset.navUnit);
      if (next >= 0 && next < phase.units.length) {
        state.unitId = phase.units[next].id;
        persist();
        renderCurriculum();
      } else if (next >= phase.units.length) {
        const pi = DATA.phases.findIndex((p) => p.key === state.phase);
        if (pi < DATA.phases.length - 1) {
          state.phase = DATA.phases[pi + 1].key;
          state.unitId = DATA.phases[pi + 1].units[0].id;
          persist();
          renderCurriculum();
        }
      } else if (next < 0) {
        const pi = DATA.phases.findIndex((p) => p.key === state.phase);
        if (pi > 0) {
          const prev = DATA.phases[pi - 1];
          state.phase = prev.key;
          state.unitId = prev.units[prev.units.length - 1].id;
          persist();
          renderCurriculum();
        }
      }
      return;
    }

    const resF = e.target.closest("[data-res-filter]");
    if (resF) {
      $("#uni-resources").dataset.filter = resF.dataset.resFilter;
      renderResources();
      return;
    }

    if (e.target.closest("#uni-flash-inner")) {
      state.flashFlipped = !state.flashFlipped;
      renderFlash();
      return;
    }

    if (e.target.closest("[data-flash-prev]")) {
      state.flashIndex -= 1;
      state.flashFlipped = false;
      persist();
      renderFlash();
      return;
    }
    if (e.target.closest("[data-flash-next]")) {
      state.flashIndex += 1;
      state.flashFlipped = false;
      persist();
      renderFlash();
      return;
    }

    if (e.target.closest("#uni-timer-toggle")) {
      state.timerRunning = !state.timerRunning;
      if (state.timerRunning) {
        markStudied();
        if (!timerInterval) timerInterval = setInterval(tickTimer, 1000);
        if (window.Notification && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }
      persist();
      renderTimer();
      return;
    }
    if (e.target.closest("#uni-timer-reset")) {
      state.timerRunning = false;
      state.timerLeft = state.timerSecs;
      persist();
      renderTimer();
      return;
    }
    if (e.target.closest("[data-timer-set]")) {
      const mins = Number(e.target.closest("[data-timer-set]").dataset.timerSet);
      state.timerSecs = mins * 60;
      state.timerLeft = state.timerSecs;
      state.timerRunning = false;
      persist();
      renderTimer();
      return;
    }

    if (e.target.closest("#uni-gd-step")) {
      gdStep();
      return;
    }
    if (e.target.closest("#uni-gd-run")) {
      let n = 0;
      const id = setInterval(() => {
        gdStep();
        n++;
        if (n >= 25 || loss(gd.w) < 0.0001) clearInterval(id);
      }, 80);
      return;
    }
    if (e.target.closest("#uni-gd-reset")) {
      gd.w = -2;
      gd.history = [{ w: gd.w, l: loss(gd.w) }];
      drawGd();
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const check = e.target.closest("[data-check]");
    if (check) {
      state.checks[check.dataset.check] = check.checked;
      markStudied();
      persist();
      renderCurriculum();
      return;
    }
    if (e.target.matches("[data-mark-unit]")) {
      state.unitDone[state.unitId] = e.target.checked;
      markStudied();
      persist();
      renderCurriculum();
      return;
    }
    if (e.target.id === "uni-gd-lr") {
      gd.lr = Number(e.target.value);
      $("#uni-gd-lr-val").textContent = gd.lr.toFixed(2);
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "uni-notes-ta") {
      state.notes = e.target.value;
      persist();
    }
  });

  // Hash routing: #curriculum / #labs etc.
  function fromHash() {
    const h = (location.hash || "#home").slice(1);
    const allowed = ["home", "curriculum", "labs", "flash", "resources", "notes", "timer"];
    if (allowed.includes(h)) setView(h);
    else setView(state.view || "home");
  }

  $$(".uni-nav__btn").forEach((b) => {
    b.addEventListener("click", () => {
      history.replaceState(null, "", "#" + b.dataset.view);
    });
  });

  window.addEventListener("hashchange", fromHash);

  // Boot
  updateHeroStats();
  fromHash();
  if (!location.hash) setView("home");
})();
