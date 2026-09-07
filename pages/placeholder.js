/* ==========================================================================
   Page: Placeholder (Lab Values / More)
   Each is a single beautiful demo component — not real functionality.
   Calculators graduated to its own real pages in Phase 7 (pages/calculators.js
   + pages/calculator.js) and no longer uses this module.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header } = MP.components;
  const { on } = MP.dom;

  const CONTENT = {
    "lab-values": {
      title: "Lab Values",
      iconName: "flask",
      hue: "violet",
      blurb: "A searchable reference of normal ranges will live here.",
    },
    more: {
      title: "More",
      iconName: "more",
      hue: "amber",
      blurb: "Bookmarks, profile, and settings will be grouped here.",
    },
  };

  function render(key) {
    const c = CONTENT[key];
    return `
      <div class="page" data-page="placeholder-${key}">
        ${header({ showSearch: false })}
        <div class="page-header"><h1 class="page-title" style="margin-top:8px">${c.title}</h1></div>
        <div class="placeholder-wrap reveal" style="animation-delay:60ms">
          <span class="placeholder-icon hue-${c.hue}">${icon(c.iconName, { size: 28, strokeWidth: 2 })}</span>
          <p class="placeholder-title">${c.title} is on the way</p>
          <p class="placeholder-text">${c.blurb}</p>
        </div>
        ${
          key === "more"
            ? `
        <div class="lesson-list reveal" style="animation-delay:120ms; margin-top:8px">
          <button class="settings-row card card-press" data-action="open-manage">
            <span class="settings-row-icon hue-teal">${icon("library", { size: 17, strokeWidth: 2.1 })}</span>
            <span class="settings-row-title">Manage Library</span>
            ${icon("chevronRight", { size: 17, strokeWidth: 2.2, className: "settings-row-chevron" })}
          </button>
        </div>`
            : ""
        }
      </div>`;
  }

  function afterRender(root) {
    on(root, "click", '[data-action="open-manage"]', () => MP.router.push("/manage"));
  }

  MP.pages = MP.pages || {};
  MP.pages.placeholder = { render, afterRender };
})(window.MP = window.MP || {});
