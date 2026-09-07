/* ==========================================================================
   Page: Calculator detail (reusable for every calculator)
   Calculator Definition -> this page -> Inputs -> Calculate -> Result.
   Method switching (when a calculator has more than one) re-renders just
   the input fields and clears any prior result — no navigation, no full
   page reload.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { formHtml, readAndValidate, clearErrors, showErrors } = MP.components.calculatorForm;
  const { resultHtml } = MP.components.calculatorResult;
  const { on, qs } = MP.dom;

  function renderNotFound() {
    return `
      <div class="page" data-page="calculator-missing">
        <button class="back-btn" data-action="go-back" style="margin:4px 0 14px">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
        <p class="placeholder-text">That calculator doesn't exist yet.</p>
      </div>`;
  }

  function render(params = {}) {
    const def = MP.calculators.registry.get(params.calculatorId);
    if (!def) return renderNotFound();
    const method = def.methods[0];

    return `
      <div class="page" data-page="calculator" data-calculator-id="${def.id}">
        <div class="page-header">
          <div class="page-header-top">
            <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
          </div>
          <h1 class="page-title">${def.title}</h1>
          ${def.shortDescription ? `<p class="page-subtitle">${def.shortDescription}</p>` : ""}
        </div>

        ${
          def.methods.length
            ? `<div class="field-group">
                 <label class="field-label">Method</label>
                 <select class="calc-select" style="width:100%" data-calc-method>
                   ${def.methods.map((m) => `<option value="${m.id}" ${m.id === method.id ? "selected" : ""}>${m.label}</option>`).join("")}
                 </select>
               </div>`
            : ""
        }

        <div data-calc-form-container>${formHtml(method.inputs)}</div>

        <div class="calc-btn-row">
          <button class="sheet-btn sheet-btn-cancel" data-action="calc-reset">Reset</button>
          <button class="sheet-btn sheet-btn-primary" data-action="calc-calculate">Calculate</button>
        </div>

        <div data-calc-result></div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function afterRender(root, params = {}) {
    const def = MP.calculators.registry.get(params.calculatorId);
    on(root, "click", '[data-action="go-back"]', () => MP.router.back());
    if (!def) return;

    function currentMethod() {
      const sel = qs("[data-calc-method]", root);
      const id = sel ? sel.value : def.methods[0].id;
      return def.methods.find((m) => m.id === id) || def.methods[0];
    }
    function resetForm() {
      const method = currentMethod();
      qs("[data-calc-form-container]", root).innerHTML = formHtml(method.inputs);
      qs("[data-calc-result]", root).innerHTML = "";
    }

    on(root, "change", "[data-calc-method]", () => resetForm());
    on(root, "click", '[data-action="calc-reset"]', () => resetForm());

    on(root, "click", '[data-action="calc-calculate"]', () => {
      const method = currentMethod();
      const formContainer = qs("[data-calc-form-container]", root);
      const resultContainer = qs("[data-calc-result]", root);

      clearErrors(method.inputs, formContainer);
      const { ok, errors, values } = readAndValidate(method.inputs, formContainer);
      if (!ok) {
        showErrors(errors, formContainer);
        resultContainer.innerHTML = "";
        MP.toast && MP.toast.show("Check the highlighted fields", "coral");
        return;
      }

      let result;
      try {
        result = method.calculate(values);
      } catch (e) {
        result = null;
      }
      if (!result || !Number.isFinite(result.value)) {
        resultContainer.innerHTML = "";
        MP.toast && MP.toast.show("Couldn't calculate a result — check your inputs", "coral");
        return;
      }

      const interpretation = typeof method.interpret === "function" ? method.interpret(result) : null;
      resultContainer.innerHTML = resultHtml({
        result,
        interpretation,
        formulaNote: method.formulaNote,
        methodLabel: method.label,
      });
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.calculator = { render, afterRender };
})(window.MP = window.MP || {});
