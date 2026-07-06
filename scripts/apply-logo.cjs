const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.html')) files.push(p);
  }
  return files;
}

const brandRoot =
  '<a href="index.html" class="site-brand group" aria-label="Abe Stack home"><img src="images/abestack-icon.png" alt="" class="site-logo-icon" width="36" height="36" decoding="async" /><img src="images/abestack-wordmark.png" alt="Abe Stack" class="site-logo-wordmark" width="120" height="22" decoding="async" /></a>';
const brandOne =
  '<a href="../index.html" class="site-brand group" aria-label="Abe Stack home"><img src="../images/abestack-icon.png" alt="" class="site-logo-icon" width="36" height="36" decoding="async" /><img src="../images/abestack-wordmark.png" alt="Abe Stack" class="site-logo-wordmark" width="120" height="22" decoding="async" /></a>';
const footerBrand =
  '<p class="site-footer__brand site-brand site-brand--footer"><img src="images/abestack-icon.png" alt="" class="site-logo-icon site-logo-icon--sm" width="28" height="28" decoding="async" /><img src="images/abestack-wordmark.png" alt="Abe Stack" class="site-logo-wordmark site-logo-wordmark--sm" width="96" height="18" decoding="async" /></p>';

const logoBlockRe =
  /<a href="(?:\.\.\/)?index\.html" class="flex items-center gap-2\.5(?: group)?">\s*<span class="site-logo-mark">A<\/span>\s*<span class="font-(?:bold|semibold)[^"]*">Abe Stack<\/span>\s*<\/a>/g;

const compactLogoRe =
  /<a href="\.\.\/index\.html" class="flex items-center gap-2\.5"><span class="site-logo-mark">A<\/span><span class="font-semibold(?: text-ink tracking-tight)?">Abe Stack<\/span><\/a>/g;

let count = 0;
for (const file of walk('.')) {
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  html = html.replace(logoBlockRe, (match) =>
    match.includes('../index.html') ? brandOne : brandRoot,
  );
  html = html.replace(compactLogoRe, brandOne);

  html = html.replace(
    /<p class="site-footer__brand flex items-center gap-2"><span class="site-logo-mark[^"]*">A<\/span> Abe Stack<\/p>/g,
    footerBrand,
  );

  if (!html.includes('favicon-32.png')) {
    html = html.replace(
      /<link rel="icon" href="(images|\.\.\/images)\/favicon\.svg" type="image\/svg\+xml" \/>/,
      (m, prefix) =>
        `${m}\n  <link rel="icon" href="${prefix}/favicon-32.png" type="image/png" sizes="32x32" />`,
    );
  }

  html = html.replace(
    /<link rel="apple-touch-icon" href="images\/og-image\.png" \/>/,
    '<link rel="apple-touch-icon" href="images/apple-touch-icon.png" />',
  );

  if (html !== orig) {
    fs.writeFileSync(file, html);
    count += 1;
    console.log('updated', file);
  }
}
console.log('files updated:', count);
