// v1.23.0 (2026-11-02): Kitchen module — shared math and labels for the pizza
// pages (kitchen.html, kitchen-recipe.html, pizza.html). Full history: CHANGELOG.md
//
// Kitchen amounts are stored exactly as typed ("2530", "1 1/2", "1/4", "5-6",
// "to taste") and only ever scaled for display. Nothing here writes back.
window.KITCHEN = (function () {
  const KINDS = [
    { id: "dough",   label: "Dough",   group: "dough" },
    { id: "sauce",   label: "Sauce",   group: "sauce" },
    { id: "base",    label: "Base",    group: "sauce" },
    { id: "topping", label: "Topping", group: "topping" },
    { id: "finish",  label: "Finish",  group: "topping" },
  ];
  const GROUPS = [
    { id: "dough",   label: "Doughs" },
    { id: "sauce",   label: "Sauces & bases" },
    { id: "topping", label: "Toppings & finishes" },
  ];
  const BUILD_STATUS = [
    { id: "menu",    label: "On menu" },
    { id: "special", label: "Special" },
    { id: "idea",    label: "Idea" },
    { id: "retired", label: "Retired" },
  ];
  // Assembly order on the line, top to bottom of the card.
  const LAYERS = [
    { id: "base",    label: "Sauce / base" },
    { id: "cheese",  label: "Cheese" },
    { id: "topping", label: "Toppings" },
    { id: "finish",  label: "After the oven" },
  ];
  // A 14" pie has (14/9)² ≈ 2.42× the area of a 9" pie. Sauce, cheese and
  // toppings scale by area unless a 14" amount is entered.
  const AREA_RATIO = Math.pow(14 / 9, 2);

  function kindLabel(id) { const k = KINDS.find(x => x.id === id); return k ? k.label : (id || ""); }
  function kindGroup(id) { const k = KINDS.find(x => x.id === id); return k ? k.group : "topping"; }
  function statusLabel(id) { const s = BUILD_STATUS.find(x => x.id === id); return s ? s.label : (id || ""); }
  function layerLabel(id) { const l = LAYERS.find(x => x.id === id); return l ? l.label : (id || ""); }

  // ---------- parsing ----------
  const UNICODE_FRACTIONS = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875 };

  // One quantity: "2530", "1,850", "2.5", "1/4", "1 1/2", "1½", "½".
  function parseOne(s) {
    s = String(s).trim().replace(/,(?=\d{3}\b)/g, "");
    if (!s) return null;
    let m = s.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/);
    if (m) return (m[1] ? Number(m[1]) : 0) + UNICODE_FRACTIONS[m[2]];
    m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : null;
    m = s.match(/^\d+(?:\.\d+)?$|^\.\d+$/);
    if (m) return Number(s);
    return null;
  }

  // A quantity or a range ("5-6", "5–6", "5 to 6", "1/2-1"). Returns
  // { lo, hi } or null when the text isn't a number ("to taste", "pinch").
  function parseAmount(text) {
    if (text === null || text === undefined) return null;
    const s = String(text).trim();
    if (!s) return null;
    const single = parseOne(s);
    if (single !== null) return { lo: single, hi: single };
    const m = s.match(/^(.+?)\s*(?:-|–|—|to)\s*(.+)$/);
    if (m) {
      const a = parseOne(m[1]), b = parseOne(m[2]);
      if (a !== null && b !== null) return { lo: Math.min(a, b), hi: Math.max(a, b) };
    }
    return null;
  }

  function mid(r) { return r ? (r.lo + r.hi) / 2 : null; }

  // ---------- formatting ----------
  function isMetric(unit) {
    const u = window.UNITS && window.UNITS.lookup(unit);
    return !!(u && u.system === "metric");
  }
  function withThousands(n) {
    return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : String(n);
  }
  // Metric amounts read as decimals (1,850 g, 0.9 g); everything else — tsp,
  // cups, oz, cans, cloves — rounds to a kitchen-friendly fraction.
  function formatNumber(v, unit) {
    if (!isFinite(v)) return "";
    if (isMetric(unit)) {
      const a = Math.abs(v);
      const r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
      return withThousands(Number(r.toFixed(2)));
    }
    let r;
    if (v < 10) r = Math.round(v * 8) / 8;
    else if (v < 50) r = Math.round(v * 2) / 2;
    else r = Math.round(v);
    if (r === 0 && v > 0) r = 0.125;
    return window.UNITS ? window.UNITS.numberStr(r, true) : String(r);
  }
  function formatRange(r, unit) {
    if (!r) return "";
    const a = formatNumber(r.lo, unit), b = formatNumber(r.hi, unit);
    return a === b ? a : a + "–" + b;
  }
  // Scale typed text by a factor. Unreadable text comes back untouched with
  // fixed: true, so the page can say it wasn't scaled.
  function scaleText(text, factor) {
    const r = parseAmount(text);
    if (!r) return { text: String(text == null ? "" : text).trim(), fixed: true, range: null };
    const out = { lo: r.lo * factor, hi: r.hi * factor };
    return { text: null, fixed: false, range: out };
  }
  function scaledAmount(text, factor, unit) {
    const s = scaleText(text, factor);
    return { text: s.fixed ? s.text : formatRange(s.range, unit), fixed: s.fixed, range: s.range };
  }

  // ---------- dough ----------
  function toGrams(amount, unit) {
    const u = window.UNITS && window.UNITS.lookup(unit);
    if (!u || u.family !== "weight") return null;
    const r = parseAmount(amount);
    return r ? mid(r) * u.factor : null;
  }
  // Baker's percentages, computed from the weights rather than typed, so a
  // hydration that doesn't match the grams can't hide on the sheet.
  function doughStats(ingredients) {
    const rows = (ingredients || []).map(i => ({ ing: i, g: toGrams(i.amount, i.unit) }));
    const flour = rows.filter(r => r.g !== null && /flour/i.test(r.ing.name || "")).reduce((s, r) => s + r.g, 0);
    if (!flour) return null;
    const pct = new Map();
    rows.forEach(r => { if (r.g !== null) pct.set(r.ing, r.g / flour * 100); });
    const find = re => rows.find(r => r.g !== null && re.test(r.ing.name || ""));
    const water = find(/water/i), salt = find(/salt/i);
    const total = rows.reduce((s, r) => s + (r.g || 0), 0);
    return {
      flour, total, pct,
      hydration: water ? water.g / flour * 100 : null,
      salt: salt ? salt.g / flour * 100 : null,
    };
  }
  function doughBaseTotal(recipe) {
    const n = mid(parseAmount(recipe.yield_qty));
    const w = Number(recipe.ball_weight_g);
    return n && w ? n * w : null;
  }
  // Scale so the ingredients add up to exactly balls × weight. The written
  // grams rarely sum to the nominal batch (the Friday sheet's come to 4,001.7 g
  // for 20 × 200 g), and the page shouldn't show 6,000 g in one place and
  // 6,003 g in another. Falls back to the nominal batch if any line isn't a
  // weight.
  function doughFactor(recipe, balls, weight) {
    if (!balls || !weight) return 1;
    const target = balls * weight;
    const ings = recipe.ingredients || [];
    const grams = ings.map(i => toGrams(i.amount, i.unit));
    if (ings.length && grams.every(g => g !== null)) {
      const sum = grams.reduce((a, g) => a + g, 0);
      if (sum > 0) return target / sum;
    }
    const base = doughBaseTotal(recipe);
    return base ? target / base : 1;
  }

  // ---------- portions & yield ----------
  function portion14Text(recipe) {
    if (String(recipe.portion_14 || "").trim()) return { text: String(recipe.portion_14), computed: false };
    const r = parseAmount(recipe.portion_9);
    if (!r) return { text: "", computed: false };
    return { text: formatRange({ lo: r.lo * AREA_RATIO, hi: r.hi * AREA_RATIO }, recipe.portion_unit), computed: true };
  }
  // Same unit text, or both units the converter knows in the same family.
  function unitFactor(fromUnit, toUnit) {
    const a = String(fromUnit || "").trim().toLowerCase(), b = String(toUnit || "").trim().toLowerCase();
    if (a && a === b) return 1;
    const ua = window.UNITS && window.UNITS.lookup(a), ub = window.UNITS && window.UNITS.lookup(b);
    if (ua && ub && ua.family === ub.family) return ua.factor / ub.factor;
    return null;
  }
  // How many pies a batch covers at a given size. Conservative on both ends:
  // the low figure uses the small yield and the big portion.
  function piesFrom(recipe, factor, size) {
    const y = parseAmount(recipe.yield_qty);
    const pText = size === 14 ? portion14Text(recipe).text : recipe.portion_9;
    const p = parseAmount(pText);
    if (!y || !p || !p.lo) return null;
    const conv = unitFactor(recipe.yield_unit, recipe.portion_unit);
    if (conv === null) return null;
    const lo = Math.floor((y.lo * factor * conv) / p.hi + 1e-9);
    const hi = Math.floor((y.hi * factor * conv) / p.lo + 1e-9);
    return { lo, hi };
  }
  // Batch multiplier needed for N pies (rounded up to a quarter batch).
  function factorForPies(recipe, pies, size) {
    const y = parseAmount(recipe.yield_qty);
    const pText = size === 14 ? portion14Text(recipe).text : recipe.portion_9;
    const p = parseAmount(pText);
    const conv = unitFactor(recipe.yield_unit, recipe.portion_unit);
    if (!y || !p || conv === null || !pies) return null;
    const need = pies * p.hi;
    return Math.ceil((need / (y.lo * conv)) * 4 - 1e-9) / 4;
  }

  // ---------- pizza layers ----------
  // The amount a layer calls for at one size: typed amount first, then the
  // other size scaled by area, then the linked component's portion.
  function layerAmount(layer, size, recipesById) {
    const own = size === 14 ? layer.amount_14 : layer.amount_9;
    const other = size === 14 ? layer.amount_9 : layer.amount_14;
    const ratio = size === 14 ? AREA_RATIO : 1 / AREA_RATIO;
    const unit = layer.unit;
    if (String(own || "").trim()) return { text: String(own).trim(), unit, computed: false };
    const r = parseAmount(other);
    if (r) return { text: formatRange({ lo: r.lo * ratio, hi: r.hi * ratio }, unit), unit, computed: true };
    if (String(other || "").trim()) return { text: String(other).trim(), unit, computed: false };
    const comp = layer.component_id && recipesById[layer.component_id];
    if (comp) {
      if (size === 14) {
        const p = portion14Text(comp);
        if (p.text) return { text: p.text, unit: comp.portion_unit, computed: p.computed, fromComponent: true };
      } else if (String(comp.portion_9 || "").trim()) {
        return { text: String(comp.portion_9).trim(), unit: comp.portion_unit, computed: false, fromComponent: true };
      }
    }
    return { text: "", unit, computed: false };
  }
  function buildSizes(build) {
    const s = String(build.sizes || "").split(/[^0-9]+/).filter(Boolean).map(Number).filter(n => n === 9 || n === 14);
    return s.length ? s : [9];
  }
  function layerName(layer, recipesById) {
    const comp = layer.component_id && recipesById[layer.component_id];
    if (String(layer.item || "").trim()) return String(layer.item).trim();
    return comp ? recipeTitle(comp) : "";
  }

  // ---------- misc ----------
  function recipeTitle(r) {
    return r ? (r.variant ? `${r.name} — ${r.variant}` : String(r.name || "")) : "";
  }
  // One step per line. A leading "1." / "1)" / "Step 1:" is dropped (the page
  // numbers them), and a short "Title: body" lead is pulled out for bold.
  function methodSteps(text) {
    return String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      l = l.replace(/^(?:step\s*)?\d+\s*[.):\-]\s*/i, "");
      const m = l.match(/^([^:.]{2,40}):\s+(.+)$/);
      return m ? { title: m[1], body: m[2] } : { title: "", body: l };
    });
  }
  function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function newId(prefix, name) {
    const slug = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
    return prefix + "_" + (slug || "item") + "_" + Date.now().toString(36);
  }
  function toast(msg) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function byName(a, b) { return recipeTitle(a).localeCompare(recipeTitle(b)); }

  return {
    KINDS, GROUPS, BUILD_STATUS, LAYERS, AREA_RATIO,
    kindLabel, kindGroup, statusLabel, layerLabel,
    parseAmount, formatNumber, formatRange, scaledAmount,
    toGrams, doughStats, doughBaseTotal, doughFactor,
    portion14Text, piesFrom, factorForPies, unitFactor,
    layerAmount, buildSizes, layerName,
    recipeTitle, methodSteps, escapeHTML, todayISO, newId, toast, param, byName,
  };
})();
