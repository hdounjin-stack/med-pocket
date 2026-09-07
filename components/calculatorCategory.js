(function (MP) {
  const { icon } = MP.icons;

  function calculatorRow(def, index = 0) {
    return `
      <button class="calc-row" style="animation-delay:${30 + index * 30}ms"
        data-action="open-calculator" data-calculator="${def.id}">
        <span class="calc-row-title">${def.title}</span>
        ${def.shortDescription ? `<span class="calc-row-desc">${def.shortDescription}</span>` : ""}
        ${icon("chevronRight", { size: 15, strokeWidth: 2.2, className: "calc-row-chevron" })}
      </button>`;
  }

  function calculatorCategory(cat, index = 0) {
    return `
      <div class="calc-cat card reveal" style="animation-delay:${60 + index * 45}ms" data-calc-cat="${cat.id}">
        <button class="calc-cat-head" data-action="toggle-category" data-category="${cat.id}">
          <span class="cat-icon hue-teal calc-cat-icon">${icon(cat.icon || "calculator", { size: 16, strokeWidth: 2.1 })}</span>
          <span class="calc-cat-title">${cat.label}</span>
          ${icon("chevronRight", { size: 15, strokeWidth: 2.4, className: "calc-cat-chevron" })}
        </button>
        <div class="calc-cat-body">
          <div class="calc-cat-body-inner">
            ${cat.calculators.map((c, i) => calculatorRow(c, i)).join("")}
          </div>
        </div>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.calculatorRow = calculatorRow;
  MP.components.calculatorCategory = calculatorCategory;
})(window.MP = window.MP || {});
