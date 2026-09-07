/* ==========================================================================
   Component: Breadcrumb
   ========================================================================== */

(function (MP) {
  function breadcrumb(parts) {
    return `
      <div class="breadcrumb">
        ${parts
          .map((p, i) => (i === 0 ? `<span>${p}</span>` : `<span class="crumb-sep">/</span><span>${p}</span>`))
          .join("")}
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.breadcrumb = breadcrumb;
})(window.MP = window.MP || {});
