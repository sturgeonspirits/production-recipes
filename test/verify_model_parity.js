// Guards the deliberate duplication of the volume model between js/abv.js (used
// by the browser to draw Live ABV) and apps-script/Code.gs (used by the batch
// size audit). If the two ever disagree the audit would flag healthy recipes,
// or miss broken ones. Run: node test/verify_model_parity.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");

global.window = {};
require(path.join(root, "js/abv.js"));
const ABV = global.window.ABV;

// Load Code.gs's helpers without its Apps Script dependencies.
const ctx = { console, Date, JSON, String, Number, Object, Array, Math, isNaN, Error,
  SpreadsheetApp: {}, ContentService: {}, Utilities: {}, PropertiesService: {}, Logger: { log() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "apps-script/Code.gs"), "utf8"), ctx);

const NAMES = ["Vodka","Fresh Orange Juice","Brown Sugar","Cinnamon Sticks","Cherries","Orange Peel",
  "Apple Cider","Everclear","Honey Syrup","Lemon Zest","Raspberries","Water","Coffee Beans",
  "Vanilla Bean","Heavy Cream","Cocoa Powder","Chocolate Syrup","Malt Powder","Instant Coffee","Coffee Beans","Espresso Powder","Instant Tea","Dry Whole Milk","Cranberry Concentrate","Blue Curacao","Mango Puree","Sweetener","Rhubarb","Neutral Spirit","Dried Cherries","Raisins","Prunes"];
const UNITS = ["mL","millilitres","L","cups","tbsp","tsp","oz","gal","qt","pt","parts","g","kg","lb","oz wt","each"];
const TYPES = ["", "liquid", "sugar", "fruit", "driedfruit", "powder", "botanical"];

// Deterministic pseudo-random so a failure is reproducible.
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];

let checked = 0, bad = 0;
const near = (x, y) => (x === null && y === null) ||
  (x !== null && y !== null && Math.abs(x - y) <= Math.max(1e-9, Math.abs(x) * 1e-12));
for (let t = 0; t < 3000; t++) {
  const n = 1 + Math.floor(rnd() * 6);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const alc = rnd() < 0.3;
    rows.push({
      ingredient_name: pick(NAMES), name: undefined,
      amount: Math.round(rnd() * 5000) / 10,
      unit: pick(UNITS),
      is_alcohol: alc ? "yes" : "no",
      abv_percent: alc ? Math.round(rnd() * 95) : "",
      ing_type: pick(TYPES),
      volume_contribution: rnd() < 0.15 ? Math.round(rnd() * 100) : ""
    });
  }
  // abv.js reads .name; Code.gs reads .ingredient_name || .name
  const batchUnit = pick(["", "mL", "L", "gal", "parts", "each"]);
  const jsRecipe = {
    batch_size: batchUnit ? Math.round(rnd() * 10000) / 10 : "",
    batch_unit: batchUnit,
    ingredients: rows.map(r => ({ ...r, name: r.ingredient_name }))
  };
  const a = { vol: ABV.estimateFinalVolumeML(jsRecipe) };
  const g = ctx.modelRecipe_(rows);
  const jsInfo = ABV.getABVInfo(jsRecipe);
  const gsInfo = ctx.getRecipeABVInfo_(jsRecipe, rows);
  checked++;

  const gVol = g ? g.volML : null;
  const gAbv = g && g.volML ? (g.alcML / g.volML) * 100 : null;
  if (!near(a.vol, gVol) || !near(jsInfo.abv, gsInfo.abv)) {
    bad++;
    if (bad <= 3) {
      console.error("MISMATCH on", JSON.stringify(rows));
      console.error("  abv.js  vol=" + a.vol);
      console.error("  Code.gs vol=" + gVol + " abv=" + gAbv);
    console.error("  safety info js=" + jsInfo.abv + " gs=" + gsInfo.abv);
    }
  }
}

const cases = [
  {
    name: "uses a measured finished batch size",
    recipe: { batch_size: 1000, batch_unit: "mL", ingredients: [
      { name: "Vodka", amount: 200, unit: "mL", is_alcohol: "yes", abv_percent: 50 },
      { name: "Water", amount: 800, unit: "mL", is_alcohol: "no" }
    ] }, expected: 10
  },
  {
    name: "withholds result for missing alcohol ABV",
    recipe: { batch_size: 1000, batch_unit: "mL", ingredients: [
      { name: "Vodka", amount: 200, unit: "mL", is_alcohol: "yes", abv_percent: "" },
      { name: "Water", amount: 800, unit: "mL", is_alcohol: "no" }
    ] }, expected: null
  },
  {
    name: "withholds result for mixed parts and physical measures",
    recipe: { ingredients: [
      { name: "Vodka", amount: 1, unit: "parts", is_alcohol: "yes", abv_percent: 50 },
      { name: "Water", amount: 500, unit: "mL", is_alcohol: "no" }
    ] }, expected: null
  },
  {
    name: "allows all-parts ratios",
    recipe: { batch_size: 10, batch_unit: "parts", ingredients: [
      { name: "Vodka", amount: 2, unit: "parts", is_alcohol: "yes", abv_percent: 50 },
      { name: "Water", amount: 8, unit: "parts", is_alcohol: "no" }
    ] }, expected: 10
  },
  {
    name: "treats spreadsheet no as not alcohol",
    recipe: { batch_size: 1000, batch_unit: "mL", ingredients: [
      { name: "Juice", amount: 500, unit: "mL", is_alcohol: "no", abv_percent: 90 },
      { name: "Water", amount: 500, unit: "mL", is_alcohol: "no" }
    ] }, expected: null
  }
];
for (const c of cases) {
  const rows = c.recipe.ingredients.map(i => ({ ...i, ingredient_name: i.name }));
  const js = ABV.getABVInfo(c.recipe).abv;
  const gs = ctx.getRecipeABVInfo_(c.recipe, rows).abv;
  if (!near(js, c.expected) || !near(gs, c.expected)) {
    console.error("FAIL case " + c.name + ": js=" + js + " gs=" + gs + " expected=" + c.expected);
    bad++;
  }
}
console.log(`checked ${checked} random recipes — ${bad} mismatches`);
if (bad) { console.error("FAIL: the two volume models have drifted apart."); process.exit(1); }
console.log("PASS: js/abv.js and apps-script/Code.gs model recipes identically.");
