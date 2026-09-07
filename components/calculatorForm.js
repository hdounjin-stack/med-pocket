/* ==========================================================================
   Component: Calculator Form
   Renders form controls from an input definition array and generically
   validates + unit-normalizes whatever was entered. A future calculator
   only needs to describe its inputs (type/min/max/quantity/units) — this
   engine handles required-field checks, numeric range checks, and
   converting to the calculator's canonical unit before calculate() ever
   runs. Nothing calculator-specific lives in here.
   ========================================================================== */

(function (MP) {
  const { escapeHtml } = MP.dom;

  function fieldHtml(input) {
    if (input.type === "select") {
      return `
        <div class="field-group">
          <label class="field-label" for="calc-field-${input.id}">${escapeHtml(input.label)}</label>
          <select class="calc-select" id="calc-field-${input.id}" data-calc-field="${input.id}">
            <option value="" disabled selected>Select…</option>
            ${input.options.map((o) => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join("")}
          </select>
          <p class="field-error" data-calc-error="${input.id}"></p>
        </div>`;
    }

    const hasUnits = Array.isArray(input.units) && input.units.length > 0;
    return `
      <div class="field-group">
        <label class="field-label" for="calc-field-${input.id}">${escapeHtml(input.label)}</label>
        <div class="field-input-row">
          <input class="calc-input" id="calc-field-${input.id}" data-calc-field="${input.id}"
            type="number" inputmode="decimal" step="${input.step || "any"}"
            placeholder="${escapeHtml(input.placeholder || "")}" />
          ${
            hasUnits
              ? `<select class="calc-select calc-unit-select" data-calc-unit="${input.id}">
                   ${input.units.map((u) => `<option value="${u}" ${u === input.defaultUnit ? "selected" : ""}>${u}</option>`).join("")}
                 </select>`
              : input.unitLabel
              ? `<span class="calc-unit-static">${escapeHtml(input.unitLabel)}</span>`
              : ""
          }
        </div>
        <p class="field-error" data-calc-error="${input.id}"></p>
      </div>`;
  }

  function formHtml(inputs) {
    return inputs.map(fieldHtml).join("");
  }

  // Reads every field, applies required/min/max checks generically, and
  // — for any field tagged with a `quantity` — normalizes it to that
  // quantity's canonical unit via js/calculators/conversions.js before
  // handing values to the calculator's own calculate() function.
  function readAndValidate(inputs, root) {
    const errors = {};
    const values = {};

    inputs.forEach((input) => {
      const el = MP.dom.qs(`[data-calc-field="${input.id}"]`, root);
      const raw = el ? el.value : "";

      if (input.type === "select") {
        if (!raw) {
          if (input.required !== false) errors[input.id] = "Required.";
          return;
        }
        values[input.id] = raw;
        return;
      }

      if (raw === "" || raw === null) {
        if (input.required !== false) errors[input.id] = "Required.";
        return;
      }
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        errors[input.id] = "Enter a valid number.";
        return;
      }
      if (input.min !== undefined && num < input.min) {
        errors[input.id] = `Must be at least ${input.min}.`;
        return;
      }
      if (input.max !== undefined && num > input.max) {
        errors[input.id] = `Must be at most ${input.max}.`;
        return;
      }

      if (input.quantity) {
        const unitEl = MP.dom.qs(`[data-calc-unit="${input.id}"]`, root);
        const unit = unitEl ? unitEl.value : input.defaultUnit;
        values[input.id] = MP.calculators.conversions.toCanonical(num, input.quantity, unit);
      } else {
        values[input.id] = num;
      }
    });

    return { ok: Object.keys(errors).length === 0, errors, values };
  }

  function clearErrors(inputs, root) {
    inputs.forEach((input) => {
      const errEl = MP.dom.qs(`[data-calc-error="${input.id}"]`, root);
      if (errEl) errEl.textContent = "";
      const fieldEl = MP.dom.qs(`[data-calc-field="${input.id}"]`, root);
      if (fieldEl) fieldEl.classList.remove("is-invalid");
    });
  }

  function showErrors(errors, root) {
    Object.entries(errors).forEach(([fieldId, message]) => {
      const errEl = MP.dom.qs(`[data-calc-error="${fieldId}"]`, root);
      if (errEl) errEl.textContent = message;
      const fieldEl = MP.dom.qs(`[data-calc-field="${fieldId}"]`, root);
      if (fieldEl) fieldEl.classList.add("is-invalid");
    });
  }

  MP.components = MP.components || {};
  MP.components.calculatorForm = { formHtml, readAndValidate, clearErrors, showErrors };
})(window.MP = window.MP || {});
