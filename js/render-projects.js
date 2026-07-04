(function () {
  const projects = (window.ABE_PROJECTS || []).slice().sort(function (a, b) {
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
        .slice(0, 2)
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

  function createCard(project, basePath) {
    var href = basePath + 'projects/' + project.slug + '.html';
    var img = basePath + project.image;
    var tag = escapeHtml(project.category) + ' · ' + escapeHtml(project.shippedLabel);
    var card = document.createElement('a');
    card.href = href;
    card.className = 'work-card group';
    card.innerHTML =
      '<div class="work-card__media">' +
      '<img src="' +
      escapeHtml(img) +
      '" alt="' +
      escapeHtml(project.imageAlt || project.title) +
      '" width="1440" height="900" loading="lazy" />' +
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
      metricChips(project.metrics) +
      '</div>';
    return card;
  }

  document.querySelectorAll('[data-projects-grid]').forEach(function (grid) {
    var basePath = grid.getAttribute('data-base-path') || '';
    var limit = parseInt(grid.getAttribute('data-limit') || '0', 10);
    var featuredOnly = grid.getAttribute('data-featured') === 'true';
    var list = projects;
    if (featuredOnly) list = list.filter(function (p) { return p.featured; });
    if (limit > 0) list = list.slice(0, limit);
    list.forEach(function (project) {
      grid.appendChild(createCard(project, basePath));
    });
  });
})();
