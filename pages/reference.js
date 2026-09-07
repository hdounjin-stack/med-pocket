/* ==========================================================================
   Page: Quick Reference (/lab-values)
   Replaces the old Lab Values placeholder. Mirrors the Calculators page
   structure exactly (search field + category accordions + compact rows),
   driven by js/data/reference.js — a module fully separate from the
   calculator registry and lesson data, per the project's data-isolation
   rule.

   Search here is LOCAL to this page (MP.reference.search) and never
   touches the global lesson search overlay.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header } = MP.components;
  const { on, qs } = MP.dom;

  function groupCard(group, index) {
    return `
      <div class="calc-cat card reveal" style="animation-delay:${60 + index * 45}ms" data-ref-cat="${group.id}">
        <button class="calc-cat-head" data-action="toggle-ref-category" data-category="${group.id}">
          <span class="cat-icon hue-teal calc-cat-icon">${icon(group.icon || "flask", { size: 16, strokeWidth: 2.1 })}</span>
          <span class="calc-cat-title">${group.label}</span>
          ${icon("chevronRight", { size: 15, strokeWidth: 2.4, className: "calc-cat-chevron" })}
        </button>
        <div class="calc-cat-body">
          <div class="calc-cat-body-inner">
            ${group.tests.map((t, i) => refRow(t, i)).join("")}
          </div>
        </div>
      </div>`;
  }

  function refRow(test, index) {
    return `
      <div class="ref-row" style="animation-delay:${30 + index * 25}ms">
        <div class="ref-row-main">
          <span class="ref-abbr">${test.abbr}</span>
          <span class="ref-name">${test.name}</span>
        </div>
        <p class="ref-range">${test.range}${test.si ? `<span class="ref-si"> · SI: ${test.si}</span>` : ""}</p>
        ${test.note ? `<p class="ref-note">${test.note}</p>` : ""}
      </div>`;
  }

  function render() {
    const groups = MP.reference.allGroups();
    return `
      <div class="page" data-page="reference">
        ${header({ showSearch: false })}
        <div class="page-header">
          <h1 class="page-title" style="margin-top:8px">Quick Reference</h1>
          <p class="page-subtitle">Typical adult laboratory intervals. Every lab reports its own ranges.</p>
        </div>
        <div class="search-field calc-search-field" style="cursor:text" aria-label="Search reference values">
          ${icon("search", { size: 16, strokeWidth: 2.2, className: "icon" })}
          <input type="text" class="search-input" placeholder="Search e.g. Na, K, Hb, INR, creatinine…" data-ref-search autocomplete="off" />
        </div>
        <div style="margin-top:14px" data-ref-list>
          ${groups.map((g, i) => groupCard(g, i)).join("")}
        </div>
        <p class="ref-disclaimer">General adult reference intervals for study purposes only — not diagnostic cutoffs and not a substitute for your institution's own reference ranges.</p>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function searchResultsHtml(groups) {
    if (!groups.length) return `<p class="placeholder-text">No tests match your search.</p>`;
    // flat matching list while searching — same UX as the calculators page
    return `<div class="calc-cat card is-open"><div class="calc-cat-body-inner" style="opacity:1;border-top:none">${groups
      .map((g) => g.tests.map((t, i) => refRow({ ...t, name: `${g.label} · ${t.name}` }, i)).join(""))
      .join("")}</div></div>`;
  }

  function afterRender(root) {
    on(root, "click", '[data-action="toggle-ref-category"]', (_e, target) => {
      const catEl = target.closest("[data-ref-cat]");
      const wasOpen = catEl.classList.contains("is-open");
      root.querySelectorAll("[data-ref-cat].is-open").forEach((el) => el.classList.remove("is-open"));
      if (!wasOpen) catEl.classList.add("is-open");
    });

    let t = null;
    on(root, "input", "[data-ref-search]", (_e, target) => {
      clearTimeout(t);
      t = setTimeout(() => {
        const list = qs("[data-ref-list]", root);
        const query = target.value.trim();
        list.innerHTML = query ? searchResultsHtml(MP.reference.search(query)) : MP.reference.allGroups().map((g, i) => groupCard(g, i)).join("");
      }, 200);
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.reference = { render, afterRender };
})(window.MP = window.MP || {});
