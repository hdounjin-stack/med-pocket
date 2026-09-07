(function (MP) {
  MP.calculators.registry.register({
    id: "qsofa", title: "qSOFA", category: "emergency",
    shortDescription: "Quick SOFA", icon: "flask", hue: "indigo",
    methods: [{
      id: "standard", label: "qSOFA", resultUnit: "/3",
      formulaNote: "Singer M, et al. Sepsis-3 definitions. JAMA. 2016. Each criterion present = 1 point.",
      inputs: [
        { id: "rr", label: "Respiratory rate ≥ 22/min", type: "select", required: true, options: [
          { value: "0", label: "No" }, { value: "1", label: "Yes" } ] },
        { id: "mentation", label: "Altered mentation", type: "select", required: true, options: [
          { value: "0", label: "No" }, { value: "1", label: "Yes" } ] },
        { id: "sbp", label: "Systolic BP ≤ 100 mmHg", type: "select", required: true, options: [
          { value: "0", label: "No" }, { value: "1", label: "Yes" } ] },
      ],
      calculate(v) {
        const rr = Number(v.rr), mentation = Number(v.mentation), sbp = Number(v.sbp);
        return { value: rr + mentation + sbp, unit: "/3", components: { "Respiratory rate ≥22": rr, "Altered mentation": mentation, "SBP ≤100": sbp } };
      },
      interpret(r) {
        if (r.value >= 2) return "qSOFA ≥2 — associated with greater risk of poor outcome in patients with suspected infection. Not a standalone diagnostic test for sepsis; use alongside full clinical assessment.";
        return "qSOFA <2 — lower-risk range by this screening tool alone; does not exclude sepsis.";
      },
    }],
  });
})(window.MP = window.MP || {});
