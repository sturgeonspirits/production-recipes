// End-to-end smoke test for the v1.23.0 Kitchen module.
//
// Serves the app statically and answers /api with the REAL apps-script/Code.gs
// running against an in-memory spreadsheet (test/fake_apps_script.js), then
// drives the kitchen pages in Chromium: starter import, dough and sauce
// scaling, editing with version bumps, pizza builds at 9″/14″, the print
// sheets, and deletes. Any console or page error fails the run.
//
//   npm i -D playwright && node test/smoke_kitchen.js
//
// Set SHOTS=dir to also save screenshots and print PDFs for a visual check.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { makeBackend } = require('./fake_apps_script');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const backend = makeBackend();

function serve() {
  return new Promise(resolve => {
    let srv;
    srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/api') {
        const send = obj => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(obj)); };
        if (req.method === 'POST') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => send(backend.post(JSON.parse(body))));
          return;
        }
        const params = {};
        u.searchParams.forEach((v, k) => { params[k] = v; });
        send(backend.get(params));
        return;
      }
      if (u.pathname === '/js/config.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(`window.CONFIG = { API_URL: "http://127.0.0.1:${srv.address().port}/api" };`);
        return;
      }
      const p = path.join(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1)));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(fs.readFileSync(p));
    });
    srv.listen(0, () => resolve(srv));
  });
}

const failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); failures.push(name); }
}
const text = async (page, sel) => (await page.textContent(sel)) || '';

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });
  page.on('dialog', d => d.accept());
  await page.addInitScript(() => sessionStorage.setItem('ss_auth', JSON.stringify({ token: 't', display_name: 'Test' })));
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };
  const printPdf = async name => {
    if (!SHOTS) return;
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: path.join(SHOTS, name + '.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: null });
  };

  console.log('\n— home page link —');
  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  check('Kitchen link in the header', await page.locator('header a[href="kitchen.html"]').count() === 1);

  console.log('\n— starter import —');
  await page.goto(base + '/kitchen.html', { waitUntil: 'networkidle' });
  const offer = await text(page, '#list');
  check('empty kitchen offers the import', offer.includes('Import starter recipes'), offer);
  check('offer counts what is in the seed', /3 doughs, 10 sauces & bases, 2 toppings & finishes and 8 pizza ideas/.test(offer), offer);
  await shot('01-import-offer');
  await page.click('#import-btn');
  await page.waitForSelector('.k-group', { timeout: 20000 });
  check('15 recipes saved', backend.get({ kitchen: '1' }).recipes.length === 15);
  check('8 pizzas saved', backend.get({ kitchen: '1' }).builds.length === 8);
  const groups = await page.locator('.k-group').allTextContents();
  check('grouped by kind, archived hidden', groups.join('|').replace(/\s+/g, ' ') === 'Doughs (2)|Sauces & bases (10)|Toppings & finishes (2)', groups.join('|'));
  await shot('02-components');
  await page.click('#show-all-label');
  check('archived dough appears when asked', (await page.locator('.k-group').first().textContent()).includes('(3)'));
  await page.click('#show-all-label');
  await page.click('#tab-pizzas');
  check('pizzas grouped as ideas', (await page.locator('.k-group').allTextContents()).join('').replace(/\s+/g, ' ').includes('Idea (8)'));
  check('pizza card names its sauce', (await text(page, '#list')).includes('Door County Cherry & Bourbon Red Sauce'));
  await shot('03-pizzas');

  console.log('\n— Pizza Friday dough —');
  await page.goto(base + '/kitchen-recipe.html?id=k_dough_friday', { waitUntil: 'networkidle' });
  let v = await text(page, '#view');
  check('hydration computed from the grams', v.includes('54.9%'), v.match(/Hydration[^%]*%/));
  check('salt 2.8%', v.includes('2.8%'));
  check('20 × 200 g by default', v.includes('20 balls × 200 g = 4,000 g'));
  check('flour hold-back split shown', v.includes('Mix 2,276 g · hold back 253 g (10%)'), v.match(/Mix[^)]*\)/));
  check('total dough tile agrees with the batch line', v.includes('4,000grams') || /Total dough\s*4,000/.test(v), v.match(/Total dough.{0,20}/));
  await page.fill('#s-balls', '30');
  await page.press('#s-balls', 'Enter');
  await page.waitForFunction(() => document.querySelector('#view').textContent.includes('6,000 g'));
  v = await text(page, '#view');
  check('30 balls → 3,793 g flour (the sheet\'s 30-pizza column says 3,795)', v.includes('3,793'));
  check('total dough tile 6,000', /Total dough\s*6,000/.test(v), v.match(/Total dough.{0,20}/));
  check('scaled ×1.5 noted', v.includes('×1.5'));
  const ps = await text(page, '#print-sheet');
  check('print sheet carries the scaled batch', ps.includes('30 balls × 200 g = 6,000 g') && ps.includes('3,793'));
  check('print sheet footer has version and scale', /Version 1 · updated \d{4}-\d{2}-\d{2} · printed .*Scaled ×1.5/.test(ps), ps.slice(-200));
  check('print sheet has checkboxes', await page.locator('#print-sheet .ps-box span').count() === 5);
  await shot('04-dough-view');
  await page.emulateMedia({ media: 'print' });
  check('print hides the app', !(await page.isVisible('main')) && await page.isVisible('#print-sheet'));
  await printPdf('print-dough-friday');
  await page.emulateMedia({ media: null });
  check('print sheet hidden on screen', !(await page.isVisible('#print-sheet')));
  await page.reload({ waitUntil: 'networkidle' });
  check('scale remembered on this device', (await page.inputValue('#s-balls')) === '30');
  await page.click('[data-weight="470"]');
  check('weight chip rescales', (await text(page, '#view')).includes('30 balls × 470 g'));
  await page.evaluate(() => localStorage.clear());

  console.log('\n— Packers par-bake dough —');
  await page.goto(base + '/kitchen-recipe.html?id=k_dough_packers_parbake', { waitUntil: 'networkidle' });
  v = await text(page, '#view');
  check('defaults to 10 × 470 g', v.includes('10 balls × 470 g = 4,700 g'));
  check('68% hydration', v.includes('68.0%'));
  check('flags the 14-inch times still to confirm', v.includes('STILL TO CONFIRM'));
  check('used on all 8 pizzas', (await page.locator('.k-uses li').count()) === 8);

  console.log('\n— Garlic Vodka sauce —');
  await page.goto(base + '/kitchen-recipe.html?id=k_sauce_garlic_vodka_red', { waitUntil: 'networkidle' });
  v = await text(page, '#view');
  check('covers 32–34 nine-inch pies', v.includes('32–34 nine-inch'));
  check('14″ portion by area', v.includes('4⅞ oz') && v.includes('9″ × 2.4'));
  await page.fill('#s-pies', '40');
  await page.press('#s-pies', 'Enter');
  await page.waitForFunction(() => document.querySelector('#s-mult').value === '1.25');
  v = await text(page, '#view');
  check('enough for 40 pies → 1.25 batches', v.includes('×1.25 batch'));
  check('cans scale as counts', v.includes('2½') && v.includes('can (28 oz)'));
  await shot('05-sauce-view');
  await printPdf('print-sauce-garlic-vodka');
  await page.evaluate(() => localStorage.clear());

  console.log('\n— variants link —');
  await page.goto(base + '/kitchen-recipe.html?id=k_sauce_smoky_bourbon_fresh', { waitUntil: 'networkidle' });
  check('other version linked', (await text(page, '.k-versions')).includes('Canned San Marzano'));

  console.log('\n— edit and version —');
  await page.goto(base + '/kitchen-recipe.html?id=k_finish_hot_honey', { waitUntil: 'networkidle' });
  await page.click('#edit-btn');
  check('editor filled', (await page.inputValue('#f-name')) === 'Hot Honey');
  check('five ingredient rows', await page.locator('#ing-body .k-ing-card').count() === 5);
  await page.click('#add-ing');
  const last = page.locator('#ing-body .k-ing-card').last();
  await last.locator('[data-f="name"]').fill('Sturgeon Spirits bourbon');
  await last.locator('[data-f="amount"]').fill('1');
  await last.locator('[data-f="unit"]').fill('tsp');
  await page.locator('#ing-body .k-ing-card').nth(5).locator('[data-move="-1"]').click();
  await page.fill('#f-variant', 'Bourbon cask');
  await page.click('#save-btn');
  await page.waitForSelector('#view:not([hidden])');
  v = await text(page, '#view');
  check('saved as version 2', v.includes('Version 2'));
  check('new line in place, moved up one', (await page.locator('.k-ings .k-ing').nth(4).textContent()).includes('bourbon'));
  check('title shows the variant', (await text(page, '#title')).includes('Hot Honey — Bourbon cask'));
  const honey = backend.get({ kitchen: '1' }).recipes.find(r => r.kitchen_id === 'k_finish_hot_honey');
  check('backend has 6 ingredients and v2', honey.ingredients.length === 6 && Number(honey.version) === 2);

  console.log('\n— new component —');
  await page.goto(base + '/kitchen-recipe.html?new=1', { waitUntil: 'networkidle' });
  check('opens in the editor', await page.isVisible('#edit'));
  await page.fill('#f-name', 'Test Pesto');
  await page.selectOption('#f-kind', 'base');
  await page.fill('#f-yield-qty', '1');
  await page.fill('#f-yield-unit', 'cup');
  await page.click('#add-ing');
  await page.locator('#ing-body [data-f="name"]').fill('Basil');
  await page.locator('#ing-body [data-f="amount"]').fill('2');
  await page.locator('#ing-body [data-f="unit"]').fill('cup');
  await page.click('#save-btn');
  await page.waitForSelector('#view:not([hidden])');
  check('URL switched to the new id', /kitchen-recipe\.html\?id=k_test_pesto_/.test(page.url()), page.url());
  check('new component saved', backend.get({ kitchen: '1' }).recipes.some(r => r.name === 'Test Pesto' && r.kind === 'base'));

  console.log('\n— pizza build —');
  await page.goto(base + '/pizza.html?id=p_peninsula_pine', { waitUntil: 'networkidle' });
  v = await text(page, '#view');
  check('9″ uses the Friday dough', v.includes("Distiller's Dough — Pizza Friday (55%) · 200 g ball"));
  check('sauce amount from the sauce portion', /2\s*oz\s*Door County Cherry/.test(v.replace(/\s+/g, ' ')), v.slice(0, 600));
  check('typed cheese amount', v.includes('1.75'));
  await shot('06-pizza-9');
  await page.click('[data-size="14"]');
  v = (await text(page, '#view')).replace(/\s+/g, ' ');
  check('14″ uses the Packers dough', v.includes('Packers par-bake (68%) · 470 g ball'));
  check('14″ sauce by area', /4⅞ oz (9″ × 2\.4 )?Door County/.test(v), v.slice(0, 500));
  check('14″ mozzarella by area (1.75 → 4¼)', /4¼ oz (9″ × 2\.4 )?Low-moisture/.test(v));
  check('scaled amounts are marked', v.includes('9″ × 2.4'));
  await page.click('.k-size-bar .alc-toggle');
  check('print both sizes → two columns', await page.locator('#print-sheet .pc-col').count() === 2);
  await page.emulateMedia({ media: 'print' });
  await printPdf('print-pizza-both');
  await page.emulateMedia({ media: null });
  await shot('07-pizza-14');

  console.log('\n— new pizza —');
  await page.evaluate(() => localStorage.clear());
  await page.goto(base + '/pizza.html?new=1', { waitUntil: 'networkidle' });
  check('defaults: Friday dough for 9″, Packers for 14″',
    (await page.inputValue('#f-dough-9')) === 'k_dough_friday' && (await page.inputValue('#f-dough-14')) === 'k_dough_packers_parbake');
  await page.fill('#f-name', 'House Garlic Red');
  await page.click('label:has(#f-size-14)');
  check('14″ ticked via its label', await page.isChecked('#f-size-14'));
  await page.selectOption('#f-status', 'menu');
  await page.click('#add-layer');
  await page.locator('#layer-body [data-f="component_id"]').selectOption('k_sauce_garlic_vodka_red');
  await page.click('#add-layer');
  const l2 = page.locator('#layer-body .k-ing-card').nth(1);
  await l2.locator('[data-f="layer"]').selectOption('cheese');
  await l2.locator('[data-f="item"]').fill('Fresh mozzarella');
  await l2.locator('[data-f="amount_9"]').fill('2');
  await page.click('#save-btn');
  await page.waitForSelector('#view:not([hidden])');
  v = (await text(page, '#view')).replace(/\s+/g, ' ');
  check('new pizza shows the sauce at 2 oz', v.includes('2 oz Garlic Vodka Red Sauce'));
  const hb = backend.get({ kitchen: '1' }).builds.find(b => b.name === 'House Garlic Red');
  check('saved with both sizes, on menu', hb && hb.sizes === '9,14' && hb.status === 'menu' && hb.layers.length === 2);

  console.log('\n— delete —');
  await page.click('#edit-btn');
  await page.click('#delete-section summary');
  await page.click('#delete-btn');
  await page.click('#delete-yes');
  await page.waitForURL(/kitchen\.html/);
  check('pizza deleted', !backend.get({ kitchen: '1' }).builds.some(b => b.name === 'House Garlic Red'));
  check('back on the pizzas tab', (await text(page, '#list')).includes('Idea'));

  console.log('\n— wide screen —');
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(base + '/kitchen-recipe.html?id=k_sauce_peach_vodka', { waitUntil: 'networkidle' });
  await shot('08-sauce-wide');
  await page.click('#edit-btn');
  await shot('09-editor-wide');

  check('no console or page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failures.length ? `\n${failures.length} FAILED` : '\nall passed');
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
