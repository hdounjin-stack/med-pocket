/* ==========================================================================
   Component: Calculator Result
   Same rendering for every calculator: a prominent value + unit, an
   optional plain-language interpretation, and a small formula/method
   citation. Reuses existing typography classes (.progress-value,
   .stat-label, .resource-note) rather than introducing new ones.
   ========================================================================== */

(function (MP) {
  function resultHtml({ result, interpretation, formulaNote, methodLabel }) {
    const components = result && result.components;
    return `
      <div class="calc-result-card card reveal" style="animation-delay:20ms" data-calc-result-card>
        <p class="stat-label">Result</p>
        <p class="progress-value calc-result-value">${result.value}</p>
        <p class="stat-label calc-result-unit">${result.unit}</p>
        ${
          components
            ? `<div class="calc-components">
                 ${Object.entries(components)
                   .map(([label, val]) => `<div class="calc-component-row"><span>${label}</span><span>${val}</span></div>`)
                   .join("")}
               </div>`
            : ""
        }
        ${
          interpretation
            ? `<div class="calc-interpretation">
                 <p class="stat-label">Interpretation</p>
                 <p class="resource-note" style="margin-top:4px">${interpretation}</p>
               </div>`
            : ""
        }
        <p class="calc-formula-note">${methodLabel ? `${methodLabel} — ` : ""}${formulaNote || ""}</p>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.calculatorResult = { resultHtml };
})(window.MP = window.MP || {});
