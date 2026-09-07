/* ==========================================================================
   Page: Home
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header, progressCard, categoryCard, animateProgress } = MP.components;
  const { findLesson, overallStats } = MP.data;
  const { on } = MP.dom;

  function continueCard() {
    const space = MP.data.getCurrentSpace();
    const found = space.continueStudyingId ? findLesson(space.continueStudyingId) : null;
    if (!found) return "";
    const { section, subsection, lesson } = found;
    const done = MP.data.isCompleted(lesson);
    const p = done ? 100 : 40;
    return `
      <button class="continue-card card card-press reveal" style="animation-delay:70ms" data-action="open-lesson" data-lesson="${lesson.id}">
        <span class="continue-icon hue-${subsection.hue}">${icon(done ? "checkCircle" : "fileText", { size: 19, strokeWidth: 2.1 })}</span>
        <span class="continue-body">
          <span class="continue-eyebrow">Continue studying</span>
          <span class="continue-title">${lesson.title}</span>
          <span class="continue-progress-text">${section.title} · ${p}% complete</span>
        </span>
        ${icon("chevronRight", { size: 18, strokeWidth: 2.4, className: "continue-chevron" })}
      </button>`;
  }

  function recentRow() {
    const space = MP.data.getCurrentSpace();
    const items = (space.recentlyOpened || []).map(findLesson).filter(Boolean);
    if (!items.length) return "";
    return `
      <div class="section-title-row reveal" style="animation-delay:110ms">
        <h2 class="section-title">Recently Opened</h2>
      </div>
      <div class="hscroll">
        ${items
          .map(
            ({ subsection, lesson }, i) => `
          <button class="recent-card card card-press reveal" style="animation-delay:${120 + i * 40}ms" data-action="open-lesson" data-lesson="${lesson.id}">
            <span class="recent-icon hue-${subsection.hue}">${icon("fileText", { size: 15, strokeWidth: 2.1 })}</span>
            <span class="recent-title">${lesson.title}</span>
            <span class="recent-meta">${subsection.title}</span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  function render() {
    const { done: totalDone, total: totalAll } = overallStats();
    const overallPct = MP.dom.pct(totalDone, totalAll);

    return `
      <div class="page" data-page="home">
        ${header({ showSearch: true })}
        ${progressCard({ overallPct, streak: 7, done: totalDone, remaining: totalAll - totalDone, total: totalAll })}
        <div class="section-title-row reveal" style="animation-delay:60ms; margin-top:0">
          <h2 class="section-title">Pick up where you left off</h2>
        </div>
        ${continueCard()}
        ${recentRow()}
        <div class="section-title-row reveal" style="animation-delay:150ms">
          <h2 class="section-title">Categories</h2>
        </div>
        <div class="cat-grid">
          ${MP.data.currentSections().map((section, i) => categoryCard(section, i)).join("")}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function afterRender(root) {
    animateProgress(root);
    on(root, "click", '[data-action="open-category"]', (_e, target) => {
      MP.router.push(`/library/${target.dataset.category}`);
    });
    on(root, "click", '[data-action="open-lesson"]', (_e, target) => {
      MP.router.push(`/lesson/${target.dataset.lesson}`);
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.home = { render, afterRender };
})(window.MP = window.MP || {});
