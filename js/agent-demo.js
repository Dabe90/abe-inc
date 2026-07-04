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

  var endpoint = cfg.agentEndpoint || '';
  var apiKey = cfg.agentApiKey || '';
  var defaultEventId = cfg.agentDemoEventId || 'prayer-city-july-2026';

  if (contextInput && !contextInput.value) {
    contextInput.placeholder = defaultEventId;
  }

  if (!endpoint || !apiKey) {
    if (configWarn) configWarn.classList.remove('hidden');
  }

  var loadingSteps = [
    { label: 'Connecting to Volunteer Coordinator Agent', detail: 'Firebase Cloud Functions · Genkit' },
    { label: 'Loading event roster', detail: 'getEventRoster tool' },
    { label: 'Proposing shift matches', detail: 'proposeVolunteerMatches tool' },
    { label: 'Queueing human review', detail: 'queueCoordinatorAction tool' },
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
      runBtn.textContent = running ? 'Agent running…' : 'Run Agent';
      runBtn.setAttribute('aria-busy', running ? 'true' : 'false');
    }
    if (form) {
      form.querySelectorAll('input, textarea').forEach(function (el) {
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
      '<span class="agent-demo__live-dot agent-demo__live-dot--pulse" aria-hidden="true"></span>' +
      '<span>Live reasoning trace</span></div>';

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

  function renderResult(data) {
    if (!resultEl) return;
    var evalScore = data.evaluation ? Math.round(data.evaluation.score * 100) : null;
    var cost = data.usage && data.usage.estimatedCostUsd != null ? data.usage.estimatedCostUsd.toFixed(4) : '—';
    var dayCost =
      data.usageSummary && data.usageSummary.dayCostUsd != null
        ? data.usageSummary.dayCostUsd.toFixed(4)
        : '—';

    resultEl.innerHTML =
      '<div class="agent-demo__result-grid">' +
      '<article class="agent-demo__result-card agent-demo__result-card--primary">' +
      '<p class="agent-demo__result-label">Coordinator summary</p>' +
      '<p class="agent-demo__result-summary">' +
      escapeHtml(data.result && data.result.summary ? data.result.summary : 'No summary returned.') +
      '</p>' +
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
      '<p class="agent-demo__result-label">Today (client)</p>' +
      '<p class="agent-demo__result-value">$' +
      escapeHtml(dayCost) +
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
      }, 2200);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!endpoint) {
      showError('Demo endpoint not configured in js/config.js (agentEndpoint).');
      return;
    }
    if (!apiKey) {
      showError('Demo API key not configured. Add agentApiKey to js/config.js to run the live agent.');
      return;
    }

    var goal = (goalInput && goalInput.value.trim()) || '';
    var eventId = (contextInput && contextInput.value.trim()) || defaultEventId;

    if (goal.length < 10) {
      showError('Describe your goal in at least 10 characters.');
      return;
    }

    clearOutput();
    setRunning(true);
    if (statusEl) statusEl.textContent = 'Running production agent — first request may take up to 60 seconds…';

    var fetchDone = false;
    var loadingDone = runLoadingAnimation(function () {
      return fetchDone;
    });

    var headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    };

    var fetchPromise = fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ goal: goal, eventId: eventId }),
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var body;
          try {
            body = text ? JSON.parse(text) : {};
          } catch (parseErr) {
            throw new Error('Invalid response from agent endpoint.');
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
        if (statusEl) statusEl.textContent = 'Agent completed — streaming reasoning trace…';
        renderTraceSteps(response.body.reasoningTrace || [], function () {
          renderResult(response.body);
          if (statusEl) statusEl.textContent = 'Done. Matches queued for human review in production.';
          setRunning(false);
        });
      })
      .catch(function (err) {
        showError(err.message || 'Agent request failed.');
        setRunning(false);
      });
  });
})();
