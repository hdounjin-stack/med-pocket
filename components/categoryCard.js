/* ==========================================================================
   Component: Section Card (grid card used on Home + Library root)
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { radialRing, bar } = MP.components;
  const { pct } = MP.dom;

  function categoryCard(section, index = 0) {
    const { done, total } = MP.data.sectionStats(section);
    const p = pct(done, total);
    return `
      <button class="cat-card card card-press reveal" style="animation-delay:${80 + index * 55}ms"
        data-action="open-category" data-category="${section.id}">
        <div class="cat-top">
          <span class="cat-icon hue-${section.hue}">${icon(section.icon, { size: 18, strokeWidth: 2.2 })}</span>
          ${radialRing({ value: p, size: 36, stroke: 4 })}
        </div>
        <div class="cat-body">
          <h3 class="cat-title">${section.title}</h3>
          <p class="cat-desc">${section.desc}</p>
        </div>
        <div class="cat-foot">
          <span class="cat-count">${done}<span class="cat-count-total">/${total}</span></span>
          ${icon("chevronRight", { size: 16, strokeWidth: 2.4, className: "cat-chevron" })}
        </div>
        ${bar({ value: p, hue: section.hue })}
      </button>`;
  }

  MP.components = MP.components || {};
  MP.components.categoryCard = categoryCard;
})(window.MP = window.MP || {});
