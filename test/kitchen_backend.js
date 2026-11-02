// Backend test for the v1.23.0 Kitchen module.
//
// Loads apps-script/Code.gs into a Node vm with a small in-memory stand-in for
// SpreadsheetApp, then drives doGet/doPost the way the browser does and checks
// what lands in the tabs. No dependencies:
//
//   node test/kitchen_backend.js
'use strict';

const { makeBackend } = require('./fake_apps_script');
const { sheets, get, post } = makeBackend();


const failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); failures.push(name); }
}

console.log('\n— first read creates the tabs —');
let k = get({ kitchen: '1' });
check('empty kitchen reads cleanly', Array.isArray(k.recipes) && k.recipes.length === 0 && k.builds.length === 0, JSON.stringify(k));
['KitchenRecipes', 'KitchenIngredients', 'PizzaBuilds', 'PizzaLayers'].forEach(n =>
  check(n + ' tab auto-created with headers', sheets[n] && sheets[n]._data[0] && sheets[n]._data[0].length > 3));

console.log('\n— save a recipe —');
let r = post({
  action: 'save_kitchen_recipe',
  recipe: { kitchen_id: 'k_dough', name: 'Distiller\'s Dough', kind: 'dough', status: 'active', yield_qty: '20', yield_unit: 'balls', ball_weight_g: 200, version: 99, updated_date: '1999-01-01' },
  ingredients: [
    { name: 'Tipo 00 flour', amount: '2530', unit: 'g', reserve_pct: 10 },
    { name: 'Water', amount: '1390', unit: 'g' },
    { name: 'DADY', amount: '1/4', unit: 'tsp', notes: 'pinch' }
  ]
});
check('save ok', r.ok === true, JSON.stringify(r));
check('new record starts at version 1 (client value ignored)', r.version === 1 && r.created === true, JSON.stringify(r));
check('server stamps the date', /^\d{4}-\d{2}-\d{2}$/.test(r.updated_date) && r.updated_date !== '1999-01-01');
const amtCol = sheets.KitchenIngredients._data[0].indexOf('amount') + 1;
check('amount column forced to plain text', sheets.KitchenIngredients._formats[amtCol] === '@');
const yCol = sheets.KitchenRecipes._data[0].indexOf('yield_qty') + 1;
check('yield column forced to plain text', sheets.KitchenRecipes._formats[yCol] === '@');

k = get({ kitchen: '1' });
const d = k.recipes[0];
check('recipe reads back', d && d.name === 'Distiller\'s Dough' && d.kind === 'dough');
check('three ingredients nested in order', d.ingredients.map(i => i.name).join('|') === 'Tipo 00 flour|Water|DADY');
check('line numbers written', d.ingredients.map(i => i.line).join(',') === '1,2,3');
check('fraction text survives', d.ingredients[2].amount === '1/4');

console.log('\n— edit it —');
r = post({
  action: 'save_kitchen_recipe',
  recipe: { kitchen_id: 'k_dough', name: 'Distiller\'s Dough — Pizza Friday', method: 'Bloom\nMix' },
  ingredients: [{ name: 'Water', amount: '1390', unit: 'g' }, { name: 'Tipo 00 flour', amount: '2530', unit: 'g', reserve_pct: 10 }]
});
check('second save bumps to version 2', r.version === 2 && r.created === false, JSON.stringify(r));
k = get({ kitchen: '1' });
check('still one recipe row', k.recipes.length === 1);
check('fields not sent are kept', k.recipes[0].kind === 'dough' && String(k.recipes[0].ball_weight_g) === '200');
check('sent fields updated', k.recipes[0].name.includes('Pizza Friday') && k.recipes[0].method === 'Bloom\nMix');
check('ingredients replaced, new order kept', k.recipes[0].ingredients.map(i => i.name).join('|') === 'Water|Tipo 00 flour');

console.log('\n— a second recipe and a build —');
post({ action: 'save_kitchen_recipe', recipe: { kitchen_id: 'k_sauce', name: 'Garlic Vodka Red', kind: 'sauce', portion_9: '2', portion_unit: 'oz' },
  ingredients: [{ name: 'San Marzano tomatoes', amount: '2', unit: 'can (28 oz)' }] });
r = post({ action: 'save_pizza_build', build: { build_id: 'b_1', name: 'Margherita', status: 'menu', sizes: '9,14', dough_9: 'k_dough', dough_14: '' },
  layers: [
    { layer: 'sauce', component_id: 'k_sauce', item: '', amount_9: '', amount_14: '' },
    { layer: 'cheese', item: 'Fresh mozzarella', amount_9: '2', amount_14: '', unit: 'oz' }
  ] });
check('build saved at version 1', r.ok && r.version === 1, JSON.stringify(r));
k = get({ kitchen: '1' });
check('two recipes, one build', k.recipes.length === 2 && k.builds.length === 1);
check('layers nested in order', k.builds[0].layers.map(l => l.layer).join(',') === 'sauce,cheese');
check('sizes kept as text', k.builds[0].sizes === '9,14');
check('ingredients stay with their own recipe', k.recipes.find(x => x.kitchen_id === 'k_sauce').ingredients.length === 1 &&
  k.recipes.find(x => x.kitchen_id === 'k_dough').ingredients.length === 2);

console.log('\n— validation —');
check('save without a name is refused', !!post({ action: 'save_kitchen_recipe', recipe: { kitchen_id: 'x', name: '  ' }, ingredients: [] }).error);
check('save without an id is refused', !!post({ action: 'save_pizza_build', build: { name: 'x' }, layers: [] }).error);
check('delete of a missing record is refused', !!post({ action: 'delete_kitchen_recipe', kitchen_id: 'nope' }).error);

console.log('\n— deletes —');
check('delete build ok', post({ action: 'delete_pizza_build', build_id: 'b_1' }).ok === true);
check('delete recipe ok', post({ action: 'delete_kitchen_recipe', kitchen_id: 'k_sauce' }).ok === true);
k = get({ kitchen: '1' });
check('build and its layers gone', k.builds.length === 0 && sheets.PizzaLayers._data.length === 1);
check('deleted recipe and its ingredients gone, other untouched', k.recipes.length === 1 && k.recipes[0].kitchen_id === 'k_dough' &&
  sheets.KitchenIngredients._data.length === 3);
check('changes logged', sheets.changelog._data.some(row => row[5] === 'save_kitchen_recipe') &&
  sheets.changelog._data.some(row => row[5] === 'delete_pizza_build'));
check('product recipe tabs untouched', sheets.Recipes._data.length === 0 && sheets.Ingredients._data.length === 0);

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall passed');
process.exit(failures.length ? 1 : 0);
