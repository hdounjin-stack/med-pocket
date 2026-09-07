/* ==========================================================================
   MedPocket — Router
   Small, explicit push()/back() API (no reliance on browser history quirks).
   location.hash is kept in sync for shareable/deep-linkable URLs.
   ========================================================================== */

(function (MP) {
  const ROUTES = [
    { re: /^\/home$/, page: "home", params: () => ({}) },
    { re: /^\/library$/, page: "library", params: () => ({}) },
    { re: /^\/library\/([^/]+)$/, page: "library", params: (m) => ({ sectionId: m[1] }) },
    { re: /^\/library\/([^/]+)\/([^/]+)$/, page: "library", params: (m) => ({ sectionId: m[1], subsectionId: m[2] }) },
    { re: /^\/lesson\/([^/]+)$/, page: "lesson", params: (m) => ({ lessonId: m[1] }) },
    { re: /^\/link\/([^/]+)\/([^/]+)$/, page: "linkViewer", params: (m) => ({ lessonId: m[1], index: m[2] }) },
    { re: /^\/pdf\/([^/]+)\/file\/([^/]+)$/, page: "pdfReader", params: (m) => ({ lessonId: m[1], fileId: m[2] }) },
    { re: /^\/pdf\/([^/]+)\/([^/]+)$/, page: "pdfReader", params: (m) => ({ lessonId: m[1], index: m[2] }) },
    { re: /^\/file\/([^/]+)\/([^/]+)$/, page: "fileViewer", params: (m) => ({ lessonId: m[1], fileId: m[2] }) },
    { re: /^\/manage$/, page: "manage", params: () => ({}) },
    { re: /^\/manage\/([^/]+)$/, page: "manage", params: (m) => ({ sectionId: m[1] }) },
    { re: /^\/manage\/([^/]+)\/([^/]+)$/, page: "manage", params: (m) => ({ sectionId: m[1], subsectionId: m[2] }) },
    { re: /^\/calculators$/, page: "calculators", params: () => ({}) },
    { re: /^\/calculators\/([^/]+)$/, page: "calculator", params: (m) => ({ calculatorId: m[1] }) },
    { re: /^\/lab-values$/, page: "reference", params: () => ({}) },
    { re: /^\/more$/, page: "placeholder", params: () => "more" },
  ];

  let container = null;
  let navControls = null;
  let searchControls = null;

  function match(route) {
    for (const r of ROUTES) {
      const m = route.match(r.re);
      if (m) return { page: r.page, params: r.params(m) };
    }
    return { page: "home", params: {} };
  }

  function renderRoute(route, direction) {
    const { page, params } = match(route);
    const mod = MP.pages[page];
    const html = mod.render(params);

    container.innerHTML = html;
    const pageEl = MP.dom.qs(".page", container);
    if (pageEl) {
      pageEl.dataset.anim = direction;
      /* "Title wall first": pages that own a .page-header also embed the
         shared .app-header (greeting row). Re-parent the header to sit
         AFTER the wall in the DOM so the sticky title bar is the FIRST
         child of #page-container — it pins at y=0 from t=0 on EVERY page
         (even ones too short to scroll, which previously left the
         greeting row visible above the wall). The greeting then scrolls
         UNDERNEATH the opaque wall and is painted over: nothing can ever
         appear above or behind the pinned title at any scroll offset.
         (Pure DOM order — no flex/order tricks, which break sticky.) */
      const ph = MP.dom.qs(":scope > .page-header", pageEl);
      const ah = MP.dom.qs(":scope > .app-header", pageEl);
      if (ph && ah) pageEl.insertBefore(ah, ph.nextElementSibling || null);
      if (direction === "forward" || direction === "back") {
        // The entrance animation is purely decorative and finishes almost
        // instantly, but animation-fill-mode:forwards keeps the element
        // "engaged" with the CSS animation engine indefinitely afterward
        // even once its value has settled — which on iOS Safari can
        // silently disable the native long-press text-selection gesture
        // for any descendant (confirmed via computed style: transform
        // stays a non-"none" matrix, not literally "none", for as long as
        // the animation keeps filling). Fully detach once it's done so
        // the page is inert to the animation engine for the rest of its
        // life, exactly as if it had never animated at all.
        pageEl.addEventListener("animationend", () => { pageEl.style.animation = "none"; }, { once: true });
      }
    }

    // IMPORTANT: afterRender must bind its delegated listeners to `pageEl`,
    // not `container`. `container` (#page-container) is created once and
    // never recreated, so listeners bound to it would accumulate by one
    // extra copy on every single navigation — never removed, because
    // dom.on() always calls addEventListener unconditionally. `pageEl`,
    // by contrast, is a brand-new node every render (innerHTML replaces
    // it entirely), so the previous page's listeners are discarded along
    // with the node they were attached to. This was the actual cause of
    // "Mark as Complete sometimes does nothing": each extra stale listener
    // toggled the same lesson's completion again on every tap, so an even
    // number of accumulated listeners silently cancelled the toggle out.
    if (pageEl) {
      mod.afterRender(pageEl, params);
    }

    navControls && navControls.setActive(MP.components.bottomNav.tabForRoute(route));

    // scroll handling
    if (direction === "back") {
      container.scrollTop = MP.state.getScroll(route);
    } else {
      container.scrollTop = 0;
    }

    /* NOTE: deliberately NO history.replaceState here. renderRoute runs for
       BOTH in-app navigations and platform back/forward landings. Rewriting
       the URL of the CURRENT history entry on every render clobbers the
       entry that a subsequent system edge-swipe would land one before —
       the swipe then skipped past the previous screen (e.g. closing a PDF
       with Back, then swiping re-opened that same PDF). push()/back() now
       own all URL writes (pushState / history.back respectively), and
       hashchange handles platform-initiated moves. */
  }

  function saveScroll() {
    const current = MP.state.currentRoute();
    MP.state.saveScroll(current, container.scrollTop);
  }

  /* ---------------- Back navigation = the PLATFORM gesture ----------------
     Every push() records a REAL browser-history entry (pushState), while
     back() renders immediately and then steps the browser history pointer
     to match. Consequence: the operating system's own edge-swipe-back
     (iOS Safari's left-edge swipe with its native parallax/snapshot
     animation, Chrome/Android's overscroll back, the mouse back button)
     all navigate ONE in-app step and land here via the hashchange safety
     net below — which pops the in-app stack and re-renders with the back
     transition. A hand-rolled JS swipe was deliberately NOT kept: it
     cannot suppress the system gesture, so both firing meant double
     navigation (verified: Chrome turned a synthetic edge drag straight
     into a real history back). One owner of the gesture: the platform.

     back()'s own history.back() arrives asynchronously; by then
     renderRoute has already updated MP.state, so the hashchange handler
     sees newRoute === currentRoute and ignores it (no double render). */

  function push(route) {
    if (route === MP.state.currentRoute()) return;
    saveScroll();
    MP.state.pushRoute(route);
    // Add a real history entry so the system back gesture targets us.
    if (history && history.pushState) history.pushState(null, "", "#" + route);
    renderRoute(route, "forward");
  }

  function replace(route) {
    saveScroll();
    MP.state.replaceRoute(route);
    renderRoute(route, "none");
  }

  let pendingBackSteps = 0; // guards the fast-double-tap-Back case (below)

  function back() {
    if (MP.state.get().stack.length <= 1) return;
    saveScroll();
    const route = MP.state.popRoute();
    renderRoute(route, "back");
    // Step the browser history pointer to match the in-app stack. Each
    // history.back() fires an async hashchange; the handler ignores those
    // echoes (pendingBackSteps) so a quick double-tap on the in-app Back
    // button can't reconcile against intermediate entries and flicker.
    if (history && history.back) {
      pendingBackSteps++;
      history.back();
      setTimeout(() => { pendingBackSteps = Math.max(0, pendingBackSteps - 1); }, 450);
    }
  }

  function init({ containerEl, nav, search }) {
    container = containerEl;
    navControls = nav;
    searchControls = search;
    const initial = (location.hash || "#/home").slice(1) || "/home";
    MP.state.get().stack = [initial];
    renderRoute(initial, "none");

    /* Condense-on-scroll for .page-header (iOS large-title behavior):
       one passive watcher flips .is-pinned on the header as soon as the
       page content has scrolled up beneath it. rAF-throttled so it can
       never fight the compositor; cheap classList.toggle otherwise. */
    let pinTick = false;
    container.addEventListener("scroll", () => {
      if (pinTick) return;
      pinTick = true;
      requestAnimationFrame(() => {
        pinTick = false;
        const ph = container.querySelector(".page-header");
        if (ph) ph.classList.toggle("is-pinned", container.scrollTop > 8);
      });
    }, { passive: true });

    // Safety net: the browser's own back/forward UI (system edge swipe,
    // hardware buttons, mouse buttons) now carries REAL in-app history
    // entries, so a hashchange means the platform performed a navigation
    // for us. The user's rule: the swipe must behave EXACTLY like one tap
    // of the in-app Back button — pop ONE screen, render it with the back
    // transition. Never "jump to wherever that route sits in the stack"
    // (the old lastIndexOf + truncate behavior did exactly that and read
    // as "goes to the last place I was"). A forward hashchange (rare:
    // only if the person uses the browser's forward button) still pushes.
    window.addEventListener("hashchange", () => {
      const newRoute = (location.hash || "#/home").slice(1) || "/home";
      if (newRoute === MP.state.currentRoute()) return;
      if (pendingBackSteps > 0) { // echo of our own back(); already rendered
        pendingBackSteps--;
        return;
      }
      const stack = MP.state.get().stack;
      if (stack.length > 1) {
        // platform went BACK one step → mirror one in-app Back tap
        MP.state.popRoute();
        renderRoute(newRoute, "back");
      } else {
        MP.state.pushRoute(newRoute);
        renderRoute(newRoute, "forward");
      }
    });
  }

  MP.router = { init, push, back, replace, match };
})(window.MP = window.MP || {});
