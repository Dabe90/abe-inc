/**
 * Abe Stack University — guided coach + in-app note viewer
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

  function prettyNote(label) {
    return String(label)
      .replace(/\.md$/i, "")
      .replace(/^.*\//, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bReadme\b/i, "Overview");
  }

  const GH_BASE = "https://github.com/Dabe90/abe-inc/blob/main";

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }
  function markStudied() {
    const t = todayKey();
    if (state.lastStudyDay === t) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yKey = y.toISOString().slice(0, 10);
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
    let total = 0, done = 0;
    unit.sessions.forEach((s) =>
      s.todos.forEach((_, i) => {
        total++;
        if (state.checks[checkKey(unit.id, s.id, i)]) done++;
      }),
    );
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function sessionProgress(unit, session) {
    let done = 0;
    session.todos.forEach((_, i) => {
      if (state.checks[checkKey(unit.id, session.id, i)]) done++;
    });
    return { total: session.todos.length, done, complete: session.todos.length > 0 && done === session.todos.length };
  }
  function nextIncomplete() {
    for (const p of DATA.phases) {
      for (const u of p.units) {
        for (const s of u.sessions) {
          if (!sessionProgress(u, s).complete) return { phase: p, unit: u, session: s };
        }
      }
    }
    const last = DATA.phases[DATA.phases.length - 1];
    const u = last.units[last.units.length - 1];
    return { phase: last, unit: u, session: u.sessions[u.sessions.length - 1] };
  }
  function syncCursorToProgress() {
    const n = nextIncomplete();
    state.phase = n.phase.key;
    state.unitId = n.unit.id;
    state.sessionId = n.session.id;
  }

  function buildSteps(unit, session) {
    const steps = [];
    const links = session.links || [];
    const watch = links.filter((l) => l.href && !l.internal);
    const notes = links.filter((l) => l.internal);
    if (watch.length) {
      steps.push({
        type: "watch",
        title: watch.length === 1 ? "Watch / read this" : "Open these resources",
        hint: "Open it, finish it, then click “I’ve done this”. Links open in a new tab.",
        links: watch,
      });
    }
    if (notes.length) {
      steps.push({
        type: "note",
        title: "Read the curriculum note",
        hint: "Opens right here in a reader panel — no downloads. Skim it, then continue.",
        links: notes,
      });
    }
    (session.todos || []).forEach((todo, i) => {
      steps.push({ type: "do", title: todo, hint: "Do this, then mark it done.", todoIndex: i, checkKey: checkKey(unit.id, session.id, i) });
    });
    steps.push({ type: "finish", title: "Write 5 lines in Notes", hint: "One sentence learned · what confused you · what you built · an analogy · next goal." });
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
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (st.type === "do" && !state.checks[st.checkKey]) return i;
    }
    if (sessionProgress(unit, session).complete) {
      const f = steps.findIndex((s) => s.type === "finish");
      if (f >= 0) return f;
    }
    return Math.min(state.stepIndex, steps.length - 1);
  }

  function totalTodos() {
    let n = 0;
    DATA.phases.forEach((p) => p.units.forEach((u) => u.sessions.forEach((s) => (n += s.todos.length))));
    return n;
  }
  function checkedCount() {
    return Object.values(state.checks).filter(Boolean).length;
  }

  function updateChrome() {
    const total = totalTodos();
    const pct = total ? Math.round((checkedCount() / total) * 100) : 0;
    const pctEl = $("#uni-ring-pct");
    if (pctEl) pctEl.textContent = pct + "%";
    const streak = $("#uni-stat-streak");
    if (streak) streak.textContent = String(state.streak || 0);
  }

  function setView(view) {
    state.view = view;
    $$(".uni-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
    $$(".uni-view").forEach((v) => (v.hidden = v.dataset.view !== view));
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
    $$("[data-practice-pane]").forEach((p) => (p.hidden = p.dataset.practicePane !== name));
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
  }

  /* ——— Note modal ——— */
  function resolveNoteHref(href, fromSrc) {
    try {
      const base = new URL(fromSrc || "/ai-curriculum/", location.origin);
      return new URL(href, base).pathname;
    } catch {
      return href;
    }
  }

  async function openNote(src, label) {
    const modal = $("#uni-note-modal");
    const body = $("#uni-note-body");
    const title = $("#uni-note-title");
    const raw = $("#uni-note-open");
    if (!modal || !body) return;
    modal.hidden = false;
    modal.dataset.src = src;
    document.body.style.overflow = "hidden";
    title.textContent = prettyNote(label || src);
    raw.href = GH_BASE + src; // github renders nicely as fallback/raw
    body.innerHTML = '<p class="uni-note-error" style="color:var(--uni-muted)">Loading…</p>';
    markStudied();
    updateChrome();
    try {
      const res = await fetch(src, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const md = await res.text();
      const html = window.marked ? window.marked.parse(md) : "<pre>" + escapeHtml(md) + "</pre>";
      body.innerHTML = html;
      // Rewrite links: internal .md → open in modal; others → new tab
      $$("a", body).forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (/\.md($|[#?])/i.test(href) && !/^https?:\/\//i.test(href)) {
          const resolved = resolveNoteHref(href, src);
          a.setAttribute("href", resolved);
          a.dataset.noteSrc = resolved;
          a.dataset.noteLabel = a.textContent || resolved;
        } else if (/^https?:\/\//i.test(href)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
      });
      body.scrollTop = 0;
    } catch (err) {
      body.innerHTML =
        '<p class="uni-note-error">Couldn’t load this note inline. ' +
        '<a href="' + escapeAttr(GH_BASE + src) + '" target="_blank" rel="noopener">Open it on GitHub ↗</a></p>';
    }
  }

  function closeNote() {
    const modal = $("#uni-note-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = state.onboarded ? "" : "hidden";
  }

  /* ——— Link rendering ——— */
  function renderLink(l) {
    if (l.href && !l.internal) {
      return `<a class="uni-link" href="${escapeAttr(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`;
    }
    if (l.internal) {
      return `<button type="button" class="uni-link uni-link--note" data-note-src="${escapeAttr(l.href)}" data-note-label="${escapeAttr(l.label)}">📄 ${escapeHtml(prettyNote(l.label))}</button>`;
    }
    return `<span class="uni-link uni-link--plain">${escapeHtml(l.label || l.note || "Reference")}</span>`;
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
          <span>Week ${prog.done}/${prog.total} tasks</span><span>·</span>
          <span>This session ${sProg.done}/${sProg.total}</span><span>·</span>
          <span>Session ${sessionIdx + 1} of ${unit.sessions.length}</span>
        </div>
      </div>

      <p class="uni-guide__tip"><strong>How to use this:</strong> Do only the highlighted step. Open the link or note, do the task, mark it done — the coach moves you forward. Ignore Full path until you’ve finished a few sessions.</p>

      ${steps
        .map((st, i) => {
          const isActive = i === active;
          const isDone = st.type === "do" ? !!state.checks[st.checkKey] : st.type === "finish" ? sProg.complete && i <= active : i < active;
          return `
          <article class="uni-step ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}" data-step="${i}">
            <div class="uni-step__head">
              <span class="uni-step__num">${isDone && !isActive ? "✓" : i + 1}</span>
              <div>
                <div class="uni-step__type">${st.type === "watch" ? "Watch / read" : st.type === "note" ? "Read note" : st.type === "do" ? "Do this" : st.type === "finish" ? "Wrap up" : "Optional"}</div>
                <div class="uni-step__title">${escapeHtml(st.title)}</div>
              </div>
            </div>
            ${
              isActive
                ? `<div class="uni-step__body">
                    <p class="uni-step__hint">${escapeHtml(st.hint)}</p>
                    <div class="uni-step__actions">
                      ${(st.links || []).map(renderLink).join("")}
                      ${st.type === "do" ? `<button type="button" class="uni-btn uni-btn--good" data-mark-todo="${escapeAttr(st.checkKey)}">${state.checks[st.checkKey] ? "Done ✓" : "I finished this"}</button>` : ""}
                      ${st.type === "watch" || st.type === "note" ? `<button type="button" class="uni-btn uni-btn--primary" data-advance-step>I’ve done this →</button>` : ""}
                      ${st.type === "finish" ? `<button type="button" class="uni-btn" data-uni-goto="notes">Open notes</button><button type="button" class="uni-btn uni-btn--primary" data-next-session>Next session →</button>` : ""}
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

    renderRail(phase, unit, session);
    updateChrome();
  }

  function renderRail(phase, unit, session) {
    const rail = $("#uni-rail");
    if (!rail) return;
    rail.innerHTML = `
      <div class="uni-rail__card">
        <div class="uni-rail__title">Sessions this week</div>
        <div class="uni-rail__sessions">
          ${unit.sessions
            .map((s) => {
              const sp = sessionProgress(unit, s);
              const active = s.id === session.id;
              return `<button type="button" class="uni-rail__session ${active ? "is-active" : ""} ${sp.complete ? "is-complete" : ""}" data-rail-session="${escapeAttr(s.id)}">
                <span class="uni-rail__badge">${sp.complete ? "✓" : s.id}</span>
                <span>
                  <span class="uni-rail__stext">${escapeHtml(s.title)}</span>
                  <span class="uni-rail__smeta">~${s.mins} min · ${sp.done}/${sp.total}</span>
                </span>
              </button>`;
            })
            .join("")}
        </div>
      </div>
      <div class="uni-rail__card">
        <div class="uni-rail__title">Jump to</div>
        <div class="uni-rail__quick">
          <button type="button" data-uni-goto="practice">🧪 Practice &amp; labs</button>
          <button type="button" data-uni-goto="notes">✎ My notes</button>
          <button type="button" data-uni-goto="path">🗺 Full curriculum map</button>
        </div>
      </div>
      <div class="uni-rail__card">
        <div class="uni-rail__title">This week’s goal</div>
        <p style="font-size:0.85rem;color:var(--uni-muted);line-height:1.5;margin:0">${escapeHtml(unit.title)}</p>
        <p style="font-size:0.78rem;color:var(--uni-muted);margin-top:0.6rem"><strong style="color:var(--uni-ink)">Project:</strong> ${escapeHtml(unit.project || "—")}</p>
      </div>
    `;
  }

  function advanceStep() {
    const { steps } = currentContext();
    state.stepIndex = Math.min(state.stepIndex + 1, steps.length - 1);
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

  /* ——— Full path ——— */
  function renderCurriculum() {
    const phase = DATA.phases.find((p) => p.key === state.phase) || DATA.phases[0];
    const shell = $("#uni-curriculum");
    if (!shell) return;
    shell.style.setProperty("--phase-color", phase.color);
    $("#uni-phase-tabs").innerHTML = DATA.phases
      .map((p) => `<button type="button" class="uni-chip ${p.key === phase.key ? "is-active" : ""}" data-phase="${p.key}" style="--phase-color:${p.color}">${escapeHtml(p.label)}</button>`)
      .join("");
    $("#uni-phase-head").innerHTML = `<div><div class="uni-panel__title">${escapeHtml(phase.label)}</div><div class="uni-panel__sub">${escapeHtml(phase.subtitle)} · Exit: ${escapeHtml(phase.exit)}</div></div>`;
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
        <div><div class="uni-panel__title">${escapeHtml(unit.unitLabel)} ${String(unit.unit).padStart(2, "0")}: ${escapeHtml(unit.title)}</div><div class="uni-panel__sub">${prog.done}/${prog.total} tasks · ${prog.pct}%</div></div>
        <button type="button" class="uni-btn uni-btn--primary" data-coach-here>Coach me on this week</button>
      </div>
      ${unit.sessions
        .map(
          (s) => `<article class="uni-session">
            <div class="uni-session__top"><div><span class="uni-session__badge">${s.id}</span><strong>${escapeHtml(s.title)}</strong></div><span class="uni-session__mins">~${s.mins} min</span></div>
            <div class="uni-links">${s.links.map(renderLink).join("")}</div>
            <ul class="uni-todo">${s.todos
              .map((t, i) => {
                const key = checkKey(unit.id, s.id, i);
                const on = !!state.checks[key];
                return `<li class="${on ? "is-checked" : ""}"><input type="checkbox" data-check="${escapeAttr(key)}" ${on ? "checked" : ""} /><span>${escapeHtml(t)}</span></li>`;
              })
              .join("")}</ul>
          </article>`,
        )
        .join("")}
      <div class="uni-meta-box"><p><strong>LinkedIn:</strong> ${escapeHtml(unit.linkedin || "—")}</p><p style="margin-top:0.4rem"><strong>Project:</strong> ${escapeHtml(unit.project || "—")}</p></div>
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
      <div class="uni-phase-tabs">${["All", ...cats].map((c) => `<button type="button" class="uni-chip ${filter === c ? "is-active" : ""}" data-res-filter="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join("")}</div>
      <div class="uni-resource-grid">${DATA.resources
        .filter((r) => filter === "All" || r.cat === filter)
        .map((r) => `<a class="uni-resource" href="${escapeAttr(r.url)}" target="_blank" rel="noopener"><div class="uni-resource__cat">${escapeHtml(r.cat)}</div><div class="uni-resource__title">${escapeHtml(r.title)}</div><div class="uni-resource__src">${escapeHtml(r.src)}</div></a>`)
        .join("")}</div>`;
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
  const loss = (w) => (w - gd.target) * (w - gd.target);
  const grad = (w) => 2 * (w - gd.target);

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
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      const cx = w / 2, cy = h / 2, scale = Math.min(w, h) / 10;
      return { x: cx + p.x * scale, y: cy - p.y * scale, scale, cx, cy };
    }
    function fromCanvas(mx, my) {
      const { scale, cx, cy } = toCanvas({ x: 0, y: 0 });
      return { x: Math.max(-4.5, Math.min(4.5, (mx - cx) / scale)), y: Math.max(-4.5, Math.min(4.5, (cy - my) / scale)) };
    }
    function hit(p, mx, my) {
      const c = toCanvas(p);
      return (c.x - mx) ** 2 + (c.y - my) ** 2 < 324;
    }
    window.__uniDrawVec = function () {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.width * 0.62 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.width * 0.62;
      ctx.fillStyle = "#0b0b0d";
      ctx.fillRect(0, 0, w, h);
      const { scale, cx, cy } = toCanvas({ x: 0, y: 0 });
      ctx.strokeStyle = "rgba(160,160,170,0.15)";
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath(); ctx.moveTo(cx + i * scale, 0); ctx.lineTo(cx + i * scale, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy + i * scale); ctx.lineTo(w, cy + i * scale); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(230,230,235,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      function arrow(to, color, label) {
        const f = toCanvas({ x: 0, y: 0 }), t = toCanvas(to);
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        const ang = Math.atan2(t.y - f.y, t.x - f.x);
        ctx.beginPath(); ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x - 12 * Math.cos(ang - 0.4), t.y - 12 * Math.sin(ang - 0.4));
        ctx.lineTo(t.x - 12 * Math.cos(ang + 0.4), t.y - 12 * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.font = "600 12px Plus Jakarta Sans, sans-serif";
        ctx.fillText(label, t.x + 10, t.y - 10);
      }
      const bLen2 = vec.b.x ** 2 + vec.b.y ** 2 || 1e-6;
      const dot = vec.a.x * vec.b.x + vec.a.y * vec.b.y;
      const proj = { x: (dot / bLen2) * vec.b.x, y: (dot / bLen2) * vec.b.y };
      ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(15,122,77,0.8)";
      const pa = toCanvas(vec.a), pp = toCanvas(proj);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pp.x, pp.y); ctx.stroke();
      ctx.setLineDash([]);
      arrow(vec.b, "#c2273f", "b");
      arrow(vec.a, "#e0728a", "a");
      arrow(proj, "#0f7a4d", "proj");
      const magA = Math.hypot(vec.a.x, vec.a.y), magB = Math.hypot(vec.b.x, vec.b.y);
      const cos = magA && magB ? dot / (magA * magB) : 0;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("uni-dot", dot.toFixed(2));
      set("uni-cos", cos.toFixed(3));
      set("uni-angle", ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI).toFixed(1) + "°");
    };
    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
    }
    const down = (e) => { e.preventDefault(); const p = pos(e); if (hit(vec.a, p.x, p.y)) vec.drag = "a"; else if (hit(vec.b, p.x, p.y)) vec.drag = "b"; };
    const move = (e) => { if (!vec.drag) return; e.preventDefault(); const p = pos(e); vec[vec.drag] = fromCanvas(p.x, p.y); drawVectorLab(); };
    const up = () => (vec.drag = null);
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", up);
    drawVectorLab();
  }
  function drawVectorLab() { if (window.__uniDrawVec) window.__uniDrawVec(); }

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
      const w = rect.width, h = rect.height, xMin = -4, xMax = 4, yMax = 16;
      const X = (x) => ((x - xMin) / (xMax - xMin)) * w;
      const Y = (y) => h - (y / yMax) * h * 0.9 - h * 0.05;
      ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(226,101,120,0.9)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = xMin + ((xMax - xMin) * i) / 100; const px = X(x), py = Y(loss(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      if (gd.history.length > 1) {
        ctx.strokeStyle = "rgba(15,122,77,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath();
        gd.history.forEach((pt, i) => { const px = X(pt.w), py = Y(pt.l); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke();
      }
      ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(X(gd.w), Y(loss(gd.w)), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(163,31,52,0.7)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(gd.target), 0); ctx.lineTo(X(gd.target), h); ctx.stroke(); ctx.setLineDash([]);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("uni-gd-w", gd.w.toFixed(3)); set("uni-gd-loss", loss(gd.w).toFixed(4)); set("uni-gd-steps", String(gd.history.length));
    };
    gd.history = [{ w: gd.w, l: loss(gd.w) }];
    drawGd();
  }
  function drawGd() { if (window.__uniDrawGd) window.__uniDrawGd(); }
  function gdStep() { gd.w = gd.w - gd.lr * grad(gd.w); gd.history.push({ w: gd.w, l: loss(gd.w) }); if (gd.history.length > 80) gd.history.shift(); drawGd(); }

  /* ——— Events ——— */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#uni-welcome-start")) return dismissWelcome(true);
    if (e.target.closest("#uni-welcome-skip")) return dismissWelcome(false);

    if (e.target.closest("[data-note-close]")) return closeNote();
    const noteBtn = e.target.closest("[data-note-src]");
    if (noteBtn) {
      e.preventDefault();
      openNote(noteBtn.dataset.noteSrc, noteBtn.dataset.noteLabel);
      return;
    }

    const tab = e.target.closest(".uni-tab");
    if (tab) { history.replaceState(null, "", "#" + tab.dataset.view); setView(tab.dataset.view); return; }

    const goto = e.target.closest("[data-uni-goto]");
    if (goto) { const v = goto.dataset.uniGoto; history.replaceState(null, "", "#" + v); setView(v); return; }

    if (e.target.closest("[data-advance-step]")) return advanceStep();

    const markTodo = e.target.closest("[data-mark-todo]");
    if (markTodo) { state.checks[markTodo.dataset.markTodo] = true; markStudied(); persist(); renderGuide(); return; }

    if (e.target.closest("[data-next-session]")) return goAdjacentSession(1);
    if (e.target.closest("[data-prev-session]")) return goAdjacentSession(-1);

    const rs = e.target.closest("[data-rail-session]");
    if (rs) { state.sessionId = rs.dataset.railSession; state.stepIndex = 0; persist(); renderGuide(); return; }

    if (e.target.closest("[data-coach-here]")) {
      const { unit } = findUnit(state.unitId);
      state.sessionId = unit.sessions[0].id;
      state.stepIndex = 0;
      persist();
      setView("learn");
      return;
    }

    const phaseBtn = e.target.closest("[data-phase]");
    if (phaseBtn) { state.phase = phaseBtn.dataset.phase; const p = DATA.phases.find((x) => x.key === state.phase); state.unitId = p.units[0].id; persist(); renderCurriculum(); return; }
    const unitBtn = e.target.closest("[data-unit]");
    if (unitBtn) { state.unitId = unitBtn.dataset.unit; persist(); renderCurriculum(); return; }

    const prac = e.target.closest("[data-practice]");
    if (prac) return setPractice(prac.dataset.practice);
    const resF = e.target.closest("[data-res-filter]");
    if (resF) { $("#uni-resources").dataset.filter = resF.dataset.resFilter; renderResources(); return; }

    if (e.target.closest("#uni-flash-inner")) { state.flashFlipped = !state.flashFlipped; renderFlash(); return; }
    if (e.target.closest("[data-flash-prev]")) { state.flashIndex -= 1; state.flashFlipped = false; persist(); renderFlash(); return; }
    if (e.target.closest("[data-flash-next]")) { state.flashIndex += 1; state.flashFlipped = false; persist(); renderFlash(); return; }

    if (e.target.closest("#uni-timer-toggle")) {
      state.timerRunning = !state.timerRunning;
      if (state.timerRunning) { markStudied(); if (!timerInterval) timerInterval = setInterval(tickTimer, 1000); }
      persist(); renderTimer(); return;
    }
    if (e.target.closest("#uni-timer-reset")) { state.timerRunning = false; state.timerLeft = state.timerSecs; persist(); renderTimer(); return; }
    if (e.target.closest("[data-timer-set]")) { const mins = Number(e.target.closest("[data-timer-set]").dataset.timerSet); state.timerSecs = mins * 60; state.timerLeft = state.timerSecs; state.timerRunning = false; persist(); renderTimer(); return; }

    if (e.target.closest("#uni-gd-step")) return gdStep();
    if (e.target.closest("#uni-gd-run")) { let n = 0; const id = setInterval(() => { gdStep(); if (++n >= 25 || loss(gd.w) < 0.0001) clearInterval(id); }, 80); return; }
    if (e.target.closest("#uni-gd-reset")) { gd.w = -2; gd.history = [{ w: gd.w, l: loss(gd.w) }]; drawGd(); return; }
  });

  document.addEventListener("change", (e) => {
    const check = e.target.closest("[data-check]");
    if (check) { state.checks[check.dataset.check] = check.checked; markStudied(); persist(); renderCurriculum(); updateChrome(); return; }
    if (e.target.id === "uni-gd-lr") { gd.lr = Number(e.target.value); const val = $("#uni-gd-lr-val"); if (val) val.textContent = gd.lr.toFixed(2); }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "uni-notes-ta") { state.notes = e.target.value; persist(); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = $("#uni-note-modal");
      if (modal && !modal.hidden) closeNote();
    }
  });

  function fromHash() {
    const h = (location.hash || "").slice(1);
    const allowed = ["learn", "path", "practice", "notes"];
    setView(allowed.includes(h) ? h : state.view || "learn");
  }

  // Boot
  showWelcomeIfNeeded();
  if (!state.onboarded) {
    updateChrome();
    renderGuide();
  } else {
    fromHash();
    if (!location.hash) setView("learn");
  }
  window.addEventListener("hashchange", fromHash);
})();
