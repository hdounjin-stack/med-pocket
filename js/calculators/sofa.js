(function (MP) {
  function respScore(ratio, supported) {
    if (ratio > 400) return 0;
    if (ratio > 300) return 1;
    if (ratio > 200) return 2;
    if (supported) return ratio > 100 ? 3 : 4;
    return 2; // <=200 without documented ventilatory/CPAP support cannot reach 3-4 per definition
  }
  function coagScore(plt) { if (plt >= 150) return 0; if (plt >= 100) return 1; if (plt >= 50) return 2; if (plt >= 20) return 3; return 4; }
  function liverScore(bili) { if (bili < 1.2) return 0; if (bili <= 1.9) return 1; if (bili <= 5.9) return 2; if (bili <= 11.9) return 3; return 4; }
  function renalScore(creat, uop) {
    let c = 0;
    if (creat >= 5.0) c = 4; else if (creat >= 3.5) c = 3; else if (creat >= 2.0) c = 2; else if (creat >= 1.2) c = 1; else c = 0;
    let u = 0;
    if (uop === "lt200") u = 4; else if (uop === "lt500") u = 3;
    return Math.max(c, u);
  }

  MP.calculators.registry.register({
    id: "sofa", title: "SOFA", category: "emergency",
    shortDescription: "Sequential Organ Failure Assessment", icon: "flask", hue: "teal",
    methods: [{
      id: "standard", label: "SOFA (original)", resultUnit: "/24",
      formulaNote: "Vincent JL, et al. Intensive Care Med. 1996. Original 6-organ SOFA, 0–4 per system.",
      inputs: [
        { id: "pf", label: "PaO₂/FiO₂ Ratio", unitLabel: "mmHg", type: "number", min: 20, max: 700, step: "any", required: true, placeholder: "350" },
        { id: "resp_support", label: "On mechanical ventilation / CPAP?", type: "select", required: true, options: [
          { value: "0", label: "No" }, { value: "1", label: "Yes" } ] },
        { id: "platelets", label: "Platelets", unitLabel: "×10³/µL", type: "number", min: 0, max: 1000, step: "any", required: true, placeholder: "200" },
        { id: "bilirubin", label: "Bilirubin", unitLabel: "mg/dL", type: "number", min: 0, max: 50, step: "any", required: true, placeholder: "0.8" },
        { id: "cv", label: "Cardiovascular (MAP / vasopressors)", type: "select", required: true, options: [
          { value: "0", label: "MAP ≥70 mmHg, no vasopressors" },
          { value: "1", label: "MAP <70 mmHg, no vasopressors" },
          { value: "2", label: "Dopamine ≤5 or any dobutamine" },
          { value: "3", label: "Dopamine >5, or epinephrine ≤0.1, or norepinephrine ≤0.1 mcg/kg/min" },
          { value: "4", label: "Dopamine >15, or epinephrine >0.1, or norepinephrine >0.1 mcg/kg/min" },
        ] },
        { id: "gcs", label: "Glasgow Coma Scale", unitLabel: "/15", type: "number", min: 3, max: 15, step: "1", required: true, placeholder: "15" },
        { id: "creatinine", label: "Creatinine", unitLabel: "mg/dL", type: "number", min: 0.1, max: 20, step: "any", required: true, placeholder: "0.9" },
        { id: "uop", label: "Urine Output", type: "select", required: false, options: [
          { value: "normal", label: "≥500 mL/day" }, { value: "lt500", label: "<500 mL/day" }, { value: "lt200", label: "<200 mL/day" } ] },
      ],
      calculate(v) {
        const resp = respScore(Number(v.pf), Number(v.resp_support) === 1);
        const coag = coagScore(Number(v.platelets));
        const liver = liverScore(Number(v.bilirubin));
        const cv = Number(v.cv);
        const gcsVal = Number(v.gcs);
        const cns = gcsVal === 15 ? 0 : gcsVal >= 13 ? 1 : gcsVal >= 10 ? 2 : gcsVal >= 6 ? 3 : 4;
        const renal = renalScore(Number(v.creatinine), v.uop || "normal");
        const total = resp + coag + liver + cv + cns + renal;
        return {
          value: total, unit: "/24",
          components: { "Respiratory": resp, "Coagulation": coag, "Liver": liver, "Cardiovascular": cv, "CNS": cns, "Renal": renal },
        };
      },
      interpret(r) {
        if (r.value >= 15) return "Very high SOFA range — associated with the highest reported mortality bands in SOFA outcome studies.";
        if (r.value >= 10) return "High SOFA range.";
        if (r.value >= 7) return "Moderately elevated SOFA range.";
        return "Lower SOFA range. An increase of ≥2 points from baseline is the criterion used in Sepsis-3 to indicate organ dysfunction.";
      },
    }],
  });
})(window.MP = window.MP || {});
