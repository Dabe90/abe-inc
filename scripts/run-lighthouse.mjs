import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync } from 'fs';

const url = process.argv[2] || 'http://localhost:3456';
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
const options = { logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], port: chrome.port };
const runner = await lighthouse(url, options);
await chrome.kill();

const scores = runner.lhr.categories;
const out = {
  performance: Math.round(scores.performance.score * 100),
  accessibility: Math.round(scores.accessibility.score * 100),
  bestPractices: Math.round(scores['best-practices'].score * 100),
  seo: Math.round(scores.seo.score * 100),
};
console.log('Lighthouse scores:', out);
writeFileSync('lighthouse-scores.json', JSON.stringify(out, null, 2));
