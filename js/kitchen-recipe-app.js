// v1.23.0 (2026-11-02): Kitchen recipe page. Opens in a read-only, scaled view
// (dough by ball count × weight, everything else by batch multiplier) with a
// one-page print sheet built from exactly what's on screen. Edit switches to
// the form; the server bumps the version on save. Full history: CHANGELOG.md
(async function () {
  const K = window.KITCHEN;
  const esc = K.escapeHTML;
  const $ = id => document.getElementById(id);
  const viewEl = $("view"), editEl = $("edit"), bar = $("bar"), printEl = $("print-sheet");

  if (window.API.demoMode) $("demo-banner").style.display = "block";

  const id = K.param("id");
  const isNew = !!K.param("new");
  let data = { recipes: [], builds: [] };
  let recipe = null;
  let mode = "view";
  let draft = null;     // working copy while editing
  let dirty = false;
  let scale = { balls: null, weight: null, mult: 1 };

  // ---------- load ----------
  try {
    data = await window.API.getKitchen();
  } catch (err) {
    viewEl.hidden = false;
    viewEl.innerHTML = `<div class="empty-state">Could not load: ${esc(err.message)}</div>`;
    return;
  }
  if (isNew) {
    recipe = { kitchen_id: "", name: "", kind: K.param("kind") || "sauce", status: "active", ingredients: [] };
    mode = "edit";
  } else {
    recipe = data.recipes.find(r => r.kitchen_id === id);
    if (!recipe) {
      viewEl.hidden = false;
      viewEl.innerHTML = `<div class="empty-state">That kitchen recipe wasn't found. <a href="kitchen.html">Back to the kitchen</a></div>`;
      return;
    }
  }

  // ---------- scale state (remembered per recipe on this device) ----------
  function scaleKey() { return "kscale:" + (recipe && recipe.kitchen_id); }
  function resetScale() {
    const n = K.parseAmount(recipe.yield_qty);
    scale = {
      balls: n ? Math.round((n.lo + n.hi) / 2) : null,
      weight: Number(recipe.ball_weight_g) || null,
      mult: 1,
    };
    try {
      const saved = JSON.parse(localStorage.getItem(scaleKey()) || "null");
      if (saved) Object.assign(scale, saved);
    } catch (_) { /* storage blocked — use the written batch */ }
  }
  function saveScale() {
    try { localStorage.setItem(scaleKey(), JSON.stringify(scale)); } catch (_) { /* ignore */ }
  }
  function factor() {
    if (recipe.kind === "dough") return K.doughFactor(recipe, scale.balls, scale.weight);
    return scale.mult > 0 ? scale.mult : 1;
  }

  // ---------- helpers ----------
  function usedIn() {
    return data.builds.filter(b => b.dough_9 === recipe.kitchen_id || b.dough_14 === recipe.kitchen_id ||
      (b.layers || []).some(l => l.component_id === recipe.kitchen_id));
  }
  function siblings() {
    if (!recipe.family) return [];
    return data.recipes.filter(x => x.family === recipe.family && x.kitchen_id !== recipe.kitchen_id);
  }
  function fmtPies(p) { return p ? (p.lo === p.hi ? String(p.lo) : `${p.lo}–${p.hi}`) : ""; }
  function multLabel(f) { return String(Number((f || 1).toFixed(2))); }
  function scaledYield(f) {
    if (!String(recipe.yield_qty || "").trim()) return "";
    const s = K.scaledAmount(recipe.yield_qty, f, recipe.yield_unit);
    return `${s.text} ${recipe.yield_unit || ""}`.trim();
  }
  function batchSummary(f) {
    if (recipe.kind === "dough") {
      const total = (scale.balls || 0) * (scale.weight || 0);
      return `${scale.balls || "?"} balls × ${scale.weight || "?"} g = ${K.formatNumber(total, "g")} g`;
    }
    const y = scaledYield(f);
    return `${f === 1 ? "1 batch" : "×" + multLabel(f) + " batch"}${y ? " — makes " + y : ""}`;
  }
  function writtenBatch() {
    if (recipe.kind === "dough") return `${recipe.yield_qty || "?"} balls × ${recipe.ball_weight_g || "?"} g`;
    return `${recipe.yield_qty || "1 batch"} ${recipe.yield_unit || ""}`.trim();
  }

  // Each ingredient line scaled, with a hold-back split when one is set.
  function ingredientRows(f) {
    const stats = recipe.kind === "dough" ? K.doughStats(recipe.ingredients) : null;
    return (recipe.ingredients || []).map(ing => {
      const amt = K.scaledAmount(ing.amount, f, ing.unit);
      let split = "";
      const pct = Number(ing.reserve_pct);
      if (pct > 0 && pct < 100 && amt.range) {
        const r = amt.range;
        const hold = { lo: r.lo * pct / 100, hi: r.hi * pct / 100 };
        const mix = { lo: r.lo - hold.lo, hi: r.hi - hold.hi };
        split = `Mix ${K.formatRange(mix, ing.unit)} ${ing.unit || ""} · hold back ${K.formatRange(hold, ing.unit)} ${ing.unit || ""} (${pct}%)`.replace(/\s+/g, " ");
      }
      const bp = stats && stats.pct.has(ing) ? stats.pct.get(ing) : null;
      return {
        ing, amount: amt.text, unit: amt.text ? (ing.unit || "") : "", fixed: amt.fixed && !!amt.text,
        split, bakers: bp === null ? "" : (bp >= 10 ? bp.toFixed(1) : bp >= 1 ? bp.toFixed(2) : bp.toFixed(2)) + "%",
      };
    });
  }

  // ---------- view ----------
  function renderView() {
    const f = factor();
    const r = recipe;
    const isDough = r.kind === "dough";
    $("title").textContent = K.recipeTitle(r) || "Kitchen Recipe";
    document.title = (K.recipeTitle(r) || "Kitchen Recipe") + " — Kitchen";

    const sib = siblings();
    const head = `<div class="card k-head">
      <div class="meta-row">
        <span class="category-pill">${esc(K.kindLabel(r.kind))}</span>
        ${r.status === "archived" ? `<span class="k-status k-status-archived">Archived</span>` : ""}
        ${r.family ? `<span class="muted">${esc(r.family)}</span>` : ""}
      </div>
      ${sib.length ? `<div class="k-versions">Other versions: ${sib.map(s =>
        `<a href="kitchen-recipe.html?id=${encodeURIComponent(s.kitchen_id)}">${esc(s.variant || s.name)}</a>`).join(" · ")}</div>` : ""}
    </div>`;

    let scaler;
    if (isDough) {
      const weights = Array.from(new Set([200, 470, Number(r.ball_weight_g) || 0].filter(Boolean)));
      scaler = `<div class="card k-scaler">
        <h2>How much dough?</h2>
        <div class="k-scale-row">
          <div class="k-stepper"><label for="s-balls">Dough balls</label>
            <div class="k-step"><button type="button" class="secondary" data-step="balls" data-d="-1" aria-label="Fewer balls">−</button>
            <input type="number" id="s-balls" min="1" step="1" inputmode="numeric" value="${esc(scale.balls || "")}">
            <button type="button" class="secondary" data-step="balls" data-d="1" aria-label="More balls">+</button></div></div>
          <div class="k-stepper"><label for="s-weight">Ball weight (g)</label>
            <input type="number" id="s-weight" min="1" step="5" inputmode="numeric" value="${esc(scale.weight || "")}">
            <div class="k-chips">${weights.map(w => `<button type="button" class="k-chip${Number(scale.weight) === w ? " on" : ""}" data-weight="${w}">${w} g</button>`).join("")}</div></div>
        </div>
        <p class="k-scale-out">${esc(batchSummary(f))}${Math.abs(f - 1) > 1e-9 ? ` <span class="muted">(×${esc(multLabel(f))} the written ${esc(writtenBatch())})</span>` : ""}</p>
      </div>`;
    } else {
      const p9 = K.piesFrom(r, f, 9), p14 = K.piesFrom(r, f, 14);
      const canPlan = K.piesFrom(r, 1, 9) !== null;
      scaler = `<div class="card k-scaler">
        <h2>How much?</h2>
        <div class="k-scale-row">
          <div class="k-stepper"><label for="s-mult">Batches</label>
            <div class="k-step"><button type="button" class="secondary" data-step="mult" data-d="-0.5" aria-label="Half a batch less">−</button>
            <input type="number" id="s-mult" min="0.25" step="0.25" inputmode="decimal" value="${esc(scale.mult)}">
            <button type="button" class="secondary" data-step="mult" data-d="0.5" aria-label="Half a batch more">+</button></div>
            <div class="k-chips">${[0.5, 1, 2, 3].map(m => `<button type="button" class="k-chip${scale.mult === m ? " on" : ""}" data-mult="${m}">${m === 0.5 ? "½" : "×" + m}</button>`).join("")}</div></div>
          ${canPlan ? `<div class="k-stepper"><label for="s-pies">Enough for</label>
            <div class="k-plan"><input type="number" id="s-pies" min="1" step="1" inputmode="numeric" placeholder="pies">
            <select id="s-size"><option value="9">9″ pies</option><option value="14">14″ pies</option></select></div></div>` : ""}
        </div>
        <p class="k-scale-out">${esc(batchSummary(f))}${p9 ? `<br><span class="muted">Covers about ${fmtPies(p9)} nine-inch${p14 ? ` or ${fmtPies(p14)} fourteen-inch` : ""} pies</span>` : ""}</p>
      </div>`;
    }

    let stats;
    if (isDough) {
      const st = K.doughStats(r.ingredients);
      stats = `<div class="stat-hero">
        <div class="stat"><div class="stat-label">Hydration</div><div class="stat-value">${st && st.hydration !== null ? st.hydration.toFixed(1) + "%" : "—"}</div><div class="stat-sub">water ÷ flour</div></div>
        <div class="stat"><div class="stat-label">Salt</div><div class="stat-value">${st && st.salt !== null ? st.salt.toFixed(1) + "%" : "—"}</div><div class="stat-sub">of flour</div></div>
        <div class="stat"><div class="stat-label">Total dough</div><div class="stat-value">${st ? K.formatNumber(st.total * f, "g") : "—"}</div><div class="stat-sub">grams</div></div>
      </div>`;
    } else {
      const p14 = K.portion14Text(r);
      stats = `<div class="stat-hero">
        <div class="stat"><div class="stat-label">Makes</div><div class="stat-value k-stat-sm">${esc(scaledYield(f) || "—")}</div><div class="stat-sub">${f === 1 ? "one batch" : "×" + esc(multLabel(f))}</div></div>
        <div class="stat"><div class="stat-label">Per 9″ pie</div><div class="stat-value k-stat-sm">${String(r.portion_9 || "").trim() ? esc(r.portion_9 + " " + (r.portion_unit || "")) : "—"}</div><div class="stat-sub">portion</div></div>
        <div class="stat"><div class="stat-label">Per 14″ pie</div><div class="stat-value k-stat-sm">${p14.text ? esc(p14.text + " " + (r.portion_unit || "")) : "—"}</div><div class="stat-sub">${p14.computed ? "9″ × 2.4 (by area)" : "portion"}</div></div>
      </div>`;
    }

    const info = [
      r.bake_temp || r.bake_time ? `<div><span class="k-info-label">${isDough ? "Bake" : "Cook"}</span> ${esc([r.bake_temp, r.bake_time].filter(Boolean).join(" · "))}</div>` : "",
      r.holding ? `<div><span class="k-info-label">Holding</span> ${esc(r.holding)}</div>` : "",
    ].join("");

    const rows = ingredientRows(f);
    let lastSection = null;
    const ingHTML = rows.length ? `<table class="k-ings"><tbody>${rows.map(row => {
      let sec = "";
      const s = String(row.ing.section || "").trim();
      if (s && s !== lastSection) sec = `<tr class="k-sec"><td colspan="3">${esc(s)}</td></tr>`;
      lastSection = s || lastSection;
      return `${sec}<tr>
        <td class="k-amt">${row.amount ? `<strong>${esc(row.amount)}</strong> ${esc(row.unit)}` : ""}${row.fixed && Math.abs(f - 1) > 1e-9 ? `<div class="k-fixed">as written</div>` : ""}</td>
        <td class="k-ing">${esc(row.ing.name)}${row.ing.notes ? `<div class="k-note">${esc(row.ing.notes)}</div>` : ""}${row.split ? `<div class="k-split">${esc(row.split)}</div>` : ""}</td>
        <td class="k-pct">${esc(row.bakers)}</td>
      </tr>`;
    }).join("")}</tbody></table>` : `<p class="muted">No ingredients yet — tap Edit to add them.</p>`;

    const steps = K.methodSteps(r.method);
    const methodHTML = steps.length ? `<ol class="k-steps">${steps.map(s =>
      `<li>${s.title ? `<strong>${esc(s.title)}.</strong> ` : ""}${esc(s.body)}</li>`).join("")}</ol>` : `<p class="muted">No method yet.</p>`;

    const uses = usedIn();
    viewEl.innerHTML = `${head}${scaler}${stats}
      ${info ? `<div class="card k-info">${info}</div>` : ""}
      <div class="card"><h2>Ingredients${Math.abs(f - 1) > 1e-9 ? ` <span class="muted">scaled ×${esc(multLabel(f))}</span>` : ""}</h2>${ingHTML}</div>
      <div class="card"><h2>Method</h2>${methodHTML}</div>
      ${r.notes ? `<div class="card"><h2>Notes</h2><div class="k-notes">${esc(r.notes)}</div></div>` : ""}
      <div class="card"><h2>Pizzas using this</h2>${uses.length ? `<ul class="k-uses">${uses.map(b =>
        `<li><a href="pizza.html?id=${encodeURIComponent(b.build_id)}">${esc(b.name)}</a> <span class="k-status k-status-${esc(b.status || "idea")}">${esc(K.statusLabel(b.status || "idea"))}</span></li>`).join("")}</ul>`
        : `<p class="muted">Not on any pizza yet.</p>`}</div>
      <p class="muted k-meta">Version ${esc(r.version || 1)} · updated ${esc(r.updated_date || "—")}${r.source ? " · Source: " + esc(r.source) : ""}</p>`;

    wireScaler();
    renderPrint(f);
  }

  function wireScaler() {
    const rerender = () => { saveScale(); renderView(); };
    viewEl.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
      const key = b.dataset.step, d = Number(b.dataset.d);
      if (key === "balls") scale.balls = Math.max(1, (Number(scale.balls) || 0) + d);
      else scale.mult = Math.max(0.25, Math.round(((Number(scale.mult) || 1) + d) * 4) / 4);
      rerender();
    }));
    viewEl.querySelectorAll("[data-weight]").forEach(b => b.addEventListener("click", () => { scale.weight = Number(b.dataset.weight); rerender(); }));
    viewEl.querySelectorAll("[data-mult]").forEach(b => b.addEventListener("click", () => { scale.mult = Number(b.dataset.mult); rerender(); }));
    const onNum = (elId, key, min) => {
      const el = $(elId);
      if (!el) return;
      el.addEventListener("change", () => {
        const v = Number(el.value);
        if (v >= min) { scale[key] = v; rerender(); } else el.value = scale[key] || "";
      });
    };
    onNum("s-balls", "balls", 1);
    onNum("s-weight", "weight", 1);
    onNum("s-mult", "mult", 0.05);
    const pies = $("s-pies"), size = $("s-size");
    if (pies) {
      const plan = () => {
        const m = K.factorForPies(recipe, Number(pies.value), Number(size.value));
        if (m) { scale.mult = m; saveScale(); const keep = { p: pies.value, s: size.value }; renderView(); $("s-pies").value = keep.p; $("s-size").value = keep.s; }
      };
      pies.addEventListener("change", plan);
      size.addEventListener("change", plan);
    }
  }

  // ---------- print sheet ----------
  function renderPrint(f) {
    const r = recipe;
    const isDough = r.kind === "dough";
    const strip = [];
    strip.push(["Batch", batchSummary(f)]);
    if (isDough) {
      const st = K.doughStats(r.ingredients);
      if (st) strip.push(["Formula", [st.hydration !== null ? st.hydration.toFixed(1) + "% hydration" : "", st.salt !== null ? st.salt.toFixed(1) + "% salt" : ""].filter(Boolean).join(" · ")]);
    } else {
      const p14 = K.portion14Text(r);
      const parts = [];
      if (String(r.portion_9 || "").trim()) parts.push(`${r.portion_9} ${r.portion_unit || ""} per 9″`);
      if (p14.text) parts.push(`${p14.text} ${r.portion_unit || ""} per 14″`);
      if (parts.length) strip.push(["Portion", parts.join(" · ").replace(/\s+/g, " ")]);
      const p9 = K.piesFrom(r, f, 9), p14n = K.piesFrom(r, f, 14);
      if (p9) strip.push(["Covers", `${fmtPies(p9)} × 9″${p14n ? ` or ${fmtPies(p14n)} × 14″` : ""}`]);
    }
    if (r.bake_temp || r.bake_time) strip.push([isDough ? "Bake" : "Cook", [r.bake_temp, r.bake_time].filter(Boolean).join(" · ")]);

    const rows = ingredientRows(f);
    let lastSection = null;
    const ings = rows.map(row => {
      let sec = "";
      const s = String(row.ing.section || "").trim();
      if (s && s !== lastSection) sec = `<tr class="ps-sec"><td></td><td colspan="2">${esc(s)}</td></tr>`;
      lastSection = s || lastSection;
      return `${sec}<tr>
        <td class="ps-box"><span></span></td>
        <td class="ps-amt">${row.amount ? `<strong>${esc(row.amount)}</strong> ${esc(row.unit)}` : ""}</td>
        <td class="ps-ing">${esc(row.ing.name)}${row.ing.notes ? ` <span class="ps-note">— ${esc(row.ing.notes)}</span>` : ""}${row.split ? `<div class="ps-split">${esc(row.split)}</div>` : ""}</td>
        ${isDough ? `<td class="ps-pct">${esc(row.bakers)}</td>` : ""}
      </tr>`;
    }).join("");

    const steps = K.methodSteps(r.method);
    const scaledNote = Math.abs(f - 1) > 1e-9 ? ` · Scaled ×${multLabel(f)} from the written ${writtenBatch()}` : "";
    printEl.innerHTML = `<article class="ps">
      <header class="ps-head">
        <div class="ps-brand">Sturgeon Spirits · Kitchen · ${esc(K.kindLabel(r.kind))}</div>
        <h1>${esc(r.name || "")}</h1>
        ${r.variant ? `<div class="ps-variant">${esc(r.variant)}</div>` : ""}
      </header>
      <dl class="ps-strip">${strip.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${r.holding ? `<p class="ps-hold"><strong>Holding:</strong> ${esc(r.holding)}</p>` : ""}
      <table class="ps-ings"><tbody>${ings}</tbody></table>
      ${steps.length ? `<section class="ps-method"><h2>Method</h2><ol>${steps.map(s => `<li>${s.title ? `<strong>${esc(s.title)}.</strong> ` : ""}${esc(s.body)}</li>`).join("")}</ol></section>` : ""}
      ${r.notes ? `<section class="ps-notes"><h2>Notes</h2><p>${esc(r.notes)}</p></section>` : ""}
      <section class="ps-lines"><h2>Changes for next time</h2></section>
      <footer class="ps-foot">Version ${esc(r.version || 1)} · updated ${esc(r.updated_date || "—")} · printed ${esc(K.todayISO())}${esc(scaledNote)}</footer>
    </article>`;
    fitNoteLines();
  }

  // Draw only as many "changes for next time" lines as fit in the space left
  // on the last page, so the sheet doesn't spill onto a page of blank lines.
  // Measured off-screen at the printable width of a letter page (7.5 × 10 in
  // inside the 0.5 in margins); the footer prints at the bottom of every page,
  // so it's left out of the flow here.
  function fitNoteLines() {
    const art = printEl.querySelector(".ps");
    const lines = printEl.querySelector(".ps-lines");
    const foot = printEl.querySelector(".ps-foot");
    if (!art || !lines) return;
    const PX_PER_IN = 96, PAGE = 10 * PX_PER_IN, FOOT = 0.35 * PX_PER_IN;
    const LINE = 17 * PX_PER_IN / 72, HEAD = 26;
    printEl.style.cssText = "display:block;position:absolute;left:-10000px;top:0;width:7.5in;visibility:hidden";
    lines.style.display = "none";
    if (foot) foot.style.display = "none";
    const h = art.getBoundingClientRect().height;
    printEl.style.cssText = "";
    lines.style.display = "";
    if (foot) foot.style.display = "";
    const left = PAGE - FOOT - (h % PAGE);
    const n = Math.min(4, Math.floor((left - HEAD) / LINE));
    if (n >= 2) lines.insertAdjacentHTML("beforeend", "<div></div>".repeat(n));
    else lines.remove();
  }

  // ---------- editor ----------
  function fillKindOptions() {
    $("f-kind").innerHTML = K.KINDS.map(k => `<option value="${k.id}">${esc(k.label)}</option>`).join("");
    const fams = Array.from(new Set(data.recipes.map(r => r.family).filter(Boolean))).sort();
    $("family-options").innerHTML = fams.map(f => `<option value="${esc(f)}">`).join("");
  }
  const FIELDS = {
    "f-name": "name", "f-kind": "kind", "f-status": "status", "f-family": "family", "f-variant": "variant",
    "f-yield-qty": "yield_qty", "f-yield-unit": "yield_unit", "f-ball-weight": "ball_weight_g",
    "f-portion-9": "portion_9", "f-portion-14": "portion_14", "f-portion-unit": "portion_unit",
    "f-bake-temp": "bake_temp", "f-bake-time": "bake_time", "f-holding": "holding", "f-source": "source",
    "f-method": "method", "f-notes": "notes",
  };
  function openEditor() {
    draft = JSON.parse(JSON.stringify(recipe));
    draft.ingredients = (draft.ingredients || []).map(i => ({
      section: i.section || "", name: i.name || "", amount: i.amount ?? "", unit: i.unit || "",
      reserve_pct: i.reserve_pct ?? "", notes: i.notes || "",
    }));
    Object.entries(FIELDS).forEach(([elId, key]) => { $(elId).value = draft[key] ?? ""; });
    if (!$("f-kind").value) $("f-kind").value = "sauce";
    if (!$("f-status").value) $("f-status").value = "active";
    toggleDough();
    renderIngRows();
    $("delete-section").hidden = !recipe.kitchen_id;
    const uses = usedIn();
    $("delete-hint").textContent = uses.length
      ? `Permanently removes this recipe and its ingredients. It's used on ${uses.length} pizza${uses.length === 1 ? "" : "s"} (${uses.map(b => b.name).join(", ")}); those will show it as missing.`
      : "Permanently removes this recipe and its ingredients.";
    dirty = false;
  }
  function toggleDough() {
    editEl.classList.toggle("is-dough", $("f-kind").value === "dough");
  }
  function renderIngRows() {
    const body = $("ing-body");
    if (!draft.ingredients.length) {
      body.innerHTML = `<p class="muted">No ingredients yet.</p>`;
      return;
    }
    const n = draft.ingredients.length;
    body.innerHTML = draft.ingredients.map((ing, i) => `<div class="k-ing-card" data-i="${i}">
      <div class="k-ing-top">
        <input type="text" data-f="name" value="${esc(ing.name)}" placeholder="Ingredient" aria-label="Ingredient name">
        <div class="k-row-btns">
          <button type="button" class="ghost" data-move="-1" aria-label="Move up"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="ghost" data-move="1" aria-label="Move down"${i === n - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="btn-remove" data-remove aria-label="Remove ingredient">×</button>
        </div>
      </div>
      <div class="k-ing-grid">
        <div class="mini"><label>Amount</label><input type="text" data-f="amount" value="${esc(ing.amount)}" inputmode="decimal"></div>
        <div class="mini"><label>Unit</label><input type="text" data-f="unit" value="${esc(ing.unit)}" list="unit-options"></div>
        <div class="mini dough-only"><label>Hold back %</label><input type="number" step="any" data-f="reserve_pct" value="${esc(ing.reserve_pct)}" inputmode="decimal"></div>
        <div class="mini"><label>Section</label><input type="text" data-f="section" value="${esc(ing.section)}"></div>
        <div class="mini k-span"><label>Notes</label><input type="text" data-f="notes" value="${esc(ing.notes)}"></div>
      </div>
    </div>`).join("") + `<datalist id="unit-options">${["g", "kg", "oz", "lb", "tsp", "tbsp", "cup", "fl oz", "mL", "L", "can (28 oz)", "clove", "pinch", "sprig", "strip", "each"].map(u => `<option value="${esc(u)}">`).join("")}</datalist>`;
  }
  $("ing-body").addEventListener("input", e => {
    const card = e.target.closest("[data-i]");
    if (!card || !e.target.dataset.f) return;
    draft.ingredients[Number(card.dataset.i)][e.target.dataset.f] = e.target.value;
    dirty = true;
  });
  $("ing-body").addEventListener("click", e => {
    const card = e.target.closest("[data-i]");
    if (!card) return;
    const i = Number(card.dataset.i);
    if (e.target.closest("[data-remove]")) { draft.ingredients.splice(i, 1); dirty = true; renderIngRows(); }
    const mv = e.target.closest("[data-move]");
    if (mv) {
      const j = i + Number(mv.dataset.move);
      if (j < 0 || j >= draft.ingredients.length) return;
      [draft.ingredients[i], draft.ingredients[j]] = [draft.ingredients[j], draft.ingredients[i]];
      dirty = true;
      renderIngRows();
    }
  });
  $("add-ing").addEventListener("click", () => {
    const last = draft.ingredients[draft.ingredients.length - 1];
    draft.ingredients.push({ section: last ? last.section : "", name: "", amount: "", unit: "", reserve_pct: "", notes: "" });
    dirty = true;
    renderIngRows();
    const cards = $("ing-body").querySelectorAll("[data-i]");
    cards[cards.length - 1].querySelector('[data-f="name"]').focus();
  });
  Object.keys(FIELDS).forEach(elId => $(elId).addEventListener("input", () => { dirty = true; }));
  $("f-kind").addEventListener("change", toggleDough);

  async function save() {
    const name = $("f-name").value.trim();
    if (!name) { alert("Give the recipe a name first."); $("f-name").focus(); return; }
    if (window.API.demoMode) { alert("Demo mode — configure the API URL to save."); return; }
    const out = { kitchen_id: recipe.kitchen_id || K.newId("k", name) };
    Object.entries(FIELDS).forEach(([elId, key]) => { out[key] = $(elId).value.trim(); });
    if (out.kind !== "dough") out.ball_weight_g = out.ball_weight_g || "";
    const ingredients = draft.ingredients
      .map(i => ({ section: String(i.section).trim(), name: String(i.name).trim(), amount: String(i.amount).trim(),
        unit: String(i.unit).trim(), reserve_pct: String(i.reserve_pct).trim(), notes: String(i.notes).trim() }))
      .filter(i => i.name || i.amount);
    const btn = $("save-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await window.API.saveKitchenRecipe(out, ingredients);
      if (!res || res.error) throw new Error((res && res.error) || "no response");
      data = await window.API.getKitchen();
      recipe = data.recipes.find(r => r.kitchen_id === out.kitchen_id) ||
        Object.assign(out, { ingredients, version: res.version, updated_date: res.updated_date });
      dirty = false;
      if (!id) history.replaceState(null, "", "kitchen-recipe.html?id=" + encodeURIComponent(recipe.kitchen_id));
      resetScale();
      setMode("view");
      K.toast(`Saved — version ${res.version}`);
    } catch (err) {
      alert("Could not save: " + err.message);
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }

  // ---------- delete ----------
  $("delete-btn").addEventListener("click", () => {
    $("delete-name").textContent = K.recipeTitle(recipe);
    $("delete-confirm").style.display = "block";
  });
  $("delete-cancel").addEventListener("click", () => { $("delete-confirm").style.display = "none"; });
  $("delete-yes").addEventListener("click", async () => {
    if (window.API.demoMode) { alert("Demo mode — configure the API URL to delete."); return; }
    $("delete-yes").disabled = true;
    try {
      const res = await window.API.deleteKitchenRecipe(recipe.kitchen_id);
      if (!res || res.error) throw new Error((res && res.error) || "no response");
      dirty = false;
      location.href = "kitchen.html";
    } catch (err) {
      alert("Could not delete: " + err.message);
      $("delete-yes").disabled = false;
    }
  });

  // ---------- mode ----------
  function setMode(m) {
    mode = m;
    viewEl.hidden = m !== "view";
    editEl.hidden = m !== "edit";
    if (m === "view") {
      bar.innerHTML = `<button id="print-btn">Print</button><button class="secondary" id="edit-btn">Edit</button>`;
      $("print-btn").addEventListener("click", () => window.print());
      $("edit-btn").addEventListener("click", () => setMode("edit"));
      renderView();
    } else {
      $("title").textContent = recipe.kitchen_id ? "Edit: " + K.recipeTitle(recipe) : "New component";
      bar.innerHTML = `<button class="secondary" id="cancel-btn">Cancel</button><button id="save-btn">Save</button>`;
      $("cancel-btn").addEventListener("click", () => {
        if (dirty && !confirm("Discard your changes?")) return;
        dirty = false;
        if (!recipe.kitchen_id) { location.href = "kitchen.html"; return; }
        setMode("view");
      });
      $("save-btn").addEventListener("click", save);
      openEditor();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  fillKindOptions();
  resetScale();
  setMode(mode);
})();
