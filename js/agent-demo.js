(function () {
  var cfg = window.ABE_INC || {};
  var root = document.getElementById('agent-demo');
  if (!root) return;

  var form = root.querySelector('[data-agent-demo-form]');
  var runBtn = root.querySelector('[data-agent-demo-run]');
  var goalInput = root.querySelector('[data-agent-demo-goal]');
  var contextInput = root.querySelector('[data-agent-demo-context]');
  var statusEl = root.querySelector('[data-agent-demo-status]');
  var streamEl = root.querySelector('[data-agent-demo-stream]');
  var resultEl = root.querySelector('[data-agent-demo-result]');
  var configWarn = root.querySelector('[data-agent-demo-config-warn]');

  var endpoint = cfg.agentDemoEndpoint || '/api/demo/volunteer-agent';
  var defaultEventId = cfg.agentDemoEventId || 'demo-serve-day-2026';

  if (contextInput) {
    contextInput.value = defaultEventId;
  }

  var loadingSteps = [
    { label: 'Starting Genkit demo agent', detail: 'Gemini 2.5 Flash · sample data only' },
    { label: 'Loading demo roster', detail: 'demoGetEventRoster (fictional volunteers)' },
    { label: 'Proposing shift matches', detail: 'demoProposeVolunteerMatches tool' },
    { label: 'Queueing human review', detail: 'demoQueueCoordinatorAction — nothing sends automatically' },
  ];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setRunning(running) {
    if (runBtn) {
      runBtn.disabled = running;
      runBtn.textContent = running ? 'Demo running…' : 'Run Demo Agent';
      runBtn.setAttribute('aria-busy', running ? 'true' : 'false');
    }
    if (form) {
      form.querySelectorAll('input, textarea').forEach(function (el) {
        if (el.hasAttribute('readonly')) return;
        el.disabled = running;
      });
    }
  }

  function clearOutput() {
    if (streamEl) streamEl.innerHTML = '';
    if (resultEl) {
      resultEl.innerHTML = '';
      resultEl.classList.add('hidden');
    }
    if (statusEl) statusEl.textContent = '';
  }

  function renderLoadingStream() {
    if (!streamEl) return;
    streamEl.innerHTML =
      '<div class="agent-demo__stream-header">' +
      '<span class="agent-demo__live-dot" aria-hidden="true"></span>' +
      '<span>Agent reasoning trace</span>' +
      '</div>' +
      loadingSteps
        .map(function (step, i) {
          return (
            '<div class="agent-demo__step" data-loading-step="' +
            i +
            '">' +
            '<div class="agent-demo__step-icon" aria-hidden="true">○</div>' +
            '<div><p class="agent-demo__step-title">' +
            escapeHtml(step.label) +
            '</p>' +
            '<p class="agent-demo__step-detail">' +
            escapeHtml(step.detail) +
            '</p></div></div>'
          );
        })
        .join('');
  }

  function advanceLoadingStep(index) {
    if (!streamEl) return;
    streamEl.querySelectorAll('[data-loading-step]').forEach(function (el, i) {
      el.classList.remove('agent-demo__step--active', 'agent-demo__step--done');
      if (i < index) el.classList.add('agent-demo__step--done');
      if (i === index) el.classList.add('agent-demo__step--active');
    });
  }

  function stepIcon(type) {
    if (type === 'reasoning') return '◆';
    if (type === 'tool_request') return '▸';
    if (type === 'tool_response') return '▪';
    return '•';
  }

  function renderTraceSteps(trace, onComplete) {
    if (!streamEl || !trace || !trace.length) {
      if (onComplete) onComplete();
      return;
    }

    streamEl.innerHTML =
      '<div class="agent-demo__stream-header">' +
      '<span class="agent-demo__mode-badge">Demo mode</span>' +
      '<span class="agent-demo__live-dot agent-demo__live-dot--pulse" aria-hidden="true"></span>' +
      '<span>Reasoning trace</span></div>';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var delay = reducedMotion ? 0 : 280;
    var i = 0;

    function addNext() {
      if (i >= trace.length) {
        if (onComplete) onComplete();
        return;
      }
      var step = trace[i];
      var el = document.createElement('div');
      el.className = 'agent-demo__step agent-demo__step--reveal agent-demo__step--done';
      el.innerHTML =
        '<div class="agent-demo__step-icon agent-demo__step-icon--' +
        escapeHtml(step.type) +
        '" aria-hidden="true">' +
        stepIcon(step.type) +
        '</div>' +
        '<div><p class="agent-demo__step-title">' +
        (step.toolName ? escapeHtml(step.toolName) : escapeHtml(step.type)) +
        '</p>' +
        '<p class="agent-demo__step-detail">' +
        escapeHtml(truncate(step.content, 220)) +
        '</p></div>';
      streamEl.appendChild(el);
      streamEl.scrollTop = streamEl.scrollHeight;
      i += 1;
      setTimeout(addNext, delay);
    }

    addNext();
  }

  function truncate(str, max) {
    var s = String(str || '');
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function renderFinalActions(actions) {
    if (!actions || !actions.length) {
      return '<p class="agent-demo__result-summary text-slate-400">No queued actions returned.</p>';
    }
    return (
      '<div class="agent-demo__actions-list">' +
      actions
        .map(function (action) {
          return (
            '<div class="agent-demo__action-item">' +
            '<strong>' +
            escapeHtml(action.actionType || 'action') +
            '</strong> · ' +
            escapeHtml(action.summary || '') +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderResult(data) {
    if (!resultEl) return;
    var evalScore = data.evaluation ? Math.round(data.evaluation.score * 100) : null;
    var cost =
      data.usage && data.usage.estimatedCostUsd != null
        ? data.usage.estimatedCostUsd.toFixed(4)
        : '—';

    resultEl.innerHTML =
      '<div class="agent-demo__result-grid">' +
      '<article class="agent-demo__result-card agent-demo__result-card--primary">' +
      '<p class="agent-demo__result-label">Coordinator summary</p>' +
      '<p class="agent-demo__result-summary">' +
      escapeHtml(data.result && data.result.summary ? data.result.summary : 'No summary returned.') +
      '</p>' +
      '</article>' +
      '<article class="agent-demo__result-card agent-demo__result-card--primary">' +
      '<p class="agent-demo__result-label">Queued for human review</p>' +
      renderFinalActions(data.finalActions) +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Phase</p>' +
      '<p class="agent-demo__result-value">' +
      escapeHtml((data.result && data.result.phase) || '—') +
      '</p>' +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Quality score</p>' +
      '<p class="agent-demo__result-value">' +
      (evalScore != null ? evalScore + '/100' : '—') +
      '</p>' +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Tools called</p>' +
      '<p class="agent-demo__result-value">' +
      escapeHtml(String((data.result && data.result.toolRequestCount) || 0)) +
      '</p>' +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Est. cost</p>' +
      '<p class="agent-demo__result-value">$' +
      escapeHtml(cost) +
      '</p>' +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Session</p>' +
      '<p class="agent-demo__result-value agent-demo__result-mono">' +
      escapeHtml(truncate(data.sessionId || '—', 28)) +
      '</p>' +
      '</article>' +
      '</div>';
    resultEl.classList.remove('hidden');
  }

  function showError(message) {
    if (statusEl) {
      statusEl.innerHTML = '<span class="agent-demo__error">' + escapeHtml(message) + '</span>';
    }
    if (streamEl) {
      streamEl.innerHTML =
        '<div class="agent-demo__stream-empty">' + escapeHtml(message) + '</div>';
    }
  }

  function runLoadingAnimation(onAbort) {
    return new Promise(function (resolve) {
      renderLoadingStream();
      var step = 0;
      advanceLoadingStep(0);
      var interval = setInterval(function () {
        if (onAbort && onAbort()) {
          clearInterval(interval);
          resolve();
          return;
        }
        step += 1;
        if (step >= loadingSteps.length) {
          clearInterval(interval);
          resolve();
          return;
        }
        advanceLoadingStep(step);
      }, 1800);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var goal = (goalInput && goalInput.value.trim()) || '';
    var eventId = defaultEventId;

    if (goal.length < 10) {
      showError('Describe your goal in at least 10 characters.');
      return;
    }

    clearOutput();
    setRunning(true);
    if (statusEl) {
      statusEl.textContent =
        'Running Genkit demo agent — sample data only, first request may take ~30 seconds…';
    }

    var fetchDone = false;
    var loadingDone = runLoadingAnimation(function () {
      return fetchDone;
    });

    var fetchPromise = fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goal, eventId: eventId }),
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var body;
          try {
            body = text ? JSON.parse(text) : {};
          } catch (parseErr) {
            throw new Error('Invalid response from demo API.');
          }
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .finally(function () {
        fetchDone = true;
      });

    Promise.all([loadingDone, fetchPromise])
      .then(function (results) {
        var response = results[1];
        if (!response.ok) {
          var errMsg =
            (response.body && response.body.error) ||
            'Request failed with status ' + response.status;
          throw new Error(errMsg);
        }
        if (statusEl) {
          statusEl.textContent =
            (response.body.disclaimer || 'Demo mode') + ' — streaming reasoning trace…';
        }
        renderTraceSteps(response.body.reasoningTrace || [], function () {
          renderResult(response.body);
          if (statusEl) {
            statusEl.textContent =
              'Done. Queued actions require human approval — demo mode, not real client data.';
          }
          setRunning(false);
        });
      })
      .catch(function (err) {
        var msg = err.message || 'Demo agent request failed.';
        if (/failed to fetch|network/i.test(msg)) {
          msg =
            'Demo API unavailable. On production this runs at /api/demo/volunteer-agent — locally use npm run next:dev.';
          if (configWarn) configWarn.classList.remove('hidden');
        }
        showError(msg);
        setRunning(false);
      });
  });
})();
