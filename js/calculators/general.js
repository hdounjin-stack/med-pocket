/* ==========================================================================
   Calculators: General / Clinical

   BMI — weight (kg) / height (m)². WHO classification bands in interpret()
   (underweight <18.5 · normal 18.5–24.9 · overweight 25–29.9 · obese ≥30)
   are the standard WHO adult cutoffs.

   BSA — Mosteller formula, verified against the original publication:
   Mosteller RD. "Simplified calculation of body-surface area."
   N Engl J Med 1987;317(17):1098. BSA = √[(height cm × weight kg)/3600].
   Reference case: 170 cm, 70 kg → √(11900/3600) = √3.3056 = 1.82 m²
   (the exact worked example quoted alongside the original letter).

   Corrected Sodium for Hyperglycemia — TWO methods exposed explicitly:
     Katz 1973:  corrected Na = measured Na + 1.6 × [(glucose − 100)/100]
     Hillier 1999: corrected Na = measured Na + 2.4 × [(glucose − 100)/100]
   Sources: Katz MA. N Engl J Med 1973;289:843–845 (hyperglycemia-induced
   hyponatremia, derivation of the 1.6 factor); Hillier TA, Abbott RD,
   Barrett EJ. Am J Med 1999;106(4):399–403 — experimentally found ~2.4 mEq/L
   per 100 mg/dL overall (nonlinear; ≈4.0 above 400–440 mg/dL), and
   recommended 2.4 to avoid underestimation. Glucose is entered in mg/dL or
   mmol/L (auto-converted via js/calculators/conversions.js).

   Anion Gap — AG = Na − (Cl + HCO₃), verified against Emmett M, Narins RG.
   "Clinical use of the anion gap." Arch Intern Med / Medicine (Baltimore)
   1977 review literature: without-K normal band ≈8–12 mEq/L. The with-K
   variant (Na+K−Cl−HCO₃, band ≈12–16) is offered as a second method.
   Reference case: Na 140, Cl 104, HCO₃ 24 → AG = 12 (classic textbook set).

   Serum Osmolality (calculated) — Osm = 2×Na + glucose/18 + BUN/2.8,
   the standard equation as evaluated by Dorwart WV, Chalmers L.
   "Comparison of methods for calculating serum osmolality." Clin Chem
   1975;21:190–194 (found 1.86×Na + 9 variant most accurate; the simple
   2×Na form remains the widely used bedside version). Glucose and BUN in
   mg/dL (mmol/L inputs auto-converted). Reference case: Na 140, glu 90,
   BUN 14 → 280 + 5 + 5 = 290 mOsm/kg.
   Interpretation: osmolal gap concept stated descriptively only.

   Corrected Calcium (albumin-adjusted) — Payne formula:
     conventional: Ca_corr = Ca_measured + 0.8 × (4.0 − albumin g/dL)
     SI form:      Ca_corr = Ca_measured + 0.02 × (40 − albumin g/L)
   Source: Payne RB et al. (the classic albumin-correction relation; BMJ
   1973 interpretation paper) — coefficients cross-checked against multiple
   clinical-reference implementations (MDCalc-consistent). Reference case:
   Ca 7.8 mg/dL, alb 2.5 g/dL → 7.8 + 0.8×1.5 = 9.0 mg/dL.
   ========================================================================== */

