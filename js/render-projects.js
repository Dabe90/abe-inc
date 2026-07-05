(function () {
  var projects = (window.ABE_PROJECTS || []).slice().sort(function (a, b) {
    return (a.sortOrder || 99) - (b.sortOrder || 99);
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function metricChips(metrics) {
    if (!metrics || !metrics.length) return '';
    return (
      '<div class="work-card__metrics">' +
      metrics
        .slice(0, 4)
        .map(function (m) {
          return (
            '<span class="work-card__metric"><strong>' +
            escapeHtml(m.value) +
            '</strong> ' +
            escapeHtml(m.label) +
            '</span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function stackChips(stack) {
    if (!stack || !stack.length) return '';
    return (
      '<div class="work-card__stack">' +
      stack
        .slice(0, 4)
        .map(function (t) {
          return '<span class="work-card__stack-chip">' + escapeHtml(t) + '</span>';
        })
        .join('') +
      '</div>'
    );
  }

  function matchesFilter(project, filterId) {
    if (!filterId || filterId === 'all') return true;
    var tags = project.filterTags || [];
    return tags.indexOf(filterId) !== -1;
  }

  function createCard(project, basePath) {
    var href = basePath + 'projects/' + project.slug + '.html';
    var img = basePath + project.image;
    var tag = escapeHtml(project.category) + ' · ' + escapeHtml(project.shippedLabel);
    var filterTags = (project.filterTags || []).join(' ');
    var proof = project.socialProof
      ? '<p class="work-card__proof mt-3 text-xs text-ink-soft leading-relaxed border-l-2 border-accent/30 pl-3 italic">"' +
        escapeHtml(project.socialProof.replace(/^"|"$/g, '')) +
        '"</p>'
      : '';
    var problem = project.problem
      ? '<p class="work-card__problem mt-3 text-xs text-ink-muted leading-relaxed"><span class="font-bold text-ink">Problem:</span> ' +
        escapeHtml(project.problem) +
        '</p>'
      : '';
    var beforeAfter = project.beforeAfter
      ? '<p class="work-card__before-after mt-3 text-xs text-ink-soft leading-relaxed"><span class="font-bold text-ink">Before → After:</span> ' +
        escapeHtml(project.beforeAfter) +
        '</p>'
      : '';
    var solution = project.solution
      ? '<details class="work-card__details mt-3"><summary class="text-xs font-bold text-accent cursor-pointer">Solution details</summary><p class="mt-2 text-xs text-ink-muted leading-relaxed">' +
        escapeHtml(project.solution) +
        '</p></details>'
      : '';

    var card = document.createElement('a');
    card.href = href;
    card.className = 'work-card group';
    card.setAttribute('data-filter-tags', filterTags);
    card.innerHTML =
      '<div class="work-card__media">' +
      '<img src="' +
      escapeHtml(img) +
      '" alt="' +
      escapeHtml(project.imageAlt || project.title) +
      '" width="1440" height="900" loading="lazy" />' +
      '<span class="work-card__cta">Read case study →</span>' +
      '</div>' +
      '<div class="work-card__body">' +
      '<span class="work-card__tag">' +
      tag +
      '</span>' +
      '<h2 class="text-xl font-bold mt-3 group-hover:text-accent transition">' +
      escapeHtml(project.title) +
      '</h2>' +
      '<p class="text-sm text-ink-soft mt-2">' +
      escapeHtml(project.subtitle) +
      '</p>' +
      problem +
      metricChips(project.metrics) +
      beforeAfter +
      solution +
      stackChips(project.stack) +
      proof +
      '<p class="work-card__link mt-4 text-sm font-bold text-accent group-hover:underline">View full case study →</p>' +
      '</div>';
    return card;
  }

  function renderGrid(grid, filterId) {
    var basePath = grid.getAttribute('data-base-path') || '';
    var limit = parseInt(grid.getAttribute('data-limit') || '0', 10);
    var featuredOnly = grid.getAttribute('data-featured') === 'true';
    var list = projects.filter(function (p) {
      return matchesFilter(p, filterId);
    });
    if (featuredOnly) list = list.filter(function (p) { return p.featured; });
    if (limit > 0) list = list.slice(0, limit);

    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML =
        '<p class="col-span-full text-center text-sm text-ink-soft py-12">No projects in this category yet.</p>';
      return;
    }
    list.forEach(function (project) {
      grid.appendChild(createCard(project, basePath));
    });
  }

  function initFilters(grid) {
    var filterBar = document.querySelector('[data-project-filters]');
    if (!filterBar) return;

    var countEl = document.querySelector('[data-project-count]');
    var activeFilter = 'all';

    function updateCount(filterId) {
      if (!countEl) return;
      var n = projects.filter(function (p) { return matchesFilter(p, filterId); }).length;
      countEl.textContent = n + ' project' + (n === 1 ? '' : 's');
    }

    filterBar.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.getAttribute('data-filter');
        filterBar.querySelectorAll('[data-filter]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        renderGrid(grid, activeFilter);
        updateCount(activeFilter);
      });
    });

    updateCount('all');
  }

  document.querySelectorAll('[data-projects-grid]').forEach(function (grid) {
    var initialFilter = grid.getAttribute('data-filter') || 'all';
    renderGrid(grid, initialFilter);
    if (grid.getAttribute('data-enable-filter') === 'true') {
      initFilters(grid);
    }
  });
})();
