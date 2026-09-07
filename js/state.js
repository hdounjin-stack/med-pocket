/* ==========================================================================
   MedPocket — App State
   Minimal, dependency-free store. No persistence — this is a UI preview,
   not a real app, so state resets on reload by design.

   Phase 6 (Study Spaces): completion overrides are now namespaced by
   study-space id: { [spaceId]: { [lessonId]: boolean } }. This is the
   ONLY structural change here — every existing call (isCompleted,
   setCompleted, removeCompleted, toggleCompleted) keeps the exact same
   signature it always had; they just transparently read/write within the
   CURRENT space's own bucket now, so two spaces can never share completion
   state even if they happen to generate the same lesson id.
   ========================================================================== */

(function (MP) {
  const state = {
    theme: "light",
    stack: ["/home"],
    scrollPositions: {},
    currentStudySpaceId: "emle",
    // Namespaced by study-space id so identical lesson ids in different
    // spaces can never collide. Lazily created per space on first write.
    completedOverrides: {},
  };

  function get() {
    return state;
  }
  function setTheme(theme) {
    state.theme = theme;
  }
  function currentRoute() {
    return state.stack[state.stack.length - 1];
  }
  function pushRoute(route) {
    state.stack.push(route);
  }
  function popRoute() {
    if (state.stack.length > 1) state.stack.pop();
    return currentRoute();
  }
  function replaceRoute(route) {
    state.stack[state.stack.length - 1] = route;
  }
  function saveScroll(route, top) {
    state.scrollPositions[route] = top;
  }
  function getScroll(route) {
    return state.scrollPositions[route] || 0;
  }

  // ---- current study space ----
  function getCurrentStudySpaceId() {
    return state.currentStudySpaceId;
  }
  function setCurrentStudySpaceId(id) {
    state.currentStudySpaceId = id;
  }

  // ---- lesson completion (single source of truth for "done" state,
  //      scoped to whichever study space is currently active) ----
  function overridesForCurrentSpace() {
    const sid = state.currentStudySpaceId;
    if (!state.completedOverrides[sid]) state.completedOverrides[sid] = {};
    return state.completedOverrides[sid];
  }
  function isCompleted(lessonId, fallback = false) {
    const override = overridesForCurrentSpace()[lessonId];
    return typeof override === "boolean" ? override : fallback;
  }
  function setCompleted(lessonId, value) {
    overridesForCurrentSpace()[lessonId] = value;
  }
  function removeCompleted(lessonId) {
    delete overridesForCurrentSpace()[lessonId];
  }
  function toggleCompleted(lessonId, fallback = false) {
    const next = !isCompleted(lessonId, fallback);
    setCompleted(lessonId, next);
    return next;
  }

  MP.state = {
    get,
    setTheme,
    currentRoute,
    pushRoute,
    popRoute,
    replaceRoute,
    saveScroll,
    getScroll,
    getCurrentStudySpaceId,
    setCurrentStudySpaceId,
    isCompleted,
    setCompleted,
    removeCompleted,
    toggleCompleted,
  };
})(window.MP = window.MP || {});
