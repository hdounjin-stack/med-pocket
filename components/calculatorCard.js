/* ==========================================================================
   Component: Calculator Card
   Deliberately reuses the same row-card language as lessonCard (icon,
   title, subtitle line, chevron) — a calculator list item doesn't need a
   different visual vocabulary from a lesson list item.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;

  function calculatorCard(def, index = 0) {
    return `
      <button class="lesson-card card card-press reveal" style="animation-delay:${60 + index * 45}ms"
        data-action="open-calculator" data-calculator="${def.id}">
        <span class="lesson-icon hue-${def.hue || "teal"}">${icon(def.icon || "calculator", { size: 17, strokeWidth: 2.1 })}</span>
        <span class="lesson-body">
          <span class="lesson-title">${def.title}</span>
          <span class="lesson-meta-row">
            <span class="lesson-resource-count">${def.shortDescription || def.category || ""}</span>
          </span>
        </span>
        ${icon("chevronRight", { size: 17, strokeWidth: 2.2, className: "lesson-chevron" })}
      </button>`;
  }

  MP.components = MP.components || {};
  MP.components.calculatorCard = calculatorCard;
})(window.MP = window.MP || {});
