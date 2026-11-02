// v1.23.0 (2026-11-02): Pizza creation page. Shows the build for 9″ or 14″
// (amounts typed per size, else scaled by pie area, else the linked sauce's
// own portion), edits it, and prints a station card — one size or both side
// by side. Full history: CHANGELOG.md
(async function () {
  const K = window.KITCHEN;
  const esc = K.escapeHTML;
  const $ = id => document.getElementById(id);
  const viewEl = $("view"), editEl = $("edit"), bar = $("bar"), printEl = $("print-sheet");

  if (window.API.demoMode) $("demo-banner").style.display = "block";

  const id = K.param("id");
  const isNew = !!K.param("new");
  let data = { recipes: [], builds: [] };
  let build = null;
  let mode = "view";
  let draft = null;
  let dirty = false;
  let size = 9;
  let printBoth = false;

  try {
    data = await window.API.getKitchen();
  } catch (err) {
    viewEl.hidden = false;
    viewEl.innerHTML = `<div class="empty-state">Could not load: ${esc(err.message)}</div>`;
    return;
  }
  const doughs = () => data.recipes.filter(r => r.kind === "dough" && r.status !== "archived").sort(K.byName);
  if (isNew) {
    const d = doughs();
    const pick = w => (d.find(r => Number(r.ball_weight_g) === w) || {}).kitchen_id || "";
    build = { build_id: "", name: "", status: "idea", sizes: "9", dough_9: pick(200), dough_14: pick(470), layers: [] };
    mode = "edit";
  } else {
    build = data.builds.find(b => b.build_id === id);
    if (!build) {
      viewEl.hidden = false;
      viewEl.innerHTML = `<div class="empty-state">That pizza wasn't found. <a href="kitchen.html#pizzas">Back to the kitchen</a></div>`;
      return;
    }
  }
  function byId() { const m = {}; data.recipes.forEach(r => { m[r.kitchen_id] = r; }); return m; }
  try {
    const saved = Number(localStorage.getItem("kpizza-size"));
    if (saved === 9 || saved === 14) size = saved;
  } catch (_) { /* ignore */ }

  // ---------- view ----------
  function doughLine(s, map) {
    const d = map[s === 14 ? build.dough_14 : build.dough_9];
    if (!d) return null;
    return { recipe: d, text: `${K.recipeTitle(d)}${d.ball_weight_g ? " · " + d.ball_weight_g + " g ball" : ""}` };
  }
  function layerRows(s, map) {
    return K.LAYERS.map(L => ({
      layer: L,
      items: (build.layers || []).filter(l => (l.layer || "topping") === L.id).map(l => {
        const a = K.layerAmount(l, s, map);
        return { l, name: K.layerName(l, map), amount: a.text, unit: a.text ? (a.unit || "") : "", computed: a.computed,
          fromComponent: !!a.fromComponent, comp: l.component_id ? map[l.component_id] : null };
      }),
    })).filter(g => g.items.length);
  }

  function renderView() {
    const map = byId();
    const sizes = K.buildSizes(build);
    if (!sizes.includes(size)) size = sizes[0];
    $("title").textContent = build.name || "Pizza";
    document.title = (build.name || "Pizza") + " — Kitchen";

    const dough = doughLine(size, map);
    const groups = layerRows(size, map);
    const missing = (build.layers || []).filter(l => l.component_id && !map[l.component_id]);

    viewEl.innerHTML = `<div class="card k-head">
        <div class="meta-row"><span class="k-status k-status-${esc(build.status || "idea")}">${esc(K.statusLabel(build.status || "idea"))}</span>
          <span class="muted">${sizes.map(s => s + "″").join(" · ")}</span></div>
        ${build.description ? `<p class="k-desc">${esc(build.description)}</p>` : ""}
      </div>
      ${sizes.length > 1 ? `<div class="k-size-bar">
        <div class="seg" role="tablist" aria-label="Pizza size">${sizes.map(s =>
          `<button type="button" role="tab" data-size="${s}" class="${s === size ? "on" : ""}" aria-selected="${s === size}">${s}″</button>`).join("")}</div>
        <label class="alc-toggle"><input type="checkbox" id="print-both"${printBoth ? " checked" : ""}><span class="dot"></span>Print both sizes</label>
      </div>` : ""}
      ${missing.length ? `<div class="demo-banner">A component this pizza used has been deleted — edit the pizza to replace it.</div>` : ""}
      <div class="card">
        <h2>${size}″ build</h2>
        <div class="k-dough">${dough ? `<span class="k-info-label">Dough</span> <a href="kitchen-recipe.html?id=${encodeURIComponent(dough.recipe.kitchen_id)}">${esc(dough.text)}</a>`
          : `<span class="k-info-label">Dough</span> <span class="muted">not set for ${size}″</span>`}</div>
        ${groups.length ? groups.map(g => `<h3 class="k-layer-h">${esc(g.layer.label)}</h3>
          <table class="k-ings k-build"><tbody>${g.items.map(it => `<tr>
            <td class="k-amt">${it.amount ? `<strong>${esc(it.amount)}</strong> ${esc(it.unit)}` : `<span class="muted">—</span>`}
              ${it.computed ? `<div class="k-fixed">${size === 14 ? "9″ × 2.4" : "14″ ÷ 2.4"}</div>` : ""}</td>
            <td class="k-ing">${it.comp ? `<a href="kitchen-recipe.html?id=${encodeURIComponent(it.comp.kitchen_id)}">${esc(it.name)}</a>` : esc(it.name)}
              ${it.l.notes ? `<div class="k-note">${esc(it.l.notes)}</div>` : ""}</td>
          </tr>`).join("")}</tbody></table>`).join("") : `<p class="muted">Nothing on this pizza yet — tap Edit to build it.</p>`}
      </div>
      ${build.bake_notes ? `<div class="card"><h2>Bake</h2><div class="k-notes">${esc(build.bake_notes)}</div></div>` : ""}
      ${build.notes ? `<div class="card"><h2>Notes</h2><div class="k-notes">${esc(build.notes)}</div></div>` : ""}
      <p class="muted k-meta">Version ${esc(build.version || 1)} · updated ${esc(build.updated_date || "—")}</p>`;

    viewEl.querySelectorAll("[data-size]").forEach(b => b.addEventListener("click", () => {
      size = Number(b.dataset.size);
      try { localStorage.setItem("kpizza-size", String(size)); } catch (_) { /* ignore */ }
      renderView();
    }));
    const pb = $("print-both");
    if (pb) pb.addEventListener("change", () => { printBoth = pb.checked; renderPrint(); });
    renderPrint();
  }

  // ---------- print: station card ----------
  function renderPrint() {
    const map = byId();
    const sizes = K.buildSizes(build);
    const which = printBoth && sizes.length > 1 ? sizes : [size];
    const col = s => {
      const dough = doughLine(s, map);
      return `<div class="pc-col">
        <div class="pc-size">${s}″${dough ? ` · ${esc(dough.text)}` : ""}</div>
        ${layerRows(s, map).map(g => `<div class="pc-layer"><h3>${esc(g.layer.label)}</h3>
          <ul>${g.items.map(it => `<li><span class="pc-amt">${it.amount ? esc(it.amount + " " + it.unit).trim() : ""}</span>
            <span class="pc-item">${esc(it.name)}${it.l.notes ? ` <em>— ${esc(it.l.notes)}</em>` : ""}</span></li>`).join("")}</ul></div>`).join("")}
      </div>`;
    };
    printEl.innerHTML = `<article class="pc${which.length > 1 ? " pc-two" : ""}">
      <header class="pc-head">
        <div class="ps-brand">Sturgeon Spirits · Pizza station</div>
        <h1>${esc(build.name || "")}</h1>
        ${build.description ? `<p class="pc-desc">${esc(build.description)}</p>` : ""}
      </header>
      <div class="pc-cols">${which.map(col).join("")}</div>
      ${build.bake_notes ? `<div class="pc-bake"><strong>Bake:</strong> ${esc(build.bake_notes)}</div>` : ""}
      <footer class="ps-foot">Version ${esc(build.version || 1)} · updated ${esc(build.updated_date || "—")} · printed ${esc(K.todayISO())}</footer>
    </article>`;
  }

  // ---------- editor ----------
  const FIELDS = { "f-name": "name", "f-status": "status", "f-dough-9": "dough_9", "f-dough-14": "dough_14",
    "f-description": "description", "f-bake": "bake_notes", "f-notes": "notes" };
  function fillSelects() {
    $("f-status").innerHTML = K.BUILD_STATUS.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join("");
    const opts = `<option value="">— none —</option>` + doughs().map(d =>
      `<option value="${esc(d.kitchen_id)}">${esc(K.recipeTitle(d))}${d.ball_weight_g ? " (" + esc(d.ball_weight_g) + " g)" : ""}</option>`).join("");
    $("f-dough-9").innerHTML = opts;
    $("f-dough-14").innerHTML = opts;
  }
  function componentOptions(selected) {
    const items = data.recipes.filter(r => r.kind !== "dough" && (r.status !== "archived" || r.kitchen_id === selected));
    return `<option value="">— typed item —</option>` + K.GROUPS.filter(g => g.id !== "dough").map(g => {
      const list = items.filter(r => K.kindGroup(r.kind) === g.id).sort(K.byName);
      return list.length ? `<optgroup label="${esc(g.label)}">${list.map(r =>
        `<option value="${esc(r.kitchen_id)}"${r.kitchen_id === selected ? " selected" : ""}>${esc(K.recipeTitle(r))}</option>`).join("")}</optgroup>` : "";
    }).join("");
  }
  function openEditor() {
    draft = JSON.parse(JSON.stringify(build));
    draft.layers = (draft.layers || []).map(l => ({ layer: l.layer || "topping", component_id: l.component_id || "", item: l.item || "",
      amount_9: l.amount_9 ?? "", amount_14: l.amount_14 ?? "", unit: l.unit || "", notes: l.notes || "" }));
    Object.entries(FIELDS).forEach(([elId, key]) => { $(elId).value = draft[key] ?? ""; });
    if (!$("f-status").value) $("f-status").value = "idea";
    const sizes = K.buildSizes(draft);
    $("f-size-9").checked = sizes.includes(9);
    $("f-size-14").checked = sizes.includes(14);
    renderLayerRows();
    $("delete-section").hidden = !build.build_id;
    dirty = false;
  }
  function renderLayerRows() {
    const body = $("layer-body");
    if (!draft.layers.length) { body.innerHTML = `<p class="muted">Nothing on this pizza yet.</p>`; return; }
    const n = draft.layers.length;
    body.innerHTML = draft.layers.map((l, i) => `<div class="k-ing-card" data-i="${i}">
      <div class="k-ing-top">
        <select data-f="layer" aria-label="Layer">${K.LAYERS.map(L => `<option value="${L.id}"${L.id === l.layer ? " selected" : ""}>${esc(L.label)}</option>`).join("")}</select>
        <div class="k-row-btns">
          <button type="button" class="ghost" data-move="-1" aria-label="Move up"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" class="ghost" data-move="1" aria-label="Move down"${i === n - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="btn-remove" data-remove aria-label="Remove line">×</button>
        </div>
      </div>
      <div class="k-ing-grid">
        <div class="mini k-span"><label>Component</label><select data-f="component_id">${componentOptions(l.component_id)}</select></div>
        <div class="mini k-span"><label>Item</label><input type="text" data-f="item" value="${esc(l.item)}" placeholder="${l.component_id ? "blank = component name" : "e.g. Low-moisture mozzarella"}"></div>
        <div class="mini"><label>9″ amount</label><input type="text" data-f="amount_9" value="${esc(l.amount_9)}" inputmode="decimal"></div>
        <div class="mini"><label>14″ amount</label><input type="text" data-f="amount_14" value="${esc(l.amount_14)}" inputmode="decimal" placeholder="auto"></div>
        <div class="mini"><label>Unit</label><input type="text" data-f="unit" value="${esc(l.unit)}" list="layer-units"></div>
        <div class="mini k-span"><label>Notes</label><input type="text" data-f="notes" value="${esc(l.notes)}"></div>
      </div>
    </div>`).join("") + `<datalist id="layer-units">${["oz", "g", "tbsp", "tsp", "each", "slices", "pinch", "handful"].map(u => `<option value="${u}">`).join("")}</datalist>`;
  }
  $("layer-body").addEventListener("input", e => {
    const card = e.target.closest("[data-i]");
    if (!card || !e.target.dataset.f) return;
    draft.layers[Number(card.dataset.i)][e.target.dataset.f] = e.target.value;
    dirty = true;
  });
  $("layer-body").addEventListener("change", e => {
    if (e.target.dataset.f === "component_id") renderLayerRows();
  });
  $("layer-body").addEventListener("click", e => {
    const card = e.target.closest("[data-i]");
    if (!card) return;
    const i = Number(card.dataset.i);
    if (e.target.closest("[data-remove]")) { draft.layers.splice(i, 1); dirty = true; renderLayerRows(); }
    const mv = e.target.closest("[data-move]");
    if (mv) {
      const j = i + Number(mv.dataset.move);
      if (j < 0 || j >= draft.layers.length) return;
      [draft.layers[i], draft.layers[j]] = [draft.layers[j], draft.layers[i]];
      dirty = true;
      renderLayerRows();
    }
  });
  $("add-layer").addEventListener("click", () => {
    const last = draft.layers[draft.layers.length - 1];
    draft.layers.push({ layer: last ? last.layer : "base", component_id: "", item: "", amount_9: "", amount_14: "", unit: last ? last.unit : "oz", notes: "" });
    dirty = true;
    renderLayerRows();
  });
  Object.keys(FIELDS).concat(["f-size-9", "f-size-14"]).forEach(elId => $(elId).addEventListener("input", () => { dirty = true; }));

  async function save() {
    const name = $("f-name").value.trim();
    if (!name) { alert("Give the pizza a name first."); $("f-name").focus(); return; }
    const sizes = [$("f-size-9").checked ? 9 : null, $("f-size-14").checked ? 14 : null].filter(Boolean);
    if (!sizes.length) { alert("Pick at least one size."); return; }
    if (window.API.demoMode) { alert("Demo mode — configure the API URL to save."); return; }
    const out = { build_id: build.build_id || K.newId("p", name), sizes: sizes.join(",") };
    Object.entries(FIELDS).forEach(([elId, key]) => { out[key] = $(elId).value.trim(); });
    const layers = draft.layers.map(l => ({
      layer: l.layer, component_id: l.component_id, item: String(l.item).trim(), amount_9: String(l.amount_9).trim(),
      amount_14: String(l.amount_14).trim(), unit: String(l.unit).trim(), notes: String(l.notes).trim(),
    })).filter(l => l.component_id || l.item);
    const btn = $("save-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await window.API.savePizzaBuild(out, layers);
      if (!res || res.error) throw new Error((res && res.error) || "no response");
      data = await window.API.getKitchen();
      build = data.builds.find(b => b.build_id === out.build_id) ||
        Object.assign(out, { layers, version: res.version, updated_date: res.updated_date });
      dirty = false;
      if (!id) history.replaceState(null, "", "pizza.html?id=" + encodeURIComponent(build.build_id));
      setMode("view");
      K.toast(`Saved — version ${res.version}`);
    } catch (err) {
      alert("Could not save: " + err.message);
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }

  $("delete-btn").addEventListener("click", () => {
    $("delete-name").textContent = build.name;
    $("delete-confirm").style.display = "block";
  });
  $("delete-cancel").addEventListener("click", () => { $("delete-confirm").style.display = "none"; });
  $("delete-yes").addEventListener("click", async () => {
    if (window.API.demoMode) { alert("Demo mode — configure the API URL to delete."); return; }
    $("delete-yes").disabled = true;
    try {
      const res = await window.API.deletePizzaBuild(build.build_id);
      if (!res || res.error) throw new Error((res && res.error) || "no response");
      dirty = false;
      location.href = "kitchen.html#pizzas";
    } catch (err) {
      alert("Could not delete: " + err.message);
      $("delete-yes").disabled = false;
    }
  });

  function setMode(m) {
    mode = m;
    viewEl.hidden = m !== "view";
    editEl.hidden = m !== "edit";
    if (m === "view") {
      bar.innerHTML = `<button id="print-btn">Print station card</button><button class="secondary" id="edit-btn">Edit</button>`;
      $("print-btn").addEventListener("click", () => window.print());
      $("edit-btn").addEventListener("click", () => setMode("edit"));
      renderView();
    } else {
      $("title").textContent = build.build_id ? "Edit: " + build.name : "New pizza";
      bar.innerHTML = `<button class="secondary" id="cancel-btn">Cancel</button><button id="save-btn">Save</button>`;
      $("cancel-btn").addEventListener("click", () => {
        if (dirty && !confirm("Discard your changes?")) return;
        dirty = false;
        if (!build.build_id) { location.href = "kitchen.html#pizzas"; return; }
        setMode("view");
      });
      $("save-btn").addEventListener("click", save);
      openEditor();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  fillSelects();
  setMode(mode);
})();
