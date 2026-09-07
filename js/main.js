/* ==========================================================================
   MedPocket — Bootstrap
   ========================================================================== */

(function (MP) {
  document.addEventListener("DOMContentLoaded", () => {
    const shell = MP.dom.qs("[data-app-shell]");
    const pageContainer = MP.dom.qs("#page-container");

    // theme
    function applyTheme(theme) {
      MP.state.setTheme(theme);
      document.documentElement.setAttribute("data-theme", theme);
      // Keep the OS status bar tinted with the app surface (see index.html).
      const meta = MP.dom.qs('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0D12" : "#F5F7F9");
    }
    applyTheme(MP.state.get().theme);

    // persistent chrome
    const nav = MP.components.bottomNav.mount(shell);
    const search = MP.components.searchOverlay.mount(shell);
    const toast = MP.components.toast.mount(shell);
    MP.toast = toast;
    const sheet = MP.components.sheet.mount(shell);
    MP.sheet = sheet;

    // global delegated actions (header is re-rendered per page, so this
    // listener lives on the stable shell element instead).
    MP.dom.on(shell, "click", '[data-action="toggle-theme"]', () => {
      applyTheme(MP.state.get().theme === "dark" ? "light" : "dark");
    });
    MP.dom.on(shell, "click", '[data-action="open-search"]', () => search.open());
    MP.dom.on(shell, "click", '[data-action="open-space-switcher"]', () => MP.studySpaceSwitcher.open());

    MP.router.init({ containerEl: pageContainer, nav, search });
  });
})(window.MP = window.MP || {});
