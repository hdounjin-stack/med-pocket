/* ==========================================================================
   Calculator: eGFR (estimated Glomerular Filtration Rate)

   Method implemented: CKD-EPI 2021 (race-free) creatinine equation.
   Source: Levey AS, Chertow GM, Coresh J, et al. "New Creatinine- and
   Cystatin C-Based Equations to Estimate GFR without Race." N Engl J Med.
   2021 Nov 4;385(19):1737–1749. This is the equation currently recommended
   by NKF/ASN as the race-free replacement for the 2009 CKD-EPI equation.

   VERIFICATION NOTE: the coefficients below were checked against multiple
   independent clinical-reference summaries of the published equation
   before implementation, but as with any clinical calculator, cross-check
   against the original NEJM publication (or a validated reference such as
   MDCalc/UpToDate) before relying on this for clinical decisions. This
   tool is a study aid, not a diagnostic device — it does not diagnose CKD
   or recommend treatment; the interpretation text below only reflects the
   descriptive KDIGO GFR-category ranges (G1–G5), stated neutrally.

   Formula:
     eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^Age × (1.012 if female)
     κ = 0.7 (female) / 0.9 (male)
     α = -0.241 (female) / -0.302 (male)
     Scr = serum creatinine in mg/dL (canonical unit — see js/calculators/conversions.js)
   ========================================================================== */

(function (MP) {
  const CKD_EPI_2021 = {
    id: "ckd-epi-2021",
    label: "CKD-EPI 2021 (race-free)",
    resultUnit: "mL/min/1.73m²",
    formulaNote:
      "Levey AS et al., N Engl J Med 2021;385(19):1737–1749 — race-free CKD-EPI creatinine equation. Verify against the original publication before clinical use.",
    inputs: [
      { id: "age", label: "Age", type: "number", unitLabel: "years", min: 1, max: 120, step: "any", required: true, placeholder: "45" },
      {
        id: "sex",
        label: "Sex",
        type: "select",
        required: true,
        options: [
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
        ],
      },
      {
        id: "creatinine",
        label: "Serum Creatinine",
        type: "number",
        quantity: "creatinine",
        units: ["mg/dL", "µmol/L"],
        defaultUnit: "mg/dL",
        min: 0.01,
        max: 40,
        step: "any",
        required: true,
        placeholder: "1.2",
      },
    ],
    // `values` arrives with every `quantity`-tagged field already
    // normalized to its canonical unit by the calculator engine — this
    // function never has to know which unit the person picked.
    calculate(values) {
      const age = Number(values.age);
      const sex = values.sex;
      const scr = Number(values.creatinine);

      const k = sex === "female" ? 0.7 : 0.9;
      const a = sex === "female" ? -0.241 : -0.302;
      const ratio = scr / k;
      const minTerm = Math.pow(Math.min(ratio, 1), a);
      const maxTerm = Math.pow(Math.max(ratio, 1), -1.2);
      let egfr = 142 * minTerm * maxTerm * Math.pow(0.9938, age);
      if (sex === "female") egfr *= 1.012;

      return { value: Math.round(egfr * 10) / 10, unit: CKD_EPI_2021.resultUnit };
    },
    interpret(result) {
      const v = result.value;
      if (v >= 90) return "G1 range (≥90) — normal or high. Other markers are needed to assess for kidney damage.";
      if (v >= 60) return "G2 range (60–89) — mildly decreased.";
      if (v >= 45) return "G3a range (45–59) — mildly to moderately decreased.";
      if (v >= 30) return "G3b range (30–44) — moderately to severely decreased.";
      if (v >= 15) return "G4 range (15–29) — severely decreased.";
      return "G5 range (<15) — kidney failure range.";
    },
  };

  const EGFR_CALCULATOR = {
    id: "egfr",
    title: "eGFR",
    category: "renal",
    shortDescription: "Estimate kidney filtration rate",
    icon: "flask",
    hue: "teal",
    methods: [CKD_EPI_2021],
  };

  MP.calculators = MP.calculators || {};
  MP.calculators.registry.register(EGFR_CALCULATOR);
})(window.MP = window.MP || {});
