/* ==========================================================================
   Component: App Header
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;

  function greetingText() {
    const h = new Date().getHours();
    if (h < 5) return "Still up?";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }

  function header({ showSearch = true } = {}) {
    const dark = MP.state.get().theme === "dark";
    const space = MP.data.getCurrentSpace();
    return `
      <header class="app-header">
        <div class="header-row">
          <div class="header-title">
            <button class="eyebrow-switcher" data-action="open-space-switcher" aria-label="Switch study space">
              <span class="eyebrow">${MP.dom.escapeHtml(space.name)}</span>
              ${icon("chevronRight", { size: 11, strokeWidth: 3, className: "icon-caret-down" })}
            </button>
            <h1 class="greeting">${greetingText()}, Sam</h1>
          </div>
          <button class="theme-toggle" data-action="toggle-theme" aria-label="Toggle theme">
            <span class="theme-knob">
              ${icon("sun", { size: 12, strokeWidth: 2.4, className: "ico-sun" })}
              ${icon("moon", { size: 12, strokeWidth: 2.4, className: "ico-moon" })}
            </span>
          </button>
        </div>
        ${showSearch ? `
        <button class="search-field" data-action="open-search" aria-label="Open search">
          ${icon("search", { size: 16, strokeWidth: 2.2, className: "icon" })}
          <span class="search-placeholder">Search lessons…</span>
        </button>` : ""}
      </header>`;
  }

  MP.components = MP.components || {};
  MP.components.header = header;
})(window.MP = window.MP || {});
