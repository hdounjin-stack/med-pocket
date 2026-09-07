/* ==========================================================================
   Component: Lesson Card (list row)
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { statusBadge } = MP.dom;

  function lessonCard(lesson, hue, index = 0) {
    const done = MP.data.isCompleted(lesson);
    const resourceCount = MP.data.countResources(lesson);
    return `
      <div class="lesson-card card card-press reveal lesson-card-with-toggle" style="animation-delay:${60 + index * 45}ms">
        <button class="row-complete-btn ${done ? "is-done" : ""}" data-action="toggle-row-complete"
          data-lesson="${lesson.id}" aria-label="${done ? "Mark as not started" : "Mark as complete"}"
          title="${done ? "Completed" : "Mark as complete"}">
          <span class="complete-icon">${icon("checkCircle", { size: 20, strokeWidth: 2.3 })}</span>
        </button>
        <button class="lesson-card-main" data-action="open-lesson" data-lesson="${lesson.id}">
          <span class="lesson-icon hue-${hue}">${icon(done ? "checkCircle" : "fileText", { size: 17, strokeWidth: 2.1 })}</span>
          <span class="lesson-body">
            <span class="lesson-title">${lesson.title}</span>
            <span class="lesson-meta-row">
              ${statusBadge(done)}
              <span class="lesson-resource-count">${resourceCount} resource${resourceCount === 1 ? "" : "s"}</span>
            </span>
          </span>
          ${icon("chevronRight", { size: 17, strokeWidth: 2.2, className: "lesson-chevron" })}
        </button>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.lessonCard = lessonCard;
})(window.MP = window.MP || {});
