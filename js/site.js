(function () {
  const btn = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!open));
    });
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  const cfg = window.ABE_INC || {};
  document.querySelectorAll('[data-brand]').forEach((el) => {
    if (cfg.siteName) el.textContent = cfg.siteName;
  });

  document.querySelectorAll('[data-email]').forEach((el) => {
    if (cfg.email) {
      if (el.tagName === 'A') el.href = 'mailto:' + cfg.email;
      else el.textContent = cfg.email;
    }
  });
  document.querySelectorAll('[data-form-email]').forEach((el) => {
    if (cfg.email) el.action = 'https://formsubmit.co/' + cfg.email;
  });

  document.querySelectorAll('form[data-form-email]').forEach((form) => {
    const replyField = form.querySelector('[data-replyto-field]');
    const emailInput = form.querySelector('[name="email"]');
    if (replyField && emailInput) {
      emailInput.addEventListener('input', () => {
        replyField.value = emailInput.value;
      });
    }
  });

  const siteBase = (cfg.siteUrl || window.location.origin).replace(/\/$/, '');
  document.querySelectorAll('form[data-form-email] input[name="_next"]').forEach((input) => {
    try {
      const path = new URL(input.value, siteBase).pathname;
      input.value = siteBase + path;
    } catch {
      input.value = siteBase + '/';
    }
  });

  const calendlyUrl = cfg.calendlyUrl;
  if (calendlyUrl && !calendlyUrl.includes('REPLACE')) {
    const bookCallUrl = siteBase + '/contact.html#book-call';

    document.querySelectorAll('[data-calendly-inline]').forEach((el) => {
      el.setAttribute('data-url', calendlyUrl);
    });
    document.querySelectorAll('[data-calendly-popup]').forEach((el) => {
      el.href = bookCallUrl;
      el.addEventListener('click', (e) => {
        if (!window.Calendly) return;
        e.preventDefault();
        Calendly.initPopupWidget({ url: calendlyUrl });
      });
    });
    const initCalendly = () => {
      if (!window.Calendly) return;
      document.querySelectorAll('[data-calendly-inline]').forEach((el) => {
        if (el.dataset.calendlyInit) return;
        el.dataset.calendlyInit = 'true';
        Calendly.initInlineWidget({ url: calendlyUrl, parentElement: el });
      });
    };
    if (window.Calendly) initCalendly();
    else window.addEventListener('load', initCalendly);
  }

  const loomUrl = cfg.loomEmbedUrl;
  if (loomUrl) {
    document.querySelectorAll('[data-loom-embed]').forEach((el) => {
      el.innerHTML =
        '<div class="relative w-full" style="padding-bottom:56.25%;height:0;">' +
        '<iframe src="' + loomUrl + '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen ' +
        'class="absolute inset-0 w-full h-full rounded-xl" title="Project walkthrough"></iframe></div>';
      el.classList.remove('video-placeholder');
    });
  }

  const clutchUrl = cfg.clutchProfileUrl;
  if (clutchUrl) {
    document.querySelectorAll('[data-clutch-link]').forEach((el) => {
      el.href = clutchUrl;
      el.classList.remove('hidden');
    });
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get('intent') === 'ai-audit') {
    var serviceSelect = document.getElementById('service');
    var messageField = document.getElementById('message');
    if (serviceSelect) {
      var intent = params.get('intent');
      for (var i = 0; i < serviceSelect.options.length; i++) {
        var optText = serviceSelect.options[i].text;
        if (intent === 'ai-audit' && optText.indexOf('AI opportunity audit') !== -1) {
          serviceSelect.selectedIndex = i;
          break;
        }
        if (intent !== 'ai-audit' && optText.indexOf('Agentic AI') !== -1 && optText.indexOf('audit') === -1) {
          serviceSelect.selectedIndex = i;
          break;
        }
      }
    }
    if (messageField && !messageField.value) {
      messageField.placeholder =
        'Describe the workflows you want audited (e.g. enrollment triage, volunteer matching, outreach). Timeline and budget range help us scope the audit.';
    }
    var subjectInput = document.querySelector('form[data-form-email] input[name="_subject"]');
    if (subjectInput) subjectInput.value = 'AI opportunity audit request — Abe Stack';
    var auditSection = document.getElementById('ai-audit');
    if (auditSection) auditSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (params.get('sent') === '1') {
    var successBanner = document.getElementById('form-success');
    if (successBanner) {
      successBanner.classList.remove('hidden');
      successBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.querySelectorAll('form[data-form-email]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var endpoint = cfg.formEndpoint;
      if (!endpoint) return;

      e.preventDefault();

      var statusEl = form.querySelector('[data-form-status]');
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.textContent : '';

      function setStatus(message, isError) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.remove('hidden', 'text-red-600', 'text-emerald-700');
        statusEl.classList.add(isError ? 'text-red-600' : 'text-emerald-700');
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      var honey = form.querySelector('input[name="_honey"]');
      var payload = {
        name: (form.querySelector('[name="name"]') || {}).value || '',
        email: (form.querySelector('[name="email"]') || {}).value || '',
        service: (form.querySelector('[name="service"]') || {}).value || '',
        message: (form.querySelector('[name="message"]') || {}).value || '',
        _honey: honey ? honey.value : '',
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          return res.json();
        })
        .then(function () {
          window.location.href = siteBase + '/contact/thank-you.html';
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
          setStatus('Could not reach our server — submitting via email backup…', true);
          HTMLFormElement.prototype.submit.call(form);
        });
    });
  });
})();
