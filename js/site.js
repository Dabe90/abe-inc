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
    document.querySelectorAll('[data-calendly-inline]').forEach((el) => {
      el.setAttribute('data-url', calendlyUrl);
    });
    document.querySelectorAll('[data-calendly-popup]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.Calendly) Calendly.initPopupWidget({ url: calendlyUrl });
      });
    });
    const initCalendly = () => {
      if (!window.Calendly) return;
      document.querySelectorAll('[data-calendly-inline]').forEach((el) => {
        if (el.dataset.calendlyInit) return;
        el.dataset.calendlyInit = 'true';
        Calendly.initInlineWidget({ url: calendlyUrl, parentElement: el });
      });
      if (document.body.dataset.calendlyWidget === 'true') {
        Calendly.initBadgeWidget({
          url: calendlyUrl,
          text: 'Book a call',
          color: '#2563eb',
          textColor: '#ffffff',
          branding: true,
        });
      }
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
})();
