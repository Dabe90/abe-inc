/**
 * Volunteer Coordinator Agent — interactive demo UI for /ai-agents/
 * Calls /api/volunteer-agent-demo with NDJSON streaming (production-safe simulator).
 */
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

  var endpoint = cfg.agentDemoEndpoint || '/api/volunteer-agent-demo';
  var useStream = cfg.agentDemoStream !== false;
  var defaultEventId = cfg.agentDemoEventId || 'demo-serve-day-2026';

  if (contextInput) {
    contextInput.value = defaultEventId;
  }

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
      runBtn.textContent = running ? 'Agent running…' : 'Run Demo Agent';
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
    if (configWarn) configWarn.classList.add('hidden');
  }

  function initStreamPanel() {
    if (!streamEl) return;
    streamEl.innerHTML =
      '<div class="agent-demo__stream-header">' +
      '<span class="agent-demo__mode-badge">Demo mode</span>' +
      '<span class="agent-demo__live-dot agent-demo__live-dot--pulse" aria-hidden="true"></span>' +
      '<span>Reasoning trace</span></div>';
  }

  function stepIcon(type) {
    if (type === 'reasoning') return '◆';
    if (type === 'tool_request') return '▸';
    if (type === 'tool_response') return '▪';
    return '•';
  }

  function truncate(str, max) {
    var s = String(str || '');
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function appendTraceStep(step) {
    if (!streamEl) return;
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
      escapeHtml(truncate(step.content, 280)) +
      '</p></div>';
    streamEl.appendChild(el);
    streamEl.scrollTop = streamEl.scrollHeight;
  }

  function renderTraceStepsAnimated(trace, onComplete) {
    if (!streamEl || !trace || !trace.length) {
      if (onComplete) onComplete();
      return;
    }
    initStreamPanel();
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var delay = reducedMotion ? 0 : 280;
    var i = 0;
    function addNext() {
      if (i >= trace.length) {
        if (onComplete) onComplete();
        return;
      }
      appendTraceStep(trace[i]);
      i += 1;
      setTimeout(addNext, delay);
    }
    addNext();
  }

  function statusBadge(status) {
    var label = status === 'pending_human_review' ? 'Awaiting approval' : escapeHtml(status || '');
    return '<span class="agent-demo__action-status">' + label + '</span>';
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
            '<div class="agent-demo__action-head">' +
            '<strong>' +
            escapeHtml(action.actionType || 'action') +
            '</strong>' +
            statusBadge(action.status) +
            '</div>' +
            '<p class="agent-demo__action-summary">' +
            escapeHtml(action.summary || '') +
            '</p></div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderMatches(matches) {
    if (!matches || !matches.length) return '';
    return (
      '<ul class="agent-demo__matches mt-3 space-y-2">' +
      matches
        .map(function (m) {
          return (
            '<li class="text-sm text-slate-200">' +
            '<strong class="text-white">' +
            escapeHtml(m.volunteer) +
            '</strong> → ' +
            escapeHtml(m.shift) +
            '<span class="block text-xs text-slate-400 mt-0.5">' +
            escapeHtml(m.reason || '') +
            '</span></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  function renderResult(data) {
    if (!resultEl) return;
    var evalScore = data.evaluation ? Math.round(data.evaluation.score * 100) : null;
    var cost =
      data.usage && data.usage.estimatedCostUsd != null
        ? data.usage.estimatedCostUsd.toFixed(4)
        : '—';
    var matches = (data.result && data.result.proposedMatches) || [];

    resultEl.innerHTML =
      '<div class="agent-demo__result-grid">' +
      '<article class="agent-demo__result-card agent-demo__result-card--primary">' +
      '<p class="agent-demo__result-label">Coordinator summary</p>' +
      '<p class="agent-demo__result-summary">' +
      escapeHtml(data.result && data.result.summary ? data.result.summary : 'No summary returned.') +
      '</p>' +
      renderMatches(matches) +
      '</article>' +
      '<article class="agent-demo__result-card agent-demo__result-card--primary">' +
      '<p class="agent-demo__result-label">Queued for human review</p>' +
      renderFinalActions(data.finalActions) +
      '</article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Phase</p>' +
      '<p class="agent-demo__result-value">' +
      escapeHtml((data.result && data.result.phase) || '—') +
      '</p></article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Quality score</p>' +
      '<p class="agent-demo__result-value">' +
      (evalScore != null ? evalScore + '/100' : '—') +
      '</p></article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Tools called</p>' +
      '<p class="agent-demo__result-value">' +
      escapeHtml(String((data.result && data.result.toolRequestCount) || 0)) +
      '</p></article>' +
      '<article class="agent-demo__result-card">' +
      '<p class="agent-demo__result-label">Est. cost</p>' +
      '<p class="agent-demo__result-value">$' +
      escapeHtml(cost) +
      '</p></article>' +
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

  function parseJsonResponse(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error('Invalid response from demo API.');
    }
  }

  function handleApiError(response, body) {
    var errMsg =
      (body && body.error) || 'Request failed with status ' + response.status;
    throw new Error(errMsg);
  }

  function finishSuccess(data) {
    if (statusEl) {
      statusEl.textContent =
        (data.disclaimer || 'Demo mode') +
        ' — queued actions require coordinator approval before send.';
    }
    renderResult(data);
    setRunning(false);
  }

  /** NDJSON stream: trace steps arrive live from the API simulator */
  function runStreamingDemo(goal, eventId) {
    var url = endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'stream=1';
    initStreamPanel();
    if (statusEl) {
      statusEl.textContent = 'Streaming reasoning trace — fictional demo data only…';
    }

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify({ goal: goal, eventId: eventId, stream: true }),
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          handleApiError(res, parseJsonResponse(text));
        });
      }
      if (!res.body || !res.body.getReader) {
        return res.text().then(function (text) {
          var data = parseJsonResponse(text);
          renderTraceStepsAnimated(data.reasoningTrace || [], function () {
            finishSuccess(data);
          });
        });
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var completeData = null;
      var traceSteps = [];

      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) {
            renderTraceStepsAnimated(traceSteps, function () {
              if (completeData) finishSuccess(completeData);
              else throw new Error('Demo stream ended without a result.');
            });
            return;
          }
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(function (line) {
            if (!line.trim()) return;
            var msg = parseJsonResponse(line);
            if (msg.type === 'trace' && msg.step) traceSteps.push(msg.step);
            if (msg.type === 'complete' && msg.data) completeData = msg.data;
          });
          return pump();
        });
      }

      return pump();
    });
  }

  /** Fallback JSON response with client-side trace animation */
  function runJsonDemo(goal, eventId) {
    if (statusEl) {
      statusEl.textContent = 'Running demo agent — fictional sample data only…';
    }
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goal, eventId: eventId }),
    }).then(function (res) {
      return res.text().then(function (text) {
        var body = parseJsonResponse(text);
        if (!res.ok) handleApiError(res, body);
        renderTraceStepsAnimated(body.reasoningTrace || [], function () {
          finishSuccess(body);
        });
      });
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

    var run = useStream ? runStreamingDemo(goal, eventId) : runJsonDemo(goal, eventId);

    run.catch(function (err) {
      var msg = err.message || 'Demo agent request failed.';
      if (/failed to fetch|network/i.test(msg)) {
        msg =
          'Demo API unavailable. Production endpoint: ' +
          endpoint +
          ' — locally run npx serve or npm run next:dev.';
        if (configWarn) configWarn.classList.remove('hidden');
      }
      showError(msg);
      setRunning(false);
    });
  });
})();