(function (MP) {
  /* ------------------------------- BMI ------------------------------- */
  const BMI = {
    id: "bmi",
    title: "BMI",
    category: "general",
    shortDescription: "Body mass index",
    icon: "monitor",
    hue: "teal",
    methods: [{
      id: "metric",
      label: "Metric (kg / cm)",
      resultUnit: "kg/m²",
      formulaNote: "BMI = weight(kg) / height(m)². WHO adult classification.",
      inputs: [
        { id: "weight", label: "Weight", unitLabel: "kg", type: "number", min: 2, max: 400, step: "any", required: true, placeholder: "70" },
        { id: "height_cm", label: "Height", unitLabel: "cm", type: "number", min: 40, max: 250, step: "any", required: true, placeholder: "170" },
      ],
      calculate(v) {
        const m = Number(v.height_cm) / 100;
        const bmi = Number(v.weight) / (m * m);
        return { value: Math.round(bmi * 10) / 10, unit: this.resultUnit };
      },
      interpret(r) {
        const b = r.value;
        if (b < 18.5) return "<18.5 — WHO underweight band.";
        if (b < 25) return "18.5–24.9 — WHO normal-weight band.";
        if (b < 30) return "25–29.9 — WHO overweight band.";
        if (b < 35) return "30–34.9 — WHO obesity class I.";
        if (b < 40) return "35–39.9 — WHO obesity class II.";
        return "≥40 — WHO obesity class III.";
      },
    }],
  };

  /* ------------------------------- BSA ------------------------------- */
  const BSA = {
    id: "bsa",
    title: "BSA",
    category: "general",
    shortDescription: "Body surface area (Mosteller)",
    icon: "stethoscope",
    hue: "indigo",
    methods: [{
      id: "mosteller",
      label: "Mosteller",
      resultUnit: "m²",
      formulaNote: "Mosteller RD. N Engl J Med 1987;317:1098. BSA = √[(height cm × weight kg) / 3600].",
      inputs: [
        { id: "weight", label: "Weight", unitLabel: "kg", type: "number", min: 2, max: 400, step: "any", required: true, placeholder: "70" },
        { id: "height_cm", label: "Height", unitLabel: "cm", type: "number", min: 40, max: 250, step: "any", required: true, placeholder: "170" },
      ],
      calculate(v) {
        const bsa = Math.sqrt((Number(v.height_cm) * Number(v.weight)) / 3600);
        return { value: Math.round(bsa * 100) / 100, unit: this.resultUnit };
      },
    }],
  };

  /* -------------------- Corrected sodium (hyperglycemia) -------------- */
  const naInputs = [
    { id: "na_measured", label: "Measured Sodium", unitLabel: "mEq/L", type: "number", min: 90, max: 180, step: "any", required: true, placeholder: "128" },
    { id: "glucose", label: "Glucose", type: "number", quantity: "glucose", units: ["mg/dL", "mmol/L"], defaultUnit: "mg/dL", min: 40, max: 2000, step: "any", required: true, placeholder: "600" },
  ];
  function correctedNa(v, factor) {
    // values.glucose arrives in canonical mg/dL via conversions.js
    return Number(v.na_measured) + factor * ((Number(v.glucose) - 100) / 100);
  }
  const NA_CORR = {
    id: "corrected-sodium",
    title: "Corrected Sodium",
    category: "general",
    shortDescription: "Hyperglycemia correction",
    icon: "flask",
    hue: "amber",
    methods: [
      {
        id: "katz-1-6",
        label: "Katz 1973 (+1.6 per 100 mg/dL)",
        resultUnit: "mEq/L",
        formulaNote: "Katz MA. N Engl J Med 1973;289:843–845. Na_corr = Na + 1.6 × [(glu−100)/100]. The traditional factor; reasonable below ~300 mg/dL.",
        inputs: naInputs,
        calculate(v) {
          return { value: Math.round(correctedNa(v, 1.6) * 10) / 10, unit: this.resultUnit };
        },
        interpret(r) {
          return `Corrected estimate ${r.value} mEq/L. Reflects water shift back out of the extracellular space once hyperglycemia resolves.`;
        },
      },
      {
        id: "hillier-2-4",
        label: "Hillier 1999 (+2.4 per 100 mg/dL)",
        resultUnit: "mEq/L",
        formulaNote: "Hillier TA et al. Am J Med 1999;106:399–403. Experimentally derived slope ≈2.4 mEq/L per 100 mg/dL (nonlinear, ≈4.0 above ~400–440 mg/dL); authors recommend 2.4 to avoid underestimation in severe hyperglycemia.",
        inputs: naInputs,
        calculate(v) {
          return { value: Math.round(correctedNa(v, 2.4) * 10) / 10, unit: this.resultUnit };
        },
        interpret(r) {
          return `Corrected estimate ${r.value} mEq/L. Preferred factor when glucose >300–400 mg/dL per the derivation study.`;
        },
      },
    ],
  };

  /* ---------------------------- Anion gap ----------------------------- */
  const agInputs = [
    { id: "na", label: "Sodium", unitLabel: "mEq/L", type: "number", min: 90, max: 180, step: "any", required: true, placeholder: "140" },
    { id: "cl", label: "Chloride", unitLabel: "mEq/L", type: "number", min: 60, max: 150, step: "any", required: true, placeholder: "104" },
    { id: "hco3", label: "Bicarbonate (HCO₃)", unitLabel: "mEq/L", type: "number", min: 2, max: 60, step: "any", required: true, placeholder: "24" },
  ];
  const ANION_GAP = {
    id: "anion-gap",
    title: "Anion Gap",
    category: "general",
    shortDescription: "Metabolic acidosis workup",
    icon: "flask",
    hue: "violet",
    methods: [
      {
        id: "without-k",
        label: "Without potassium (Na − [Cl+HCO₃])",
        resultUnit: "mEq/L",
        formulaNote: "AG = Na − (Cl + HCO₃). Normal band ≈8–12 mEq/L. See Emmett M, Narins RG. Arch Intern Med 1977 clinical review of the anion gap.",
        inputs: agInputs,
        calculate(v) {
          const ag = Number(v.na) - (Number(v.cl) + Number(v.hco3));
          return { value: Math.round(ag * 10) / 10, unit: this.resultUnit };
        },
        interpret(r) {
          const a = r.value;
          if (a > 12) return ">12 — elevated-gap range: consider unmeasured anions (ketoacids, lactate, toxins, renal retention).";
          if (a < 8) return "<8 — low-gap range: hypoalbuminemia is the most common cause.";
          return "8–12 — usual reference band (lab-dependent).";
        },
      },
      {
        id: "with-k",
        label: "With potassium ([Na+K] − [Cl+HCO₃])",
        resultUnit: "mEq/L",
        formulaNote: "AG = (Na + K) − (Cl + HCO₃). Normal band ≈12–16 mEq/L.",
        inputs: [...agInputs.slice(0, 1),
          { id: "k", label: "Potassium", unitLabel: "mEq/L", type: "number", min: 1, max: 9, step: "any", required: true, placeholder: "4" },
          ...agInputs.slice(1)],
        calculate(v) {
          const ag = (Number(v.na) + Number(v.k)) - (Number(v.cl) + Number(v.hco3));
          return { value: Math.round(ag * 10) / 10, unit: this.resultUnit };
        },
        interpret(r) {
          const a = r.value;
          if (a > 16) return ">16 — elevated-gap range (with-K convention).";
          if (a < 12) return "<12 — low-gap range (with-K convention).";
          return "12–16 — usual reference band for the with-K formula (lab-dependent).";
        },
      },
    ],
  };

  /* --------------------------- Osmolality ----------------------------- */
  const OSMO = {
    id: "serum-osmolality",
    title: "Serum Osmolality",
    category: "general",
    shortDescription: "Calculated (2×Na + glu/18 + BUN/2.8)",
    icon: "flask",
    hue: "teal",
    methods: [{
      id: "standard",
      label: "Standard equation",
      resultUnit: "mOsm/kg",
      formulaNote: "Osm = 2×Na + glucose/18 + BUN/2.8 (glucose, BUN in mg/dL). Equation family evaluated by Dorwart & Chalmers, Clin Chem 1975;21:190–194. SI inputs auto-converted.",
      inputs: [
        { id: "na", label: "Sodium", unitLabel: "mEq/L", type: "number", min: 90, max: 180, step: "any", required: true, placeholder: "140" },
        { id: "glucose", label: "Glucose", type: "number", quantity: "glucose", units: ["mg/dL", "mmol/L"], defaultUnit: "mg/dL", min: 20, max: 2000, step: "any", required: true, placeholder: "90" },
        { id: "bun", label: "BUN", type: "number", quantity: "bun", units: ["mg/dL", "mmol/L"], defaultUnit: "mg/dL", min: 1, max: 300, step: "any", required: true, placeholder: "14" },
      ],
      calculate(v) {
        const osm = 2 * Number(v.na) + Number(v.glucose) / 18 + Number(v.bun) / 2.8;
        return { value: Math.round(osm), unit: this.resultUnit };
      },
      interpret(r) {
        const o = r.value;
        if (o >= 275 && o <= 295) return "275–295 — usual normal band for calculated osmolality.";
        if (o > 295) return ">295 — hyperosmolar range.";
        return "<275 — hypo-osmolar range.";
      },
    }],
  };

  /* ------------------------ Corrected calcium ------------------------- */
  const CA_CORR = {
    id: "corrected-calcium",
    title: "Corrected Calcium",
    category: "general",
    shortDescription: "Albumin adjustment (Payne)",
    icon: "flask",
    hue: "coral",
    methods: [{
      id: "payne",
      label: "Payne formula",
      resultUnit: "mg/dL",
      formulaNote: "Ca_corr = Ca + 0.8 × (4.0 − albumin g/dL) — Payne's classic albumin correction (SI equivalent: +0.02 × (40 − alb g/L)). Albumin inputs auto-convert g/L→g/dL.",
      inputs: [
        { id: "ca", label: "Measured Total Calcium", type: "number", quantity: "calcium", units: ["mg/dL", "mmol/L"], defaultUnit: "mg/dL", min: 2, max: 20, step: "any", required: true, placeholder: "7.8" },
        { id: "albumin", label: "Albumin", type: "number", quantity: "albumin", units: ["g/dL", "g/L"], defaultUnit: "g/dL", min: 0.5, max: 6.5, step: "any", required: true, placeholder: "2.5" },
      ],
      calculate(v) {
        const corr = Number(v.ca) + 0.8 * (4.0 - Number(v.albumin));
        return { value: Math.round(corr * 100) / 100, unit: this.resultUnit };
      },
      interpret(r) {
        const c = r.value;
        if (c < 8.5) return "<8.5 mg/dL — hypocalcemia band for corrected total calcium (lab-dependent).";
        if (c > 10.6) return ">10.6 mg/dL — hypercalcemia band for corrected total calcium (lab-dependent).";
        return "≈8.5–10.6 mg/dL — usual corrected-calcium band (lab-dependent).";
      },
    }],
  };

  [BMI, BSA, NA_CORR, ANION_GAP, OSMO, CA_CORR].forEach((c) => MP.calculators.registry.register(c));
})(window.MP = window.MP || {});
