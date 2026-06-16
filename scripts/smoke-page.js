// Quick diagnostic - run: node scripts/smoke-page.js
const http = require('http');
const { chromium } = require('playwright');

(async function() {
  var errors = [];
  var browser = await chromium.launch();
  var page = await browser.newPage();
  page.on('requestfailed', function(r) { errors.push('FAIL ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  page.on('response', function(r) { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  page.on('console', function(m) { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4173/app.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  var hasState = await page.evaluate(function() { return typeof window.state !== 'undefined'; });
  var hasShowTab = await page.evaluate(function() { return typeof window.showTab === 'function'; });
  console.log('state:', hasState, 'showTab:', hasShowTab);
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length || !hasState ? 1 : 0);
})().catch(function(e) { console.error(e); process.exit(1); });
