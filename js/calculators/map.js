(function (MP) {
  MP.calculators.registry.register({
    id: "map", title: "MAP", category: "emergency",
    shortDescription: "Mean Arterial Pressure", icon: "heart", hue: "violet",
    methods: [{
      id: "standard", label: "MAP", resultUnit: "mmHg",
      formulaNote: "MAP = (SBP + 2 × DBP) / 3.",
      inputs: [
        { id: "sbp", label: "Systolic Blood Pressure", unitLabel: "mmHg", type: "number", min: 1, max: 300, step: "any", required: true, placeholder: "120" },
        { id: "dbp", label: "Diastolic Blood Pressure", unitLabel: "mmHg", type: "number", min: 1, max: 200, step: "any", required: true, placeholder: "80" },
      ],
      calculate(v) {
        const sbp = Number(v.sbp), dbp = Number(v.dbp);
        return { value: Math.round(((sbp + 2 * dbp) / 3) * 10) / 10, unit: "mmHg" };
      },
    }],
  });
})(window.MP = window.MP || {});
