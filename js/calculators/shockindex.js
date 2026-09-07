(function (MP) {
  MP.calculators.registry.register({
    id: "shock-index", title: "Shock Index", category: "emergency",
    shortDescription: "HR / SBP", icon: "heartPulse", hue: "rose",
    methods: [{
      id: "standard", label: "Shock Index", resultUnit: "",
      formulaNote: "Shock Index = Heart Rate / Systolic BP. Allgower & Burri, 1967.",
      inputs: [
        { id: "hr", label: "Heart Rate", unitLabel: "bpm", type: "number", min: 1, max: 300, step: "any", required: true, placeholder: "100" },
        { id: "sbp", label: "Systolic Blood Pressure", unitLabel: "mmHg", type: "number", min: 1, max: 300, step: "any", required: true, placeholder: "100" },
      ],
      calculate(v) {
        const hr = Number(v.hr), sbp = Number(v.sbp);
        return { value: Math.round((hr / sbp) * 100) / 100, unit: "" };
      },
      interpret(r) {
        if (r.value >= 1.0) return "Above the commonly cited 1.0 reference threshold — has been associated with higher risk in some populations; interpret alongside the full clinical picture.";
        return "Below the commonly cited 1.0 reference threshold.";
      },
    }],
  });
})(window.MP = window.MP || {});
