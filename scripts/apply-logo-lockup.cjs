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

const lockupRoot =
  '<a href="index.html" class="site-brand group" aria-label="Abe Stack home"><img src="images/abestack-lockup.png" alt="Abe Stack" class="site-logo-lockup" width="85" height="40" decoding="async" /></a>';
const lockupOne =
  '<a href="../index.html" class="site-brand group" aria-label="Abe Stack home"><img src="../images/abestack-lockup.png" alt="Abe Stack" class="site-logo-lockup" width="85" height="40" decoding="async" /></a>';
const footerBrand =
  '<p class="site-footer__brand site-brand site-brand--footer"><img src="images/abestack-lockup-sm.png" alt="Abe Stack" class="site-logo-lockup" width="68" height="32" decoding="async" /></p>';

const dualRe =
  /<a href="(?:\.\.\/)?index\.html" class="site-brand(?: group)?" aria-label="Abe Stack home"><img src="(?:\.\.\/)?images\/abestack-icon\.png" alt="" class="site-logo-icon" width="36" height="36" decoding="async" \/><img src="(?:\.\.\/)?images\/abestack-wordmark\.png" alt="Abe Stack" class="site-logo-wordmark" width="120" height="22" decoding="async" \/><\/a>/g;

const footerRe =
  /<p class="site-footer__brand site-brand site-brand--footer"><img src="images\/abestack-icon\.png" alt="" class="site-logo-icon site-logo-icon--sm" width="28" height="28" decoding="async" \/><img src="images\/abestack-wordmark\.png" alt="Abe Stack" class="site-logo-wordmark site-logo-wordmark--sm" width="96" height="18" decoding="async" \/><\/p>/g;

let count = 0;
for (const file of walk('.')) {
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;
  html = html.replace(dualRe, (match) => (match.includes('../') ? lockupOne : lockupRoot));
  html = html.replace(footerRe, footerBrand);
  if (html !== orig) {
    fs.writeFileSync(file, html);
    count += 1;
    console.log('updated', file);
  }
}
console.log('files updated:', count);
