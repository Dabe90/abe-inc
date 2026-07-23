/**
 * Abe Stack University — guided coach + curriculum
 */
(function () {
  const DATA = window.ABE_UNIVERSITY;
  if (!DATA) {
    console.error("ABE_UNIVERSITY data missing");
    return;
  }

  const STORAGE_KEY = "abe-university-v2";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  // Migrate v1 if present
  (function migrate() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    try {
      const old = JSON.parse(localStorage.getItem("abe-university-v1") || "null");
      if (old) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({ onboarded: true }, old)));
      }
    } catch (_) {}
  })();

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  const state = Object.assign(
    {
      view: "learn",
      phase: "year-0",
      unitId: "year-0-01",
      sessionId: "A",
      stepIndex: 0,
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
      onboarded: false,
      practice: "labs",
    },
    loadState(),
  );

  state.timerRunning = false;
  state.flashFlipped = false;
  if (!["learn", "path", "practice", "notes"].includes(state.view)) state.view = "learn";

  function persist() {
    saveState({
      view: state.view,
      phase: state.phase,
      unitId: state.unitId,
      sessionId: state.sessionId,
      stepIndex: state.stepIndex,
      checks: state.checks,
      unitDone: state.unitDone,
      notes: state.notes,
      flashIndex: state.flashIndex,
      timerSecs: state.timerSecs,
      timerLeft: state.timerLeft,
      streak: state.streak,
      lastStudyDay: state.lastStudyDay,
      onboarded: state.onboarded,
      practice: state.practice,
    });
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

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

  function checkKey(unitId, sessionId, todoIdx) {
    return `${unitId}:${sessionId}:${todoIdx}`;
  }

  function findUnit(id) {
    for (const p of DATA.phases) {
      const u = p.units.find((x) => x.id === id);
      if (u) return { phase: p, unit: u };
    }
    return { phase: DATA.phases[0], unit: DATA.phases[0].units[0] };
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

  function sessionProgress(unit, session) {
    let total = session.todos.length;
    let done = 0;
    session.todos.forEach((_, i) => {
      if (state.checks[checkKey(unit.id, session.id, i)]) done++;
    });
    return { total, done, complete: total > 0 && done === total };
  }

  function nextIncomplete() {
    for (const p of DATA.phases) {
      for (const u of p.units) {
        for (const s of u.sessions) {
          const prog = sessionProgress(u, s);
          if (!prog.complete) {
            let step = 0;
            // links first as steps, then todos
            return { phase: p, unit: u, session: s, stepHint: step };
          }
        }
      }
    }
    const last = DATA.phases[DATA.phases.length - 1];
    const u = last.units[last.units.length - 1];
    return { phase: last, unit: u, session: u.sessions[u.sessions.length - 1], stepHint: 0 };
  }

  function syncCursorToProgress() {
    const n = nextIncomplete();
    state.phase = n.phase.key;
    state.unitId = n.unit.id;
    state.sessionId = n.session.id;
  }

  /** Build ordered coach steps for a session */
  function buildSteps(unit, session) {
    const steps = [];
    const watchLinks = (session.links || []).filter((l) => l.href);
    const noteLinks = (session.links || []).filter((l) => !l.href);

    if (watchLinks.length) {
      steps.push({
        type: "watch",
        title: watchLinks.length === 1 ? "Watch / read this" : "Open these resources",
        hint: "Do this first. Open the link, finish it, then come back and continue.",
        links: watchLinks,
      });
    }
    if (noteLinks.length) {
      steps.push({
        type: "note",
        title: "Skim the curriculum note",
        hint: "These are local study notes in the repo (optional on the site). Focus on the video/link above if you’re just starting.",
        links: noteLinks,
      });
    }
    (session.todos || []).forEach((todo, i) => {
      steps.push({
        type: "do",
        title: todo,
        hint: "Complete this task, then mark it done below.",
        todoIndex: i,
        checkKey: checkKey(unit.id, session.id, i),
      });
    });
    steps.push({
      type: "finish",
      title: "Write 5 lines in Notes (optional but powerful)",
      hint: "One sentence learned · what confused you · what you built · an analogy · next goal.",
    });
    return steps;
  }

  function currentContext() {
    const { phase, unit } = findUnit(state.unitId);
    let session = unit.sessions.find((s) => s.id === state.sessionId) || unit.sessions[0];
    state.sessionId = session.id;
    const steps = buildSteps(unit, session);
    if (state.stepIndex >= steps.length) state.stepIndex = Math.max(0, steps.length - 1);
    return { phase, unit, session, steps };
  }

  function activeStepIndex(steps, unit, session) {
    // Prefer first incomplete do-step; else first unfinished logical step
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (st.type === "do" && !state.checks[st.checkKey]) return i;
    }
    // all todos done → finish step
    const finishIdx = steps.findIndex((s) => s.type === "finish");
    if (finishIdx >= 0 && sessionProgress(unit, session).complete) return finishIdx;
    // otherwise use stored stepIndex but clamp to first incomplete watch if early
    return Math.min(state.stepIndex, steps.length - 1);
  }

  function totalTodos() {
    let n = 0;
    DATA.phases.forEach((p) =>
      p.units.forEach((u) => u.sessions.forEach((s) => (n += s.todos.length))),
    );
    return n;
  }

  function checkedCount() {
    return Object.values(state.checks).filter(Boolean).length;
  }

  function updateChrome() {
    const total = totalTodos();
    const checked = checkedCount();
    const pct = total ? Math.round((checked / total) * 100) : 0;
    const pctEl = $("#uni-ring-pct");
    if (pctEl) pctEl.textContent = pct + "%";
    const streak = $("#uni-stat-streak");
    if (streak) streak.textContent = String(state.streak || 0);

    const { phase, unit, session, steps } = currentContext();
    const idx = activeStepIndex(steps, unit, session);
    state.stepIndex = idx;
    const step = steps[idx];

    const stripTitle = $("#uni-strip-title");
    const stripSub = $("#uni-strip-sub");
    const stripCta = $("#uni-strip-cta");
    if (stripTitle && step) {
      stripTitle.textContent = step.title.length > 90 ? step.title.slice(0, 87) + "…" : step.title;
      stripSub.textContent = `${phase.label} · ${unit.unitLabel} ${String(unit.unit).padStart(2, "0")} · Session ${session.id} · Step ${idx + 1}/${steps.length}`;
      if (step.type === "watch" && step.links[0] && step.links[0].href) {
        stripCta.textContent = "Open resource →";
        stripCta.dataset.action = "open-link";
        stripCta.dataset.href = step.links[0].href;
      } else if (step.type === "do") {
        stripCta.textContent = "Mark done";
        stripCta.dataset.action = "mark-todo";
        stripCta.dataset.check = step.checkKey;
      } else if (step.type === "finish") {
        stripCta.textContent = "Open notes";
        stripCta.dataset.action = "goto-notes";
      } else {
        stripCta.textContent = "Continue";
        stripCta.dataset.action = "scroll-guide";
      }
    }
  }

  function setView(view) {
    state.view = view;
    $$(".uni-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
    $$(".uni-view").forEach((v) => {
      v.hidden = v.dataset.view !== view;
    });
    persist();
    if (view === "learn") renderGuide();
    if (view === "path") renderCurriculum();
    if (view === "practice") {
      setPractice(state.practice || "labs");
      renderFlash();
      renderResources();
      renderTimer();
      initLabs();
    }
    if (view === "notes") renderNotes();
    updateChrome();
  }

  function setPractice(name) {
    state.practice = name;
    $$("[data-practice]").forEach((b) => b.classList.toggle("is-active", b.dataset.practice === name));
    $$("[data-practice-pane]").forEach((p) => {
      p.hidden = p.dataset.practicePane !== name;
    });
    persist();
    if (name === "labs") initLabs();
    if (name === "flash") renderFlash();
    if (name === "resources") renderResources();
    if (name === "timer") renderTimer();
  }

  /* ——— Welcome ——— */
  function showWelcomeIfNeeded() {
    const el = $("#uni-welcome");
    if (!el) return;
    if (!state.onboarded) {
      el.hidden = false;
      document.body.style.overflow = "hidden";
    } else {
      el.hidden = true;
      document.body.style.overflow = "";
    }
  }

  function dismissWelcome(startFresh) {
    state.onboarded = true;
    if (startFresh) {
      state.phase = "year-0";
      state.unitId = "year-0-01";
      state.sessionId = "A";
      state.stepIndex = 0;
    } else {
      syncCursorToProgress();
    }
    persist();
    const el = $("#uni-welcome");
    if (el) el.hidden = true;
    document.body.style.overflow = "";
    setView("learn");
    renderGuide();
  }

  /* ——— Guide ——— */
  function renderGuide() {
    const root = $("#uni-guide");
    if (!root) return;
    const { phase, unit, session, steps } = currentContext();
    const prog = unitProgress(unit);
    const sProg = sessionProgress(unit, session);
    const active = activeStepIndex(steps, unit, session);
    state.stepIndex = active;

    const sessionIdx = unit.sessions.findIndex((s) => s.id === session.id);

    root.innerHTML = `
      <div class="uni-guide__where">
        <div class="uni-guide__eyebrow">You are here — don’t skip ahead</div>
        <h2>${escapeHtml(phase.label)} · ${escapeHtml(unit.unitLabel)} ${String(unit.unit).padStart(2, "0")}</h2>
        <p><strong>${escapeHtml(unit.title)}</strong> — Session ${escapeHtml(session.id)}: ${escapeHtml(session.title)} (~${session.mins} min)</p>
        <div class="uni-guide__progress" aria-hidden="true"><span style="width:${prog.pct}%"></span></div>
        <div class="uni-guide__meta">
          <span>Week tasks ${prog.done}/${prog.total}</span>
          <span>·</span>
          <span>This session ${sProg.done}/${sProg.total}</span>
          <span>·</span>
          <span>Session ${sessionIdx + 1} of ${unit.sessions.length}</span>
        </div>
      </div>

      <p class="uni-guide__tip">
        <strong>How to use this:</strong> Focus only on the highlighted step. Open the link, do the task, mark it done — the coach moves you forward. Ignore the Full path until you’ve finished a few sessions.
      </p>

      ${steps
        .map((st, i) => {
          const isActive = i === active;
          const isDone =
            st.type === "do"
              ? !!state.checks[st.checkKey]
              : st.type === "finish"
                ? sProg.complete && i <= active
                : i < active;
          return `
          <article class="uni-step ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}" data-step="${i}">
            <div class="uni-step__head">
              <span class="uni-step__num">${isDone && !isActive ? "✓" : i + 1}</span>
              <div>
                <div class="uni-step__type">${
                  st.type === "watch"
                    ? "Watch / read"
                    : st.type === "do"
                      ? "Do this"
                      : st.type === "finish"
                        ? "Wrap up"
                        : "Optional"
                }</div>
                <div class="uni-step__title">${escapeHtml(st.title)}</div>
              </div>
            </div>
            ${
              isActive
                ? `<div class="uni-step__body">
              <p class="uni-step__hint">${escapeHtml(st.hint)}</p>
              <div class="uni-step__actions">
                ${(st.links || [])
                  .map((l) =>
                    l.href
                      ? `<a class="uni-link" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`
                      : `<span class="uni-link uni-link--note">${escapeHtml(l.label || l.note)}</span>`,
                  )
                  .join("")}
                ${
                  st.type === "do"
                    ? `<button type="button" class="uni-btn uni-btn--good" data-mark-todo="${escapeAttr(st.checkKey)}">${state.checks[st.checkKey] ? "Done ✓" : "I finished this"}</button>`
                    : ""
                }
                ${
                  st.type === "watch" || st.type === "note"
                    ? `<button type="button" class="uni-btn uni-btn--primary" data-advance-step>I’ve done this →</button>`
                    : ""
                }
                ${
                  st.type === "finish"
                    ? `<button type="button" class="uni-btn" data-uni-goto="notes">Open notes</button>
                       <button type="button" class="uni-btn uni-btn--primary" data-next-session>Next session →</button>`
                    : ""
                }
              </div>
            </div>`
                : ""
            }
          </article>`;
        })
        .join("")}

      <div class="uni-guide__nav">
        <button type="button" class="uni-btn" data-prev-session>← Previous session</button>
        <button type="button" class="uni-btn" data-uni-goto="practice">Try a lab</button>
        <button type="button" class="uni-btn uni-btn--primary" data-next-session>Skip to next session →</button>
      </div>
    `;

    updateChrome();
  }

  function advanceStep() {
    const { steps, unit, session } = currentContext();
    state.stepIndex = Math.min(state.stepIndex + 1, steps.length - 1);
    // If advancing past watch into todos, fine
    markStudied();
    persist();
    renderGuide();
  }

  function goAdjacentSession(delta) {
    const { phase, unit } = findUnit(state.unitId);
    const sIdx = unit.sessions.findIndex((s) => s.id === state.sessionId);
    const nextS = sIdx + delta;
    if (nextS >= 0 && nextS < unit.sessions.length) {
      state.sessionId = unit.sessions[nextS].id;
      state.stepIndex = 0;
      persist();
      renderGuide();
      return;
    }
    const uIdx = phase.units.findIndex((u) => u.id === unit.id);
    const nextU = uIdx + delta;
    if (nextU >= 0 && nextU < phase.units.length) {
      const u = phase.units[nextU];
      state.unitId = u.id;
      state.sessionId = delta > 0 ? u.sessions[0].id : u.sessions[u.sessions.length - 1].id;
      state.stepIndex = 0;
      persist();
      renderGuide();
      return;
    }
    const pIdx = DATA.phases.findIndex((p) => p.key === phase.key);
    const nextP = pIdx + delta;
    if (nextP >= 0 && nextP < DATA.phases.length) {
      const p = DATA.phases[nextP];
      state.phase = p.key;
      const u = delta > 0 ? p.units[0] : p.units[p.units.length - 1];
      state.unitId = u.id;
      state.sessionId = delta > 0 ? u.sessions[0].id : u.sessions[u.sessions.length - 1].id;
      state.stepIndex = 0;
      persist();
      renderGuide();
    }
  }

  /* ——— Curriculum path (browse) ——— */
  function renderCurriculum() {
    const phase = DATA.phases.find((p) => p.key === state.phase) || DATA.phases[0];
    const shell = $("#uni-curriculum");
    if (!shell) return;
    shell.style.setProperty("--phase-color", phase.color);

    $("#uni-phase-tabs").innerHTML = DATA.phases
      .map(
        (p) =>
          `<button type="button" class="uni-chip ${p.key === phase.key ? "is-active" : ""}" data-phase="${p.key}" style="--phase-color:${p.color}">${escapeHtml(p.label)}</button>`,
      )
      .join("");

    $("#uni-phase-head").innerHTML = `
      <div>
        <div class="uni-panel__title">${escapeHtml(phase.label)}</div>
        <div class="uni-panel__sub">${escapeHtml(phase.subtitle)} · Exit: ${escapeHtml(phase.exit)}</div>
      </div>
    `;

    let unit = phase.units.find((u) => u.id === state.unitId) || phase.units[0];
    if (!phase.units.some((u) => u.id === state.unitId)) state.unitId = unit.id;

    $("#uni-week-grid").innerHTML = phase.units
      .map((u) => {
        const prog = unitProgress(u);
        const done = prog.total > 0 && prog.done === prog.total;
        return `<button type="button" class="uni-week ${u.id === unit.id ? "is-active" : ""} ${done ? "is-done" : ""}" data-unit="${u.id}" title="${escapeHtml(u.title)}">${String(u.unit).padStart(2, "0")}</button>`;
      })
      .join("");

    const prog = unitProgress(unit);
    $("#uni-unit-detail").innerHTML = `
      <div class="uni-panel__head" style="margin-bottom:0.75rem">
        <div>
          <div class="uni-panel__title">${escapeHtml(unit.unitLabel)} ${String(unit.unit).padStart(2, "0")}: ${escapeHtml(unit.title)}</div>
          <div class="uni-panel__sub">${prog.done}/${prog.total} tasks · ${prog.pct}%</div>
        </div>
        <button type="button" class="uni-btn uni-btn--primary" data-coach-here>Coach me on this week</button>
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
                  : `<span class="uni-link uni-link--note">${escapeHtml(l.label || l.note || "Note")}</span>`,
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
    `;
  }

  /* ——— Flash / resources / notes / timer ——— */
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

  function renderNotes() {
    const ta = $("#uni-notes-ta");
    if (ta && ta.value !== state.notes) ta.value = state.notes || "";
  }

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
      return;
    }
    state.timerLeft -= 1;
    if (state.timerLeft % 5 === 0) persist();
    renderTimer();
  }

  /* ——— Labs ——— */
  let labsReady = false;
  const vec = { a: { x: 2.5, y: 1.5 }, b: { x: 1.2, y: 2.8 }, drag: null };
  const gd = { w: -2, lr: 0.15, history: [], target: 1.5 };

  function loss(w) {
    const d = w - gd.target;
    return d * d;
  }
  function grad(w) {
    return 2 * (w - gd.target);
  }

  function initLabs() {
    if (labsReady) {
      drawVectorLab();
      drawGd();
      return;
    }
    labsReady = true;
    setupVectorLab();
    setupGradientLab();
  }

  function setupVectorLab() {
    const canvas = $("#uni-vec-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function toCanvas(p) {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 10;
      return { x: cx + p.x * scale, y: cy - p.y * scale, scale, cx, cy, w, h };
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

    window.__uniDrawVec = function () {
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
      ctx.strokeStyle = "rgba(226,232,240,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      function arrow(to, color, label) {
        const f = toCanvas({ x: 0, y: 0 });
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
      arrow(vec.b, "#38bdf8", "b");
      arrow(vec.a, "#60a5fa", "a");
      arrow(proj, "#34d399", "proj");

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
      vec[vec.drag] = fromCanvas(p.x, p.y);
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
  }

  function drawVectorLab() {
    if (window.__uniDrawVec) window.__uniDrawVec();
  }

  function setupGradientLab() {
    const canvas = $("#uni-gd-canvas");
    if (!canvas) return;
    window.__uniDrawGd = function () {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      const rect = parent.getBoundingClientRect();
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
      const X = (x) => ((x - xMin) / (xMax - xMin)) * w;
      const Y = (y) => h - (y / yMax) * h * 0.9 - h * 0.05;
      ctx.strokeStyle = "rgba(96,165,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = xMin + ((xMax - xMin) * i) / 100;
        const px = X(x);
        const py = Y(loss(x));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
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
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(X(gd.w), Y(loss(gd.w)), 6, 0, Math.PI * 2);
      ctx.fill();
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

  /* ——— Events ——— */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#uni-welcome-start")) {
      dismissWelcome(true);
      return;
    }
    if (e.target.closest("#uni-welcome-skip")) {
      dismissWelcome(false);
      return;
    }

    const tab = e.target.closest(".uni-tab");
    if (tab) {
      history.replaceState(null, "", "#" + tab.dataset.view);
      setView(tab.dataset.view);
      return;
    }

    const goto = e.target.closest("[data-uni-goto]");
    if (goto) {
      const v = goto.dataset.uniGoto;
      history.replaceState(null, "", "#" + v);
      setView(v);
      return;
    }

    const strip = e.target.closest("#uni-strip-cta");
    if (strip) {
      const action = strip.dataset.action;
      if (action === "open-link" && strip.dataset.href) {
        window.open(strip.dataset.href, "_blank", "noopener");
        advanceStep();
      } else if (action === "mark-todo" && strip.dataset.check) {
        state.checks[strip.dataset.check] = true;
        markStudied();
        persist();
        renderGuide();
      } else if (action === "goto-notes") {
        setView("notes");
      } else {
        setView("learn");
        const active = $(".uni-step.is-active");
        if (active) active.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (e.target.closest("[data-advance-step]")) {
      advanceStep();
      return;
    }

    const markTodo = e.target.closest("[data-mark-todo]");
    if (markTodo) {
      const key = markTodo.dataset.markTodo;
      state.checks[key] = true;
      markStudied();
      persist();
      renderGuide();
      return;
    }

    if (e.target.closest("[data-next-session]")) {
      goAdjacentSession(1);
      return;
    }
    if (e.target.closest("[data-prev-session]")) {
      goAdjacentSession(-1);
      return;
    }

    if (e.target.closest("[data-coach-here]")) {
      const { unit } = findUnit(state.unitId);
      state.sessionId = unit.sessions[0].id;
      state.stepIndex = 0;
      persist();
      setView("learn");
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
      persist();
      renderCurriculum();
      return;
    }

    const prac = e.target.closest("[data-practice]");
    if (prac) {
      setPractice(prac.dataset.practice);
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
      updateChrome();
      return;
    }
    if (e.target.id === "uni-gd-lr") {
      gd.lr = Number(e.target.value);
      const val = $("#uni-gd-lr-val");
      if (val) val.textContent = gd.lr.toFixed(2);
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "uni-notes-ta") {
      state.notes = e.target.value;
      persist();
    }
  });

  function fromHash() {
    const h = (location.hash || "").slice(1);
    const allowed = ["learn", "path", "practice", "notes"];
    if (allowed.includes(h)) setView(h);
    else setView(state.view || "learn");
  }

  // Boot
  showWelcomeIfNeeded();
  if (!state.onboarded) {
    // still render behind overlay
    updateChrome();
    renderGuide();
  } else {
    fromHash();
    if (!location.hash) setView("learn");
  }

  window.addEventListener("hashchange", fromHash);
})();
