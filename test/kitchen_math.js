// Unit checks for js/kitchen.js (v1.23.0): amount parsing, scaling, baker's
// percentages, pie counts and 9"/14" layer amounts. No dependencies:
//
//   node test/kitchen_math.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {}, console };
vm.createContext(ctx);
['units.js', 'kitchen.js'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx));
const K = ctx.window.KITCHEN;

const failures = [];
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`));
  if (!ok) failures.push(name);
}
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6);
function ok(name, cond, extra) {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : ' — ' + extra));
  if (!cond) failures.push(name);
}

console.log('\n— parsing —');
eq('plain number', K.parseAmount('2530'), { lo: 2530, hi: 2530 });
eq('thousands comma', K.parseAmount('1,850'), { lo: 1850, hi: 1850 });
eq('decimal', K.parseAmount('0.9'), { lo: 0.9, hi: 0.9 });
eq('fraction', K.parseAmount('1/4'), { lo: 0.25, hi: 0.25 });
eq('mixed number', K.parseAmount('1 1/2'), { lo: 1.5, hi: 1.5 });
eq('unicode fraction', K.parseAmount('1½'), { lo: 1.5, hi: 1.5 });
eq('hyphen range', K.parseAmount('5-6'), { lo: 5, hi: 6 });
eq('en-dash range with decimals', K.parseAmount('2–2.5'), { lo: 2, hi: 2.5 });
eq('"to" range', K.parseAmount('12 to 14'), { lo: 12, hi: 14 });
eq('fraction range', K.parseAmount('1/2-1'), { lo: 0.5, hi: 1 });
eq('words are not numbers', K.parseAmount('to taste'), null);
eq('blank', K.parseAmount(''), null);

console.log('\n— formatting & scaling —');
eq('grams get thousands separators', K.formatNumber(3795, 'g'), '3,795');
eq('small grams keep decimals', K.formatNumber(0.9, 'g'), '0.9');
eq('tsp rounds to a fraction', K.formatNumber(1.5, 'tsp'), '1½');
eq('counts round to eighths', K.formatNumber(2.24, 'cloves'), '2¼');
eq('scaled range', K.scaledAmount('5-6', 2, 'lb').text, '10–12');
eq('unscaled text passes through', K.scaledAmount('pinch', 3, '').text, 'pinch');
ok('unscaled text is flagged', K.scaledAmount('pinch', 3, '').fixed === true, 'not flagged');

console.log('\n— dough —');
// Pizza Friday sheet, 20 × 200 g.
const friday = {
  yield_qty: '20', ball_weight_g: 200, ingredients: [
    { name: 'Tipo "00" flour', amount: '2530', unit: 'g' },
    { name: 'Water (75–80°F)', amount: '1390', unit: 'g' },
    { name: 'Fine sea salt', amount: '71', unit: 'g' },
    { name: 'Active dry yeast (Costco ADY)', amount: '9.5', unit: 'g' },
    { name: "Distiller's yeast (DADY)", amount: '1.2', unit: 'g' }
  ]
};
const st = K.doughStats(friday.ingredients);
ok('hydration ≈ 55%', near(st.hydration, 54.94, 0.05), st.hydration);
ok('salt ≈ 2.8%', near(st.salt, 2.81, 0.02), st.salt);
ok('total ≈ 4,000 g', near(st.total, 4001.7, 0.01), st.total);
ok('30 balls × 200 g scales the ingredients to exactly 6,000 g', near(st.total * K.doughFactor(friday, 30, 200), 6000), st.total * K.doughFactor(friday, 30, 200));
ok('10 balls × 470 g → 4,700 g', near(st.total * K.doughFactor(friday, 10, 470), 4700), K.doughFactor(friday, 10, 470));
ok('non-weight line falls back to the nominal batch', near(K.doughFactor({ yield_qty: '20', ball_weight_g: 200, ingredients: [{ name: 'flour', amount: '2530', unit: 'g' }, { name: 'yeast', amount: 'pinch', unit: '' }] }, 30, 200), 1.5), 'no fallback');

console.log('\n— pies & portions —');
const gv = { yield_qty: '64-68', yield_unit: 'oz', portion_9: '2', portion_unit: 'oz' };
eq('Garlic Vodka covers 32–34 nine-inch pies', K.piesFrom(gv, 1, 9), { lo: 32, hi: 34 });
eq('14" portion scales by area', K.portion14Text(gv), { text: '4⅞', computed: true });
eq('14" pies from one batch', K.piesFrom(gv, 1, 14), { lo: 13, hi: 13 });
eq('batch needed for 40 nine-inch pies', K.factorForPies(gv, 40, 9), 1.25);
eq('cups yield vs oz portion converts', K.piesFrom({ yield_qty: '2', yield_unit: 'cups', portion_9: '2', portion_unit: 'oz' }, 1, 9), { lo: 8, hi: 8 });
eq('g portion vs oz yield does not guess', K.piesFrom({ yield_qty: '24', yield_unit: 'oz', portion_9: '55-60', portion_unit: 'g' }, 1, 9), null);

console.log('\n— pizza layers —');
const comps = { k_gv: Object.assign({ kitchen_id: 'k_gv', name: 'Garlic Vodka Red' }, gv) };
eq('typed 9" amount', K.layerAmount({ amount_9: '1.75', unit: 'oz' }, 9, comps).text, '1.75');
const l14 = K.layerAmount({ amount_9: '1.75', unit: 'oz' }, 14, comps);
eq('14" scaled from 9"', [l14.text, l14.computed], ['4¼', true]);
eq('typed 14" wins', K.layerAmount({ amount_9: '1.75', amount_14: '4', unit: 'oz' }, 14, comps).text, '4');
const fromComp = K.layerAmount({ component_id: 'k_gv' }, 9, comps);
eq('sauce layer falls back to the sauce portion', [fromComp.text, fromComp.unit, !!fromComp.fromComponent], ['2', 'oz', true]);
eq('…and its 14" portion', K.layerAmount({ component_id: 'k_gv' }, 14, comps).text, '4⅞');
eq('sizes parsed', K.buildSizes({ sizes: '9,14' }), [9, 14]);
eq('sizes default to 9', K.buildSizes({ sizes: '' }), [9]);

console.log('\n— method —');
eq('numbering stripped, title split', K.methodSteps('1. Bloom: Stir yeast into water.\n\n2) Mix until shaggy'),
  [{ title: 'Bloom', body: 'Stir yeast into water.' }, { title: '', body: 'Mix until shaggy' }]);

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall passed');
process.exit(failures.length ? 1 : 0);
