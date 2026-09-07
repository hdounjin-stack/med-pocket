/* ==========================================================================
   Component: Bottom Navigation
   Tabs: Home, Library, Calculators, Lab Values, More.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { qs, qsa, on } = MP.dom;

  const TABS = [
    { id: "home", label: "Home", icon: "home", route: "/home" },
    { id: "library", label: "Library", icon: "library", route: "/library" },
    { id: "calc", label: "Calculators", icon: "calculator", route: "/calculators" },
    { id: "lab", label: "Lab Values", icon: "flask", route: "/lab-values" },
    { id: "more", label: "More", icon: "more", route: "/more" },
  ];

  function markup() {
    return `
      <nav class="bottom-nav" data-bottom-nav>
        <div class="nav-pill" data-nav-pill></div>
        ${TABS.map(
          (t) => `
          <button class="nav-item" data-nav-tab="${t.id}" data-route="${t.route}">
            ${icon(t.icon, { size: 20, strokeWidth: 2, className: "nav-icon" })}
            <span class="nav-label">${t.label}</span>
          </button>`
        ).join("")}
      </nav>`;
  }

  function mount(root) {
    root.insertAdjacentHTML("beforeend", markup());
    const nav = qs("[data-bottom-nav]", root);
    on(nav, "click", "[data-nav-tab]", (_e, target) => {
      MP.router.push(target.dataset.route);
    });
    // Recalculate on resize so the pill never drifts if the viewport changes.
    let currentTab = null;
    window.addEventListener("resize", () => {
      if (currentTab) setActive(nav, currentTab);
    });
    return {
      setActive: (tabId) => {
        currentTab = tabId;
        setActive(nav, tabId);
      },
    };
  }

  function setActive(nav, tabId) {
    const items = qsa("[data-nav-tab]", nav);
    items.forEach((item) => item.classList.toggle("is-active", item.dataset.navTab === tabId));

    const pill = qs("[data-nav-pill]", nav);
    const activeItem = items.find((item) => item.dataset.navTab === tabId);
    if (!activeItem) {
      pill.style.opacity = "0";
      return;
    }

    // Always derive the pill's position fresh from the active item's real
    // rendered geometry — never from the previous pill position — so
    // offsets can't accumulate across repeated tab switches.
    const inset = 7;
    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const left = itemRect.left - navRect.left + inset;
    const width = itemRect.width - inset * 2;

    pill.style.opacity = "1";
    pill.style.width = `${width}px`;
    pill.style.transform = `translateX(${left}px)`;
  }

  // Map a route to the tab it should highlight (sub-routes belong to Library).
  function tabForRoute(route) {
    if (route.startsWith("/library")) return "library";
    if (route.startsWith("/calculators")) return "calc";
    if (route.startsWith("/lab-values")) return "lab";
    if (route.startsWith("/more")) return "more";
    if (route.startsWith("/manage")) return "more";
    if (route.startsWith("/home")) return "home";
    if (route.startsWith("/lesson")) return "library";
    if (route.startsWith("/link")) return "library";
    if (route.startsWith("/pdf")) return "library";
    if (route.startsWith("/file")) return "library";
    return "home";
  }

  MP.components = MP.components || {};
  MP.components.bottomNav = { mount, TABS, tabForRoute };
})(window.MP = window.MP || {});
