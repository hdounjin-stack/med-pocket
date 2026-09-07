/* ==========================================================================
   Page: Calculators (list)
   Category accordion generated from MP.calculators.registry.groupedByCategory().
   Search (local only, see registry.search) replaces the accordion with a
   flat matching-row list; clearing search restores the collapsed accordion.
   Expand/collapse is pure CSS class toggling — no re-render, no route change.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header, calculatorCategory, calculatorRow } = MP.components;
  const { on, qs } = MP.dom;

  function render() {
    const groups = MP.calculators.registry.groupedByCategory();
    return `
      <div class="page" data-page="calculators">
        ${header({ showSearch: false })}
        <div class="page-header">
          <h1 class="page-title" style="margin-top:8px">Calculators</h1>
          <p class="page-subtitle">Quick, auditable clinical calculators.</p>
        </div>
        <div class="search-field calc-search-field" style="cursor:text" aria-label="Search calculators">
          ${icon("search", { size: 16, strokeWidth: 2.2, className: "icon" })}
          <input type="text" class="search-input" placeholder="Search calculators…" data-calc-search autocomplete="off" />
        </div>
        <div style="margin-top:14px" data-calc-list>
          ${groups.map((g, i) => calculatorCategory(g, i)).join("") || `<p class="placeholder-text">No calculators yet.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function searchResultsHtml(results) {
    if (!results.length) return `<p class="placeholder-text">No calculators match your search.</p>`;
    return `<div class="calc-cat card is-open"><div class="calc-cat-body-inner" style="opacity:1;border-top:none">${results
      .map((c, i) => calculatorRow(c, i))
      .join("")}</div></div>`;
  }

  function afterRender(root) {
    const list = qs("[data-calc-list]", root);
    const input = qs("[data-calc-search]", root);
    const groups = MP.calculators.registry.groupedByCategory();

    on(root, "click", '[data-action="open-calculator"]', (_e, t) => {
      MP.router.push(`/calculators/${t.dataset.calculator}`);
    });

    on(root, "click", '[data-action="toggle-category"]', (_e, t) => {
      const catEl = t.closest("[data-calc-cat]");
      if (!catEl) return;
      const wasOpen = catEl.classList.contains("is-open");
      list.querySelectorAll("[data-calc-cat].is-open").forEach((el) => el.classList.remove("is-open"));
      if (!wasOpen) catEl.classList.add("is-open");
    });

    on(root, "input", "[data-calc-search]", () => {
      const q = input.value.trim();
      if (!q) {
        list.innerHTML = groups.map((g, i) => calculatorCategory(g, i)).join("") || `<p class="placeholder-text">No calculators yet.</p>`;
        return;
      }
      list.innerHTML = searchResultsHtml(MP.calculators.registry.search(q));
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.calculators = { render, afterRender };
})(window.MP = window.MP || {});
