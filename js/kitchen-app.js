// v1.23.0 (2026-11-02): Kitchen list page — components (doughs, sauces & bases,
// toppings & finishes) and pizza creations, plus the one-time starter import
// of the recipes transcribed from the kitchen PDFs. Full history: CHANGELOG.md
(async function () {
  const K = window.KITCHEN;
  const esc = K.escapeHTML;
  const listEl = document.getElementById("list");
  const search = document.getElementById("search");
  const showAll = document.getElementById("show-all");
  const showAllText = document.getElementById("show-all-text");
  const newBtn = document.getElementById("new-btn");
  const countEl = document.getElementById("result-count");
  const tabs = Array.from(document.querySelectorAll(".seg [data-tab]"));

  if (window.API.demoMode) document.getElementById("demo-banner").style.display = "block";

  let data = { recipes: [], builds: [] };
  let tab = location.hash === "#pizzas" ? "pizzas" : "components";

  async function load() {
    try {
      data = await window.API.getKitchen();
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state">Could not load the kitchen: ${esc(err.message)}</div>`;
      return false;
    }
    return true;
  }

  function recipesById() {
    const m = {};
    data.recipes.forEach(r => { m[r.kitchen_id] = r; });
    return m;
  }

  function usedIn(id) {
    return data.builds.filter(b => b.dough_9 === id || b.dough_14 === id ||
      (b.layers || []).some(l => l.component_id === id));
  }

  function matches(q, ...fields) {
    if (!q) return true;
    return fields.some(f => String(f || "").toLowerCase().includes(q));
  }

  function componentCard(r) {
    const meta = [];
    const stats = [];
    if (r.kind === "dough") {
      const n = String(r.yield_qty || "").trim();
      if (n) meta.push(`${esc(n)} ${esc(r.yield_unit || "balls")}${r.ball_weight_g ? " × " + esc(r.ball_weight_g) + " g" : ""}`);
      const st = K.doughStats(r.ingredients);
      if (st && st.hydration !== null) stats.push(`${st.hydration.toFixed(0)}% hydration`);
    } else {
      if (String(r.yield_qty || "").trim()) meta.push(`Makes ${esc(r.yield_qty)} ${esc(r.yield_unit || "")}`.trim());
      if (String(r.portion_9 || "").trim()) stats.push(`${esc(r.portion_9)} ${esc(r.portion_unit || "")} per 9″`.replace(/\s+per/, " per"));
      const pies = K.piesFrom(r, 1, 9);
      if (pies) stats.push(`${pies.lo === pies.hi ? pies.lo : pies.lo + "–" + pies.hi} nine-inch pies`);
    }
    const uses = usedIn(r.kitchen_id).length;
    stats.push(uses ? `in ${uses} pizza${uses === 1 ? "" : "s"}` : `<span class="tag-empty">not on a pizza yet</span>`);
    if (r.version) stats.push(`v${esc(r.version)}`);
    return `<a class="recipe-card" href="kitchen-recipe.html?id=${encodeURIComponent(r.kitchen_id)}">
      <div class="name"><span>${esc(r.name)}${r.variant ? ` <span class="k-variant">${esc(r.variant)}</span>` : ""}</span>
        ${r.status === "archived" ? `<span class="k-status k-status-archived">Archived</span>` : ""}</div>
      <div class="meta-row"><span class="category-pill">${esc(K.kindLabel(r.kind))}</span>${meta.map(m => `<span>${m}</span>`).join("")}</div>
      <div class="ttb-row">${stats.map(s => `<span>${s}</span>`).join("")}</div>
    </a>`;
  }

  function pizzaCard(b, byId) {
    const base = (b.layers || []).filter(l => l.layer === "base").map(l => K.layerName(l, byId)).filter(Boolean);
    const sizes = K.buildSizes(b).map(s => s + "″").join(" · ");
    const toppings = (b.layers || []).filter(l => l.layer === "topping" || l.layer === "cheese")
      .map(l => K.layerName(l, byId)).filter(Boolean);
    return `<a class="recipe-card" href="pizza.html?id=${encodeURIComponent(b.build_id)}">
      <div class="name"><span>${esc(b.name)}</span><span class="k-status k-status-${esc(b.status || "idea")}">${esc(K.statusLabel(b.status || "idea"))}</span></div>
      <div class="meta-row">${base.map(x => `<span class="category-pill">${esc(x)}</span>`).join("")}<span>${esc(sizes)}</span></div>
      ${toppings.length ? `<div class="ttb-row"><span>${esc(toppings.slice(0, 5).join(", "))}${toppings.length > 5 ? "…" : ""}</span></div>` : ""}
    </a>`;
  }

  function renderComponents(q) {
    const all = data.recipes;
    const shown = all.filter(r => (showAll.checked || r.status !== "archived") &&
      matches(q, r.name, r.variant, r.family, r.notes, K.kindLabel(r.kind)));
    countEl.textContent = `${shown.length} of ${all.length} components`;
    if (!shown.length) {
      listEl.innerHTML = `<div class="empty-state">No components match. Try clearing the search${showAll.checked ? "" : " or showing archived ones"}.</div>`;
      return;
    }
    listEl.innerHTML = K.GROUPS.map(g => {
      const items = shown.filter(r => K.kindGroup(r.kind) === g.id)
        .sort((a, b) => String(a.family || a.name).localeCompare(String(b.family || b.name)) || K.byName(a, b));
      if (!items.length) return "";
      return `<h2 class="k-group">${esc(g.label)} <span class="muted">(${items.length})</span></h2>
        <div class="recipe-list">${items.map(componentCard).join("")}</div>`;
    }).join("");
  }

  function renderPizzas(q) {
    const byId = recipesById();
    const all = data.builds;
    const shown = all.filter(b => (showAll.checked || b.status !== "retired") &&
      matches(q, b.name, b.description, b.notes, ...(b.layers || []).map(l => K.layerName(l, byId))));
    countEl.textContent = `${shown.length} of ${all.length} pizzas`;
    if (!all.length) {
      listEl.innerHTML = `<div class="empty-state">No pizzas yet. Tap “+ New pizza” to build one from your sauces and toppings.</div>`;
      return;
    }
    if (!shown.length) {
      listEl.innerHTML = `<div class="empty-state">No pizzas match. Try clearing the search${showAll.checked ? "" : " or showing retired ones"}.</div>`;
      return;
    }
    listEl.innerHTML = K.BUILD_STATUS.map(s => {
      const items = shown.filter(b => (b.status || "idea") === s.id).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      if (!items.length) return "";
      return `<h2 class="k-group">${esc(s.label)} <span class="muted">(${items.length})</span></h2>
        <div class="recipe-list">${items.map(b => pizzaCard(b, byId)).join("")}</div>`;
    }).join("");
  }

  async function renderImportOffer() {
    let seed = null;
    try {
      const res = await fetch("data/kitchen_seed.json", { cache: "no-store" });
      if (res.ok) seed = await res.json();
    } catch (_) { /* no seed file deployed — plain empty state */ }
    if (!seed) {
      listEl.innerHTML = `<div class="empty-state">Nothing in the kitchen yet. Tap “+ New component” to add a dough or sauce.</div>`;
      return;
    }
    const counts = {};
    seed.recipes.forEach(r => { const g = K.kindGroup(r.kind); counts[g] = (counts[g] || 0) + 1; });
    const parts = K.GROUPS.filter(g => counts[g.id]).map(g => `${counts[g.id]} ${g.label.toLowerCase()}`);
    listEl.innerHTML = `<div class="card k-import">
      <h2>Start with your recipe PDFs</h2>
      <p>${esc(parts.join(", "))} and ${seed.builds.length} pizza ideas, transcribed from the printed recipe sheets, are ready to load. You can edit any of them afterward.</p>
      <button id="import-btn">Import starter recipes</button>
      <p class="hint" id="import-status"></p>
    </div>`;
    const btn = document.getElementById("import-btn");
    const status = document.getElementById("import-status");
    btn.addEventListener("click", async () => {
      if (window.API.demoMode) { alert("Demo mode — configure the API URL to import."); return; }
      btn.disabled = true;
      const total = seed.recipes.length + seed.builds.length;
      let done = 0;
      try {
        for (const r of seed.recipes) {
          status.textContent = `Saving ${done + 1} of ${total}: ${K.recipeTitle(r)}`;
          const res = await window.API.saveKitchenRecipe(stripChildren(r, "ingredients"), r.ingredients || []);
          if (!res || res.error) throw new Error((res && res.error) || "no response");
          done++;
        }
        for (const b of seed.builds) {
          status.textContent = `Saving ${done + 1} of ${total}: ${b.name}`;
          const res = await window.API.savePizzaBuild(stripChildren(b, "layers"), b.layers || []);
          if (!res || res.error) throw new Error((res && res.error) || "no response");
          done++;
        }
        status.textContent = "Done.";
        await load();
        render();
        K.toast(`Imported ${done} recipes and pizzas`);
      } catch (err) {
        status.textContent = `Stopped after ${done} of ${total}: ${err.message}. Reload the page to see what was saved.`;
        btn.disabled = false;
      }
    });
  }

  function stripChildren(obj, key) {
    const out = Object.assign({}, obj);
    delete out[key];
    return out;
  }

  function render() {
    tabs.forEach(t => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    newBtn.textContent = tab === "pizzas" ? "+ New pizza" : "+ New component";
    showAllText.textContent = tab === "pizzas" ? "Show retired" : "Show archived";
    search.placeholder = tab === "pizzas" ? "Search pizzas, sauces, toppings…" : "Search doughs, sauces, toppings…";
    if (!data.recipes.length && !data.builds.length) {
      countEl.textContent = "";
      renderImportOffer();
      return;
    }
    const q = search.value.trim().toLowerCase();
    if (tab === "pizzas") renderPizzas(q); else renderComponents(q);
  }

  tabs.forEach(t => t.addEventListener("click", () => {
    tab = t.dataset.tab;
    history.replaceState(null, "", tab === "pizzas" ? "#pizzas" : location.pathname + location.search);
    render();
  }));
  search.addEventListener("input", render);
  showAll.addEventListener("change", render);
  newBtn.addEventListener("click", () => {
    if (window.API.demoMode) { alert("Demo mode — configure the API URL to add recipes."); return; }
    location.href = tab === "pizzas" ? "pizza.html?new=1" : "kitchen-recipe.html?new=1";
  });

  if (await load()) render();
})();
