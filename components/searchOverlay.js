/* ==========================================================================
   Component: Search Overlay
   Searches lesson titles only (not resources, PDFs, notes, calculators,
   lab values) per spec. Renders once into the DOM and is toggled open/closed.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { qs, on } = MP.dom;

  function resultRow({ section, subsection, lesson }) {
    return `
      <button class="search-result-row" data-action="open-lesson" data-lesson="${lesson.id}">
        ${icon("search", { size: 15, className: "search-result-icon" })}
        <span class="search-result-text">
          <span class="search-result-title">${lesson.title}</span>
          <span class="search-result-path">${subsection.title} · ${section.title}</span>
        </span>
        ${icon("chevronRight", { size: 15, className: "search-result-arrow" })}
      </button>`;
  }

  function renderResults(query) {
    const all = MP.data.allLessonsFlat();
    const q = query.trim().toLowerCase();
    const matches = q ? all.filter((r) => r.lesson.title.toLowerCase().includes(q)) : [];

    if (!q) {
      return `<p class="search-empty">Start typing to search lesson titles.</p>`;
    }
    if (!matches.length) {
      return `<p class="search-empty">No lessons match “${query}”.</p>`;
    }
    return `<div class="search-results">${matches.map(resultRow).join("")}</div>`;
  }

  function markup() {
    return `
      <div class="search-overlay" data-search-overlay>
        <div class="search-overlay-backdrop" data-action="close-search"></div>
        <div class="search-overlay-sheet">
          <div class="search-field search-field-open">
            ${icon("search", { size: 17, strokeWidth: 2.2, className: "icon" })}
            <input type="text" class="search-input" placeholder="Search lesson titles…" data-search-input autocomplete="off" />
            <button class="search-cancel" data-action="close-search">Cancel</button>
          </div>
          <p class="search-heading">Results</p>
          <div data-search-results>${renderResults("")}</div>
        </div>
      </div>`;
  }

  function mount(root) {
    root.insertAdjacentHTML("beforeend", markup());
    const overlay = qs("[data-search-overlay]", root);
    const input = qs("[data-search-input]", overlay);
    const resultsBox = qs("[data-search-results]", overlay);

    on(overlay, "input", "[data-search-input]", () => {
      resultsBox.innerHTML = renderResults(input.value);
    });

    on(overlay, "click", '[data-action="close-search"]', () => close());
    on(overlay, "click", '[data-action="open-lesson"]', (_e, target) => {
      close();
      MP.router.push(`/lesson/${target.dataset.lesson}`);
    });

    function open() {
      overlay.classList.add("is-open");
      input.value = "";
      resultsBox.innerHTML = renderResults("");
      setTimeout(() => input.focus(), 260);
    }
    function close() {
      overlay.classList.remove("is-open");
    }

    return { open, close };
  }

  MP.components = MP.components || {};
  MP.components.searchOverlay = { mount };
})(window.MP = window.MP || {});
